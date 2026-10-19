import React, { useState, useEffect, useRef } from 'react';
import { Bookmark } from '../types/models';
import {
  Trash2,
  RotateCcw,
  Clock,
  Globe,
  ExternalLink,
  AlertTriangle,
  X,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import { useBookmarkOpener } from '../context/BookmarkOpenerContext';
import { useToast } from '../context/ToastContext';
import { DeleteBookmarkModal } from '../components/bookmarks/DeleteBookmarkModal';

interface RecycleBinPageProps {
  deletedBookmarks: Bookmark[];
  loading: boolean;
  searchQuery?: string;
  onRestoreBookmark: (id: number) => Promise<{ success: boolean; error?: string }>;
  onPermanentDeleteBookmark: (id: number) => Promise<{ success: boolean; error?: string }>;
  onEmptyRecycleBin: () => Promise<{ success: boolean; count?: number; error?: string }>;
}

function getDaysRemaining(deletedAt?: string | null): number {
  if (!deletedAt) return 15;
  const normalized = deletedAt.includes('T')
    ? deletedAt
    : `${deletedAt.replace(' ', 'T')}Z`;
  const deletedTime = new Date(normalized).getTime();
  if (isNaN(deletedTime)) return 15;
  const elapsedDays = (Date.now() - deletedTime) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(15 - elapsedDays));
}

