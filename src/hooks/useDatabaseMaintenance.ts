import { useState, useEffect, useCallback } from 'react';
import { DatabaseStorageStats, DatabaseOptimizationResult } from '../types/models';

export function useDatabaseMaintenance() {
  const [stats, setStats] = useState<DatabaseStorageStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [optimizing, setOptimizing] = useState<boolean>(false);
  const [optimizationResult, setOptimizationResult] = useState<DatabaseOptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // @ts-ignore
      const result = await window.electronAPI.database.getStats();
      if (result.success) {
        setStats(result.data);
      } else {
        setError(result.error || 'Failed to retrieve database storage stats.');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while querying database storage.');
    } finally {
      setLoading(false);
    }
  }, []);

  const runOptimize = useCallback(async () => {
    try {
      setOptimizing(true);
      setError(null);
      setOptimizationResult(null);
      // @ts-ignore
      const result = await window.electronAPI.database.optimize();
      if (result.success) {
        setOptimizationResult(result.data);
        await fetchStats();
        return result.data as DatabaseOptimizationResult;
      } else {
        setError(result.error || 'Failed to optimize and compact database.');
        return null;
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred during database optimization.');
      return null;
    } finally {
      setOptimizing(false);
    }
  }, [fetchStats]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    optimizing,
    optimizationResult,
    error,
    refreshStats: fetchStats,
    runOptimize,
    clearResult: () => setOptimizationResult(null),
  };
}
