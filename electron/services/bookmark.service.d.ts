import { Bookmark } from '../../src/types/models';
import { UpdateBookmarkDTO } from '../models/bookmark.model';
export declare class BookmarkService {
    /**
     * Adds a new bookmark immediately with pending enrichment and delegates
     * metadata scraping and asset downloads to the background enrichment job.
     */
    addBookmark(url: string): Promise<Bookmark>;
    /**
     * Refetches metadata and preview images for an existing bookmark from the internet.
     */
    refetchBookmark(id: number): Promise<Bookmark>;
    getAllBookmarks(): Bookmark[];
    getDeletedBookmarks(): Bookmark[];
    searchBookmarks(query: string): Bookmark[];
    updateBookmark(id: number, data: UpdateBookmarkDTO): Bookmark;
    /**
     * Soft-deletes a bookmark by moving it to the Recycle Bin.
     */
    deleteBookmark(id: number): void;
    /**
     * Restores a bookmark from the Recycle Bin.
     */
    restoreBookmark(id: number): Bookmark | null;
    /**
     * Permanently deletes a single bookmark from the database and prunes unreferenced assets.
     */
    permanentDeleteBookmark(id: number): Promise<void>;
    /**
     * Permanently deletes all bookmarks in the Recycle Bin and prunes unreferenced assets.
     */
    emptyRecycleBin(): Promise<number>;
    /**
     * Permanently deletes bookmarks that have been in the Recycle Bin for 15 days or more,
     * pruning their unreferenced assets from disk.
     */
    purgeExpiredBookmarks(days?: number): Promise<number>;
}
export declare const bookmarkService: BookmarkService;
