import React, { useState } from 'react';
import { X, Globe, User, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface BrowserProfile {
  id: string;
  name: string;
  path: string;
}

interface BrowserImportModalProps {
  onClose: () => void;
  onImportComplete: () => void;
}

const BROWSERS = [
  { id: 'chrome', name: 'Google Chrome' },
  { id: 'edge', name: 'Microsoft Edge' },
  { id: 'opera', name: 'Opera' },
  { id: 'firefox', name: 'Mozilla Firefox' },
  { id: 'yandex', name: 'Yandex Browser' }
];

export const BrowserImportModal: React.FC<BrowserImportModalProps> = ({ onClose, onImportComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedBrowser, setSelectedBrowser] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
  const [selectedProfilePath, setSelectedProfilePath] = useState<string | null>(null);
  
  const [bookmarks, setBookmarks] = useState<{title: string, url: string}[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; duplicates: number; total: number }>({
    imported: 0,
    duplicates: 0,
    total: 0
  });

  const handleBrowserSelect = async (browserId: string) => {
    setSelectedBrowser(browserId);
    setLoading(true);
    setError(null);
    try {
      // @ts-ignore
      const res = await window.electronAPI.browserImport.getProfiles(browserId);
      if (res.success) {
        setProfiles(res.data);
        if (res.data.length === 1) {
          // Auto-select if only one profile
          setSelectedProfilePath(res.data[0].path);
        }
        setStep(2);
      } else {
        setError(res.error || 'Failed to get profiles. Is this browser installed?');
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    }
    setLoading(false);
  };

  const handleExtract = async () => {
    if (!selectedBrowser || !selectedProfilePath) return;
    setLoading(true);
    setError(null);
    try {
      // @ts-ignore
      const res = await window.electronAPI.browserImport.extract(selectedBrowser, selectedProfilePath);
      if (res.success) {
        setBookmarks(res.data);
        setSelectedUrls(new Set());
        setSearchQuery('');
        setStep(3);
      } else {
        setError(res.error || 'Extract failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Extract failed.');
    }
    setLoading(false);
  };

  const handleImportSelected = async () => {
    const bookmarksToImport = bookmarks.filter(b => selectedUrls.has(b.url));
    if (bookmarksToImport.length === 0) return;
    
    setLoading(true);
    setError(null);
    try {
      // @ts-ignore
      const res = await window.electronAPI.browserImport.execute(bookmarksToImport);
      if (res.success) {
        if (typeof res.data === 'number') {
          setImportResult({
            imported: res.data,
            duplicates: bookmarksToImport.length - res.data,
            total: bookmarksToImport.length
          });
        } else if (res.data) {
          setImportResult(res.data);
        }
        setStep(4);
        onImportComplete();
      } else {
        setError(res.error || 'Import failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Import failed.');
    }
    setLoading(false);
  };

  const filteredBookmarks = bookmarks.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Import from Browser</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm border border-red-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="text-gray-600 mb-4">Select the browser you want to import bookmarks from:</p>
              <div className="grid gap-3">
                {BROWSERS.map(b => (
                  <button
                    key={b.id}
                    onClick={() => handleBrowserSelect(b.id)}
                    disabled={loading}
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-left disabled:opacity-50"
                  >
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                      <Globe className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-gray-800">{b.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-gray-600 mb-4">
                {profiles.length > 1 
                  ? 'Multiple profiles found. Please select which profile to import from:'
                  : 'Profile found. Ready to import.'}
              </p>
              
              <div className="grid gap-3 max-h-60 overflow-y-auto mb-6">
                {profiles.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProfilePath(p.path)}
                    className={`flex items-center gap-3 p-4 border rounded-xl transition-all text-left ${selectedProfilePath === p.path ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                  >
                    <div className={`p-2 rounded-lg ${selectedProfilePath === p.path ? 'bg-blue-200 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      <User className="w-5 h-5" />
                    </div>
                    <span className={`font-medium ${selectedProfilePath === p.path ? 'text-blue-900' : 'text-gray-800'}`}>
                      {p.name}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => {
                    setStep(1);
                    setSelectedProfilePath(null);
                    setError(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleExtract}
                  disabled={!selectedProfilePath || loading}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col h-[60vh]">
              <p className="text-gray-600 mb-2">Select bookmarks to import ({selectedUrls.size} selected of {bookmarks.length})</p>
              
              <input
                type="text"
                placeholder="Filter bookmarks by title or URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => {
                    const newSet = new Set(selectedUrls);
                    filteredBookmarks.forEach(b => newSet.add(b.url));
                    setSelectedUrls(newSet);
                  }}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Select All Filtered
                </button>
                <button
                  onClick={() => {
                    const newSet = new Set(selectedUrls);
                    filteredBookmarks.forEach(b => newSet.delete(b.url));
                    setSelectedUrls(newSet);
                  }}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Deselect All Filtered
                </button>
              </div>

              <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg p-2 mb-4">
                {filteredBookmarks.map(b => (
                  <label key={b.url} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors border-b border-gray-50 last:border-0">
                    <input
                      type="checkbox"
                      checked={selectedUrls.has(b.url)}
                      onChange={(e) => {
                        const newSet = new Set(selectedUrls);
                        if (e.target.checked) newSet.add(b.url);
                        else newSet.delete(b.url);
                        setSelectedUrls(newSet);
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="overflow-hidden flex-1">
                      <div className="text-sm font-medium text-gray-800 truncate" title={b.title}>{b.title}</div>
                      <div className="text-xs text-gray-500 truncate" title={b.url}>{b.url}</div>
                    </div>
                  </label>
                ))}
                {filteredBookmarks.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    No bookmarks match your search.
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleImportSelected}
                  disabled={selectedUrls.size === 0 || loading}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Import Selected
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col items-center justify-center py-6 text-center px-4">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Import Completed</h3>
              <p className="text-sm text-gray-500 mb-6">
                Bulk import operation finished.
              </p>

              <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-6">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-emerald-600">{importResult.imported}</span>
                  <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mt-1">Added URLs</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-amber-600">{importResult.duplicates}</span>
                  <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider mt-1">Skipped Duplicates</span>
                </div>
              </div>

              <p className="text-xs text-gray-500 mb-6">
                Total processed bookmarks: <strong className="text-gray-700">{importResult.total}</strong>
              </p>

              <button
                onClick={onClose}
                className="w-full max-w-xs py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
