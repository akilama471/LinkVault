import React, { useState, useRef, useEffect } from 'react';
import { Bookmark as BookmarkModel } from '../../types/models';
import { ExternalLink, Star, Trash2, Flag, Edit2, RotateCw, Globe, Loader2, EyeOff } from 'lucide-react';
import clsx from 'clsx';
import { useBookmarkOpener } from '../../context/BookmarkOpenerContext';
import { useToast } from '../../context/ToastContext';
import { BookmarkContextMenu } from './BookmarkContextMenu';
import { DeleteBookmarkModal } from './DeleteBookmarkModal';
import { ViewMode } from '../common/ViewModeToggle';

export interface BookmarkCardProps {
  bookmark: BookmarkModel;
  onDelete: (id: number) => Promise<any> | void;
  onToggleFavorite: (id: number, current: boolean) => void;
  onToggleImportant: (id: number, current: boolean) => void;
  onEdit: (bookmark: BookmarkModel) => void;
  onUpdate?: (id: number, data: Partial<BookmarkModel>) => Promise<any> | void;
  onRefetch?: (id: number) => Promise<{ success: boolean; data?: BookmarkModel; error?: string }>;
  viewMode?: ViewMode;
  isSelected?: boolean;
  isFocused?: boolean;
  isSelectionActive?: boolean;
  onToggleSelect?: (id: number, e: React.MouseEvent | React.ChangeEvent) => void;
  onClickCard?: (id: number, e: React.MouseEvent) => void;
  cardIndex?: number;
}

