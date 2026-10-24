import { Collection } from '../../src/types/models';
import { collectionModel } from '../models/collection.model';
import { bookmarkService } from './bookmark.service';
import { assetService } from './asset.service';
import { dbManager } from '../database/db';
import { webContents } from 'electron';

export class CollectionService {
  public getAllCollections(): Collection[] {
    this.purgeExpiredCollections();
    return collectionModel.getAll();
  }

  public getDeletedCollections(): Collection[] {
    this.purgeExpiredCollections();
    return collectionModel.getDeleted();
  }

  public getOrCreateCollection(name: string, description: string | null = null): Collection {
    const cleanName = name.trim();
    if (!cleanName) throw new Error('Collection name cannot be empty');
    
    let col = collectionModel.findByName(cleanName);
    if (!col) {
      col = collectionModel.create(cleanName, description);
    } else {
      if (col.deleted_at) {
        collectionModel.restore(col.id);
      }
      if (description !== null && col.description !== description) {
        collectionModel.update(col.id, cleanName, description);
      }
      col = collectionModel.findById(col.id)!;
    }

    webContents.getAllWebContents().forEach(wc => {
      wc.send('collections:updated');
    });

    return col;
  }

  public renameCollection(id: number, newName: string, description: string | null = null): Collection {
    const cleanName = newName.trim();
    if (!cleanName) throw new Error('Collection name cannot be empty');
    
    const existing = collectionModel.findByName(cleanName);
    if (existing && existing.id !== id) {
      if (existing.deleted_at) {
        collectionModel.permanentDelete(existing.id);
      } else {
        throw new Error('A collection with this name already exists');
      }
    }
    
    const current = collectionModel.findById(id);
    if (!current) {
      throw new Error(`Collection with id ${id} not found`);
    }

    const finalDescription = description !== undefined && description !== null ? description : current.description;
    collectionModel.update(id, cleanName, finalDescription);
    const updated = collectionModel.findById(id)!;

    webContents.getAllWebContents().forEach(wc => {
      wc.send('collections:updated');
    });

    return updated;
  }

  /**
   * Refetches metadata and preview images for all bookmarks in the collection.
   */
  public async refetchCollection(id: number): Promise<Collection> {
    const col = collectionModel.findById(id);
    if (!col) {
      throw new Error(`Collection with id ${id} not found`);
    }

    const bookmarkIds = collectionModel.getBookmarkIdsForCollection(id);
    for (const bookmarkId of bookmarkIds) {
      try {
        await bookmarkService.refetchBookmark(bookmarkId);
      } catch (e) {
        console.warn(`[refetchCollection] Failed to refetch bookmark ${bookmarkId}:`, e);
      }
    }

    dbManager.getDb().prepare('UPDATE collections SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
    const updated = collectionModel.findById(id)!;

    webContents.getAllWebContents().forEach(wc => {
      wc.send('collections:updated');
      wc.send('bookmarks:updated');
    });

    return updated;
  }

  /**
   * Soft-deletes a collection (moves to Recycle Bin).
   * When deleteBookmarks is true, also moves all bookmarks in the collection to the Recycle Bin.
   */
  public deleteCollection(id: number, deleteBookmarks = false): void {
    this.purgeExpiredCollections();
    collectionModel.delete(id, deleteBookmarks);
    webContents.getAllWebContents().forEach(wc => {
      wc.send('collections:updated');
      wc.send('bookmarks:updated');
    });
  }

  public restoreCollection(id: number): Collection | null {
    const restored = collectionModel.restore(id);
    webContents.getAllWebContents().forEach(wc => {
      wc.send('collections:updated');
      wc.send('bookmarks:updated');
    });
    return restored;
  }

  public async permanentDeleteCollection(id: number): Promise<void> {
    const db = dbManager.getDb();
    const row = db.prepare('SELECT deleted_with_bookmarks FROM collections WHERE id = ?').get(id) as { deleted_with_bookmarks?: number } | undefined;
    
    let candidateAssets: (string | null | undefined)[] = [];
    if (row?.deleted_with_bookmarks) {
      const trashedBookmarks = db.prepare(`
        SELECT thumbnail_path, preview_path FROM bookmarks
        WHERE id IN (SELECT bookmark_id FROM bookmark_collections WHERE collection_id = ?)
          AND deleted_at IS NOT NULL
      `).all(id) as { thumbnail_path: string | null; preview_path: string | null }[];
      candidateAssets = trashedBookmarks.flatMap(b => [b.thumbnail_path, b.preview_path]);
    }

    collectionModel.permanentDelete(id);

    if (candidateAssets.length > 0) {
      await assetService.deleteAssetsIfUnreferenced(candidateAssets);
    }

    webContents.getAllWebContents().forEach(wc => {
      wc.send('collections:updated');
      wc.send('bookmarks:updated');
    });
  }

  public emptyRecycleBin(): number {
    const count = collectionModel.emptyTrash();
    webContents.getAllWebContents().forEach(wc => {
      wc.send('collections:updated');
      wc.send('bookmarks:updated');
    });
    return count;
  }

  public purgeExpiredCollections(days = 15): number {
    const purgedCount = collectionModel.purgeExpiredTrash(days);
    if (purgedCount > 0) {
      webContents.getAllWebContents().forEach(wc => {
        wc.send('collections:updated');
      });
    }
    return purgedCount;
  }

  public getCollectionsForBookmark(bookmarkId: number): Collection[] {
    return collectionModel.getCollectionsForBookmark(bookmarkId);
  }

  public setCollectionsForBookmark(bookmarkId: number, collectionNames: string[]): Collection[] {
    const colIds = collectionNames.map(name => this.getOrCreateCollection(name).id);
    collectionModel.setCollectionsForBookmark(bookmarkId, colIds);
    webContents.getAllWebContents().forEach(wc => {
      wc.send('collections:updated');
    });
    return collectionModel.getCollectionsForBookmark(bookmarkId);
  }

  public bulkAddBookmarksToCollection(collectionId: number, bookmarkIds: number[]): void {
    collectionModel.bulkAddBookmarksToCollection(collectionId, bookmarkIds);
    webContents.getAllWebContents().forEach(wc => {
      wc.send('collections:updated');
      wc.send('bookmarks:updated');
    });
  }
  
  public getBookmarkIdsForCollection(collectionId: number): number[] {
    return collectionModel.getBookmarkIdsForCollection(collectionId);
  }
}

export const collectionService = new CollectionService();
