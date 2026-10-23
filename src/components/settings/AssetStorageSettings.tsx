import React, { useState } from 'react';
import { 
  HardDrive, 
  Sparkles, 
  RefreshCw, 
  ShieldCheck, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  FileImage,
  AlertCircle,
  X
} from 'lucide-react';
import { useAssetStorage } from '../../hooks/useAssetStorage';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

export const AssetStorageSettings: React.FC = () => {
  const {
    stats,
    loading,
    vacuuming,
    vacuumResult,
    error,
    scanStorage,
    runVacuum,
    clearResult
  } = useAssetStorage();

  const [showOrphanDetails, setShowOrphanDetails] = useState(false);

  const totalBytes = stats?.totalSizeBytes || 0;
  const activeBytes = stats?.activeSizeBytes || 0;
  const orphanBytes = stats?.orphanSizeBytes || 0;

  const activePercent = totalBytes > 0 ? (activeBytes / totalBytes) * 100 : 100;
  const orphanPercent = totalBytes > 0 ? (orphanBytes / totalBytes) * 100 : 0;

  const hasOrphans = (stats?.orphanFiles || 0) > 0;

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 transition-all duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-indigo-500 to-violet-600 text-white rounded-xl shadow-sm">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">Asset Storage Doctor</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-violet-100 text-violet-700">
                Vacuum
              </span>
            </div>
            <p className="text-gray-500 text-sm">
              Inspect disk usage, detect unreferenced cache files, and garbage collect orphaned assets.
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center self-start sm:self-center">
          {loading ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Scanning storage...
            </span>
          ) : hasOrphans ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              {stats?.orphanFiles} Orphaned {stats?.orphanFiles === 1 ? 'File' : 'Files'} ({formatBytes(stats?.orphanSizeBytes || 0)})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Storage Optimized (0 Orphans)
            </span>
          )}
        </div>
      </div>

      {/* Success Banner */}
      {vacuumResult && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start justify-between gap-3 text-emerald-900 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-emerald-900">
                Vacuum Completed Successfully!
              </p>
              <p className="text-sm text-emerald-700 mt-0.5">
                Cleaned {vacuumResult.deletedCount} orphaned {vacuumResult.deletedCount === 1 ? 'file' : 'files'} and reclaimed <span className="font-bold">{formatBytes(vacuumResult.reclaimedBytes)}</span> of disk space.
              </p>
              {vacuumResult.errors.length > 0 && (
                <p className="text-xs text-amber-700 mt-2">
                  Note: {vacuumResult.errors.length} file(s) could not be removed (file locked by system).
                </p>
              )}
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
          <span>Storage Utilization Distribution</span>
          <span>{formatBytes(totalBytes)} Total</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
          <div 
            style={{ width: `${activePercent}%` }} 
            className="bg-gradient-to-r from-indigo-500 to-violet-600 h-full transition-all duration-500"
            title={`Active Referenced Assets: ${activePercent.toFixed(1)}%`}
          />
          {orphanPercent > 0 && (
            <div 
              style={{ width: `${orphanPercent}%` }} 
              className="bg-gradient-to-r from-amber-400 to-rose-500 h-full transition-all duration-500"
              title={`Orphan Assets: ${orphanPercent.toFixed(1)}%`}
            />
          )}
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
            <span>Active Referenced ({activePercent.toFixed(1)}%)</span>
          </div>
          {orphanPercent > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span>Orphaned / Reclaimable ({orphanPercent.toFixed(1)}%)</span>
            </div>
          )}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Total Assets */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Cached</span>
            <FileImage className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {formatBytes(stats?.totalSizeBytes || 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {stats?.totalFiles || 0} total image files
            </div>
          </div>
        </div>

        {/* Active Referenced Assets */}
        <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-700 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Active Referenced</span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-indigo-950">
              {formatBytes(stats?.activeSizeBytes || 0)}
            </div>
            <div className="text-xs text-indigo-600 mt-1">
              {stats?.activeFiles || 0} linked to bookmarks/domains
            </div>
          </div>
        </div>

        {/* Orphaned Assets */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${
          hasOrphans 
            ? 'bg-rose-50/60 border-rose-200' 
            : 'bg-emerald-50/50 border-emerald-100'
        }`}>
          <div className={`flex items-center justify-between mb-2 ${
            hasOrphans ? 'text-rose-700' : 'text-emerald-700'
          }`}>
            <span className="text-xs font-medium uppercase tracking-wider">Reclaimable (Orphans)</span>
            <Trash2 className={`w-4 h-4 ${hasOrphans ? 'text-rose-600' : 'text-emerald-600'}`} />
          </div>
          <div>
            <div className={`text-2xl font-bold ${hasOrphans ? 'text-rose-950' : 'text-emerald-950'}`}>
              {formatBytes(stats?.orphanSizeBytes || 0)}
            </div>
            <div className={`text-xs mt-1 ${hasOrphans ? 'text-rose-600 font-medium' : 'text-emerald-600'}`}>
              {hasOrphans 
                ? `${stats?.orphanFiles} unreferenced files on disk` 
                : 'Zero orphaned files'}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          id="btn-vacuum-assets"
          onClick={runVacuum}
          disabled={!hasOrphans || vacuuming || loading}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-medium text-white shadow-sm transition-all duration-200 ${
            hasOrphans && !vacuuming && !loading
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 hover:shadow active:scale-[0.99] cursor-pointer'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
          }`}
        >
          {vacuuming ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Pruning Orphan Assets...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Vacuum & Prune Orphans ({formatBytes(stats?.orphanSizeBytes || 0)})</span>
            </>
          )}
        </button>

        <button
          id="btn-scan-assets"
          onClick={scanStorage}
          disabled={loading || vacuuming}
          className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
          title="Rescan asset directory and database"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          <span>{loading ? 'Scanning...' : 'Scan Storage'}</span>
        </button>
      </div>

      {/* Expandable Orphan Files Inspector */}
      {hasOrphans && stats?.orphans && stats.orphans.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <button
            onClick={() => setShowOrphanDetails(!showOrphanDetails)}
            className="flex items-center justify-between w-full text-left text-sm text-gray-600 hover:text-gray-900 transition-colors py-1 group"
          >
            <span className="font-medium flex items-center gap-2">
              <span>Inspect Detected Orphan Files ({stats.orphans.length})</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 group-hover:bg-gray-200">
                Click to {showOrphanDetails ? 'hide' : 'view'}
              </span>
            </span>
            {showOrphanDetails ? (
              <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
            )}
          </button>

          {showOrphanDetails && (
            <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100 bg-gray-50/50">
              {stats.orphans.map((orphan) => (
                <div key={orphan.filename} className="p-3 flex items-center justify-between text-xs hover:bg-white transition-colors">
                  <div className="flex items-center gap-2 min-w-0 mr-3">
                    <span className={`px-2 py-0.5 rounded font-mono font-medium text-[10px] uppercase tracking-wider ${
                      orphan.assetType === 'thumbnail'
                        ? 'bg-purple-100 text-purple-700'
                        : orphan.assetType === 'preview'
                        ? 'bg-blue-100 text-blue-700'
                        : orphan.assetType === 'favicon'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {orphan.assetType}
                    </span>
                    <span className="font-mono text-gray-700 truncate" title={orphan.filename}>
                      {orphan.filename}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 text-gray-500">
                    <span className="hidden sm:inline text-gray-400">
                      {formatDate(orphan.modifiedAt)}
                    </span>
                    <span className="font-semibold text-gray-800">
                      {formatBytes(orphan.sizeBytes)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
