import { bookmarkModel } from '../models/bookmark.model';
import { metadataService } from './metadata.service';
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

class EnrichmentService {
  private isProcessing = false;
  private hasPendingWork = false;
  private shouldStop = false;
  private logs: JobLog[] = [];
  private logCounter = 0;

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
        // Fetch 5 bookmarks that have thumbnail_path='pending', newest first so recently added bookmarks get priority
        const pendingBookmarks = dbManager.getDb().prepare(`
          SELECT id, url, title FROM bookmarks 
          WHERE thumbnail_path = 'pending' AND deleted_at IS NULL
          ORDER BY id DESC
          LIMIT 5
        `).all() as { id: number; url: string; title: string | null }[];

        if (pendingBookmarks.length === 0) {
          if (this.hasPendingWork) {
            this.hasPendingWork = false;
            continue;
          }
          break; // Nothing left to process
        }

        for (const bookmark of pendingBookmarks) {
          if (this.shouldStop) break;
          try {
            const msg = `Enriching bookmark ${bookmark.id}...`;
            console.log(`[Enrichment Job] ${msg} : ${bookmark.url}`);
            this.addLog(bookmark.id, bookmark.url, 'processing', msg);
            
            // Only delay between subsequent requests to avoid rate limits (first item runs immediately)
            if (!isFirstItem) {
              await new Promise(resolve => setTimeout(resolve, 1500));
              if (this.shouldStop) break;
            }
            isFirstItem = false;

            const metadata = await metadataService.extractMetadata(bookmark.url);
            if (this.shouldStop) break;
            
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

            const domain = await domainService.getOrCreateDomain(metadata.domain, metadata.faviconUrl);

            let previewPath: string | null = null;
            let thumbnailPath: string | null = null;

            if (metadata.previewImageUrl) {
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
              domain_id: domain.id,
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
            console.error(`[Enrichment Job] Failed to enrich bookmark ${bookmark.id} (${bookmark.url}):`, error);
            this.addLog(bookmark.id, bookmark.url, 'error', error?.message || 'Failed to enrich metadata');
            
            // On failure, clear the pending flag so we don't loop infinitely
            bookmarkModel.update(bookmark.id, { thumbnail_path: null });

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
