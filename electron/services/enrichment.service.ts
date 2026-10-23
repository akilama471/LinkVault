import { bookmarkModel } from '../models/bookmark.model';
import { metadataService, RateLimitError } from './metadata.service';
import { domainService } from './domain.service';
import { assetService } from './asset.service';
import { dbManager } from '../database/db';
import { webContents, ipcMain } from 'electron';

export interface JobLog {
  id: number;
  timestamp: string;
  bookmarkId: number;
  url: string;
  status: 'processing' | 'success' | 'error';
  message: string;
}

interface DomainRateState {
  lastRequestTime: number;
  consecutiveErrors: number;
  backoffUntil: number;
}

class EnrichmentService {
  private isProcessing = false;
  private hasPendingWork = false;
  private shouldStop = false;
  private logs: JobLog[] = [];
  private logCounter = 0;

  // Domain Rate-Limiting & Backoff Configuration
  private domainStates = new Map<string, DomainRateState>();
  private readonly BASE_SAME_DOMAIN_DELAY_MS = 2500;
  private readonly BASE_GLOBAL_DELAY_MS = 800;
  private readonly JITTER_MAX_MS = 800;
  private readonly BASE_BACKOFF_MS = 10000; // 10s base backoff on 429
  private readonly MAX_BACKOFF_MS = 120000; // 2 minutes max backoff
  private lastDomainRequested: string | null = null;

  public stopEnrichmentJob() {
    this.shouldStop = true;
  }

  public clearLogs() {
    this.logs = [];
    webContents.getAllWebContents().forEach(wc => {
      wc.send('jobs:logs-updated');
    });
  }

  constructor() {
    ipcMain.handle('jobs:getEnrichmentLogs', () => {
      return this.logs;
    });
  }

  private getDomainState(domain: string): DomainRateState {
    let state = this.domainStates.get(domain);
    if (!state) {
      state = {
        lastRequestTime: 0,
        consecutiveErrors: 0,
        backoffUntil: 0,
      };
      this.domainStates.set(domain, state);
    }
    return state;
  }

  private getHostname(urlStr: string): string {
    try {
      return new URL(urlStr).hostname;
    } catch {
      return 'unknown';
    }
  }

