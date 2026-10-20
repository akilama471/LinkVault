import { useState, useEffect, useCallback } from 'react';
import { Tag } from '../types/models';

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // @ts-ignore
      const result = await window.electronAPI.tags.getAll();
      if (result.success) {
        setTags(result.data);
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTag = async (name: string): Promise<{ success: boolean; data?: Tag; error?: string }> => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.tags.create(name);
      if (result.success) {
        await fetchTags();
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const renameTag = async (id: number, newName: string): Promise<{ success: boolean; data?: Tag; error?: string }> => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.tags.rename(id, newName);
      if (result.success) {
        await fetchTags();
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const deleteTag = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.tags.delete(id);
      if (result.success) {
        await fetchTags();
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const getBookmarkIds = async (tagId: number): Promise<number[]> => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.tags.getBookmarkIds(tagId);
      if (result.success) {
        return result.data;
      }
      return [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  useEffect(() => {
    fetchTags();

    // @ts-ignore
    const unsubTags = window.electronAPI?.events?.onTagsUpdated?.(() => {
      fetchTags();
    });
    // @ts-ignore
    const unsubBookmarks = window.electronAPI?.events?.onBookmarksUpdated?.(() => {
      fetchTags();
    });

    return () => {
      if (unsubTags) unsubTags();
      if (unsubBookmarks) unsubBookmarks();
    };
  }, [fetchTags]);

  return {
    tags,
    loading,
    error,
    createTag,
    renameTag,
    deleteTag,
    getBookmarkIds,
    refresh: fetchTags
  };
}