export const RecycleBinPage: React.FC<RecycleBinPageProps> = ({
  deletedBookmarks,
  loading,
  searchQuery = '',
  onRestoreBookmark,
  onPermanentDeleteBookmark,
  onEmptyRecycleBin,
}) => {
  const { openBookmark } = useBookmarkOpener();
  const { success, error } = useToast();

  const [bookmarkToDelete, setBookmarkToDelete] = useState<Bookmark | null>(null);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [isEmptying, setIsEmptying] = useState(false);
  const [restoringIds, setRestoringIds] = useState<Set<number>>(new Set());
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    bookmark: Bookmark;
    x: number;
    y: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClose = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    document.addEventListener('mousedown', handleClose);
    document.addEventListener('contextmenu', handleClose);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClose);
      document.removeEventListener('contextmenu', handleClose);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  const query = searchQuery.trim().toLowerCase();
  const filteredBookmarks = query
    ? deletedBookmarks.filter(
        (b) =>
          (b.title && b.title.toLowerCase().includes(query)) ||
          b.url.toLowerCase().includes(query) ||
          (b.description && b.description.toLowerCase().includes(query))
      )
    : deletedBookmarks;

  const handleRestore = async (bookmark: Bookmark) => {
    setRestoringIds((prev) => new Set(prev).add(bookmark.id));
    try {
      const result = await onRestoreBookmark(bookmark.id);
      const displayName = bookmark.title || 'Untitled';
      if (result.success) {
        success('Bookmark Restored', `"${displayName}" has been restored to your library.`);
      } else {
        error('Restore Failed', result.error || 'Could not restore bookmark.');
      }
    } finally {
      setRestoringIds((prev) => {
        const next = new Set(prev);
        next.delete(bookmark.id);
        return next;
      });
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!bookmarkToDelete) return;
    const displayName = bookmarkToDelete.title || 'Untitled';
    const result = await onPermanentDeleteBookmark(bookmarkToDelete.id);
    if (result.success) {
      success('Bookmark Deleted', `"${displayName}" was permanently deleted.`);
    } else {
      error('Delete Failed', result.error || 'Could not permanently delete bookmark.');
    }
  };

  const handleConfirmEmptyTrash = async () => {
    setIsEmptying(true);
    try {
      const result = await onEmptyRecycleBin();
      if (result.success) {
        success('Recycle Bin Emptied', 'All trashed bookmarks were permanently deleted.');
        setShowEmptyConfirm(false);
      } else {
        error('Failed to Empty Recycle Bin', result.error || 'An error occurred.');
      }
    } finally {
      setIsEmptying(false);
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Trash2 className="w-6 h-6 text-gray-700" />
            <span>Recycle Bin</span>
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {filteredBookmarks.length} {filteredBookmarks.length === 1 ? 'bookmark' : 'bookmarks'} in
            Recycle Bin • Items older than 15 days are permanently deleted automatically.
          </p>
        </div>

        {deletedBookmarks.length > 0 && (
          <button
            type="button"
            onClick={() => setShowEmptyConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <Trash2 className="w-4 h-4" />
            <span>Empty Recycle Bin</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
          <p>Loading Recycle Bin...</p>
        </div>
      ) : filteredBookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <div className="bg-gray-100 p-6 rounded-full mb-4 text-gray-300">
            <Trash2 className="w-12 h-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Recycle Bin is empty</h3>
          <p className="text-sm text-gray-500">
            Deleted bookmarks will appear here for 15 days before being permanently removed.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBookmarks.map((bookmark) => {
            const displayName = bookmark.title || 'Untitled';
            const daysLeft = getDaysRemaining(bookmark.deleted_at);
            const isRestoring = restoringIds.has(bookmark.id);
            const hasImgError = imgErrors.has(bookmark.id);

            let hostname = '';
            try {
              hostname = new URL(bookmark.url).hostname;
            } catch {
              // Ignore invalid URL
            }

            const hasValidThumbnail = Boolean(
              bookmark.thumbnail_path && bookmark.thumbnail_path !== 'pending' && !hasImgError
            );
            const imageUrl = hasValidThumbnail
              ? `asset://${bookmark.thumbnail_path}`
              : hostname && !hasImgError
              ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`
              : null;

            return (
              <div
                key={bookmark.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({ bookmark, x: e.clientX, y: e.clientY });
                }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group flex flex-col"
              >
                <div className="relative h-40 w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={displayName}
                      onError={() =>
                        setImgErrors((prev) => new Set(prev).add(bookmark.id))
                      }
                      className={clsx(
                        'transition-transform group-hover:scale-105 grayscale-[30%]',
                        hasValidThumbnail
                          ? 'w-full h-full object-cover'
                          : 'w-16 h-16 object-contain opacity-70'
                      )}
                    />
                  ) : (
                    <Globe className="w-12 h-12 text-gray-300" />
                  )}

                  {/* Remaining Days Badge */}
                  <div
                    className={clsx(
                      'absolute top-2.5 left-2.5 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur shadow-xs border',
                      daysLeft <= 3
                        ? 'bg-red-50/95 text-red-700 border-red-200'
                        : 'bg-white/90 text-gray-700 border-gray-200/80'
                    )}
                    title="Automatically deleted after 15 days in Recycle Bin"
                  >
                    <Clock className="w-3 h-3" />
                    <span>
                      {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                    </span>
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <h3
                    className="font-semibold text-gray-900 line-clamp-2 leading-tight mb-1"
                    title={displayName}
                  >
                    {displayName}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">
                    {bookmark.description || 'No description available.'}
                  </p>

                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                    <a
                      href={bookmark.url}
                      onClick={(e) => {
                        e.preventDefault();
                        openBookmark(bookmark.url, bookmark.title || undefined);
                      }}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                      title="Visit URL"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Visit Site
                    </a>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleRestore(bookmark)}
                        disabled={isRestoring}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                        title="Restore Bookmark"
                      >
                        <RotateCcw className={clsx('w-3.5 h-3.5', isRestoring && 'animate-spin')} />
                        <span>Restore</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookmarkToDelete(bookmark)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        title="Delete Permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Right-click menu for Recycle Bin items */}
      {contextMenu && (
        <div
          ref={menuRef}
          style={{
            top: `${Math.min(contextMenu.y, window.innerHeight - 140)}px`,
            left: `${Math.min(contextMenu.x, window.innerWidth - 220)}px`,
          }}
          className="fixed z-[9999] min-w-[200px] bg-white/95 backdrop-blur-md rounded-xl border border-gray-200/90 shadow-2xl p-1.5 text-sm select-none animate-in fade-in zoom-in-95 duration-100 text-gray-800"
        >
          <div className="px-2.5 py-1.5 border-b border-gray-100 mb-1">
            <p className="font-semibold text-gray-900 truncate max-w-[190px]">
              {contextMenu.bookmark.title || 'Untitled'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              handleRestore(contextMenu.bookmark);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium text-xs leading-none">Restore</span>
              <span className="text-[10px] text-gray-400 mt-0.5">Move back to library</span>
            </div>
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button
            type="button"
            onClick={() => {
              setBookmarkToDelete(contextMenu.bookmark);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium text-xs leading-none">Delete Permanently</span>
              <span className="text-[10px] text-red-400 mt-0.5">Remove forever</span>
            </div>
          </button>
        </div>
      )}

      {/* Single Bookmark Permanent Delete Confirmation Modal */}
      {bookmarkToDelete && (
        <DeleteBookmarkModal
          bookmark={bookmarkToDelete}
          isPermanent={true}
          onClose={() => setBookmarkToDelete(null)}
          onConfirm={handleConfirmPermanentDelete}
        />
      )}

      {/* Empty Recycle Bin Confirmation Modal */}
      {showEmptyConfirm && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !isEmptying && setShowEmptyConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150 text-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">
                    Empty Recycle Bin?
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEmptyConfirm(false)}
                disabled={isEmptying}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-600 leading-relaxed">
                Are you sure you want to permanently delete all{' '}
                <strong className="text-gray-900">
                  {deletedBookmarks.length}{' '}
                  {deletedBookmarks.length === 1 ? 'bookmark' : 'bookmarks'}
                </strong>{' '}
                in the Recycle Bin? Once deleted, they cannot be recovered.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 bg-gray-50 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowEmptyConfirm(false)}
                disabled={isEmptying}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEmptyTrash}
                disabled={isEmptying}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isEmptying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Emptying...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Empty Recycle Bin</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
