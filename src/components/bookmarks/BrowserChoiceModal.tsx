import React, { useState } from 'react';
import { X, ExternalLink, FolderOpen } from 'lucide-react';
import { BrowserIcon } from '../common/BrowserIcon';
import { BrowserStatusInfo } from '../../types/browser';

interface BrowserChoiceModalProps {
  isOpen: boolean;
  url: string;
  title?: string;
  statuses: Record<string, BrowserStatusInfo>;
  onClose: () => void;
  onSelectBrowser: (browserName: string, rememberChoice: boolean) => void;
  onLocateBrowser: (browserName: string) => void;
}

const BROWSERS_TO_CHOOSE = [
  'Default Browser',
  'Google Chrome',
  'Mozilla Firefox',
  'Microsoft Edge',
  'Opera',
  'Yandex',
  'Brave'
];

export const BrowserChoiceModal: React.FC<BrowserChoiceModalProps> = ({
  isOpen,
  url,
  title,
  statuses,
  onClose,
  onSelectBrowser,
  onLocateBrowser
}) => {
  const [rememberChoice, setRememberChoice] = useState(false);

  if (!isOpen) return null;

  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = url;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 overflow-hidden transform transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="browser-choice-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/70">
          <div>
            <h2 id="browser-choice-title" className="text-lg font-bold text-gray-900">
              Open Bookmark With
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Choose which browser to use to open this bookmark
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-full transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bookmark URL details preview */}
        <div className="px-6 py-3.5 bg-blue-50/50 border-b border-blue-100/50 flex items-center gap-3">
          <div className="p-2 bg-blue-100/70 text-blue-600 rounded-lg shrink-0">
            <ExternalLink className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-semibold text-gray-900 truncate">
              {title || hostname}
            </h3>
            <p className="text-[11px] text-gray-500 truncate" title={url}>
              {url}
            </p>
          </div>
        </div>

        {/* Browser Options List */}
        <div className="p-4 max-h-[360px] overflow-y-auto space-y-2">
          {BROWSERS_TO_CHOOSE.map((browserName) => {
            const status = statuses[browserName];
            const isSpecific = browserName !== 'Default Browser';
            const isDetected = !isSpecific || status?.detected;

            return (
              <div
                key={browserName}
                className="group flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 transition-all cursor-pointer"
                onClick={() => onSelectBrowser(browserName, rememberChoice)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-gray-50 group-hover:bg-white rounded-lg border border-gray-100 shadow-2xs transition-colors shrink-0">
                    <BrowserIcon name={browserName} className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-900 group-hover:text-blue-700 transition-colors">
                        {browserName}
                      </span>
                      {browserName === 'Default Browser' && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                          System
                        </span>
                      )}
                    </div>
                    {isSpecific && (
                      <p className="text-[11px] text-gray-400 truncate max-w-[280px]">
                        {status?.isCustom
                          ? 'Custom executable set'
                          : status?.detected
                          ? status.path || 'Detected'
                          : 'Not detected in standard locations'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isSpecific && !isDetected ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onLocateBrowser(browserName);
                      }}
                      className="flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition-colors"
                      title="Browse to find executable (.exe)"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      Locate
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
                    >
                      Open
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer with Remember Option */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberChoice}
              onChange={(e) => setRememberChoice(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
            />
            <span>Remember choice as default browser</span>
          </label>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
