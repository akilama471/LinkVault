import { dbManager } from '../database/db';
import { Collection } from '../../src/types/models';

export class CollectionModel {
  public getAll(): Collection[] {
    return dbManager.getDb().prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM bookmark_collections bc
         JOIN bookmarks b ON b.id = bc.bookmark_id
         WHERE bc.collection_id = c.id AND b.deleted_at IS NULL) as bookmark_count
      FROM collections c
      WHERE c.deleted_at IS NULL
      ORDER BY c.name COLLATE NOCASE ASC
    `).all() as Collection[];
  }

  public getDeleted(): Collection[] {
    return dbManager.getDb().prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM bookmark_collections bc
         JOIN bookmarks b ON b.id = bc.bookmark_id
         WHERE bc.collection_id = c.id) as bookmark_count
      FROM collections c
      WHERE c.deleted_at IS NOT NULL
      ORDER BY c.deleted_at DESC
    `).all() as Collection[];
  }

  public findByName(name: string): Collection | null {
    return dbManager.getDb().prepare('SELECT * FROM collections WHERE name = ? COLLATE NOCASE').get(name) as Collection | null;
  }

  public findById(id: number): Collection | null {
    return dbManager.getDb().prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM bookmark_collections bc
         JOIN bookmarks b ON b.id = bc.bookmark_id
         WHERE bc.collection_id = c.id AND b.deleted_at IS NULL) as bookmark_count
      FROM collections c
      WHERE c.id = ?
    `).get(id) as Collection | null;
  }

  public create(name: string, description: string | null = null): Collection {
    const info = dbManager.getDb().prepare('INSERT INTO collections (name, description) VALUES (?, ?)').run(name, description);
    return this.findById(info.lastInsertRowid as number)!;
  }

  public update(id: number, name: string, description: string | null = null): void {
    if (description === undefined || description === null) {
      const existing = this.findById(id);
      const nextDesc = description !== null ? description : (existing?.description ?? null);
      dbManager.getDb().prepare('UPDATE collections SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(name, nextDesc, id);
    } else {
      dbManager.getDb().prepare('UPDATE collections SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(name, description, id);
    }
  }

  /**
   * Soft-deletes a collection (moves it to the Recycle Bin).
   * When deleteBookmarks is true, also moves all bookmarks in the collection to the Recycle Bin.
   */
  public delete(id: number, deleteBookmarks = false): void {
    const db = dbManager.getDb();
    db.transaction(() => {
      if (deleteBookmarks) {
        db.prepare(`
          UPDATE bookmarks
          SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id IN (SELECT bookmark_id FROM bookmark_collections WHERE collection_id = ?)
            AND deleted_at IS NULL
        `).run(id);
      }
      db.prepare(`
        UPDATE collections
        SET deleted_at = CURRENT_TIMESTAMP,
            deleted_with_bookmarks = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(deleteBookmarks ? 1 : 0, id);
    })();
  }

  /**
   * Restores a soft-deleted collection from the Recycle Bin.
   */
  public restore(id: number): Collection | null {
    const db = dbManager.getDb();
    const row = db.prepare('SELECT deleted_with_bookmarks FROM collections WHERE id = ?').get(id) as { deleted_with_bookmarks?: number } | undefined;
    db.transaction(() => {
      if (row?.deleted_with_bookmarks) {
        db.prepare(`
          UPDATE bookmarks
          SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE id IN (SELECT bookmark_id FROM bookmark_collections WHERE collection_id = ?)
        `).run(id);
      }
      db.prepare(`
        UPDATE collections
        SET deleted_at = NULL,
            deleted_with_bookmarks = 0,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(id);
    })();
    return this.findById(id);
  }

  /**
   * Permanently deletes a collection from the database.
   */
  public permanentDelete(id: number): void {
    const db = dbManager.getDb();
    const row = db.prepare('SELECT deleted_with_bookmarks FROM collections WHERE id = ?').get(id) as { deleted_with_bookmarks?: number } | undefined;
    db.transaction(() => {
      if (row?.deleted_with_bookmarks) {
        db.prepare(`
          DELETE FROM bookmarks
          WHERE id IN (SELECT bookmark_id FROM bookmark_collections WHERE collection_id = ?)
            AND deleted_at IS NOT NULL
        `).run(id);
      }
      db.prepare('DELETE FROM collections WHERE id = ?').run(id);
    })();
  }

  /**
   * Permanently deletes all collections currently in the Recycle Bin.
   */
  public emptyTrash(): number {
    const db = dbManager.getDb();
    const info = db.prepare('DELETE FROM collections WHERE deleted_at IS NOT NULL').run();
    return info.changes;
  }

  /**
   * Permanently deletes collections in the Recycle Bin older than the specified number of days (default 15).
   */
  public purgeExpiredTrash(days = 15): number {
    const db = dbManager.getDb();
    const info = db.prepare(`
      DELETE FROM collections
      WHERE deleted_at IS NOT NULL
        AND (julianday('now') - julianday(deleted_at)) >= ?
    `).run(days);
    return info.changes;
  }

  public getCollectionsForBookmark(bookmarkId: number): Collection[] {
    return dbManager.getDb().prepare(`
      SELECT c.* FROM collections c
      JOIN bookmark_collections bc ON c.id = bc.collection_id
      WHERE bc.bookmark_id = ? AND c.deleted_at IS NULL
      ORDER BY c.name COLLATE NOCASE ASC
    `).all(bookmarkId) as Collection[];
  }

  public getBookmarkIdsForCollection(collectionId: number): number[] {
    const rows = dbManager.getDb().prepare(`
      SELECT bc.bookmark_id FROM bookmark_collections bc
      JOIN bookmarks b ON b.id = bc.bookmark_id
      WHERE bc.collection_id = ? AND b.deleted_at IS NULL
    `).all(collectionId) as {bookmark_id: number}[];
    return rows.map(r => r.bookmark_id);
  }

  public setCollectionsForBookmark(bookmarkId: number, collectionIds: number[]): void {
    const db = dbManager.getDb();
    const deleteStmt = db.prepare('DELETE FROM bookmark_collections WHERE bookmark_id = ?');
    const insertStmt = db.prepare('INSERT INTO bookmark_collections (bookmark_id, collection_id) VALUES (?, ?)');
    
    db.transaction(() => {
      deleteStmt.run(bookmarkId);
      for (const colId of collectionIds) {
        insertStmt.run(bookmarkId, colId);
      }
    })();
  }
}

export const collectionModel = new CollectionModel();
