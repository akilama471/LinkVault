import { dbManager } from '../database/db';
import { Bookmark } from '../../src/types/models';
import { sanitizeFtsQuery } from '../utils/search.utils';

export interface CreateBookmarkDTO {
  url: string;
  title: string | null;
  description: string | null;
  domain_id: number | null;
  thumbnail_path: string | null;
  preview_path: string | null;
}

export interface UpdateBookmarkDTO {
  title?: string | null;
  description?: string | null;
  is_favorite?: boolean;
  is_important?: boolean;
  notes?: string | null;
  domain_id?: number | null;
  thumbnail_path?: string | null;
  preview_path?: string | null;
  deleted_at?: string | null;
  hide_mode?: number;
}

export class BookmarkModel {
  public findById(id: number): Bookmark | null {
    const db = dbManager.getDb();
    const stmt = db.prepare('SELECT * FROM bookmarks WHERE id = ?');
    const row = stmt.get(id);
    if (!row) return null;
    return this.mapRow(row);
  }

  public findByUrl(url: string): Bookmark | null {
    const db = dbManager.getDb();
    const stmt = db.prepare('SELECT * FROM bookmarks WHERE url = ?');
    const row = stmt.get(url);
    if (!row) return null;
    return this.mapRow(row);
  }

  public create(data: CreateBookmarkDTO): Bookmark {
    const db = dbManager.getDb();
    const stmt = db.prepare(`
      INSERT INTO bookmarks (url, title, description, domain_id, thumbnail_path, preview_path)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      data.url,
      data.title,
      data.description,
      data.domain_id,
      data.thumbnail_path,
      data.preview_path
    );
    return this.findById(info.lastInsertRowid as number)!;
  }

  public update(id: number, data: UpdateBookmarkDTO): Bookmark {
    const db = dbManager.getDb();
    
    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    
    if (data.title !== undefined) { updates.push('title = ?'); values.push(data.title); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
    if (data.is_favorite !== undefined) { updates.push('is_favorite = ?'); values.push(data.is_favorite ? 1 : 0); }
    if (data.is_important !== undefined) { updates.push('is_important = ?'); values.push(data.is_important ? 1 : 0); }
    if (data.notes !== undefined) { updates.push('notes = ?'); values.push(data.notes); }
    if (data.domain_id !== undefined) { updates.push('domain_id = ?'); values.push(data.domain_id); }
    if (data.thumbnail_path !== undefined) { updates.push('thumbnail_path = ?'); values.push(data.thumbnail_path); }
    if (data.preview_path !== undefined) { updates.push('preview_path = ?'); values.push(data.preview_path); }
    if (data.deleted_at !== undefined) { updates.push('deleted_at = ?'); values.push(data.deleted_at); }
    if (data.hide_mode !== undefined) { updates.push('hide_mode = ?'); values.push(data.hide_mode); }
    
    if (updates.length === 0) return this.findById(id)!;

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const sql = `UPDATE bookmarks SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...values);

    return this.findById(id)!;
  }

