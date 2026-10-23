import React, { useState, useEffect } from 'react';
import { 
  FileCode, 
  FileSpreadsheet, 
  FileJson, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  FolderPlus, 
  Tag as TagIcon, 
  Check, 
  Sparkles,
  RefreshCw,
  FolderTree
} from 'lucide-react';
import { ExportFilterOptions, HtmlImportResult } from '../../types/models';

interface BookmarkExchangeSettingsProps {
  onRefreshAll: () => void;
}

interface MetadataState {
  totalBookmarks: number;
  collections: { id: number; name: string }[];
  tags: { id: number; name: string }[];
}

export const BookmarkExchangeSettings: React.FC<BookmarkExchangeSettingsProps> = ({ onRefreshAll }) => {
  const [meta, setMeta] = useState<MetadataState>({ totalBookmarks: 0, collections: [], tags: [] });
  const [format, setFormat] = useState<'html' | 'json' | 'csv'>('html');
  const [scope, setScope] = useState<'all' | 'collection' | 'tag'>('all');
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | undefined>(undefined);
  const [selectedTagId, setSelectedTagId] = useState<number | undefined>(undefined);
  const [includeRecycleBin, setIncludeRecycleBin] = useState<boolean>(false);

  const [exporting, setExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<{ total: number; filePath: string } | null>(null);

  const [importing, setImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<HtmlImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMetadata = async () => {
    try {
      if (window.electronAPI?.exchange?.getMetadata) {
        const res = await window.electronAPI.exchange.getMetadata();
        if (res.success && res.data) {
          setMeta(res.data);
          if (res.data.collections.length > 0 && selectedCollectionId === undefined) {
            setSelectedCollectionId(res.data.collections[0].id);
          }
          if (res.data.tags.length > 0 && selectedTagId === undefined) {
            setSelectedTagId(res.data.tags[0].id);
          }
        }
      }
    } catch (err: any) {
      console.warn('Failed to load bookmark exchange metadata:', err);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, []);

  const handleExport = async () => {
    try {
      setExporting(true);
      setError(null);
      setExportSuccess(null);

      const filter: ExportFilterOptions = {
        format,
        scope,
        collectionId: scope === 'collection' ? selectedCollectionId : undefined,
        tagId: scope === 'tag' ? selectedTagId : undefined,
        includeRecycleBin
      };

      const res = await window.electronAPI.exchange.export(filter);
      if (res.success) {
        setExportSuccess({ total: res.total, filePath: res.filePath });
        setTimeout(() => setExportSuccess(null), 6000);
      } else if (!res.canceled) {
        setError(res.error || 'Failed to export bookmarks');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred during export');
    } finally {
      setExporting(false);
    }
  };

  const handleImportHtml = async () => {
    try {
      setImporting(true);
      setError(null);
      setImportResult(null);

      const res = await window.electronAPI.exchange.importHtml();
      if (res.success && res.data) {
        setImportResult(res.data);
        await loadMetadata();
        onRefreshAll();
      } else if (!res.canceled) {
        setError(res.error || 'Failed to import HTML bookmarks');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred during HTML import');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <FileCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">Standard Bookmark Import & Export</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                Netscape HTML • JSON • CSV
              </span>
            </div>
            <p className="text-gray-500 text-sm">
              Universal browser portability with Chrome, Firefox, Safari, Edge, Brave, and spreadsheets.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {exportSuccess && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-900 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">
              Successfully exported {exportSuccess.total} {exportSuccess.total === 1 ? 'bookmark' : 'bookmarks'}!
            </p>
            <p className="text-xs text-emerald-700 mt-0.5 font-mono break-all">{exportSuccess.filePath}</p>
          </div>
        </div>
      )}

      {importResult && (
        <div className="mb-6 p-5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 animate-fade-in">
          <div className="flex items-center gap-2 font-semibold text-sm mb-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            HTML Bookmarks Imported Successfully
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-white p-2.5 rounded-lg border border-blue-200/80 shadow-2xs">
              <div className="text-lg font-bold text-blue-700">{importResult.imported}</div>
              <div className="text-xs text-gray-500">New Bookmarks</div>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-blue-200/80 shadow-2xs">
              <div className="text-lg font-bold text-slate-700">{importResult.duplicates}</div>
              <div className="text-xs text-gray-500">Duplicates Skipped</div>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-blue-200/80 shadow-2xs">
              <div className="text-lg font-bold text-indigo-700">{importResult.collectionsCreated}</div>
              <div className="text-xs text-gray-500">Folders Created</div>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-blue-200/80 shadow-2xs">
              <div className="text-lg font-bold text-emerald-700">{importResult.tagsCreated}</div>
              <div className="text-xs text-gray-500">Tags Created</div>
            </div>
          </div>
          <p className="text-xs text-blue-700/80 mt-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Folder hierarchy was preserved as Collections. Background thumbnail enrichment has begun automatically.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* Import Section */}
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600" />
                Import External HTML Bookmark File
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Import from Chrome, Firefox, Safari, Edge, Raindrop, or any standard bookmark HTML file.
              </p>
            </div>

            <button
              onClick={handleImportHtml}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              {importing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <FolderTree className="w-3.5 h-3.5" />
                  Select HTML File...
                </>
              )}
            </button>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-1 border-t border-slate-200">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Preserves folder hierarchies into LinkVault Collections and extracts comma-separated tags automatically.</span>
          </div>
        </div>

        {/* Export Section */}
        <div className="p-5 border border-gray-200 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Download className="w-4 h-4 text-purple-600" />
                Export Bookmarks
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Choose format and scope to generate clean, portable exports.
              </p>
            </div>

            <button
              onClick={handleExport}
              disabled={exporting || meta.totalBookmarks === 0}
              className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              {exporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Export File
                </>
              )}
            </button>
          </div>

          {/* Format Picker */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Export Format</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormat('html')}
                className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                  format === 'html'
                    ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500 text-blue-900'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2 font-medium text-xs mb-1">
                  <FileCode className="w-4 h-4 text-blue-600" />
                  Netscape HTML
                </div>
                <p className="text-[11px] text-gray-500 leading-snug">
                  Compatible with Chrome, Safari, Firefox, Edge & other bookmark managers.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFormat('json')}
                className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                  format === 'json'
                    ? 'border-purple-500 bg-purple-50/50 ring-1 ring-purple-500 text-purple-900'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2 font-medium text-xs mb-1">
                  <FileJson className="w-4 h-4 text-purple-600" />
                  JSON Document
                </div>
                <p className="text-[11px] text-gray-500 leading-snug">
                  Full structured JSON schema including collections, tags, notes, and dates.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                  format === 'csv'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500 text-emerald-900'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2 font-medium text-xs mb-1">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  CSV Spreadsheet
                </div>
                <p className="text-[11px] text-gray-500 leading-snug">
                  Excel & Google Sheets ready with UTF-8 BOM encoding for data analysis.
                </p>
              </button>
            </div>
          </div>

          {/* Scope & Filter Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Export Scope</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    scope === 'all'
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  All ({meta.totalBookmarks})
                </button>
                <button
                  type="button"
                  onClick={() => setScope('collection')}
                  disabled={meta.collections.length === 0}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer disabled:opacity-40 ${
                    scope === 'collection'
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <FolderPlus className="w-3 h-3" />
                  Collection
                </button>
                <button
                  type="button"
                  onClick={() => setScope('tag')}
                  disabled={meta.tags.length === 0}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer disabled:opacity-40 ${
                    scope === 'tag'
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <TagIcon className="w-3 h-3" />
                  Tag
                </button>
              </div>
            </div>

            {/* Collection or Tag Dropdown */}
            {scope === 'collection' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Select Collection</label>
                <select
                  value={selectedCollectionId}
                  onChange={(e) => setSelectedCollectionId(Number(e.target.value))}
                  className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer"
                >
                  {meta.collections.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {scope === 'tag' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Select Tag</label>
                <select
                  value={selectedTagId}
                  onChange={(e) => setSelectedTagId(Number(e.target.value))}
                  className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer"
                >
                  {meta.tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      #{tag.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Option: Include Recycle Bin */}
          <div className="pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-gray-600">
              <input
                type="checkbox"
                checked={includeRecycleBin}
                onChange={(e) => setIncludeRecycleBin(e.target.checked)}
                className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
              />
              Include bookmarks currently in Recycle Bin
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
