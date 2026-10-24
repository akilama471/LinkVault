import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  RotateCw, 
  Play, 
  Square, 
  Trash2, 
  ExternalLink, 
  Edit2, 
  Search, 
  Clock, 
  Globe, 
  Loader2,
  RefreshCw,
  GitMerge,
  HelpCircle
} from 'lucide-react';
import { useAuditor } from '../hooks/useAuditor';
import { Bookmark, DuplicateGroup } from '../types/models';
import { BookmarkDetailsModal } from '../components/bookmarks/BookmarkDetailsModal';
import { DeleteBookmarkModal } from '../components/bookmarks/DeleteBookmarkModal';
import { useBookmarkOpener } from '../context/BookmarkOpenerContext';
import { useToast } from '../context/ToastContext';

interface AuditorPageProps {
  bookmarks: Bookmark[];
  onDeleteBookmark: (id: number) => Promise<any> | void;
  onUpdateBookmark: (id: number, data: Partial<Bookmark>) => any;
  onRefreshBookmarks: () => void;
}

export const AuditorPage: React.FC<AuditorPageProps> = ({
  bookmarks,
  onDeleteBookmark,
  onUpdateBookmark,
  onRefreshBookmarks
}) => {
  const {
    summary,
    duplicates,
    progress,
    loading: auditorLoading,
    startHealthCheck,
    stopHealthCheck,
    checkBookmark,
    mergeDuplicates,
    refreshAll
  } = useAuditor();

  const { openBookmark } = useBookmarkOpener();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'broken' | 'duplicates'>('broken');
  const [brokenFilter, setBrokenFilter] = useState<'all_issues' | 'dead' | 'server_error' | 'dns' | 'timeout' | 'healthy' | 'unchecked'>('all_issues');
  const [duplicateFilter, setDuplicateFilter] = useState<'all' | 'normalized' | 'exact'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [deletingBookmark, setDeletingBookmark] = useState<Bookmark | null>(null);
  const [checkingBookmarkId, setCheckingBookmarkId] = useState<number | null>(null);
  const [isMergingAll, setIsMergingAll] = useState(false);
  const [isDeletingDead, setIsDeletingDead] = useState(false);

  // Filter broken bookmarks
  const filteredBrokenBookmarks = useMemo(() => {
    return bookmarks.filter(b => {
      // Status filter
      if (brokenFilter === 'all_issues') {
        if (!b.health_status || b.health_status === 'ok') return false;
      } else if (brokenFilter === 'dead') {
        if (b.health_status !== 'dead') return false;
      } else if (brokenFilter === 'server_error') {
        if (b.health_status !== 'server_error') return false;
      } else if (brokenFilter === 'dns') {
        if (b.health_status !== 'dns_error' && b.health_status !== 'unreachable') return false;
      } else if (brokenFilter === 'timeout') {
        if (b.health_status !== 'timeout') return false;
      } else if (brokenFilter === 'healthy') {
        if (b.health_status !== 'ok') return false;
      } else if (brokenFilter === 'unchecked') {
        if (b.health_status) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = b.title?.toLowerCase().includes(q);
        const urlMatch = b.url.toLowerCase().includes(q);
        const errorMatch = b.health_error?.toLowerCase().includes(q);
        return titleMatch || urlMatch || errorMatch;
      }

      return true;
    });
  }, [bookmarks, brokenFilter, searchQuery]);

  // Filter duplicate groups
  const filteredDuplicateGroups = useMemo(() => {
    return duplicates.filter(g => {
      if (duplicateFilter === 'exact' && g.matchType !== 'exact') return false;
      if (duplicateFilter === 'normalized' && g.matchType !== 'normalized') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const normMatch = g.normalizedUrl.toLowerCase().includes(q);
        const childMatch = g.bookmarks.some(b => b.url.toLowerCase().includes(q) || b.title?.toLowerCase().includes(q));
        return normMatch || childMatch;
      }

      return true;
    });
  }, [duplicates, duplicateFilter, searchQuery]);

  // Single bookmark health re-check handler
  const handleRecheckSingle = async (id: number) => {
    setCheckingBookmarkId(id);
    try {
      await checkBookmark(id);
      onRefreshBookmarks();
    } finally {
      setCheckingBookmarkId(null);
    }
  };

  // Bulk move all dead links to Recycle Bin
  const handleMoveAllDeadToRecycleBin = async () => {
    const deadBookmarks = bookmarks.filter(b => b.health_status === 'dead');
    if (deadBookmarks.length === 0) return;
    if (!confirm(`Are you sure you want to move all ${deadBookmarks.length} dead bookmarks to the Recycle Bin?`)) {
      return;
    }

    setIsDeletingDead(true);
    try {
      for (const b of deadBookmarks) {
        await onDeleteBookmark(b.id);
      }
      success('Dead Links Cleaned Up', `Moved ${deadBookmarks.length} dead links to the Recycle Bin.`);
      onRefreshBookmarks();
      refreshAll();
    } catch (err: any) {
      error('Delete Failed', err?.message || 'Could not delete dead bookmarks.');
    } finally {
      setIsDeletingDead(false);
    }
  };

  // Merge a single duplicate group
  const handleMergeGroup = async (group: DuplicateGroup) => {
    const duplicateIds = group.bookmarks
      .filter(b => b.id !== group.primaryBookmarkId)
      .map(b => b.id);

    if (duplicateIds.length === 0) return;

    await mergeDuplicates(group.primaryBookmarkId, duplicateIds, true);
    onRefreshBookmarks();
  };

  // Merge all duplicate groups at once
  const handleMergeAllDuplicates = async () => {
    if (duplicates.length === 0) return;
    if (!confirm(`Merge all ${duplicates.length} duplicate groups? Duplicate copies will be moved to the Recycle Bin while their tags & collections are merged into the primary bookmarks.`)) {
      return;
    }

    setIsMergingAll(true);
    try {
      for (const group of duplicates) {
        const duplicateIds = group.bookmarks
          .filter(b => b.id !== group.primaryBookmarkId)
          .map(b => b.id);
        if (duplicateIds.length > 0) {
          await mergeDuplicates(group.primaryBookmarkId, duplicateIds, true);
        }
      }
      success('All Duplicates Merged', `Successfully merged ${duplicates.length} duplicate groups.`);
      onRefreshBookmarks();
    } catch (err: any) {
      error('Merge Failed', err?.message || 'Could not merge all duplicates.');
    } finally {
      setIsMergingAll(false);
    }
  };

  const progressPercent = progress.total > 0 ? Math.round((progress.checked / progress.total) * 100) : 0;

  return (
    <div className="h-full flex flex-col p-6 sm:p-8 max-w-7xl mx-auto pb-32">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-50 text-red-600 rounded-2xl border border-red-100 shadow-2xs">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              Link Auditor & Health
            </h1>
            <p className="text-sm text-gray-500">
              Detect dead links (404s, 500s, DNS failures) and clean up exact & normalized duplicate URLs.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {progress.isRunning ? (
            <button
              type="button"
              onClick={stopHealthCheck}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-xs"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Stop Checking</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={refreshAll}
                disabled={auditorLoading}
                className="p-2.5 bg-white text-gray-600 hover:text-gray-900 border border-gray-300 rounded-xl transition-colors cursor-pointer shadow-2xs hover:bg-gray-50 disabled:opacity-50"
                title="Refresh audit stats and duplicate groups"
              >
                <RefreshCw className={`w-4 h-4 ${auditorLoading ? 'animate-spin text-blue-500' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => startHealthCheck({ onlyFlagged: true })}
                disabled={!summary || (summary.deadCount === 0 && summary.serverErrorCount === 0 && summary.dnsErrorCount === 0)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 border border-gray-300 rounded-xl text-sm font-medium transition-colors cursor-pointer shadow-2xs"
                title="Pings only previously dead, error, or timed-out links"
              >
                <RotateCw className="w-4 h-4 text-amber-500" />
                <span className="hidden sm:inline">Re-check Issues</span>
              </button>

              <button
                type="button"
                onClick={() => startHealthCheck({ forceRecheck: true })}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-xs"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Run Health Check</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Progress Banner */}
      {progress.isRunning && (
        <div className="mb-6 bg-blue-50/90 border border-blue-200 rounded-2xl p-4.5 text-blue-900 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm font-bold">
                Auditing Bookmarks ({progressPercent}%)
              </span>
              <span className="text-xs text-blue-600 font-medium">
                {progress.checked} of {progress.total} links verified
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              {progress.deadCount > 0 && (
                <span className="text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                  {progress.deadCount} Dead
                </span>
              )}
              {progress.errorCount > 0 && (
                <span className="text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  {progress.errorCount} Errors
                </span>
              )}
            </div>
          </div>

          {/* Progress bar line */}
          <div className="w-full bg-blue-200/80 rounded-full h-2 overflow-hidden mb-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {progress.currentUrl && (
            <p className="text-xs text-blue-700 truncate font-mono">
              Pinging: {progress.currentUrl}
            </p>
          )}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-6">
        {/* Dead links */}
        <div
          onClick={() => {
            setActiveTab('broken');
            setBrokenFilter('dead');
          }}
          className={`p-4.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'broken' && brokenFilter === 'dead'
              ? 'border-red-500 bg-red-50/50 shadow-xs ring-2 ring-red-500/20'
              : 'border-gray-200 bg-white hover:border-red-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dead Links</span>
            <div className="p-2 bg-red-100/80 text-red-600 rounded-xl">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-0.5">
            {summary?.deadCount ?? 0}
          </div>
          <p className="text-xs text-gray-500">404 Not Found & 410 Gone</p>
        </div>

        {/* Server Errors & DNS */}
        <div
          onClick={() => {
            setActiveTab('broken');
            setBrokenFilter('server_error');
          }}
          className={`p-4.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'broken' && (brokenFilter === 'server_error' || brokenFilter === 'dns')
              ? 'border-amber-500 bg-amber-50/50 shadow-xs ring-2 ring-amber-500/20'
              : 'border-gray-200 bg-white hover:border-amber-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Errors & DNS</span>
            <div className="p-2 bg-amber-100/80 text-amber-600 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-0.5">
            {(summary?.serverErrorCount ?? 0) + (summary?.dnsErrorCount ?? 0) + (summary?.timeoutCount ?? 0)}
          </div>
          <p className="text-xs text-gray-500">500 Server, DNS, Timeouts</p>
        </div>

        {/* Duplicates */}
        <div
          onClick={() => {
            setActiveTab('duplicates');
            setDuplicateFilter('all');
          }}
          className={`p-4.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'duplicates'
              ? 'border-indigo-500 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-500/20'
              : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Duplicate Groups</span>
            <div className="p-2 bg-indigo-100/80 text-indigo-600 rounded-xl">
              <Copy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-0.5">
            {summary?.duplicateGroupCount ?? 0}
          </div>
          <p className="text-xs text-gray-500">
            {(summary?.exactDuplicatesCount ?? 0) + (summary?.normalizedDuplicatesCount ?? 0)} extra copies
          </p>
        </div>

        {/* Healthy links */}
        <div
          onClick={() => {
            setActiveTab('broken');
            setBrokenFilter('healthy');
          }}
          className={`p-4.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'broken' && brokenFilter === 'healthy'
              ? 'border-emerald-500 bg-emerald-50/50 shadow-xs ring-2 ring-emerald-500/20'
              : 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Healthy Links</span>
            <div className="p-2 bg-emerald-100/80 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-0.5">
            {summary?.healthyCount ?? 0}
          </div>
          <p className="text-xs text-gray-500">Verified HTTP 200 OK</p>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-gray-200 mb-6">
        <div className="flex gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('broken')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'broken'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Broken & Dead Links</span>
            {summary && (summary.deadCount + summary.serverErrorCount + summary.dnsErrorCount > 0) && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                {summary.deadCount + summary.serverErrorCount + summary.dnsErrorCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('duplicates')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'duplicates'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Copy className="w-4 h-4" />
            <span>Duplicate Link Detector</span>
            {summary && summary.duplicateGroupCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                {summary.duplicateGroupCount}
              </span>
            )}
          </button>
        </div>

        {/* Global search within auditor */}
        <div className="relative w-64 mb-2 hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search auditor results..."
            className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: BROKEN & DEAD LINKS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'broken' && (
        <div className="space-y-4">
          {/* Sub-filter chips & bulk action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setBrokenFilter('all_issues')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  brokenFilter === 'all_issues' ? 'bg-red-600 text-white shadow-2xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Issues
              </button>
              <button
                type="button"
                onClick={() => setBrokenFilter('dead')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  brokenFilter === 'dead' ? 'bg-red-600 text-white shadow-2xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                404 Dead ({summary?.deadCount ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setBrokenFilter('server_error')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  brokenFilter === 'server_error' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                500 Server Error ({summary?.serverErrorCount ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setBrokenFilter('dns')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  brokenFilter === 'dns' ? 'bg-purple-600 text-white shadow-2xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                DNS / Unreachable ({(summary?.dnsErrorCount ?? 0) + (summary?.unreachableCount ?? 0)})
              </button>
              <button
                type="button"
                onClick={() => setBrokenFilter('timeout')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  brokenFilter === 'timeout' ? 'bg-orange-600 text-white shadow-2xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Timeouts ({summary?.timeoutCount ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setBrokenFilter('healthy')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  brokenFilter === 'healthy' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Healthy ({summary?.healthyCount ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setBrokenFilter('unchecked')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  brokenFilter === 'unchecked' ? 'bg-gray-700 text-white shadow-2xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Unchecked ({summary?.uncheckedCount ?? 0})
              </button>
            </div>

            {/* Quick bulk action */}
            {summary && summary.deadCount > 0 && brokenFilter === 'dead' && (
              <button
                type="button"
                onClick={handleMoveAllDeadToRecycleBin}
                disabled={isDeletingDead}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              >
                {isDeletingDead ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Move All 404s to Recycle Bin</span>
              </button>
            )}
          </div>

          {/* Broken links list */}
          {filteredBrokenBookmarks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">
                No issues found under this filter
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                {brokenFilter === 'all_issues'
                  ? 'All audited bookmarks appear healthy and accessible. Click "Run Health Check" to re-verify your library.'
                  : 'No bookmarks matching this status category.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs divide-y divide-gray-100">
              {filteredBrokenBookmarks.map((bookmark) => {
                const isCheckingThis = checkingBookmarkId === bookmark.id;
                const isDead = bookmark.health_status === 'dead';
                const isServerError = bookmark.health_status === 'server_error';
                const isDns = bookmark.health_status === 'dns_error' || bookmark.health_status === 'unreachable';
                const isTimeout = bookmark.health_status === 'timeout';
                const isHealthy = bookmark.health_status === 'ok';

                return (
                  <div
                    key={bookmark.id}
                    className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-gray-50/80 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Health Status Pill / Icon */}
                      <div className="mt-0.5 shrink-0">
                        {isDead && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{bookmark.http_status || 404} Dead</span>
                          </span>
                        )}
                        {isServerError && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{bookmark.http_status || 500} Server Error</span>
                          </span>
                        )}
                        {isDns && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <Globe className="w-3.5 h-3.5" />
                            <span>DNS Failure</span>
                          </span>
                        )}
                        {isTimeout && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Timeout</span>
                          </span>
                        )}
                        {isHealthy && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{bookmark.http_status || 200} Healthy</span>
                          </span>
                        )}
                        {!bookmark.health_status && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Unchecked</span>
                          </span>
                        )}
                      </div>

                      {/* Bookmark info */}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-gray-900 truncate">
                          {bookmark.title || 'Untitled Bookmark'}
                        </h4>
                        <p className="text-xs text-gray-500 font-mono truncate max-w-xl">
                          {bookmark.url}
                        </p>

                        <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                          {bookmark.health_error && (
                            <span className="text-red-600 font-medium truncate">
                              Reason: {bookmark.health_error}
                            </span>
                          )}
                          {bookmark.last_checked_at && (
                            <span>
                              Checked {new Date(bookmark.last_checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleRecheckSingle(bookmark.id)}
                        disabled={isCheckingThis}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Ping link now to re-check status"
                      >
                        <RefreshCw className={`w-4 h-4 ${isCheckingThis ? 'animate-spin text-blue-600' : ''}`} />
                      </button>

                      <a
                        href={bookmark.url}
                        onClick={(e) => {
                          e.preventDefault();
                          openBookmark(bookmark.url, bookmark.title || undefined);
                        }}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Open in browser to inspect"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>

                      <button
                        type="button"
                        onClick={() => setEditingBookmark(bookmark)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit bookmark"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingBookmark(bookmark)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Move to Recycle Bin"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: DUPLICATE LINK DETECTOR */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'duplicates' && (
        <div className="space-y-4">
          {/* Sub-filter chips & bulk action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDuplicateFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  duplicateFilter === 'all' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Duplicates ({duplicates.length})
              </button>
              <button
                type="button"
                onClick={() => setDuplicateFilter('normalized')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  duplicateFilter === 'normalized' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Normalized Differences Only
              </button>
              <button
                type="button"
                onClick={() => setDuplicateFilter('exact')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  duplicateFilter === 'exact' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Exact String Matches
              </button>
            </div>

            {duplicates.length > 0 && (
              <button
                type="button"
                onClick={handleMergeAllDuplicates}
                disabled={isMergingAll}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              >
                {isMergingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitMerge className="w-3.5 h-3.5" />}
                <span>Merge All {duplicates.length} Duplicate Groups</span>
              </button>
            )}
          </div>

          {/* Duplicate groups display */}
          {filteredDuplicateGroups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">
                No Duplicate Links Found
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {duplicateFilter === 'all'
                  ? 'Your bookmark library is completely free of exact and normalized URL duplicates.'
                  : 'No duplicate groups match the selected filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDuplicateGroups.map((group, groupIdx) => {
                return (
                  <div
                    key={groupIdx}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs"
                  >
                    {/* Group Header */}
                    <div className="bg-gray-50/80 px-5 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-gray-900 font-mono">
                            {group.normalizedUrl}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            group.matchType === 'exact'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {group.matchType === 'exact' ? 'Exact Match' : 'Normalized Match'}
                          </span>
                        </div>

                        {group.differenceReasons.length > 0 && (
                          <div className="flex flex-wrap gap-1 text-[11px] text-gray-500">
                            <span>Detected via:</span>
                            {group.differenceReasons.map((reason, rIdx) => (
                              <span key={rIdx} className="bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-700 font-medium">
                                {reason}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleMergeGroup(group)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                      >
                        <GitMerge className="w-3.5 h-3.5" />
                        <span>Merge & Keep Primary</span>
                      </button>
                    </div>

                    {/* Bookmarks in Group */}
                    <div className="divide-y divide-gray-100 p-2">
                      {group.bookmarks.map((bookmark) => {
                        const isPrimary = bookmark.id === group.primaryBookmarkId;
                        return (
                          <div
                            key={bookmark.id}
                            className={`p-3 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                              isPrimary ? 'bg-indigo-50/30' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="text-xs font-bold text-gray-900 truncate">
                                  {bookmark.title || bookmark.url}
                                </h5>
                                {isPrimary ? (
                                  <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.2 rounded-full">
                                    ★ Primary
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-[10px]">
                                    Duplicate copy
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-gray-500 font-mono truncate max-w-xl">
                                {bookmark.url}
                              </p>

                              <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                                <span>Saved {new Date(bookmark.created_at).toLocaleDateString()}</span>
                                {bookmark.is_favorite && <span className="text-yellow-600 font-medium">★ Favorite</span>}
                                {bookmark.is_important && <span className="text-red-600 font-medium">🚩 Important</span>}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <a
                                href={bookmark.url}
                                onClick={(e) => {
                                  e.preventDefault();
                                  openBookmark(bookmark.url, bookmark.title || undefined);
                                }}
                                className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                                title="Open in browser"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>

                              <button
                                type="button"
                                onClick={() => setDeletingBookmark(bookmark)}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                title="Move this duplicate to Recycle Bin"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Edit Bookmark Modal */}
      {editingBookmark && (
        <BookmarkDetailsModal
          bookmark={editingBookmark}
          onClose={() => setEditingBookmark(null)}
          onSave={onUpdateBookmark}
        />
      )}

      {/* Delete Bookmark Modal */}
      {deletingBookmark && (
        <DeleteBookmarkModal
          bookmark={deletingBookmark}
          onClose={() => setDeletingBookmark(null)}
          onConfirm={async () => {
            await onDeleteBookmark(deletingBookmark.id);
            setDeletingBookmark(null);
            onRefreshBookmarks();
            refreshAll();
          }}
        />
      )}
    </div>
  );
};