  /**
   * Moves a bookmark to the Recycle Bin (soft delete).
   */
  public delete(id: number): void {
    const db = dbManager.getDb();
    db.prepare('UPDATE bookmarks SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  }

  /**
   * Restores a bookmark from the Recycle Bin.
   */
  public restore(id: number): Bookmark | null {
    const db = dbManager.getDb();
    db.prepare('UPDATE bookmarks SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
    return this.findById(id);
  }

  /**
   * Permanently deletes a bookmark from the database.
   */
  public permanentDelete(id: number): void {
    const db = dbManager.getDb();
    db.prepare('DELETE FROM bookmarks WHERE id = ?').run(id);
  }

  /**
   * Permanently deletes all bookmarks currently in the Recycle Bin.
   */
  public emptyTrash(): number {
    const db = dbManager.getDb();
    const info = db.prepare('DELETE FROM bookmarks WHERE deleted_at IS NOT NULL').run();
    return info.changes;
  }

  /**
   * Permanently deletes bookmarks in the Recycle Bin older than the specified number of days (default 15).
   */
  public purgeExpiredTrash(days = 15): number {
    const db = dbManager.getDb();
    const info = db.prepare(`
      DELETE FROM bookmarks
      WHERE deleted_at IS NOT NULL
        AND (julianday('now') - julianday(deleted_at)) >= ?
    `).run(days);
    return info.changes;
  }

  public getAll(): Bookmark[] {
    const db = dbManager.getDb();
    const rows = db.prepare('SELECT * FROM bookmarks WHERE deleted_at IS NULL ORDER BY created_at DESC').all();
    return rows.map((row: any) => this.mapRow(row));
  }

  public getDeleted(): Bookmark[] {
    const db = dbManager.getDb();
    const rows = db.prepare('SELECT * FROM bookmarks WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC').all();
    return rows.map((row: any) => this.mapRow(row));
  }

  public search(query: string): Bookmark[] {
    const trimmed = query ? query.trim() : '';
    if (!trimmed) {
      return [];
    }

    const ftsQuery = sanitizeFtsQuery(trimmed);
    if (!ftsQuery) {
      return [];
    }

    const db = dbManager.getDb();
    try {
      const rows = db.prepare(`
        SELECT b.* FROM bookmarks b
        JOIN bookmarks_fts fts ON b.id = fts.rowid
        WHERE bookmarks_fts MATCH ? AND b.deleted_at IS NULL
        ORDER BY rank
      `).all(ftsQuery);
      return rows.map((row: any) => this.mapRow(row));
    } catch (error) {
      console.warn('FTS5 search failed, falling back to LIKE query:', error);
      return this.fallbackSearch(trimmed);
    }
  }

  /**
   * Resilient fallback query using LIKE across bookmarks, tags, and domains
   * if FTS5 encounters any unexpected parsing/matching errors.
   */
  public fallbackSearch(query: string): Bookmark[] {
    const db = dbManager.getDb();
    const likeTerm = `%${query.replace(/[%_\\]/g, '\\$&')}%`;
    const rows = db.prepare(`
      SELECT DISTINCT b.* FROM bookmarks b
      LEFT JOIN domains d ON b.domain_id = d.id
      LEFT JOIN bookmark_tags bt ON b.id = bt.bookmark_id
      LEFT JOIN tags t ON bt.tag_id = t.id
      WHERE b.deleted_at IS NULL AND (
        b.title LIKE ? ESCAPE '\\' OR
        b.url LIKE ? ESCAPE '\\' OR
        b.description LIKE ? ESCAPE '\\' OR
        b.notes LIKE ? ESCAPE '\\' OR
        d.domain LIKE ? ESCAPE '\\' OR
        d.display_name LIKE ? ESCAPE '\\' OR
        t.name LIKE ? ESCAPE '\\'
      )
      ORDER BY b.created_at DESC
    `).all(likeTerm, likeTerm, likeTerm, likeTerm, likeTerm, likeTerm, likeTerm);
    return rows.map((row: any) => this.mapRow(row));
  }

  /**
   * Fully rebuilds the bookmarks_fts virtual table from active database records.
   */
  public rebuildFts(): void {
    const db = dbManager.getDb();
    db.transaction(() => {
      db.prepare('DELETE FROM bookmarks_fts').run();
      db.prepare(`
        INSERT INTO bookmarks_fts(rowid, title, url, description, notes, tags, domain)
        SELECT 
          b.id, b.title, b.url, b.description, b.notes,
          (SELECT GROUP_CONCAT(t.name, ' ') FROM bookmark_tags bt JOIN tags t ON bt.tag_id = t.id WHERE bt.bookmark_id = b.id),
          (SELECT d.domain || ' ' || COALESCE(d.display_name, '') FROM domains d WHERE d.id = b.domain_id)
        FROM bookmarks b
      `).run();
    })();
  }

  /**
   * Manually syncs an individual bookmark record into bookmarks_fts.
   */
  public syncBookmarkFts(bookmarkId: number): void {
    const db = dbManager.getDb();
    db.transaction(() => {
      db.prepare('DELETE FROM bookmarks_fts WHERE rowid = ?').run(bookmarkId);
      db.prepare(`
        INSERT INTO bookmarks_fts(rowid, title, url, description, notes, tags, domain)
        SELECT 
          b.id, b.title, b.url, b.description, b.notes,
          (SELECT GROUP_CONCAT(t.name, ' ') FROM bookmark_tags bt JOIN tags t ON bt.tag_id = t.id WHERE bt.bookmark_id = b.id),
          (SELECT d.domain || ' ' || COALESCE(d.display_name, '') FROM domains d WHERE d.id = b.domain_id)
        FROM bookmarks b WHERE b.id = ?
      `).run(bookmarkId);
    })();
  }

  private mapRow(row: any): Bookmark {
    return {
      ...row,
      is_favorite: Boolean(row.is_favorite),
      is_important: Boolean(row.is_important),
      hide_mode: row.hide_mode ?? 0,
    };
  }
}

export const bookmarkModel = new BookmarkModel();
