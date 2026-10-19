import React, { useState, useEffect } from 'react';
import { Collection } from '../../types/models';
import { Trash2, AlertTriangle, Folder, X, Loader2, Check } from 'lucide-react';
import clsx from 'clsx';

interface DeleteCollectionModalProps {
  collection: Collection;
  bookmarkCount: number;
  initialDeleteBookmarks?: boolean;
  onClose: () => void;
  onConfirm: (deleteBookmarks: boolean) => Promise<void>;
}

export const DeleteCollectionModal: React.FC<DeleteCollectionModalProps> = ({
  collection,
  bookmarkCount,
  initialDeleteBookmarks = false,
  onClose,
  onConfirm,
}) => {
  const [deleteBookmarks, setDeleteBookmarks] = useState(initialDeleteBookmarks);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isDeleting]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(deleteBookmarks);
      onClose();
    } catch (e) {
      console.error(e);
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => !isDeleting && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150 text-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 leading-tight">
                Delete Collection
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Items are moved to the Recycle Bin and permanently deleted after 15 days
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Target Collection Preview */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200/80">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
              <Folder className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{collection.name}</p>
              {collection.description && (
                <p className="text-xs text-gray-500 truncate">{collection.description}</p>
              )}
            </div>
            <span className="text-xs font-medium text-gray-600 bg-white border border-gray-200 px-2.5 py-1 rounded-full shrink-0">
              {bookmarkCount} {bookmarkCount === 1 ? 'bookmark' : 'bookmarks'}
            </span>
          </div>

          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
              Deletion Options
            </label>

            {/* Option 1: Delete only collection data */}
            <div
              onClick={() => !isDeleting && setDeleteBookmarks(false)}
              className={clsx(
                'p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3',
                !deleteBookmarks
                  ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              )}
            >
              <div className="pt-0.5">
                <div
                  className={clsx(
                    'w-4 h-4 rounded-full border flex items-center justify-center transition-colors',
                    !deleteBookmarks
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-300 bg-white'
                  )}
                >
                  {!deleteBookmarks && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-gray-900">
                    1. Delete only collection data
                  </span>
                  <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                    Keeps Bookmarks
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Moves the collection folder to the Recycle Bin (permanently deleted after 15 days).
                  Your{' '}
                  <strong className="text-gray-900">
                    {bookmarkCount} bookmark{bookmarkCount === 1 ? '' : 's'}
                  </strong>{' '}
                  will remain active in your library.
                </p>
              </div>
            </div>

            {/* Option 2: Delete both collection and bookmarks */}
            <div
              onClick={() => !isDeleting && setDeleteBookmarks(true)}
              className={clsx(
                'p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3',
                deleteBookmarks
                  ? 'border-red-600 bg-red-50/50 shadow-xs'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              )}
            >
              <div className="pt-0.5">
                <div
                  className={clsx(
                    'w-4 h-4 rounded-full border flex items-center justify-center transition-colors',
                    deleteBookmarks
                      ? 'border-red-600 bg-red-600 text-white'
                      : 'border-gray-300 bg-white'
                  )}
                >
                  {deleteBookmarks && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-gray-900">
                    2. Delete collection and contained bookmarks
                  </span>
                  <span className="text-[10px] font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full shrink-0">
                    Recycle Bin (15d)
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Moves both this collection and all{' '}
                  <strong className="text-red-700">
                    {bookmarkCount} contained bookmark{bookmarkCount === 1 ? '' : 's'}
                  </strong>{' '}
                  to the Recycle Bin. They will be permanently deleted after 15 days.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 bg-gray-50 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className={clsx(
              'px-4 py-2 text-sm font-medium text-white rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50',
              deleteBookmarks
                ? 'bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-500/30'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/30'
            )}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Moving to Recycle Bin...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>
                  {deleteBookmarks
                    ? `Delete Collection & ${bookmarkCount} Bookmarks`
                    : 'Delete Collection Only'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
