import React, { useState, useEffect } from 'react';
import { Bookmark } from '../../types/models';
import { Trash2, AlertTriangle, Globe, X, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface DeleteBookmarkModalProps {
  bookmark: Bookmark;
  isPermanent?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export const DeleteBookmarkModal: React.FC<DeleteBookmarkModalProps> = ({
  bookmark,
  isPermanent = false,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isDeleting]);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      console.error(e);
      setIsDeleting(false);
    }
  };

  let hostname = '';
  try {
    hostname = new URL(bookmark.url).hostname;
  } catch {
    // Ignore invalid URL
  }

  const hasValidThumbnail = Boolean(
    bookmark.thumbnail_path && bookmark.thumbnail_path !== 'pending' && !imgError
  );
  const iconUrl = hasValidThumbnail
    ? `asset://${bookmark.thumbnail_path}`
    : hostname && !imgError
    ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
    : null;

  const displayName = bookmark.title || 'Untitled';

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
                {isPermanent ? 'Delete Permanently?' : 'Delete Bookmark?'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {isPermanent
                  ? 'This action cannot be undone'
                  : 'Move this bookmark to the Recycle Bin'}
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
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200/80">
            <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
              {iconUrl ? (
                <img
                  src={iconUrl}
                  alt={displayName}
                  onError={() => setImgError(true)}
                  className={clsx(
                    hasValidThumbnail ? 'w-full h-full object-cover' : 'w-6 h-6 object-contain'
                  )}
                />
              ) : (
                <Globe className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate" title={displayName}>
                {displayName}
              </p>
              <p className="text-xs text-gray-500 truncate" title={bookmark.url}>
                {bookmark.url}
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed">
            {isPermanent ? (
              <>
                Are you sure you want to permanently delete{' '}
                <strong className="text-gray-900">"{displayName}"</strong>? It will be removed from
                your database immediately and cannot be recovered.
              </>
            ) : (
              <>
                Are you sure you want to delete{' '}
                <strong className="text-gray-900">"{displayName}"</strong>? It will be moved to the{' '}
                <strong className="text-gray-900">Recycle Bin</strong> and permanently deleted after{' '}
                <strong className="text-gray-900">15 days</strong>.
              </>
            )}
          </p>
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
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-500/30 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>{isPermanent ? 'Delete Permanently' : 'Move to Recycle Bin'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
