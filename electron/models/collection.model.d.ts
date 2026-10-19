import { Collection } from '../../src/types/models';
export declare class CollectionModel {
    getAll(): Collection[];
    getDeleted(): Collection[];
    findByName(name: string): Collection | null;
    findById(id: number): Collection | null;
    create(name: string, description?: string | null): Collection;
    update(id: number, name: string, description?: string | null): void;
    /**
     * Soft-deletes a collection (moves it to the Recycle Bin).
     * When deleteBookmarks is true, also moves all bookmarks in the collection to the Recycle Bin.
     */
    delete(id: number, deleteBookmarks?: boolean): void;
    /**
     * Restores a soft-deleted collection from the Recycle Bin.
     */
    restore(id: number): Collection | null;
    /**
     * Permanently deletes a collection from the database.
     */
    permanentDelete(id: number): void;
    /**
     * Permanently deletes all collections currently in the Recycle Bin.
     */
    emptyTrash(): number;
    /**
     * Permanently deletes collections in the Recycle Bin older than the specified number of days (default 15).
     */
    purgeExpiredTrash(days?: number): number;
    getCollectionsForBookmark(bookmarkId: number): Collection[];
    getBookmarkIdsForCollection(collectionId: number): number[];
    setCollectionsForBookmark(bookmarkId: number, collectionIds: number[]): void;
}
export declare const collectionModel: CollectionModel;
