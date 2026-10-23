import { ipcMain } from 'electron';
import { collectionService } from '../services/collection.service';
import { passwordService } from '../services/password.service';

export function registerCollectionController() {
  ipcMain.handle('collections:getAll', async () => {
    try {
      passwordService.checkAuth();
      const cols = collectionService.getAllCollections();
      return { success: true, data: cols };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('collections:getDeleted', async () => {
    try {
      passwordService.checkAuth();
      const cols = collectionService.getDeletedCollections();
      return { success: true, data: cols };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('collections:create', async (event, name: string, description: string | null) => {
    try {
      passwordService.checkAuth();
      const col = collectionService.getOrCreateCollection(name, description);
      return { success: true, data: col };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('collections:rename', async (event, id: number, newName: string, description: string | null) => {
    try {
      passwordService.checkAuth();
      const col = collectionService.renameCollection(id, newName, description);
      return { success: true, data: col };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('collections:refetch', async (event, id: number) => {
    try {
      passwordService.checkAuth();
      const col = await collectionService.refetchCollection(id);
      return { success: true, data: col };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('collections:delete', async (event, id: number, deleteBookmarks = false) => {
    try {
      passwordService.checkAuth();
      collectionService.deleteCollection(id, Boolean(deleteBookmarks));
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('collections:restore', async (event, id: number) => {
    try {
      passwordService.checkAuth();
      const col = collectionService.restoreCollection(id);
      return { success: true, data: col };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('collections:permanentDelete', async (event, id: number) => {
    try {
      passwordService.checkAuth();
      await collectionService.permanentDeleteCollection(id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('collections:emptyTrash', async () => {
    try {
      passwordService.checkAuth();
      const count = collectionService.emptyRecycleBin();
      return { success: true, count };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('collections:getForBookmark', async (event, bookmarkId: number) => {
    try {
      passwordService.checkAuth();
      const cols = collectionService.getCollectionsForBookmark(bookmarkId);
      return { success: true, data: cols };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('collections:setForBookmark', async (event, bookmarkId: number, colNames: string[]) => {
    try {
      passwordService.checkAuth();
      const cols = collectionService.setCollectionsForBookmark(bookmarkId, colNames);
      return { success: true, data: cols };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('collections:getBookmarkIds', async (event, collectionId: number) => {
    try {
      passwordService.checkAuth();
      const ids = collectionService.getBookmarkIdsForCollection(collectionId);
      return { success: true, data: ids };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
