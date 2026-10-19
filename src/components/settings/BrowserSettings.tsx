import React, { useState } from 'react';
import { Compass, CheckCircle2, AlertCircle, FolderOpen, RefreshCw, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { useBookmarkOpener } from '../../context/BookmarkOpenerContext';
import { 
  BROWSER_OPTIONS, 
  BrowserOption, 
  SUPPORTED_SPECIFIC_BROWSERS 
} from '../../types/browser';
import { BrowserIcon } from '../common/BrowserIcon';

export const BrowserSettings: React.FC = () => {
  const { 
    defaultBrowser, 
    setDefaultBrowser, 
    browserStatuses, 
    refreshStatuses, 
    locateBrowserExecutable, 
    clearCustomBrowserPath 
  } = useBookmarkOpener();

  const [showPathConfig, setShowPathConfig] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSelectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as BrowserOption;
    setSaving(true);
    await setDefaultBrowser(val);
    setSaving(false);
  };

  const currentStatus = browserStatuses[defaultBrowser];
  const isSpecificBrowser = defaultBrowser !== 'Always Ask' && defaultBrowser !== 'Default Browser';

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
          <Compass className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Browser Settings</h2>
          <p className="text-gray-500 text-sm">Configure how bookmarks are opened on your system.</p>
        </div>
      </div>

      {/* Main Selection Field */}
      <div className="space-y-4">
        <div>
          <label 
            htmlFor="default-bookmark-opening-browser"
            className="block text-sm font-semibold text-gray-800 mb-2"
          >
            Default Bookmark Opening Browser
          </label>
          <div className="relative">
            <select
              id="default-bookmark-opening-browser"
              value={defaultBrowser}
              onChange={handleSelectChange}
              disabled={saving}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 font-medium text-sm appearance-none cursor-pointer pr-10 shadow-2xs"
            >
              {BROWSER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Dynamic Contextual Helper Information */}
        <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/60 text-xs">
          {defaultBrowser === 'Always Ask' && (
            <p className="text-gray-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
              You will be prompted to choose a browser each time you visit a bookmark URL.
            </p>
          )}

          {defaultBrowser === 'Default Browser' && (
            <p className="text-gray-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
              Bookmarks will open in your operating system&apos;s standard default browser.
            </p>
          )}

          {isSpecificBrowser && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BrowserIcon name={defaultBrowser} className="w-4 h-4" />
                  <span className="font-medium text-gray-800">{defaultBrowser}</span>
                </div>
                {currentStatus?.detected ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    {currentStatus.isCustom ? 'Custom Path Configured' : 'Detected on System'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertCircle className="w-3 h-3" />
                    Not Found in Default Locations
                  </span>
                )}
              </div>

              {currentStatus?.detected ? (
                <div className="flex items-center justify-between text-gray-500 pt-1">
                  <span className="font-mono text-[11px] truncate max-w-[420px]" title={currentStatus.path || ''}>
                    {currentStatus.path}
                  </span>
                  <button
                    type="button"
                    onClick={() => locateBrowserExecutable(defaultBrowser)}
                    className="text-blue-600 hover:text-blue-800 font-medium ml-2 shrink-0 hover:underline"
                  >
                    Change...
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-amber-800 text-[11px]">
                    If installed in a non-default directory, please locate the executable file.
                  </span>
                  <button
                    type="button"
                    onClick={() => locateBrowserExecutable(defaultBrowser)}
                    className="flex items-center gap-1 text-xs font-medium text-amber-800 bg-amber-100/80 hover:bg-amber-200/80 px-2.5 py-1 rounded-lg transition-colors shrink-0"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    Locate Executable (.exe)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Collapsible Section for Non-Default / Custom Locations */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowPathConfig(!showPathConfig)}
            className="flex items-center justify-between w-full py-2 text-xs font-semibold text-gray-700 hover:text-blue-600 transition-colors"
          >
            <span>Custom Browser Locations &amp; Detection Status</span>
            {showPathConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showPathConfig && (
            <div className="mt-3 space-y-2.5 border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between pb-1">
                <p className="text-[11px] text-gray-500">
                  Manage detected and custom executable paths (.exe) for installed browsers.
                </p>
                <button
                  type="button"
                  onClick={() => refreshStatuses()}
                  className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800 px-2 py-0.5 rounded hover:bg-gray-100 transition-colors"
                  title="Rescan system for browsers"
                >
                  <RefreshCw className="w-3 h-3" />
                  Rescan
                </button>
              </div>

              <div className="space-y-2">
                {SUPPORTED_SPECIFIC_BROWSERS.map((browserName) => {
                  const status = browserStatuses[browserName];
                  return (
                    <div
                      key={browserName}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-50/70 border border-gray-200/70 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-3">
                        <BrowserIcon name={browserName} className="w-5 h-5 shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{browserName}</span>
                            {status?.detected ? (
                              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-medium">
                                {status.isCustom ? 'Custom' : 'Detected'}
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.2 bg-gray-100 text-gray-500 rounded font-medium">
                                Not detected
                              </span>
                            )}
                          </div>
                          <p 
                            className="text-[11px] text-gray-500 font-mono truncate max-w-[320px] mt-0.5"
                            title={status?.path || 'Not detected in standard folders'}
                          >
                            {status?.path || 'Not detected in standard folders'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {status?.isCustom && (
                          <button
                            type="button"
                            onClick={() => clearCustomBrowserPath(browserName)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Reset to automatic detection"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => locateBrowserExecutable(browserName)}
                          className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 bg-white border border-gray-200 hover:border-blue-300 px-2.5 py-1 rounded-lg shadow-2xs transition-all"
                        >
                          <FolderOpen className="w-3 h-3" />
                          {status?.detected ? 'Change...' : 'Locate...'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
