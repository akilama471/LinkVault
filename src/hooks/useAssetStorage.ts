import { useState, useEffect, useCallback } from 'react';
import { AssetStorageStats, VacuumResult } from '../types/models';

export function useAssetStorage() {
  const [stats, setStats] = useState<AssetStorageStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [vacuuming, setVacuuming] = useState<boolean>(false);
  const [vacuumResult, setVacuumResult] = useState<VacuumResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // @ts-ignore
      const result = await window.electronAPI.assets.getStorageStats();
      if (result.success) {
        setStats(result.data);
      } else {
        setError(result.error || 'Failed to scan asset storage.');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while scanning asset storage.');
    } finally {
      setLoading(false);
    }
  }, []);

  const runVacuum = useCallback(async () => {
    try {
      setVacuuming(true);
      setError(null);
      setVacuumResult(null);
      // @ts-ignore
      const result = await window.electronAPI.assets.vacuum();
      if (result.success) {
        setVacuumResult(result.data);
        await fetchStats();
        return result.data as VacuumResult;
      } else {
        setError(result.error || 'Failed to vacuum orphan assets.');
        return null;
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred during asset vacuum.');
      return null;
    } finally {
      setVacuuming(false);
    }
  }, [fetchStats]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    vacuuming,
    vacuumResult,
    error,
    scanStorage: fetchStats,
    runVacuum,
    clearResult: () => setVacuumResult(null),
  };
}
