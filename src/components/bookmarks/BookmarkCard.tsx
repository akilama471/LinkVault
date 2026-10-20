import React, { useState, useRef, useEffect } from 'react';
import { Bookmark as BookmarkModel } from '../../types/models';
import { ExternalLink, Star, Trash2, Flag, Edit2, RotateCw, Globe, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useBookmarkOpener } from '../../context/BookmarkOpenerContext';
import { useToast } from '../../context/ToastContext';
import { BookmarkContextMenu } from './BookmarkContextMenu';
import { DeleteBookmarkModal } from './DeleteBookmarkModal';

interface BookmarkCardProps {
  bookmark: BookmarkModel;
  onDelete: (id: number) => Promise<any> | void;
  onToggleFavorite: (id: number, current: boolean) => void;
  onToggleImportant: (id: number, current: boolean) => void;
  onEdit: (bookmark: BookmarkModel) => void;
  onUpdate?: (id: number, data: Partial<BookmarkModel>) => Promise<any> | void;
  onRefetch?: (id: number) => Promise<{ success: boolean; data?: BookmarkModel; error?: string }>;
}

export const BookmarkCard: React.FC<BookmarkCardProps> = ({
  bookmark,
  onDelete,
  onToggleFavorite,
  onToggleImportant,
  onEdit,
  onUpdate,
  onRefetch,
}) => {
  const { openBookmark } = useBookmarkOpener();
  const { success, error } = useToast();

  const displayName = bookmark.title || 'Untitled';
  const [isRefetching, setIsRefetching] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [editValue, setEditValue] = useState(displayName);
  const [isSavingRename, setIsSavingRename] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRenameRef = useRef(false);

  // Sync editValue when bookmark title or rename mode changes
  useEffect(() => {
    if (isRenaming) {
      setEditValue(bookmark.title || 'Untitled');
    }
  }, [isRenaming, bookmark.title]);

  // Focus and select text when entering rename mode (like Windows File Explorer)
  useEffect(() => {
    if (isRenaming) {
      const focusInput = () => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      };
      focusInput();
      const timer = setTimeout(focusInput, 15);
      return () => clearTimeout(timer);
    }
  }, [isRenaming]);

  // Reset image error state when thumbnail changes
  useEffect(() => {
    setImgError(false);
  }, [bookmark.thumbnail_path, bookmark.updated_at]);

  let hostname = '';
  try {
    hostname = new URL(bookmark.url).hostname;
  } catch (e) {
    // Ignore invalid urls
  }

  const fallbackUrl = hostname
    ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`
    : null;

  const hasValidThumbnail = Boolean(bookmark.thumbnail_path && bookmark.thumbnail_path !== 'pending' && !imgError);
  const imageUrl = hasValidThumbnail
    ? `asset://${bookmark.thumbnail_path}`
    : fallbackUrl;

  const isFavicon = !hasValidThumbnail;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('close-context-menus'));
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleRefetch = async () => {
    if (isRefetching) return;
    setIsRefetching(true);
    try {
      let result: { success: boolean; data?: BookmarkModel; error?: string };
      if (onRefetch) {
        result = await onRefetch(bookmark.id);
      } else {
        // @ts-ignore
        result = await window.electronAPI.bookmarks.refetch(bookmark.id);
      }

      if (result && result.success) {
        success('Bookmark Updated', `Refetched latest details for "${result.data?.title || displayName}".`);
      } else {
        error('Refetch Failed', result?.error || 'Could not update bookmark details from the internet.');
      }
    } catch (err: any) {
      error('Refetch Failed', err?.message || 'Could not update bookmark details from the internet.');
    } finally {
      setIsRefetching(false);
    }
  };

  const handleStartRename = () => {
    isSubmittingRenameRef.current = false;
    setEditValue(bookmark.title || 'Untitled');
    setIsRenaming(true);
  };

  const handleCancelRename = () => {
    isSubmittingRenameRef.current = false;
    setEditValue(bookmark.title || 'Untitled');
    setIsRenaming(false);
  };

  const handleSaveRename = async () => {
    if (!isRenaming || isSubmittingRenameRef.current) return;

    const trimmed = editValue.trim();
    if (!trimmed || trimmed === displayName) {
      handleCancelRename();
      return;
    }

    isSubmittingRenameRef.current = true;
    setIsSavingRename(true);
    try {
      if (onUpdate) {
        await onUpdate(bookmark.id, { title: trimmed });
      } else {
        // @ts-ignore
        await window.electronAPI.bookmarks.update(bookmark.id, { title: trimmed });
      }
      setIsRenaming(false);
      success('Bookmark Renamed', `Display name changed to "${trimmed}".`);
    } catch (err: any) {
      error('Rename Failed', err?.message || 'Failed to rename bookmark.');
    } finally {
      setIsSavingRename(false);
      isSubmittingRenameRef.current = false;
    }
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleSaveRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleCancelRename();
    }
  };

  return (
    <>
      <div
        onContextMenu={handleContextMenu}
        className={clsx(
          "relative bg-white rounded-xl shadow-sm border overflow-hidden transition-all group flex flex-col",
          isRenaming
            ? "border-blue-500 ring-2 ring-blue-500/20 shadow-md"
            : "border-gray-200 hover:shadow-md",
          isRefetching && "pointer-events-none select-none"
        )}
      >
        {/* Refetching Loading Overlay over the Bookmark Card component */}
        {isRefetching && (
          <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2.5 animate-in fade-in duration-200">
            <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50/90 border border-blue-100 shadow-sm">
              <Globe className="w-7 h-7 text-blue-300/60" />
              <RotateCw className="w-7 h-7 text-blue-600 animate-spin absolute" />
            </div>
            <span className="text-xs font-medium text-blue-600 bg-white/95 px-3 py-1 rounded-full border border-blue-100 shadow-xs animate-pulse">
              Refetching details...
            </span>
          </div>
        )}

        <div className="relative h-40 w-full bg-gray-100 flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={bookmark.title || 'Bookmark'}
              onError={() => setImgError(true)}
              className={clsx(
                "transition-transform group-hover:scale-105",
                isFavicon ? "w-16 h-16 object-contain opacity-70" : "w-full h-full object-cover"
              )}
            />
          ) : (
            <Globe className="w-12 h-12 text-gray-300" />
          )}

          {bookmark.thumbnail_path === 'pending' && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/95 border border-blue-200 text-[11px] font-medium text-blue-600 shadow-xs backdrop-blur-xs">
              <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
              <span>Fetching details...</span>
            </div>
          )}
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <button
              onClick={() => onToggleImportant(bookmark.id, bookmark.is_important)}
              className={clsx(
                "p-1.5 rounded-full bg-white/80 backdrop-blur shadow-sm hover:bg-white transition-colors cursor-pointer",
                bookmark.is_important ? "text-red-500" : "text-gray-400"
              )}
              title="Mark as Important"
            >
              <Flag className="w-4 h-4" fill={bookmark.is_important ? "currentColor" : "none"} />
            </button>
            <button
              onClick={() => onToggleFavorite(bookmark.id, bookmark.is_favorite)}
              className={clsx(
                "p-1.5 rounded-full bg-white/80 backdrop-blur shadow-sm hover:bg-white transition-colors cursor-pointer",
                bookmark.is_favorite ? "text-yellow-500" : "text-gray-400"
              )}
              title="Favorite"
            >
              <Star className="w-4 h-4" fill={bookmark.is_favorite ? "currentColor" : "none"} />
            </button>
          </div>
        </div>

        <div className="p-4 flex flex-col flex-1">
          {isRenaming ? (
            <div className="mb-1.5" onClick={(e) => e.stopPropagation()}>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleRenameKeyDown}
                  onBlur={handleSaveRename}
                  disabled={isSavingRename}
                  className="w-full font-semibold text-sm text-gray-900 bg-white border border-blue-500 rounded-md px-2 py-1 shadow-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Bookmark name"
                />
                {isSavingRename && (
                  <div className="absolute right-2 top-1.5">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  </div>
                )}
              </div>
              <span className="block text-[10px] text-gray-400 mt-0.5 select-none">
                Enter to save • Esc to cancel
              </span>
            </div>
          ) : (
            <h3
              onDoubleClick={(e) => {
                e.stopPropagation();
                handleStartRename();
              }}
              className="font-semibold text-gray-900 line-clamp-2 leading-tight mb-1 cursor-text"
              title={`${bookmark.title || bookmark.url} (Double-click or right-click to rename)`}
            >
              {displayName}
            </h3>
          )}

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

            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(bookmark)}
                className="text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                title="Edit Details"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {contextMenu && (
        <BookmarkContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          bookmark={bookmark}
          isRefetching={isRefetching}
          onClose={() => setContextMenu(null)}
          onRefetch={handleRefetch}
          onRename={handleStartRename}
          onDelete={() => setShowDeleteModal(true)}
        />
      )}

      {showDeleteModal && (
        <DeleteBookmarkModal
          bookmark={bookmark}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={async () => {
            await onDelete(bookmark.id);
            success('Moved to Recycle Bin', `"${displayName}" was moved to the Recycle Bin.`);
          }}
        />
      )}
    </>
  );
};
