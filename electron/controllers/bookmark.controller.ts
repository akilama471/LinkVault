import { bookmarkService } from '../services/bookmark.service';
import { UpdateBookmarkDTO } from '../models/bookmark.model';
import { registerSecureHandler } from '../utils/ipc.guard';

export function registerBookmarkController() {
  registerSecureHandler('bookmarks:add', async (_event, url: string) => {
    const bookmark = await bookmarkService.addBookmark(url);
    return { success: true, data: bookmark };
  });

  registerSecureHandler('bookmarks:getAll', () => {
    const bookmarks = bookmarkService.getAllBookmarks();
    return { success: true, data: bookmarks };
  });

  registerSecureHandler('bookmarks:search', (_event, query: string) => {
    const bookmarks = bookmarkService.searchBookmarks(query);
    return { success: true, data: bookmarks };
  });

  registerSecureHandler('bookmarks:update', (_event, id: number, data: UpdateBookmarkDTO) => {
    const bookmark = bookmarkService.updateBookmark(id, data);
    return { success: true, data: bookmark };
  });

  registerSecureHandler('bookmarks:refetch', async (_event, id: number) => {
    const bookmark = await bookmarkService.refetchBookmark(id);
    return { success: true, data: bookmark };
  });

  registerSecureHandler('bookmarks:delete', (_event, id: number) => {
    bookmarkService.deleteBookmark(id);
    return { success: true };
  });

  registerSecureHandler('bookmarks:bulkDelete', (_event, ids: number[]) => {
    const count = bookmarkService.bulkDeleteBookmarks(ids);
    return { success: true, count };
  });

  registerSecureHandler('bookmarks:bulkUpdate', (_event, ids: number[], data: UpdateBookmarkDTO) => {
    const count = bookmarkService.bulkUpdateBookmarks(ids, data);
    return { success: true, count };
  });

  registerSecureHandler('bookmarks:getDeleted', () => {
    const bookmarks = bookmarkService.getDeletedBookmarks();
    return { success: true, data: bookmarks };
  });

  registerSecureHandler('bookmarks:restore', (_event, id: number) => {
    const bookmark = bookmarkService.restoreBookmark(id);
    return { success: true, data: bookmark };
  });

  registerSecureHandler('bookmarks:permanentDelete', async (_event, id: number) => {
    await bookmarkService.permanentDeleteBookmark(id);
    return { success: true };
  });

  registerSecureHandler('bookmarks:emptyTrash', async () => {
    const count = await bookmarkService.emptyRecycleBin();
    return { success: true, count };
  });
}
