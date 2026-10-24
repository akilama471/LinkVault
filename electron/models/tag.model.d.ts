import { Tag } from '../../src/types/models';
export declare class TagModel {
    getAll(): Tag[];
    findByName(name: string): Tag | null;
    create(name: string): Tag;
    update(id: number, name: string): void;
    delete(id: number): void;
    findById(id: number): Tag | null;
    getTagsForBookmark(bookmarkId: number): Tag[];
    getBookmarkIdsForTag(tagId: number): number[];
    setTagsForBookmark(bookmarkId: number, tagIds: number[]): void;
    bulkAddTagsToBookmarks(bookmarkIds: number[], tagIds: number[]): void;
    bulkRemoveTagsFromBookmarks(bookmarkIds: number[], tagIds: number[]): void;
}
export declare const tagModel: TagModel;
