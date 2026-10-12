import { useState, useEffect, useCallback } from 'react';
import { Bookmark } from '../types/models';

export function useBookmarks(isAuthenticated = true) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookmarks = useCallback(async (query?: string, silent = false) => {
    if (!isAuthenticated) {
      setBookmarks([]);
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateBookmark = async (id: number, data: Partial<Bookmark>) => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.bookmarks.update(id, data);
      if (result.success) {
        setBookmarks((prev) => prev.map(b => b.id === id ? { ...b, ...data } : b));
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const toggleFavorite = (id: number, currentStatus: boolean) => updateBookmark(id, { is_favorite: !currentStatus });
  const toggleImportant = (id: number, currentStatus: boolean) => updateBookmark(id, { is_important: !currentStatus });

  useEffect(() => {
    if (!isAuthenticated) {
      setBookmarks([]);
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
    loading,
    error,
    addBookmark,
    deleteBookmark,
    updateBookmark,
    toggleFavorite,
    toggleImportant,
    refresh: fetchBookmarks
  };
}
