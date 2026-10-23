import * as cheerio from 'cheerio';
import { net, BrowserWindow } from 'electron';
import { assetService } from './asset.service';
import { settingsService } from './settings.service';

export class RateLimitError extends Error {
  public readonly status: number;
  public readonly retryAfterSeconds?: number;
  public readonly domain: string;

  constructor(domain: string, status: number = 429, retryAfterSeconds?: number) {
    super(`Rate limit (${status}) encountered for domain ${domain}${retryAfterSeconds ? ` (retry after ${retryAfterSeconds}s)` : ''}`);
    this.name = 'RateLimitError';
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
    this.domain = domain;
  }
}

export interface WebsiteMetadata {
  url: string;
  title: string | null;
  description: string | null;
  domain: string;
  faviconUrl: string | null;
  previewImageUrl: string | null;
  previewPath?: string | null; // Set when captured directly via headless browser
}

export class MetadataService {
  /**
   * Fetches and parses website metadata from a given URL using Cheerio,
   * with an optional headless browser fallback for client-rendered SPAs.
   */
  public async extractMetadata(url: string, options?: { enableSpaFallback?: boolean }): Promise<WebsiteMetadata> {
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname;
    
    const defaultMetadata: WebsiteMetadata = {
      url,
      title: domain,
      description: null,
      domain,
      faviconUrl: `${parsedUrl.protocol}//${parsedUrl.host}/favicon.ico`,
      previewImageUrl: null,
      previewPath: null,
    };

    const shouldTrySpa = options?.enableSpaFallback !== undefined
      ? options.enableSpaFallback
      : settingsService.getSpaFallbackEnabled();

    let cheerioResult: WebsiteMetadata | null = null;
    let cheerioError: any = null;

    try {
      cheerioResult = await this.extractWithCheerio(url, defaultMetadata);
    } catch (err: any) {
      if (err instanceof RateLimitError) {
        // Rethrow rate limit errors immediately so queue worker can trigger backoff
        throw err;
      }
      cheerioError = err;
      console.warn(`[MetadataService] Cheerio extraction failed for ${url}:`, err.message);
    }

    // Check if Cheerio result is insufficient (e.g. SPA placeholder title, no preview image)
    const isGenericTitle = !cheerioResult?.title || 
      cheerioResult.title === domain || 
      cheerioResult.title.toLowerCase() === 'untitled' ||
      cheerioResult.title.toLowerCase().includes('just a moment') ||
      cheerioResult.title.toLowerCase().includes('loading...') ||
      cheerioResult.title.toLowerCase().includes('enable javascript');

    const isMissingPreview = !cheerioResult?.previewImageUrl && !cheerioResult?.previewPath;

    if (shouldTrySpa && (cheerioError || isGenericTitle || isMissingPreview)) {
      try {
        console.log(`[MetadataService] Triggering headless browser SPA fallback for: ${url}`);
        const headlessResult = await this.extractWithHeadlessBrowser(url, cheerioResult || defaultMetadata);
        if (headlessResult) {
          return headlessResult;
        }
      } catch (spaErr) {
        console.warn(`[MetadataService] Headless browser fallback failed for ${url}:`, spaErr);
      }
    }

    return cheerioResult || defaultMetadata;
  }

