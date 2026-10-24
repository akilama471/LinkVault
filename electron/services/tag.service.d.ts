import { Tag } from '../../src/types/models';
export declare class TagService {
    getAllTags(): Tag[];
    getOrCreateTag(name: string): Tag;
    renameTag(id: number, newName: string): Tag;
    deleteTag(id: number): void;
    getTagsForBookmark(bookmarkId: number): Tag[];
    setTagsForBookmark(bookmarkId: number, tagNames: string[]): Tag[];
    bulkAddTagsToBookmarks(bookmarkIds: number[], tagNames: string[]): void;
    bulkRemoveTagsFromBookmarks(bookmarkIds: number[], tagIds: number[]): void;
    getBookmarkIdsForTag(tagId: number): number[];
}
export declare const tagService: TagService;
