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
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.shouldStop = false;

    try {
      while (!this.shouldStop) {
        // Fetch 5 bookmarks that have thumbnail_path='pending' (indicating they were freshly imported)
        const pendingBookmarks = dbManager.getDb().prepare(`
          SELECT id, url, title FROM bookmarks 
          WHERE thumbnail_path = 'pending' AND deleted_at IS NULL
          LIMIT 5
        `).all() as { id: number; url: string; title: string | null }[];

        if (pendingBookmarks.length === 0) {
          break; // Nothing left to process
        }

        for (const bookmark of pendingBookmarks) {
          if (this.shouldStop) break;
          try {
            const msg = `Enriching bookmark ${bookmark.id}...`;
            console.log(`[Enrichment Job] ${msg} : ${bookmark.url}`);
            this.addLog(bookmark.id, bookmark.url, 'processing', msg);
            
            // Wait 2 seconds before making network requests to avoid IP bans / Rate Limits
            await new Promise(resolve => setTimeout(resolve, 2000));
            if (this.shouldStop) break;

            const metadata = await metadataService.extractMetadata(bookmark.url);
            if (this.shouldStop) break;
            
            // Prefer original title if it's not "Untitled", else use metadata title
            const finalTitle = (bookmark.title && bookmark.title !== 'Untitled' && bookmark.title !== bookmark.url) ? bookmark.title : metadata.title;

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
            });

            this.addLog(bookmark.id, bookmark.url, 'success', 'Successfully enriched title, description, and thumbnail.');

          } catch (error: any) {
            console.error(`[Enrichment Job] Failed to enrich bookmark ${bookmark.id} (${bookmark.url}):`, error);
            this.addLog(bookmark.id, bookmark.url, 'error', error?.message || 'Failed to enrich metadata');
            
            // On failure, clear the pending flag so we don't loop infinitely
            bookmarkModel.update(bookmark.id, { thumbnail_path: null });
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

export const enrichmentService = new EnrichmentService();
