import { useState, useEffect, useCallback } from 'react';
import { Bookmark } from '../types/models';

export function useBookmarks(isAuthenticated = true) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [deletedBookmarks, setDeletedBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookmarks = useCallback(async (query?: string, silent = false) => {
    if (!isAuthenticated) {
      setBookmarks([]);
      setDeletedBookmarks([]);
      setLoading(false);
      return;
    }

    try {
      if (!silent) setLoading(true);
      setError(null);
      
      let result;
      if (query && query.trim().length > 0) {
        // @ts-ignore
        result = await window.electronAPI.bookmarks.search(query);
      } else {
        // @ts-ignore
        result = await window.electronAPI.bookmarks.getAll();
      }

      if (result.success) {
        setBookmarks(result.data);
      } else {
        setError(result.error);
      }

      // @ts-ignore
      const deletedResult = await window.electronAPI.bookmarks.getDeleted();
      if (deletedResult && deletedResult.success) {
        setDeletedBookmarks(deletedResult.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isAuthenticated]);

  const addBookmark = async (url: string) => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.bookmarks.add(url);
      if (result.success) {
        // Optimistically or simply refetch
        await fetchBookmarks();
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const deleteBookmark = async (id: number) => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.bookmarks.delete(id);
      if (result.success) {
        setBookmarks((prev) => prev.filter(b => b.id !== id));
        await fetchBookmarks(undefined, true);
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const restoreBookmark = async (id: number) => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.bookmarks.restore(id);
      if (result.success) {
        setDeletedBookmarks((prev) => prev.filter(b => b.id !== id));
        await fetchBookmarks(undefined, true);
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const permanentDeleteBookmark = async (id: number) => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.bookmarks.permanentDelete(id);
      if (result.success) {
        setDeletedBookmarks((prev) => prev.filter(b => b.id !== id));
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const emptyRecycleBin = async () => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.bookmarks.emptyTrash();
      if (result.success) {
        setDeletedBookmarks([]);
        return { success: true, count: result.count };
      }
      return { success: false, error: result.error };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const updateBookmark = async (id: number, data: Partial<Bookmark>) => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.bookmarks.update(id, data);
      if (result.success) {
        setBookmarks((prev) => prev.map(b => b.id === id ? (result.data || { ...b, ...data }) : b));
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const refetchBookmark = async (id: number) => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.bookmarks.refetch(id);
      if (result.success) {
        if (result.data) {
          setBookmarks((prev) => prev.map(b => b.id === id ? result.data : b));
        }
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const toggleFavorite = (id: number, currentStatus: boolean) => updateBookmark(id, { is_favorite: !currentStatus });
  const toggleImportant = (id: number, currentStatus: boolean) => updateBookmark(id, { is_important: !currentStatus });

  const bulkDeleteBookmarks = async (ids: number[]) => {
    if (!ids.length) return { success: true, count: 0 };
    try {
      // @ts-ignore
      if (window.electronAPI?.bookmarks?.bulkDelete) {
        // @ts-ignore
        const result = await window.electronAPI.bookmarks.bulkDelete(ids);
        if (result.success) {
          setBookmarks((prev) => prev.filter(b => !ids.includes(b.id)));
          await fetchBookmarks(undefined, true);
          return { success: true, count: result.count ?? ids.length };
        }
        return { success: false, error: result.error };
      } else {
        // Fallback for non-electron or legacy
        for (const id of ids) {
          // @ts-ignore
          await window.electronAPI?.bookmarks?.delete(id);
        }
        setBookmarks((prev) => prev.filter(b => !ids.includes(b.id)));
        await fetchBookmarks(undefined, true);
        return { success: true, count: ids.length };
      }
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const bulkUpdateBookmarks = async (ids: number[], data: Partial<Bookmark>) => {
    if (!ids.length) return { success: true, count: 0 };
    try {
      // @ts-ignore
      if (window.electronAPI?.bookmarks?.bulkUpdate) {
        // @ts-ignore
        const result = await window.electronAPI.bookmarks.bulkUpdate(ids, data);
        if (result.success) {
          setBookmarks((prev) => prev.map(b => ids.includes(b.id) ? { ...b, ...data } : b));
          await fetchBookmarks(undefined, true);
          return { success: true, count: result.count ?? ids.length };
        }
        return { success: false, error: result.error };
      } else {
        // Fallback
        for (const id of ids) {
          // @ts-ignore
          await window.electronAPI?.bookmarks?.update(id, data);
        }
        setBookmarks((prev) => prev.map(b => ids.includes(b.id) ? { ...b, ...data } : b));
        await fetchBookmarks(undefined, true);
        return { success: true, count: ids.length };
      }
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const bulkAddTags = async (bookmarkIds: number[], tagNames: string[]) => {
    if (!bookmarkIds.length || !tagNames.length) return { success: true };
    try {
      // @ts-ignore
      if (window.electronAPI?.tags?.bulkAdd) {
        // @ts-ignore
        const result = await window.electronAPI.tags.bulkAdd(bookmarkIds, tagNames);
        return result;
      }
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const bulkRemoveTags = async (bookmarkIds: number[], tagIds: number[]) => {
    if (!bookmarkIds.length || !tagIds.length) return { success: true };
    try {
      // @ts-ignore
      if (window.electronAPI?.tags?.bulkRemove) {
        // @ts-ignore
        const result = await window.electronAPI.tags.bulkRemove(bookmarkIds, tagIds);
        return result;
      }
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const bulkAddToCollection = async (collectionId: number, bookmarkIds: number[]) => {
    if (!bookmarkIds.length) return { success: true };
    try {
      // @ts-ignore
      if (window.electronAPI?.collections?.bulkAdd) {
        // @ts-ignore
        const result = await window.electronAPI.collections.bulkAdd(collectionId, bookmarkIds);
        return result;
      }
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setBookmarks([]);
      setDeletedBookmarks([]);
      setLoading(false);
      return;
    }

    fetchBookmarks();
    
    // @ts-ignore
    const unsubscribe = window.electronAPI.events?.onBookmarksUpdated(() => {
      fetchBookmarks(undefined, true);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [fetchBookmarks, isAuthenticated]);

  return {
    bookmarks,
    deletedBookmarks,
    loading,
    error,
    addBookmark,
    deleteBookmark,
    restoreBookmark,
    permanentDeleteBookmark,
    emptyRecycleBin,
    updateBookmark,
    refetchBookmark,
    toggleFavorite,
    toggleImportant,
    bulkDeleteBookmarks,
    bulkUpdateBookmarks,
    bulkAddTags,
    bulkRemoveTags,
    bulkAddToCollection,
    refresh: fetchBookmarks
  };
}
