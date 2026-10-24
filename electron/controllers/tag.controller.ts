import { tagService } from '../services/tag.service';
import { registerSecureHandler } from '../utils/ipc.guard';

export function registerTagController() {
  registerSecureHandler('tags:getAll', () => {
    const tags = tagService.getAllTags();
    return { success: true, data: tags };
  });

  registerSecureHandler('tags:create', (_event, name: string) => {
    const tag = tagService.getOrCreateTag(name);
    return { success: true, data: tag };
  });

  registerSecureHandler('tags:rename', (_event, id: number, newName: string) => {
    const tag = tagService.renameTag(id, newName);
    return { success: true, data: tag };
  });

  registerSecureHandler('tags:delete', (_event, id: number) => {
    tagService.deleteTag(id);
    return { success: true };
  });

  registerSecureHandler('tags:getForBookmark', (_event, bookmarkId: number) => {
    const tags = tagService.getTagsForBookmark(bookmarkId);
    return { success: true, data: tags };
  });

  registerSecureHandler('tags:setForBookmark', (_event, bookmarkId: number, tagNames: string[]) => {
    const tags = tagService.setTagsForBookmark(bookmarkId, tagNames);
    return { success: true, data: tags };
  });

  registerSecureHandler('tags:bulkAdd', (_event, bookmarkIds: number[], tagNames: string[]) => {
    tagService.bulkAddTagsToBookmarks(bookmarkIds, tagNames);
    return { success: true };
  });

  registerSecureHandler('tags:bulkRemove', (_event, bookmarkIds: number[], tagIds: number[]) => {
    tagService.bulkRemoveTagsFromBookmarks(bookmarkIds, tagIds);
    return { success: true };
  });

  registerSecureHandler('tags:getBookmarkIds', (_event, tagId: number) => {
    const ids = tagService.getBookmarkIdsForTag(tagId);
    return { success: true, data: ids };
  });
}
