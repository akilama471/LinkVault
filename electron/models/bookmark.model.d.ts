import { Bookmark } from '../../src/types/models';
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
export declare class BookmarkModel {
    findById(id: number): Bookmark | null;
    findByUrl(url: string): Bookmark | null;
    create(data: CreateBookmarkDTO): Bookmark;
    update(id: number, data: UpdateBookmarkDTO): Bookmark;
    /**
     * Moves a bookmark to the Recycle Bin (soft delete).
     */
    delete(id: number): void;
    /**
     * Moves multiple bookmarks to the Recycle Bin (soft delete).
     */
    bulkDelete(ids: number[]): number;
    /**
     * Updates multiple bookmarks in a single query.
     */
    bulkUpdate(ids: number[], data: UpdateBookmarkDTO): number;
    /**
     * Restores a bookmark from the Recycle Bin.
     */
    restore(id: number): Bookmark | null;
    /**
     * Permanently deletes a bookmark from the database.
     */
    permanentDelete(id: number): void;
    /**
     * Permanently deletes all bookmarks currently in the Recycle Bin.
     */
    emptyTrash(): number;
    /**
     * Permanently deletes bookmarks in the Recycle Bin older than the specified number of days (default 15).
     */
    purgeExpiredTrash(days?: number): number;
    getAll(): Bookmark[];
    getDeleted(): Bookmark[];
    search(query: string): Bookmark[];
    /**
     * Resilient fallback query using LIKE across bookmarks, tags, and domains
     * if FTS5 encounters any unexpected parsing/matching errors.
     */
    fallbackSearch(query: string): Bookmark[];
    /**
     * Fully rebuilds the bookmarks_fts virtual table from active database records.
     */
    rebuildFts(): void;
    /**
     * Manually syncs an individual bookmark record into bookmarks_fts.
     */
    syncBookmarkFts(bookmarkId: number): void;
    private mapRow;
}
export declare const bookmarkModel: BookmarkModel;