  private getJitter(): number {
    return Math.floor(Math.random() * this.JITTER_MAX_MS);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));
  }

  private addLog(bookmarkId: number, url: string, status: 'processing' | 'success' | 'error', message: string) {
    const log: JobLog = {
      id: ++this.logCounter,
      timestamp: new Date().toISOString(),
      bookmarkId,
      url,
      status,
      message
    };
    
    // Update existing processing log if it exists for this bookmark
    if (status !== 'processing') {
      const existingIdx = this.logs.findIndex(l => l.bookmarkId === bookmarkId && l.status === 'processing');
      if (existingIdx !== -1) {
        this.logs[existingIdx] = { ...this.logs[existingIdx], status, message, timestamp: log.timestamp };
      } else {
        this.logs.unshift(log);
      }
    } else {
      this.logs.unshift(log);
    }
    
    if (this.logs.length > 200) {
      this.logs.pop(); // Keep only last 200
    }

    webContents.getAllWebContents().forEach(wc => {
      wc.send('jobs:logs-updated');
    });
  }

  public async startEnrichmentJob() {
    if (this.isProcessing) {
      this.hasPendingWork = true;
      return;
    }
    this.isProcessing = true;
    this.shouldStop = false;

    let isFirstItem = true;

    try {
      while (!this.shouldStop) {
        // Query up to 25 pending bookmarks to allow picking around rate-limited domains
        const pendingBookmarks = dbManager.getDb().prepare(`
          SELECT id, url, title FROM bookmarks 
          WHERE thumbnail_path = 'pending' AND deleted_at IS NULL
          ORDER BY id DESC
          LIMIT 25
        `).all() as { id: number; url: string; title: string | null }[];

        if (pendingBookmarks.length === 0) {
          if (this.hasPendingWork) {
            this.hasPendingWork = false;
            continue;
          }
          break; // Nothing left to process
        }

        const now = Date.now();

        // Separate items whose domain is NOT currently in rate-limit backoff
        const readyBookmarks = pendingBookmarks.filter(b => {
          const domain = this.getHostname(b.url);
          const state = this.getDomainState(domain);
          return state.backoffUntil <= now;
        });

        // If all pending bookmarks are from domains in backoff, wait until the earliest backoff expires
        if (readyBookmarks.length === 0) {
          const earliestExpiry = Math.min(...pendingBookmarks.map(b => this.getDomainState(this.getHostname(b.url)).backoffUntil));
          const waitMs = Math.max(1000, earliestExpiry - now);
          console.log(`[EnrichmentService] All pending domains are in backoff. Waiting ${Math.ceil(waitMs / 1000)}s...`);
          await this.delay(waitMs);
          continue;
        }

        // Process ready bookmarks
        for (const bookmark of readyBookmarks) {
          if (this.shouldStop) break;

          const domain = this.getHostname(bookmark.url);
          const domainState = this.getDomainState(domain);

          // Check again in case state changed during previous loop iteration
          if (domainState.backoffUntil > Date.now()) {
            continue;
          }

          try {
            const msg = `Enriching bookmark ${bookmark.id} (${domain})...`;
            console.log(`[Enrichment Job] ${msg} : ${bookmark.url}`);
            this.addLog(bookmark.id, bookmark.url, 'processing', msg);

            // Rate-limiting delay with jitter
            if (!isFirstItem) {
              const isSameDomain = this.lastDomainRequested === domain;
              const jitter = this.getJitter();
              const requiredInterval = isSameDomain 
                ? (this.BASE_SAME_DOMAIN_DELAY_MS + jitter) 
                : (this.BASE_GLOBAL_DELAY_MS + jitter);

              const elapsed = Date.now() - domainState.lastRequestTime;
              if (elapsed < requiredInterval) {
                const waitMs = requiredInterval - elapsed;
                await this.delay(waitMs);
              }
            }
            isFirstItem = false;
            if (this.shouldStop) break;

            domainState.lastRequestTime = Date.now();
            this.lastDomainRequested = domain;

            const metadata = await metadataService.extractMetadata(bookmark.url);
            if (this.shouldStop) break;

            // Domain succeeded: reset consecutive rate errors
            domainState.consecutiveErrors = 0;

            let hostname = '';
            try {
              hostname = new URL(bookmark.url).hostname;
            } catch {}

            // If current title is a placeholder (empty, 'Untitled', URL, domain, or hostname), use metadata title
            const isPlaceholderTitle =
              !bookmark.title ||
              bookmark.title === 'Untitled' ||
              bookmark.title === bookmark.url ||
              bookmark.title === metadata.domain ||
              (hostname && bookmark.title === hostname);

            const finalTitle = isPlaceholderTitle
              ? (metadata.title || bookmark.title || 'Untitled')
              : (bookmark.title || metadata.title || 'Untitled');

            const domainRecord = await domainService.getOrCreateDomain(metadata.domain, metadata.faviconUrl);

            let previewPath: string | null = null;
            let thumbnailPath: string | null = null;

            // 1. Direct preview from SPA headless screenshot
            if (metadata.previewPath) {
              previewPath = metadata.previewPath;
              thumbnailPath = await assetService.generateThumbnail(previewPath);
            } 
            // 2. Download from OpenGraph / Twitter meta image URL
            else if (metadata.previewImageUrl) {
              previewPath = await assetService.downloadImage(metadata.previewImageUrl, 'prev', bookmark.url);
              if (this.shouldStop) break;
              if (previewPath) {
                thumbnailPath = await assetService.generateThumbnail(previewPath);
              }
            }

            if (this.shouldStop) break;

            bookmarkModel.update(bookmark.id, {
              title: finalTitle,
              description: metadata.description,
              domain_id: domainRecord.id,
              preview_path: previewPath,
              thumbnail_path: thumbnailPath
            });

            // Notify frontend
            webContents.getAllWebContents().forEach(wc => {
              wc.send('bookmarks:updated');
              wc.send('domains:updated');
            });

            this.addLog(bookmark.id, bookmark.url, 'success', 'Successfully enriched title, description, and thumbnail.');

          } catch (error: any) {
            if (error instanceof RateLimitError || error.status === 429) {
              // Exponential backoff for 429 Too Many Requests
              const backoffSec = error.retryAfterSeconds || Math.min(
                this.MAX_BACKOFF_MS / 1000, 
                (this.BASE_BACKOFF_MS / 1000) * Math.pow(2, domainState.consecutiveErrors)
              );
              domainState.consecutiveErrors++;
              domainState.backoffUntil = Date.now() + (backoffSec * 1000) + this.getJitter();

              const backoffMsg = `Rate limit (429) hit for ${domain}. Backing off for ${Math.round(backoffSec)}s. Bookmark will be retried automatically.`;
              console.warn(`[Enrichment Job] ${backoffMsg}`);
              this.addLog(bookmark.id, bookmark.url, 'error', backoffMsg);

              // Do NOT clear thumbnail_path='pending' on rate limits so it will retry after backoff expires
            } else {
              console.error(`[Enrichment Job] Failed to enrich bookmark ${bookmark.id} (${bookmark.url}):`, error);
              this.addLog(bookmark.id, bookmark.url, 'error', error?.message || 'Failed to enrich metadata');
              
              // On permanent failure, clear the pending flag so we don't loop infinitely
              bookmarkModel.update(bookmark.id, { thumbnail_path: null });
            }

            webContents.getAllWebContents().forEach(wc => {
              wc.send('bookmarks:updated');
            });
          }
        }
      }
    } finally {
      this.isProcessing = false;
      this.hasPendingWork = false;
    }
  }
}

export const enrichmentService = new EnrichmentService();

