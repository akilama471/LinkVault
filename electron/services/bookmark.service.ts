import { Bookmark } from '../../src/types/models';
import { bookmarkModel, UpdateBookmarkDTO } from '../models/bookmark.model';
import { domainModel } from '../models/domain.model';
import { metadataService } from './metadata.service';
import { assetService } from './asset.service';
import { domainService } from './domain.service';
import { enrichmentService } from './enrichment.service';
import { dbManager } from '../database/db';
import { webContents } from 'electron';

export class BookmarkService {
  /**
   * Adds a new bookmark immediately with pending enrichment and delegates
   * metadata scraping and asset downloads to the background enrichment job.
   */
  public async addBookmark(url: string): Promise<Bookmark> {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error('Invalid URL: Must start with http:// or https://');
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error('Invalid URL format');
    }

    // 1. Check if it already exists
    const altUrl = url.endsWith('/') ? url.slice(0, -1) : url + '/';
    const existing = bookmarkModel.findByUrl(url) || bookmarkModel.findByUrl(altUrl);
    if (existing) {
      if (existing.deleted_at) {
        bookmarkModel.permanentDelete(existing.id);
      } else {
        throw new Error('Bookmark already exists');
      }
    }

    // 2. Resolve domain synchronously without network requests
    const domainName = parsedUrl.hostname;
    let domain = domainModel.findByDomain(domainName);
    if (!domain) {
      domain = domainModel.create(domainName, null);
    }

    // 3. Save bookmark to database immediately with 'pending' thumbnail status
    const db = dbManager.getDb();
    const createTransaction = db.transaction(() => {
      return bookmarkModel.create({
        url,
        title: domainName,
        description: null,
        domain_id: domain.id,
        preview_path: null,
        thumbnail_path: 'pending'
      });
    });

    let createdBookmark: Bookmark;
    try {
      createdBookmark = createTransaction();
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        throw new Error('Bookmark already exists');
      }
      throw err;
    }

    // 4. Broadcast update to webContents so the bookmark appears instantly in the UI
    webContents.getAllWebContents().forEach(wc => {
      wc.send('bookmarks:updated');
    });

    // 5. Delegate metadata scraping and asset generation to background enrichment job
    enrichmentService.startEnrichmentJob().catch(err => {
      console.error('[BookmarkService] Background enrichment failed to start:', err);
    });

    return createdBookmark;
  }

  /**
   * Refetches metadata and preview images for an existing bookmark from the internet.
   */
  public async refetchBookmark(id: number): Promise<Bookmark> {
    const bookmark = bookmarkModel.findById(id);
    if (!bookmark) {
      throw new Error(`Bookmark with id ${id} not found`);
    }

    const metadata = await metadataService.extractMetadata(bookmark.url);
    const domain = await domainService.getOrCreateDomain(metadata.domain, metadata.faviconUrl);

    let previewPath: string | null = bookmark.preview_path;
    let thumbnailPath: string | null = bookmark.thumbnail_path === 'pending' ? null : bookmark.thumbnail_path;

    if (metadata.previewImageUrl) {
      const downloadedPreview = await assetService.downloadImage(metadata.previewImageUrl, 'prev', bookmark.url);
      if (downloadedPreview) {
        previewPath = downloadedPreview;
        const generatedThumb = await assetService.generateThumbnail(downloadedPreview);
        if (generatedThumb) {
          thumbnailPath = generatedThumb;
        }
      }
    }

    const updatedTitle = metadata.title || bookmark.title;
    const updatedDescription = metadata.description !== null ? metadata.description : bookmark.description;

    const updated = bookmarkModel.update(id, {
      title: updatedTitle,
      description: updatedDescription,
      domain_id: domain.id,
      preview_path: previewPath,
      thumbnail_path: thumbnailPath
    });

    webContents.getAllWebContents().forEach(wc => {
      wc.send('bookmarks:updated');
      wc.send('domains:updated');
    });

    return updated;
  }

  public getAllBookmarks(): Bookmark[] {
    this.purgeExpiredBookmarks();
    return bookmarkModel.getAll();
  }

  public getDeletedBookmarks(): Bookmark[] {
    this.purgeExpiredBookmarks();
    return bookmarkModel.getDeleted();
  }

  public searchBookmarks(query: string): Bookmark[] {
    this.purgeExpiredBookmarks();
    return bookmarkModel.search(query);
  }

  public updateBookmark(id: number, data: UpdateBookmarkDTO): Bookmark {
    const updated = bookmarkModel.update(id, data);
    webContents.getAllWebContents().forEach(wc => {
      wc.send('bookmarks:updated');
    });
    return updated;
  }

  /**
   * Soft-deletes a bookmark by moving it to the Recycle Bin.
   */
  public deleteBookmark(id: number): void {
    this.purgeExpiredBookmarks();
    bookmarkModel.delete(id);
    webContents.getAllWebContents().forEach(wc => {
      wc.send('bookmarks:updated');
    });
  }

  /**
   * Restores a bookmark from the Recycle Bin.
   */
  public restoreBookmark(id: number): Bookmark | null {
    const restored = bookmarkModel.restore(id);
    webContents.getAllWebContents().forEach(wc => {
      wc.send('bookmarks:updated');
    });
    return restored;
  }

  /**
   * Permanently deletes a single bookmark from the database.
   */
  public permanentDeleteBookmark(id: number): void {
    bookmarkModel.permanentDelete(id);
    webContents.getAllWebContents().forEach(wc => {
      wc.send('bookmarks:updated');
    });
  }

  /**
   * Permanently deletes all bookmarks in the Recycle Bin.
   */
  public emptyRecycleBin(): number {
    const count = bookmarkModel.emptyTrash();
    webContents.getAllWebContents().forEach(wc => {
      wc.send('bookmarks:updated');
    });
    return count;
  }

  /**
   * Permanently deletes bookmarks that have been in the Recycle Bin for 15 days or more.
   */
  public purgeExpiredBookmarks(days = 15): number {
    const purgedCount = bookmarkModel.purgeExpiredTrash(days);
    if (purgedCount > 0) {
      webContents.getAllWebContents().forEach(wc => {
        wc.send('bookmarks:updated');
      });
    }
    return purgedCount;
  }
}

export const bookmarkService = new BookmarkService();
