import React, { useState, useEffect } from 'react';
import { Tag } from '../../types/models';
import { Trash2, AlertTriangle, Hash, X, Loader2 } from 'lucide-react';

interface DeleteTagModalProps {
  tag: Tag;
  bookmarkCount: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DeleteTagModal: React.FC<DeleteTagModalProps> = ({
  tag,
  bookmarkCount,
  onClose,
  onConfirm,
}) => {
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
      await onConfirm();
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
                Delete Tag
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Remove this tag label from your library
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
          <div className="flex items-center gap-3 p-3.5 bg-gray-50 border border-gray-200/80 rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Hash className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">
                #{tag.name}
              </p>
              <p className="text-xs text-gray-500">
                Attached to {bookmarkCount} {bookmarkCount === 1 ? 'bookmark' : 'bookmarks'}
              </p>
            </div>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl">
            <p className="text-xs text-amber-900 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold">#{tag.name}</span>? The tag will be removed from all associated bookmarks. The bookmarks themselves will <strong>not</strong> be deleted.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-gray-100 bg-gray-50/60">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-white hover:text-gray-900 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Delete Tag</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
