import { useState, useEffect, useCallback } from 'react';
import { AuditSummary, DuplicateGroup, HealthCheckProgress } from '../types/models';
import { useToast } from '../context/ToastContext';

export function useAuditor() {
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [progress, setProgress] = useState<HealthCheckProgress>({
    isRunning: false,
    total: 0,
    checked: 0,
    deadCount: 0,
    errorCount: 0
  });
  const [loading, setLoading] = useState(true);
  const { success, error, info } = useToast();

  const fetchSummary = useCallback(async () => {
    try {
      // @ts-ignore
      const res = await window.electronAPI?.auditor?.getSummary?.();
      if (res && res.success) {
        setSummary(res.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch audit summary', err);
    }
  }, []);

  const fetchDuplicates = useCallback(async () => {
    try {
      // @ts-ignore
      const res = await window.electronAPI?.auditor?.getDuplicates?.();
      if (res && res.success) {
        setDuplicates(res.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch duplicates', err);
    }
  }, []);

  const fetchProgress = useCallback(async () => {
    try {
      // @ts-ignore
      const res = await window.electronAPI?.auditor?.getProgress?.();
      if (res && res.success && res.data) {
        setProgress(res.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch auditor progress', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchSummary(), fetchDuplicates(), fetchProgress()]);
    } finally {
      setLoading(false);
    }
  }, [fetchSummary, fetchDuplicates, fetchProgress]);

  useEffect(() => {
    refreshAll();

    // @ts-ignore
    const unsubProgress = window.electronAPI?.events?.onAuditorProgress?.((prog: HealthCheckProgress) => {
      setProgress(prog);
    });

    // @ts-ignore
    const unsubCompleted = window.electronAPI?.events?.onAuditorCompleted?.((latestSummary: AuditSummary) => {
      if (latestSummary) setSummary(latestSummary);
      fetchDuplicates();
      info('Audit Finished', 'Health check cycle completed.');
    });

    // @ts-ignore
    const unsubUpdated = window.electronAPI?.events?.onAuditorUpdated?.(() => {
      fetchSummary();
      fetchDuplicates();
    });

    return () => {
      if (unsubProgress) unsubProgress();
      if (unsubCompleted) unsubCompleted();
      if (unsubUpdated) unsubUpdated();
    };
  }, [refreshAll, fetchSummary, fetchDuplicates]);

  const startHealthCheck = async (options?: { forceRecheck?: boolean; onlyFlagged?: boolean }) => {
    try {
      // @ts-ignore
      await window.electronAPI?.auditor?.startHealthCheck?.(options);
      setProgress(prev => ({ ...prev, isRunning: true }));
      info('Health Check Started', 'Pinging saved bookmarks in the background...');
    } catch (err: any) {
      error('Failed to Start', err?.message || 'Could not start health check.');
    }
  };

  const stopHealthCheck = async () => {
    try {
      // @ts-ignore
      await window.electronAPI?.auditor?.stopHealthCheck?.();
      setProgress(prev => ({ ...prev, isRunning: false }));
      info('Health Check Paused', 'Background checker stopped.');
    } catch (err: any) {
      error('Failed to Stop', err?.message || 'Could not stop health check.');
    }
  };

  const checkBookmark = async (id: number) => {
    try {
      // @ts-ignore
      const res = await window.electronAPI?.auditor?.checkBookmark?.(id);
      if (res && res.success) {
        const item = res.data;
        if (item.status === 'ok') {
          success('Link is Healthy', `Received HTTP ${item.httpStatus || 200} OK.`);
        } else if (item.status === 'dead') {
          error('Dead Link Flagged', item.error || '404 Not Found');
        } else if (item.status === 'server_error') {
          error('Server Error Flagged', item.error || 'Server error encountered');
        } else {
          error('Connection Issue', item.error || 'Failed to reach link');
        }
        await fetchSummary();
        return res.data;
      }
    } catch (err: any) {
      error('Health Check Failed', err?.message || 'Could not verify link.');
    }
  };

  const mergeDuplicates = async (primaryId: number, duplicateIds: number[], moveToTrash = true) => {
    try {
      // @ts-ignore
      const res = await window.electronAPI?.auditor?.mergeDuplicates?.(primaryId, duplicateIds, moveToTrash);
      if (res && res.success) {
        success(
          'Duplicates Merged', 
          `Merged metadata from ${duplicateIds.length} bookmarks into primary copy${moveToTrash ? ' and moved duplicates to Recycle Bin' : ''}.`
        );
        await Promise.all([fetchSummary(), fetchDuplicates()]);
        return true;
      }
    } catch (err: any) {
      error('Merge Failed', err?.message || 'Could not merge duplicate bookmarks.');
      return false;
    }
  };

  return {
    summary,
    duplicates,
    progress,
    loading,
    startHealthCheck,
    stopHealthCheck,
    checkBookmark,
    mergeDuplicates,
    refreshSummary: fetchSummary,
    refreshDuplicates: fetchDuplicates,
    refreshAll
  };
}
