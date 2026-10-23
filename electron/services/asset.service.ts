import path from 'node:path';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { app, net } from 'electron';
import crypto from 'node:crypto';
import sharp from 'sharp';
import https from 'node:https';
import http from 'node:http';
import { dbManager } from '../database/db';
import { AssetStorageStats, OrphanAssetInfo, VacuumResult } from '../../src/types/models';

export class AssetService {
  private readonly assetsDir: string;

  constructor() {
    this.assetsDir = path.join(app.getPath('userData'), 'assets');
    this.ensureDirectory();
  }

  private async ensureDirectory() {
    try {
      await fs.mkdir(this.assetsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create assets directory:', error);
    }
  }

  /**
   * Generates a unique filename for an asset
   */
  private generateFilename(prefix: string, extension: string): string {
    const hash = crypto.randomBytes(16).toString('hex');
    return `${prefix}_${hash}${extension}`;
  }

  /**
   * Downloads an image from a URL and saves it to the local filesystem
   * Returns the relative path to the saved asset
   */
  public async downloadImage(url: string, prefix: string = 'img', sourceUrl?: string): Promise<string | null> {
    try {
      const filename = this.generateFilename(prefix, '.bdi');
      const fullPath = path.join(this.assetsDir, filename);

      await new Promise<void>((resolve, reject) => {
        const headers: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 BookmarkManager/1.0',
        };
        
        if (sourceUrl) {
          headers['Referer'] = sourceUrl;
        }

        const makeRequest = (targetUrl: string, redirectCount: number = 0) => {
          if (redirectCount > 5) {
            reject(new Error('Too many redirects'));
            return;
          }
          const requestClient = targetUrl.startsWith('https') ? https : http;
          const req = requestClient.get(targetUrl, { headers }, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              // Handle redirect
              const redirectUrl = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, targetUrl).href;
              makeRequest(redirectUrl, redirectCount + 1);
              return;
            }
            
            if (!res.statusCode || res.statusCode >= 400) {
              reject(new Error(`Status ${res.statusCode}`));
              return;
            }

            const MAX_SIZE = 5 * 1024 * 1024; // 5MB
            let downloadedBytes = 0;

            res.on('data', (chunk) => {
              downloadedBytes += chunk.length;
              if (downloadedBytes > MAX_SIZE) {
                req.destroy(new Error('File size exceeds 5MB limit'));
              }
            });

            const transform = sharp()
              .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
              .webp({ quality: 80 });

            const outStream = createWriteStream(fullPath);

            res.pipe(transform).pipe(outStream);

            outStream.on('finish', () => resolve());
            outStream.on('error', (err) => {
              req.destroy();
              fs.unlink(fullPath).catch(() => {});
              reject(err);
            });
            transform.on('error', (err) => {
              req.destroy();
              fs.unlink(fullPath).catch(() => {});
              reject(err);
            });
          });
          
          req.on('error', reject);
          req.setTimeout(15000, () => {
            req.destroy();
            reject(new Error('Timeout'));
          });
        };

        makeRequest(url);
      });

      return filename; // Return relative filename
    } catch (error) {
      console.warn(`Failed to download image from ${url}:`, error);
      return null;
    }
  }

  /**
   * Generates a small thumbnail from an existing local image
   */
  public async generateThumbnail(sourceFilename: string): Promise<string | null> {
    try {
      const sourcePath = path.join(this.assetsDir, sourceFilename);
      const sourceBuffer = await fs.readFile(sourcePath);

      const thumbnailFilename = this.generateFilename('thumb', '.bdi');
      const thumbnailPath = path.join(this.assetsDir, thumbnailFilename);

      await sharp(sourceBuffer)
        .resize(300, 200, { fit: 'cover' })
        .webp({ quality: 70 })
        .toFile(thumbnailPath);

      return thumbnailFilename;
    } catch (error) {
      console.error(`Failed to generate thumbnail for ${sourceFilename}:`, error);
      return null;
    }
  }

  /**
   * Saves a raw image buffer (e.g. from headless browser capturePage) as a WebP asset
   */
  public async saveImageBuffer(buffer: Buffer, prefix: string = 'prev'): Promise<string | null> {
    try {
      const filename = this.generateFilename(prefix, '.bdi');
      const fullPath = path.join(this.assetsDir, filename);

      await sharp(buffer)
        .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(fullPath);

      return filename;
    } catch (error) {
      console.warn('[AssetService] Failed to save image buffer as asset:', error);
      return null;
    }
  }

  /**
   * Resolves a relative asset filename to an absolute path for the renderer to display (via custom protocol or file://)
   */
  public getAssetAbsolutePath(filename: string): string {
    return path.join(this.assetsDir, filename);
  }

  /**
   * Deletes a single asset file from userData/assets if it exists on disk.
   */
  public async deleteAsset(filename: string | null | undefined): Promise<boolean> {
    if (!filename || filename === 'pending') return false;
    const safeFilename = path.basename(filename);
    const fullPath = path.join(this.assetsDir, safeFilename);

    try {
      await fs.unlink(fullPath);
      return true;
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        console.warn(`[AssetService] Failed to unlink asset ${safeFilename}:`, err);
      }
      return false;
    }
  }

  /**
   * Checks whether a given asset filename is actively referenced in the database
   * by any bookmark (as thumbnail or preview) or by any domain (as favicon).
   */
  public isAssetReferenced(filename: string | null | undefined): boolean {
    if (!filename || filename === 'pending') return false;
    const safeFilename = path.basename(filename);
    const db = dbManager.getDb();
    const row = db.prepare(`
      SELECT 1 FROM bookmarks WHERE thumbnail_path = ? OR preview_path = ?
      UNION
      SELECT 1 FROM domains WHERE favicon_path = ?
      LIMIT 1
    `).get(safeFilename, safeFilename, safeFilename);
    return Boolean(row);
  }

  /**
   * Retrieves a Set of all asset filenames referenced by any database record.
   */
  public getAllReferencedAssetFilenames(): Set<string> {
    const db = dbManager.getDb();
    const rows = db.prepare(`
      SELECT thumbnail_path AS p FROM bookmarks WHERE thumbnail_path IS NOT NULL AND thumbnail_path != 'pending'
      UNION
      SELECT preview_path AS p FROM bookmarks WHERE preview_path IS NOT NULL AND preview_path != 'pending'
      UNION
      SELECT favicon_path AS p FROM domains WHERE favicon_path IS NOT NULL AND favicon_path != 'pending'
    `).all() as { p: string }[];
    return new Set(rows.map(r => path.basename(r.p)));
  }

  /**
   * Deletes an asset file from disk if no active bookmark or domain references it.
   */
  public async deleteAssetIfUnreferenced(filename: string | null | undefined): Promise<boolean> {
    if (!filename || filename === 'pending') return false;
    const safeFilename = path.basename(filename);
    if (!this.isAssetReferenced(safeFilename)) {
      return this.deleteAsset(safeFilename);
    }
    return false;
  }

  /**
   * Batch deletes multiple assets from disk if they are not referenced in the database.
   */
  public async deleteAssetsIfUnreferenced(filenames: (string | null | undefined)[]): Promise<number> {
    const valid = filenames.filter((f): f is string => Boolean(f) && f !== 'pending');
    if (valid.length === 0) return 0;

    const uniqueFilenames = Array.from(new Set(valid.map(f => path.basename(f))));
    const referencedSet = this.getAllReferencedAssetFilenames();
    let deletedCount = 0;

    for (const filename of uniqueFilenames) {
      if (!referencedSet.has(filename)) {
        const deleted = await this.deleteAsset(filename);
        if (deleted) deletedCount++;
      }
    }
    return deletedCount;
  }

  /**
   * Scans the assets directory and returns real-time storage statistics,
   * distinguishing between active referenced assets and unreferenced orphans.
   */
  public async getStorageStats(): Promise<AssetStorageStats> {
    await this.ensureDirectory();

    let dirents: any[] = [];
    try {
      dirents = await fs.readdir(this.assetsDir, { withFileTypes: true });
    } catch (e) {
      console.error('[AssetService] Failed to read assets directory:', e);
      return {
        totalFiles: 0,
        totalSizeBytes: 0,
        activeFiles: 0,
        activeSizeBytes: 0,
        orphanFiles: 0,
        orphanSizeBytes: 0,
        orphans: [],
      };
    }

    const referencedSet = this.getAllReferencedAssetFilenames();
    const now = Date.now();
    const GRACE_PERIOD_MS = 30 * 1000; // 30s grace period for in-flight image downloads

    let totalFiles = 0;
    let totalSizeBytes = 0;
    let activeFiles = 0;
    let activeSizeBytes = 0;
    let orphanFiles = 0;
    let orphanSizeBytes = 0;
    const orphans: OrphanAssetInfo[] = [];

    for (const dirent of dirents) {
      if (!dirent.isFile()) continue;

      const filename = dirent.name;
      const fullPath = path.join(this.assetsDir, filename);

      try {
        const stat = await fs.stat(fullPath);
        const sizeBytes = stat.size;
        const modifiedAt = stat.mtime.toISOString();

        totalFiles++;
        totalSizeBytes += sizeBytes;

        if (referencedSet.has(filename)) {
          activeFiles++;
          activeSizeBytes += sizeBytes;
        } else {
          // Check if file is still within grace period (recent in-flight download)
          const fileAgeMs = now - stat.mtimeMs;
          if (fileAgeMs < GRACE_PERIOD_MS) {
            // Count as active/in-flight rather than an orphan
            activeFiles++;
            activeSizeBytes += sizeBytes;
          } else {
            orphanFiles++;
            orphanSizeBytes += sizeBytes;

            let assetType: 'thumbnail' | 'preview' | 'favicon' | 'other' = 'other';
            if (filename.startsWith('thumb_')) assetType = 'thumbnail';
            else if (filename.startsWith('prev_')) assetType = 'preview';
            else if (filename.startsWith('fav_')) assetType = 'favicon';

            orphans.push({
              filename,
              sizeBytes,
              modifiedAt,
              assetType,
            });
          }
        }
      } catch (err) {
        console.warn(`[AssetService] Failed to stat asset file ${filename}:`, err);
      }
    }

    // Sort orphans largest first
    orphans.sort((a, b) => b.sizeBytes - a.sizeBytes);

    return {
      totalFiles,
      totalSizeBytes,
      activeFiles,
      activeSizeBytes,
      orphanFiles,
      orphanSizeBytes,
      orphans,
    };
  }

  /**
   * Deletes all unreferenced orphan files from userData/assets and reclaims disk space.
   */
  public async pruneOrphanAssets(): Promise<VacuumResult> {
    const stats = await this.getStorageStats();
    let deletedCount = 0;
    let reclaimedBytes = 0;
    const errors: string[] = [];

    for (const orphan of stats.orphans) {
      // Double check it wasn't referenced in the meantime
      if (this.isAssetReferenced(orphan.filename)) {
        continue;
      }

      const safeFilename = path.basename(orphan.filename);
      const fullPath = path.join(this.assetsDir, safeFilename);

      try {
        await fs.unlink(fullPath);
        deletedCount++;
        reclaimedBytes += orphan.sizeBytes;
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          errors.push(`${orphan.filename}: ${err.message}`);
        }
      }
    }

    return {
      deletedCount,
      reclaimedBytes,
      errors,
    };
  }
}

export const assetService = new AssetService();
