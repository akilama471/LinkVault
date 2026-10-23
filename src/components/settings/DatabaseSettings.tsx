import React from 'react';
import { 
  Database, 
  Sparkles, 
  RefreshCw, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  X,
  FileCheck,
  Zap
} from 'lucide-react';
import { useDatabaseMaintenance } from '../../hooks/useDatabaseMaintenance';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

interface DatabaseSettingsProps {
  onRefreshAll?: () => void;
}

export const DatabaseSettings: React.FC<DatabaseSettingsProps> = ({ onRefreshAll }) => {
  const {
    stats,
    loading,
    optimizing,
    optimizationResult,
    error,
    refreshStats,
    runOptimize,
    clearResult
  } = useDatabaseMaintenance();

  const handleOptimize = async () => {
    const res = await runOptimize();
    if (res && onRefreshAll) {
      onRefreshAll();
    }
  };

  const totalBytes = stats?.totalSizeBytes || 0;
  const dbBytes = stats?.dbSizeBytes || 0;
  const walBytes = stats?.walSizeBytes || 0;
  const freelistBytes = stats?.freelistSizeBytes || 0;

  const hasFragmentedSpace = (stats?.freelistCount || 0) > 0 || (stats?.walSizeBytes || 0) > 256 * 1024;

  const dbPercent = totalBytes > 0 ? (dbBytes / totalBytes) * 100 : 100;
  const walPercent = totalBytes > 0 ? (walBytes / totalBytes) * 100 : 0;

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 transition-all duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-cyan-500 to-blue-600 text-white rounded-xl shadow-sm">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">Database Maintenance</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700">
                WAL & VACUUM
              </span>
            </div>
            <p className="text-gray-500 text-sm">
              Flush write-ahead logs, defragment SQLite storage tables, and optimize query indices.
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center self-start sm:self-center">
          {loading ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Inspecting DB...
            </span>
          ) : hasFragmentedSpace ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              Compaction Recommended ({formatBytes(freelistBytes)} reusable)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Database Compact & Optimal
            </span>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {optimizationResult && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start justify-between gap-3 text-emerald-900 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-emerald-900">
                Database Optimization Completed!
              </p>
              <p className="text-sm text-emerald-700 mt-0.5">
                Flushed write-ahead logs via <span className="font-mono text-xs font-bold">TRUNCATE</span>, defragmented storage tables via <span className="font-mono text-xs font-bold">VACUUM</span>, and reclaimed <span className="font-bold">{formatBytes(optimizationResult.reclaimedBytes)}</span>.
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                Before: {formatBytes(optimizationResult.beforeSizeBytes)} → After: {formatBytes(optimizationResult.afterSizeBytes)}
              </p>
            </div>
          </div>
          <button 
            onClick={clearResult}
            className="text-emerald-500 hover:text-emerald-700 transition-colors p-1"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Visual Storage Distribution Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>Database File Composition</span>
          <span>{formatBytes(totalBytes)} Total on Disk</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
          <div 
            style={{ width: `${dbPercent}%` }} 
            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full transition-all duration-500"
            title={`Main Database: ${dbPercent.toFixed(1)}%`}
          />
          {walPercent > 0 && (
            <div 
              style={{ width: `${walPercent}%` }} 
              className="bg-gradient-to-r from-amber-400 to-orange-500 h-full transition-all duration-500"
              title={`WAL File: ${walPercent.toFixed(1)}%`}
            />
          )}
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            <span>Main SQLite File ({dbPercent.toFixed(1)}%)</span>
          </div>
          {walPercent > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span>WAL Journal ({walPercent.toFixed(1)}%)</span>
            </div>
          )}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Main SQLite DB */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Main Database</span>
            <FileCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {formatBytes(stats?.dbSizeBytes || 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {stats?.pageCount || 0} pages @ {formatBytes(stats?.pageSize || 4096)}
            </div>
          </div>
        </div>

        {/* WAL Journal File */}
        <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-700 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">WAL Journal Log</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-950">
              {formatBytes(stats?.walSizeBytes || 0)}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Mode: {stats?.journalMode?.toUpperCase() || 'WAL'} (Periodic 15m flush)
            </div>
          </div>
        </div>

        {/* Freelist / Fragmentation */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${
          (stats?.freelistCount || 0) > 0 
            ? 'bg-amber-50/60 border-amber-200' 
            : 'bg-emerald-50/50 border-emerald-100'
        }`}>
          <div className={`flex items-center justify-between mb-2 ${
            (stats?.freelistCount || 0) > 0 ? 'text-amber-700' : 'text-emerald-700'
          }`}>
            <span className="text-xs font-medium uppercase tracking-wider">Free Space in File</span>
            <Sparkles className={`w-4 h-4 ${
              (stats?.freelistCount || 0) > 0 ? 'text-amber-600' : 'text-emerald-600'
            }`} />
          </div>
          <div>
            <div className={`text-2xl font-bold ${
              (stats?.freelistCount || 0) > 0 ? 'text-amber-950' : 'text-emerald-950'
            }`}>
              {formatBytes(freelistBytes)}
            </div>
            <div className={`text-xs mt-1 ${
              (stats?.freelistCount || 0) > 0 ? 'text-amber-700 font-medium' : 'text-emerald-600'
            }`}>
              {(stats?.freelistCount || 0) > 0
                ? `${stats?.freelistCount} free pages reusable/compactable`
                : 'Zero uncompacted pages'}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          id="btn-optimize-database"
          onClick={handleOptimize}
          disabled={optimizing || loading}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-medium text-white shadow-sm transition-all duration-200 ${
            !optimizing && !loading
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 hover:shadow active:scale-[0.99] cursor-pointer'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
          }`}
        >
          {optimizing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Optimizing & Compacting SQLite...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Optimize & Compact Database</span>
            </>
          )}
        </button>

        <button
          id="btn-refresh-db-stats"
          onClick={refreshStats}
          disabled={loading || optimizing}
          className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
          title="Refresh SQLite storage metrics"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          <span>{loading ? 'Inspecting...' : 'Refresh Diagnostics'}</span>
        </button>
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">
        Routine checkpoints run automatically every 15 minutes and on application exit. Manual compaction re-indexes tables and immediately frees disk space.
      </p>
    </div>
  );
};
