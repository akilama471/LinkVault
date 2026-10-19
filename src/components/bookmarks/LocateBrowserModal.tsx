import React from 'react';
import { AlertCircle, FolderOpen, X } from 'lucide-react';
import { BrowserIcon } from '../common/BrowserIcon';

interface LocateBrowserModalProps {
  isOpen: boolean;
  browserName: string;
  onClose: () => void;
  onLocate: () => void;
}

export const LocateBrowserModal: React.FC<LocateBrowserModalProps> = ({
  isOpen,
  browserName,
  onClose,
  onLocate
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden transform transition-all"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Browser Not Detected</h3>
              <p className="text-xs text-gray-500">Executable required to open bookmarks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <BrowserIcon name={browserName} className="w-8 h-8 shrink-0" />
            <div>
              <p className="font-semibold text-sm text-gray-900">{browserName}</p>
              <p className="text-xs text-gray-500">Not found at default operating system locations.</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed">
            Browsers may be installed on custom drives or as portable applications. Please locate the executable file (<code className="text-xs font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-800">.exe</code>) on your computer. LinkVault will remember this location for future use.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 bg-gray-50 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onLocate}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-xl shadow-sm transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
            Locate Executable (.exe)
          </button>
        </div>
      </div>
    </div>
  );
};