  /**
   * Fast static metadata extraction using net.fetch and Cheerio
   */
  private async extractWithCheerio(url: string, defaultMetadata: WebsiteMetadata): Promise<WebsiteMetadata> {
    const domain = defaultMetadata.domain;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    let response: Response;
    try {
      response = await net.fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 BookmarkManager/1.0',
        },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle rate limiting (429 Too Many Requests or 503 with Retry-After)
    if (response.status === 429 || response.status === 503) {
      let retryAfter: number | undefined;
      const retryHeader = response.headers.get('retry-after');
      if (retryHeader) {
        const parsed = parseInt(retryHeader, 10);
        if (!isNaN(parsed)) retryAfter = parsed;
      }
      throw new RateLimitError(domain, response.status, retryAfter);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return defaultMetadata;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract Title
    const title = $('meta[property="og:title"]').attr('content') || 
                  $('meta[name="twitter:title"]').attr('content') || 
                  $('title').text() || 
                  domain;

    // Extract Description
    const description = $('meta[property="og:description"]').attr('content') || 
                        $('meta[name="description"]').attr('content') || 
                        null;

    // Extract Preview Image
    let previewImageUrl = $('meta[property="og:image"]').attr('content') || 
                          $('meta[name="twitter:image"]').attr('content') || 
                          null;

    // Extract Favicon
    let faviconUrl = $('link[rel="apple-touch-icon"]').attr('href') ||
                     $('link[rel="icon"]').attr('href') ||
                     $('link[rel="shortcut icon"]').attr('href') ||
                     defaultMetadata.faviconUrl;

    if (previewImageUrl && !previewImageUrl.startsWith('http')) {
      try { previewImageUrl = new URL(previewImageUrl, url).href; } catch {}
    }
    if (faviconUrl && !faviconUrl.startsWith('http')) {
      try { faviconUrl = new URL(faviconUrl, url).href; } catch {}
    }

    return {
      url,
      title: title ? title.trim() : domain,
      description: description ? description.trim() : null,
      domain,
      faviconUrl,
      previewImageUrl,
      previewPath: null
    };
  }

  /**
   * Headless browser fallback using a hidden Electron BrowserWindow
   * to render client-side SPAs (React/Vue/Twitter) and capture page snapshots if no OpenGraph image is found.
   */
  private async extractWithHeadlessBrowser(url: string, baseMetadata: WebsiteMetadata): Promise<WebsiteMetadata | null> {
    let win: BrowserWindow | null = null;

    try {
      win = new BrowserWindow({
        width: 1280,
        height: 800,
        show: false,
        webPreferences: {
          offscreen: true,
          javascript: true,
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
        }
      });

      win.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // 12 second load timeout
      await Promise.race([
        win.loadURL(url),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Headless browser navigation timeout')), 12000))
      ]);

      // Allow 1.5 seconds for client-side frameworks to mount and update document title & meta tags
      await new Promise(resolve => setTimeout(resolve, 1500));

      const domData = await win.webContents.executeJavaScript(`
        (() => {
          const getMeta = (prop) => {
            const el = document.querySelector(\`meta[property="\${prop}"], meta[name="\${prop}"]\`);
            return el ? el.getAttribute('content') : null;
          };
          const title = getMeta('og:title') || getMeta('twitter:title') || document.title;
          const desc = getMeta('og:description') || getMeta('twitter:description') || getMeta('description');
          const img = getMeta('og:image') || getMeta('twitter:image');
          let fav = null;
          const icon = document.querySelector('link[rel="apple-touch-icon"], link[rel="icon"], link[rel="shortcut icon"]');
          if (icon) fav = icon.getAttribute('href');
          return { title, description: desc, previewImageUrl: img, faviconUrl: fav };
        })()
      `).catch(() => null);

      let title = (domData?.title && domData.title.trim()) || baseMetadata.title;
      let description = (domData?.description && domData.description.trim()) || baseMetadata.description;
      let previewImageUrl = domData?.previewImageUrl || baseMetadata.previewImageUrl;
      let faviconUrl = domData?.faviconUrl || baseMetadata.faviconUrl;
      let previewPath: string | null = null;

      if (previewImageUrl && !previewImageUrl.startsWith('http')) {
        try { previewImageUrl = new URL(previewImageUrl, url).href; } catch {}
      }
      if (faviconUrl && !faviconUrl.startsWith('http')) {
        try { faviconUrl = new URL(faviconUrl, url).href; } catch {}
      }

      // If client-rendered page STILL has no OpenGraph preview image, take a crisp screenshot of the rendered SPA!
      if (!previewImageUrl) {
        try {
          const screenshot = await win.webContents.capturePage();
          if (!screenshot.isEmpty()) {
            const pngBuffer = screenshot.toPNG();
            const savedFile = await assetService.saveImageBuffer(pngBuffer, 'prev');
            if (savedFile) {
              previewPath = savedFile;
            }
          }
        } catch (captureErr) {
          console.warn(`[MetadataService] Failed to capture page screenshot for ${url}:`, captureErr);
        }
      }

      return {
        url,
        title: title || baseMetadata.domain,
        description,
        domain: baseMetadata.domain,
        faviconUrl,
        previewImageUrl,
        previewPath
      };

    } catch (error) {
      console.warn(`[MetadataService] Headless browser execution failed for ${url}:`, error);
      return null;
    } finally {
      if (win && !win.isDestroyed()) {
        try {
          win.destroy();
        } catch {}
      }
    }
  }
}

export const metadataService = new MetadataService();

