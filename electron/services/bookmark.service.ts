import { Bookmark } from '../../src/types/models';
import { bookmarkModel, UpdateBookmarkDTO } from '../models/bookmark.model';
import { metadataService } from './metadata.service';
import { assetService } from './asset.service';
import { domainService } from './domain.service';
import { dbManager } from '../database/db';
import { webContents } from 'electron';

export class BookmarkService {
  /**
   * Adds a new bookmark by scraping its URL for metadata and downloading assets.
   */
  public async addBookmark(url: string): Promise<Bookmark> {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error('Invalid URL: Must start with http:// or https://');
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

    // 2. Fetch Metadata
    const metadata = await metadataService.extractMetadata(url);

    if (metadata.url) {
      const altMetaUrl = metadata.url.endsWith('/') ? metadata.url.slice(0, -1) : metadata.url + '/';
      const existingMeta = bookmarkModel.findByUrl(metadata.url) || bookmarkModel.findByUrl(altMetaUrl);
      if (existingMeta) {
        if (existingMeta.deleted_at) {
          bookmarkModel.permanentDelete(existingMeta.id);
        } else {
          throw new Error('Bookmark already exists');
        }
      }
    }

    // 3. Handle Domain & Favicon caching
    const domain = await domainService.getOrCreateDomain(metadata.domain, metadata.faviconUrl);

    // 4. Download Preview Image (if available) and generate thumbnail
    let previewPath: string | null = null;
    let thumbnailPath: string | null = null;

    if (metadata.previewImageUrl) {
      previewPath = await assetService.downloadImage(metadata.previewImageUrl, 'prev');
      if (previewPath) {
        thumbnailPath = await assetService.generateThumbnail(previewPath);
      }
    }

    // 5. Save to database using transaction
    const db = dbManager.getDb();
    
    // We use a transaction in case there are tags/collections to be added in the future
    const createTransaction = db.transaction(() => {
      return bookmarkModel.create({
        url: metadata.url,
        title: metadata.title,
        description: metadata.description,
        domain_id: domain.id,
        preview_path: previewPath,
        thumbnail_path: thumbnailPath
      });
    });

    try {
      return createTransaction();
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        throw new Error('Bookmark already exists');
      }
      throw err;
    }
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
    // Sanitize query to prevent FTS5 syntax errors (remove double quotes)
    const sanitizedQuery = query.replace(/"/g, '').trim();
    
    if (!sanitizedQuery) {
      return [];
    }

    // Add wildcards for partial matching in FTS5
    const ftsQuery = sanitizedQuery.split(/\s+/).map(word => `"${word}"*`).join(' AND ');
    return bookmarkModel.search(ftsQuery);
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
