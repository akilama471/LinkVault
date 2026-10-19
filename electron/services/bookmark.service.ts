import { Bookmark } from '../../src/types/models';
import { bookmarkModel, UpdateBookmarkDTO } from '../models/bookmark.model';
import { metadataService } from './metadata.service';
import { assetService } from './asset.service';
import { domainService } from './domain.service';
import { dbManager } from '../database/db';

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
      throw new Error('Bookmark already exists');
    }

    // 2. Fetch Metadata
    const metadata = await metadataService.extractMetadata(url);

    if (metadata.url) {
      const altMetaUrl = metadata.url.endsWith('/') ? metadata.url.slice(0, -1) : metadata.url + '/';
      const existingMeta = bookmarkModel.findByUrl(metadata.url) || bookmarkModel.findByUrl(altMetaUrl);
      if (existingMeta) {
        throw new Error('Bookmark already exists');
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

  public getAllBookmarks(): Bookmark[] {
    return bookmarkModel.getAll();
  }

  public searchBookmarks(query: string): Bookmark[] {
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
    return bookmarkModel.update(id, data);
  }

  public deleteBookmark(id: number): void {
    // Note: Asset cleanup logic should ideally go here (deleting preview_path and thumbnail_path files)
    // For safety, we can leave assets on disk or implement an explicit asset cleanup job.
    bookmarkModel.delete(id);
  }
}

export const bookmarkService = new BookmarkService();
