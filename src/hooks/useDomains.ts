import { useState, useEffect, useCallback } from 'react';
import { Domain } from '../types/models';

export function useDomains() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDomains = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // @ts-ignore
      const result = await window.electronAPI.domains.getAll();
      if (result.success) {
        setDomains(result.data);
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetchDomain = async (id: number) => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.domains.refetch(id);
      if (result.success) {
        await fetchDomains();
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const renameDomain = async (id: number, newName: string) => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.domains.rename(id, newName);
      if (result.success) {
        await fetchDomains();
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const deleteDomain = async (id: number, deleteBookmarks: boolean) => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.domains.delete(id, deleteBookmarks);
      if (result.success) {
        await fetchDomains();
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    fetchDomains();

    // @ts-ignore
    const unsubscribe = window.electronAPI.events?.onDomainsUpdated?.(() => {
      fetchDomains();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [fetchDomains]);

  return {
    domains,
    loading,
    error,
    refresh: fetchDomains,
    refetchDomain,
    renameDomain,
    deleteDomain
  };
}
