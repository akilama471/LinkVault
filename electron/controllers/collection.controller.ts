import { collectionService } from '../services/collection.service';
import { registerSecureHandler } from '../utils/ipc.guard';

export function registerCollectionController() {
  registerSecureHandler('collections:getAll', () => {
    const cols = collectionService.getAllCollections();
    return { success: true, data: cols };
  });

  registerSecureHandler('collections:getDeleted', () => {
    const cols = collectionService.getDeletedCollections();
    return { success: true, data: cols };
  });

  registerSecureHandler('collections:create', (_event, name: string, description: string | null) => {
    const col = collectionService.getOrCreateCollection(name, description);
    return { success: true, data: col };
  });

  registerSecureHandler('collections:rename', (_event, id: number, newName: string, description: string | null) => {
    const col = collectionService.renameCollection(id, newName, description);
    return { success: true, data: col };
  });

  registerSecureHandler('collections:refetch', async (_event, id: number) => {
    const col = await collectionService.refetchCollection(id);
    return { success: true, data: col };
  });

  registerSecureHandler('collections:delete', (_event, id: number, deleteBookmarks = false) => {
    collectionService.deleteCollection(id, Boolean(deleteBookmarks));
    return { success: true };
  });

  registerSecureHandler('collections:restore', (_event, id: number) => {
    const col = collectionService.restoreCollection(id);
    return { success: true, data: col };
  });

  registerSecureHandler('collections:permanentDelete', async (_event, id: number) => {
    await collectionService.permanentDeleteCollection(id);
    return { success: true };
  });

  registerSecureHandler('collections:emptyTrash', () => {
    const count = collectionService.emptyRecycleBin();
    return { success: true, count };
  });

  registerSecureHandler('collections:getForBookmark', (_event, bookmarkId: number) => {
    const cols = collectionService.getCollectionsForBookmark(bookmarkId);
    return { success: true, data: cols };
  });

  registerSecureHandler('collections:setForBookmark', (_event, bookmarkId: number, colNames: string[]) => {
    const cols = collectionService.setCollectionsForBookmark(bookmarkId, colNames);
    return { success: true, data: cols };
  });

  registerSecureHandler('collections:bulkAdd', (_event, collectionId: number, bookmarkIds: number[]) => {
    collectionService.bulkAddBookmarksToCollection(collectionId, bookmarkIds);
    return { success: true };
  });

  registerSecureHandler('collections:getBookmarkIds', (_event, collectionId: number) => {
    const ids = collectionService.getBookmarkIdsForCollection(collectionId);
    return { success: true, data: ids };
  });
}
