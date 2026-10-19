import { Collection } from '../../src/types/models';
export declare class CollectionService {
    getAllCollections(): Collection[];
    getDeletedCollections(): Collection[];
    getOrCreateCollection(name: string, description?: string | null): Collection;
    renameCollection(id: number, newName: string, description?: string | null): Collection;
    /**
     * Refetches metadata and preview images for all bookmarks in the collection.
     */
    refetchCollection(id: number): Promise<Collection>;
    /**
     * Soft-deletes a collection (moves to Recycle Bin).
     * When deleteBookmarks is true, also moves all bookmarks in the collection to the Recycle Bin.
     */
    deleteCollection(id: number, deleteBookmarks?: boolean): void;
    restoreCollection(id: number): Collection | null;
    permanentDeleteCollection(id: number): void;
    emptyRecycleBin(): number;
    purgeExpiredCollections(days?: number): number;
    getCollectionsForBookmark(bookmarkId: number): Collection[];
    setCollectionsForBookmark(bookmarkId: number, collectionNames: string[]): Collection[];
    getBookmarkIdsForCollection(collectionId: number): number[];
}
export declare const collectionService: CollectionService;
