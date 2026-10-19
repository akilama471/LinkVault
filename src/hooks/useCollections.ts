import { useState, useEffect, useCallback } from 'react';
import { Collection } from '../types/models';

export function useCollections(isAuthenticated = true) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [deletedCollections, setDeletedCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = useCallback(async (silent = false) => {
    if (!isAuthenticated) {
      setCollections([]);
      setDeletedCollections([]);
      setLoading(false);
      return;
    }

    try {
      if (!silent) setLoading(true);
      setError(null);
      // @ts-ignore
      const result = await window.electronAPI.collections.getAll();
      if (result.success) {
        setCollections(result.data);
      } else {
        setError(result.error);
      }

      // @ts-ignore
      const deletedResult = await window.electronAPI.collections.getDeleted?.();
      if (deletedResult && deletedResult.success) {
        setDeletedCollections(deletedResult.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isAuthenticated]);

  const createCollection = async (name: string, description?: string) => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.collections.create(name, description);
      if (result.success) {
        await fetchCollections(true);
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const renameCollection = async (id: number, newName: string, description?: string) => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.collections.rename(id, newName, description);
      if (result.success) {
        setCollections(prev => prev.map(c => c.id === id ? (result.data || { ...c, name: newName }) : c));
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const refetchCollection = async (id: number) => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.collections.refetch(id);
      if (result.success) {
        if (result.data) {
          setCollections(prev => prev.map(c => c.id === id ? result.data : c));
        }
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const deleteCollection = async (id: number, deleteBookmarks = false) => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.collections.delete(id, deleteBookmarks);
      if (result.success) {
        setCollections(prev => prev.filter(c => c.id !== id));
        await fetchCollections(true);
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const restoreCollection = async (id: number) => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.collections.restore(id);
      if (result.success) {
        setDeletedCollections(prev => prev.filter(c => c.id !== id));
        await fetchCollections(true);
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const permanentDeleteCollection = async (id: number) => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.collections.permanentDelete(id);
      if (result.success) {
        setDeletedCollections(prev => prev.filter(c => c.id !== id));
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const emptyCollectionTrash = async () => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.collections.emptyTrash();
      if (result.success) {
        setDeletedCollections([]);
        return { success: true, count: result.count };
      }
      return { success: false, error: result.error };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const getBookmarkIds = async (collectionId: number): Promise<number[]> => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.collections.getBookmarkIds(collectionId);
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
    fetchCollections();

    // @ts-ignore
    const unsubCols = window.electronAPI.events?.onCollectionsUpdated?.(() => {
      fetchCollections(true);
    });
    // @ts-ignore
    const unsubBookmarks = window.electronAPI.events?.onBookmarksUpdated?.(() => {
      fetchCollections(true);
    });

    return () => {
      if (unsubCols) unsubCols();
      if (unsubBookmarks) unsubBookmarks();
    };
  }, [fetchCollections]);

  return {
    collections,
    deletedCollections,
    loading,
    error,
    createCollection,
    renameCollection,
    refetchCollection,
    deleteCollection,
    restoreCollection,
    permanentDeleteCollection,
    emptyCollectionTrash,
    getBookmarkIds,
    refresh: fetchCollections
  };
}
