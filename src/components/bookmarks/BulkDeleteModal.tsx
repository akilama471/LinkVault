import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { Bookmark } from '../../types/models';

interface BulkDeleteModalProps {
  selectedCount: number;
  selectedBookmarks: Bookmark[];
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export const BulkDeleteModal: React.FC<BulkDeleteModalProps> = ({
  selectedCount,
  selectedBookmarks,
  onClose,
  onConfirm
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-2xl border border-red-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Move {selectedCount} {selectedCount === 1 ? 'bookmark' : 'bookmarks'} to Recycle Bin?
          </h3>

          <p className="text-sm text-gray-600 mb-4">
            The selected bookmarks will be moved to the Recycle Bin. You can restore them anytime within 15 days before they are permanently purged.
          </p>

          {selectedBookmarks.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-5 max-h-36 overflow-y-auto space-y-1.5 text-xs">
              {selectedBookmarks.slice(0, 5).map(b => (
                <div key={b.id} className="text-gray-700 truncate font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  <span className="truncate">{b.title || b.url}</span>
                </div>
              ))}
              {selectedCount > 5 && (
                <div className="text-gray-400 font-medium pl-3">
                  + {selectedCount - 5} more...
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-xs mb-6">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Links, cached descriptions, and tagged categories will remain recoverable in Recycle Bin.</span>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? 'Moving...' : `Move ${selectedCount} to Recycle Bin`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
