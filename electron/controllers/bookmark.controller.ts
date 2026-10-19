import { ipcMain } from 'electron';
import { bookmarkService } from '../services/bookmark.service';
import { UpdateBookmarkDTO } from '../models/bookmark.model';
import { passwordService } from '../services/password.service';

export function registerBookmarkController() {
  ipcMain.handle('bookmarks:add', async (event, url: string) => {
    try {
      passwordService.checkAuth();
      const bookmark = await bookmarkService.addBookmark(url);
      return { success: true, data: bookmark };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('bookmarks:getAll', async () => {
    try {
      passwordService.checkAuth();
      const bookmarks = bookmarkService.getAllBookmarks();
      return { success: true, data: bookmarks };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('bookmarks:search', async (event, query: string) => {
    try {
      passwordService.checkAuth();
      const bookmarks = bookmarkService.searchBookmarks(query);
      return { success: true, data: bookmarks };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('bookmarks:update', async (event, id: number, data: UpdateBookmarkDTO) => {
    try {
      passwordService.checkAuth();
      const bookmark = bookmarkService.updateBookmark(id, data);
      return { success: true, data: bookmark };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('bookmarks:refetch', async (event, id: number) => {
    try {
      passwordService.checkAuth();
      const bookmark = await bookmarkService.refetchBookmark(id);
      return { success: true, data: bookmark };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('bookmarks:delete', async (event, id: number) => {
    try {
      passwordService.checkAuth();
      bookmarkService.deleteBookmark(id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('bookmarks:getDeleted', async () => {
    try {
      passwordService.checkAuth();
      const bookmarks = bookmarkService.getDeletedBookmarks();
      return { success: true, data: bookmarks };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('bookmarks:restore', async (event, id: number) => {
    try {
      passwordService.checkAuth();
      const bookmark = bookmarkService.restoreBookmark(id);
      return { success: true, data: bookmark };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('bookmarks:permanentDelete', async (event, id: number) => {
    try {
      passwordService.checkAuth();
      bookmarkService.permanentDeleteBookmark(id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('bookmarks:emptyTrash', async () => {
    try {
      passwordService.checkAuth();
      const count = bookmarkService.emptyRecycleBin();
      return { success: true, count };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