export const BookmarkCard: React.FC<BookmarkCardProps> = ({
  bookmark,
  onDelete,
  onToggleFavorite,
  onToggleImportant,
  onEdit,
  onUpdate,
  onRefetch,
  viewMode = 'comfortable',
  isSelected = false,
  isFocused = false,
  isSelectionActive = false,
  onToggleSelect,
  onClickCard,
  cardIndex
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

  const cardRef = useRef<HTMLDivElement>(null);
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

  // Scroll into view if keyboard focus is moved here
  useEffect(() => {
    if (isFocused && cardRef.current) {
      cardRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isFocused]);

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

  const handleCardClick = (e: React.MouseEvent) => {
    if (isRenaming) return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      onToggleSelect?.(bookmark.id, e);
    } else if (e.shiftKey) {
      e.preventDefault();
      onClickCard?.(bookmark.id, e);
    } else if (onClickCard) {
      onClickCard(bookmark.id, e);
    }
  };

  // -------------------------------------------------------------
  // DETAILED LIST VIEW ROW
  // -------------------------------------------------------------
  if (viewMode === 'list') {
    return (
      <>
        <div
          ref={cardRef}
          id={`bookmark-card-${bookmark.id}`}
          data-bookmark-index={cardIndex}
          onContextMenu={handleContextMenu}
          onClick={handleCardClick}
          className={clsx(
            "relative bg-white rounded-xl shadow-2xs border p-3 flex items-center gap-3.5 transition-all group select-none cursor-pointer",
            isRenaming && "border-blue-500 ring-2 ring-blue-500/20 shadow-sm",
            isSelected && "border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/20 shadow-xs",
            isFocused && !isSelected && "ring-2 ring-blue-500 border-blue-400 shadow-md",
            !isSelected && !isFocused && !isRenaming && "border-gray-200 hover:border-gray-300 hover:shadow-xs",
            isRefetching && "pointer-events-none select-none opacity-70"
          )}
        >
          {/* Checkbox */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(bookmark.id, e);
            }}
            className="flex items-center justify-center p-1 rounded hover:bg-gray-100 cursor-pointer shrink-0"
            title={isSelected ? "Deselect" : "Select (Ctrl+Click or Space)"}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelect?.(bookmark.id, e);
              }}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer pointer-events-none"
              tabIndex={-1}
            />
          </div>

          {/* Thumbnail preview */}
          <div className="relative w-14 h-11 rounded-lg bg-gray-100 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={displayName}
                onError={() => setImgError(true)}
                className={clsx(
                  isFavicon ? "w-6 h-6 object-contain opacity-80" : "w-full h-full object-cover"
                )}
              />
            ) : (
              <Globe className="w-5 h-5 text-gray-300" />
            )}
            {bookmark.thumbnail_path === 'pending' && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
              </div>
            )}
          </div>

          {/* Middle info */}
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 mb-0.5">
              {isRenaming ? (
                <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleRenameKeyDown}
                    onBlur={handleSaveRename}
                    disabled={isSavingRename}
                    className="w-full font-semibold text-xs text-gray-900 bg-white border border-blue-500 rounded px-2 py-0.5 outline-none"
                  />
                </div>
              ) : (
                <h3
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleStartRename();
                  }}
                  className="font-semibold text-sm text-gray-900 truncate"
                  title={`${displayName} (Double-click to rename)`}
                >
                  {displayName}
                </h3>
              )}

              {hostname && (
                <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                  {hostname}
                </span>
              )}

              {bookmark.hide_mode === 1 && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                  <EyeOff className="w-2.5 h-2.5" /> Hidden (All)
                </span>
              )}
              {bookmark.hide_mode === 2 && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                  <EyeOff className="w-2.5 h-2.5" /> Hidden
                </span>
              )}
            </div>

            <p className="text-xs text-gray-500 truncate max-w-2xl">
              {bookmark.description || bookmark.url}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleImportant(bookmark.id, bookmark.is_important);
              }}
              className={clsx(
                "p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer",
                bookmark.is_important ? "text-red-500" : "text-gray-400 hover:text-gray-600"
              )}
              title="Mark as Important"
            >
              <Flag className="w-4 h-4" fill={bookmark.is_important ? "currentColor" : "none"} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(bookmark.id, bookmark.is_favorite);
              }}
              className={clsx(
                "p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer",
                bookmark.is_favorite ? "text-yellow-500" : "text-gray-400 hover:text-gray-600"
              )}
              title="Favorite"
            >
              <Star className="w-4 h-4" fill={bookmark.is_favorite ? "currentColor" : "none"} />
            </button>

            <a
              href={bookmark.url}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openBookmark(bookmark.url, bookmark.title || undefined);
              }}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
              title="Visit site in browser"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Visit</span>
            </a>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(bookmark);
              }}
              className="text-gray-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              title="Edit Details"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteModal(true);
              }}
              className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
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
            onUpdateHideMode={(mode) => onUpdate && onUpdate(bookmark.id, { hide_mode: mode })}
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
  }

  // -------------------------------------------------------------
  // COMPACT & COMFORTABLE GRID CARDS
  // -------------------------------------------------------------
  const isCompact = viewMode === 'compact';

  return (
    <>
      <div
        ref={cardRef}
        id={`bookmark-card-${bookmark.id}`}
        data-bookmark-index={cardIndex}
        onContextMenu={handleContextMenu}
        onClick={handleCardClick}
        className={clsx(
          "relative bg-white rounded-xl shadow-xs border overflow-hidden transition-all group flex flex-col cursor-pointer select-none",
          isRenaming && "border-blue-500 ring-2 ring-blue-500/20 shadow-md",
          isSelected && "border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/15 shadow-sm",
          isFocused && !isSelected && "ring-2 ring-blue-500 border-blue-400 shadow-md",
          !isSelected && !isFocused && !isRenaming && "border-gray-200 hover:border-gray-300 hover:shadow-md",
          isRefetching && "pointer-events-none select-none"
        )}
      >
        {/* Refetching Loading Overlay */}
        {isRefetching && (
          <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 animate-in fade-in duration-200">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50/90 border border-blue-100 shadow-sm">
              <Globe className="w-6 h-6 text-blue-300/60" />
              <RotateCw className="w-6 h-6 text-blue-600 animate-spin absolute" />
            </div>
            <span className="text-[11px] font-medium text-blue-600 bg-white/95 px-2.5 py-0.5 rounded-full border border-blue-100 shadow-xs animate-pulse">
              Refetching...
            </span>
          </div>
        )}

        {/* Multi-Select Checkbox Overlay (Top Left) */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(bookmark.id, e);
          }}
          className={clsx(
            "absolute z-10 p-1 rounded-lg transition-all cursor-pointer flex items-center justify-center",
            isCompact ? "top-1.5 left-1.5" : "top-2 left-2",
            isSelected
              ? "opacity-100 bg-blue-600 text-white shadow-md ring-2 ring-white"
              : isSelectionActive
              ? "opacity-90 bg-white/95 text-gray-500 hover:text-gray-800 hover:bg-white shadow-xs border border-gray-200"
              : "opacity-0 group-hover:opacity-100 bg-white/90 hover:bg-white text-gray-400 hover:text-gray-700 shadow-xs border border-gray-200"
          )}
          title={isSelected ? "Deselect" : "Select (Ctrl+Click or Space)"}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect?.(bookmark.id, e);
            }}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer pointer-events-none"
            tabIndex={-1}
          />
        </div>

        {/* Thumbnail preview area */}
        <div
          className={clsx(
            "relative w-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0",
            isCompact ? "h-28" : "h-40"
          )}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={displayName}
              onError={() => setImgError(true)}
              className={clsx(
                "transition-transform group-hover:scale-105",
                isFavicon
                  ? isCompact ? "w-10 h-10 object-contain opacity-70" : "w-16 h-16 object-contain opacity-70"
                  : "w-full h-full object-cover"
              )}
            />
          ) : (
            <Globe className={clsx("text-gray-300", isCompact ? "w-8 h-8" : "w-12 h-12")} />
          )}

          {bookmark.thumbnail_path === 'pending' && (
            <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/95 border border-blue-200 text-[10px] font-medium text-blue-600 shadow-2xs backdrop-blur-xs">
              <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-500" />
              <span>Fetching...</span>
            </div>
          )}

          {/* Top Right Quick Actions (Important & Favorite) */}
          <div className={clsx("absolute flex items-center gap-1", isCompact ? "top-1.5 right-1.5" : "top-2 right-2")}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleImportant(bookmark.id, bookmark.is_important);
              }}
              className={clsx(
                "rounded-full bg-white/80 backdrop-blur shadow-xs hover:bg-white transition-colors cursor-pointer",
                isCompact ? "p-1" : "p-1.5",
                bookmark.is_important ? "text-red-500" : "text-gray-400"
              )}
              title="Mark as Important"
            >
              <Flag className={isCompact ? "w-3 h-3" : "w-4 h-4"} fill={bookmark.is_important ? "currentColor" : "none"} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(bookmark.id, bookmark.is_favorite);
              }}
              className={clsx(
                "rounded-full bg-white/80 backdrop-blur shadow-xs hover:bg-white transition-colors cursor-pointer",
                isCompact ? "p-1" : "p-1.5",
                bookmark.is_favorite ? "text-yellow-500" : "text-gray-400"
              )}
              title="Favorite"
            >
              <Star className={isCompact ? "w-3 h-3" : "w-4 h-4"} fill={bookmark.is_favorite ? "currentColor" : "none"} />
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className={clsx("flex flex-col flex-1", isCompact ? "p-3" : "p-4")}>
          {bookmark.hide_mode === 1 && (
            <span
              title="Hidden only from All Bookmarks (Method 1)"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 mb-1 w-fit"
            >
              <EyeOff className="w-2.5 h-2.5" /> Hidden (All)
            </span>
          )}
          {bookmark.hide_mode === 2 && (
            <span
              title="Hidden from all locations (Method 2)"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200 mb-1 w-fit"
            >
              <EyeOff className="w-2.5 h-2.5" /> Hidden
            </span>
          )}

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
                  className="w-full font-semibold text-xs text-gray-900 bg-white border border-blue-500 rounded-md px-2 py-1 shadow-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Bookmark name"
                />
                {isSavingRename && (
                  <div className="absolute right-2 top-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                  </div>
                )}
              </div>
              <span className="block text-[9px] text-gray-400 mt-0.5 select-none">
                Enter to save • Esc to cancel
              </span>
            </div>
          ) : (
            <h3
              onDoubleClick={(e) => {
                e.stopPropagation();
                handleStartRename();
              }}
              className={clsx(
                "font-semibold text-gray-900 leading-tight mb-1 cursor-text",
                isCompact ? "text-xs line-clamp-1" : "text-sm line-clamp-2"
              )}
              title={`${bookmark.title || bookmark.url} (Double-click or right-click to rename)`}
            >
              {displayName}
            </h3>
          )}

          {!isCompact && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1">
              {bookmark.description || 'No description available.'}
            </p>
          )}

          {isCompact && hostname && (
            <span className="text-[10px] text-gray-400 truncate mb-2">
              {hostname}
            </span>
          )}

          {/* Footer actions */}
          <div
            className={clsx(
              "flex items-center justify-between mt-auto border-t border-gray-100",
              isCompact ? "pt-2" : "pt-3"
            )}
          >
            <a
              href={bookmark.url}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openBookmark(bookmark.url, bookmark.title || undefined);
              }}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              title="Visit URL"
            >
              <ExternalLink className="w-3 h-3" />
              <span>{isCompact ? "Visit" : "Visit Site"}</span>
            </a>

            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(bookmark);
                }}
                className="text-gray-400 hover:text-blue-600 transition-colors cursor-pointer p-0.5"
                title="Edit Details"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteModal(true);
                }}
                className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer p-0.5"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
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
          onUpdateHideMode={(mode) => onUpdate && onUpdate(bookmark.id, { hide_mode: mode })}
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
