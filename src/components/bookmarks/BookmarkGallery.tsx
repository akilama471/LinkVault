import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { BookmarkCard } from './BookmarkCard';
import { BookmarkDetailsModal } from './BookmarkDetailsModal';
import { BulkActionBar } from './BulkActionBar';
import { BulkDeleteModal } from './BulkDeleteModal';
import { BulkTagModal } from './BulkTagModal';
import { BulkCollectionModal } from './BulkCollectionModal';
import { BulkHideModeModal } from './BulkHideModeModal';
import { ViewModeToggle, ViewMode } from '../common/ViewModeToggle';
import { KeyboardShortcutsModal } from '../common/KeyboardShortcutsModal';
import { Bookmark } from '../../types/models';
import { Search, Loader2, ChevronLeft, ChevronRight, CheckSquare } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useBookmarkOpener } from '../../context/BookmarkOpenerContext';

export interface BookmarkGalleryProps {
  bookmarks: Bookmark[];
  loading?: boolean;
  onDeleteBookmark: (id: number) => void;
  onToggleFavorite: (id: number, current: boolean) => void;
  onToggleImportant: (id: number, current: boolean) => void;
  onUpdateBookmark: (id: number, data: Partial<Bookmark>) => any;
  onRefetchBookmark?: (id: number) => Promise<{ success: boolean; data?: Bookmark; error?: string }>;
  onBulkDeleteBookmarks?: (ids: number[]) => Promise<{ success: boolean; count?: number; error?: string }>;
  onBulkUpdateBookmarks?: (ids: number[], data: Partial<Bookmark>) => Promise<{ success: boolean; count?: number; error?: string }>;
  onBulkAddTags?: (bookmarkIds: number[], tagNames: string[]) => Promise<any>;
  onBulkRemoveTags?: (bookmarkIds: number[], tagIds: number[]) => Promise<any>;
  onBulkAddToCollection?: (collectionId: number, bookmarkIds: number[]) => Promise<any>;
  headerTitle?: React.ReactNode;
  headerSubtitle?: React.ReactNode;
  headerActions?: React.ReactNode;
  defaultSort?: 'newest' | 'oldest' | 'title-asc' | 'title-desc';
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  itemsPerPage?: number;
}

export const BookmarkGallery: React.FC<BookmarkGalleryProps> = ({
  bookmarks,
  loading = false,
  onDeleteBookmark,
  onToggleFavorite,
  onToggleImportant,
  onUpdateBookmark,
  onRefetchBookmark,
  onBulkDeleteBookmarks,
  onBulkUpdateBookmarks,
  onBulkAddTags,
  onBulkRemoveTags,
  onBulkAddToCollection,
  headerTitle,
  headerSubtitle,
  headerActions,
  defaultSort = 'newest',
  emptyStateTitle = 'No bookmarks here',
  emptyStateDescription = 'Try saving a new URL or adjusting your filters.',
  itemsPerPage = 50,
}) => {
  const { success, error } = useToast();
  const { openBookmark } = useBookmarkOpener();

  // 1. View Mode (persisted in localStorage)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem('linkvault_view_mode');
      if (saved === 'comfortable' || saved === 'compact' || saved === 'list') {
        return saved;
      }
    } catch {
      // fallback
    }
    return 'comfortable';
  });

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('linkvault_view_mode', mode);
    } catch {
      // ignore
    }
  };

  // 2. Sort Order & Pagination
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'title-asc' | 'title-desc'>(defaultSort);
  const [currentPage, setCurrentPage] = useState(1);

  // 3. Selection State
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isModifierDown, setIsModifierDown] = useState(false);
  const lastSelectedIdRef = useRef<number | null>(null);

  // Monitor Shift / Ctrl / Meta modifier key presses to prime selection mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        setIsModifierDown(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        setIsModifierDown(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // 4. Keyboard Navigation Focus
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  // 5. Modals State
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkTagModal, setShowBulkTagModal] = useState(false);
  const [showBulkCollectionModal, setShowBulkCollectionModal] = useState(false);
  const [showBulkHideModeModal, setShowBulkHideModeModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Reset page & selection on bookmark list or filter changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    setFocusedIndex(null);
  }, [bookmarks.length, sortOrder]);

  // Sort bookmarks
  const sortedBookmarks = useMemo(() => {
    return [...bookmarks].sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortOrder === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortOrder === 'title-asc') return (a.title || a.url).localeCompare(b.title || b.url);
      if (sortOrder === 'title-desc') return (b.title || b.url).localeCompare(a.title || a.url);
      return 0;
    });
  }, [bookmarks, sortOrder]);

  const totalPages = Math.ceil(sortedBookmarks.length / itemsPerPage);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedBookmarks = useMemo(() => {
    return sortedBookmarks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [sortedBookmarks, currentPage, itemsPerPage]);

  const visibleBookmarkIds = useMemo(() => {
    return paginatedBookmarks.map(b => b.id);
  }, [paginatedBookmarks]);

  const isAllVisibleSelected = visibleBookmarkIds.length > 0 && visibleBookmarkIds.every(id => selectedIds.has(id));

  // Selection handlers
  const handleToggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => {
      if (prev) {
        setSelectedIds(new Set());
        lastSelectedIdRef.current = null;
        return false;
      }
      return true;
    });
  }, []);

  const handleToggleSelect = useCallback((id: number) => {
    setIsSelectionMode(true);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    lastSelectedIdRef.current = id;
  }, []);

  const handleSelectRange = useCallback((targetId: number) => {
    setIsSelectionMode(true);
    const lastId = lastSelectedIdRef.current;
    if (lastId === null) {
      handleToggleSelect(targetId);
      return;
    }

    const lastIdx = paginatedBookmarks.findIndex(b => b.id === lastId);
    const targetIdx = paginatedBookmarks.findIndex(b => b.id === targetId);

    if (lastIdx === -1 || targetIdx === -1) {
      handleToggleSelect(targetId);
      return;
    }

    const start = Math.min(lastIdx, targetIdx);
    const end = Math.max(lastIdx, targetIdx);

    setSelectedIds(prev => {
      const next = new Set(prev);
      for (let i = start; i <= end; i++) {
        next.add(paginatedBookmarks[i].id);
      }
      return next;
    });
    lastSelectedIdRef.current = targetId;
  }, [paginatedBookmarks, handleToggleSelect]);

  const handleToggleSelectAllVisible = useCallback(() => {
    if (isAllVisibleSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        visibleBookmarkIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setIsSelectionMode(true);
      setSelectedIds(prev => {
        const next = new Set(prev);
        visibleBookmarkIds.forEach(id => next.add(id));
        return next;
      });
    }
  }, [isAllVisibleSelected, visibleBookmarkIds]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
    lastSelectedIdRef.current = null;
    setIsSelectionMode(false);
  }, []);

  // Keyboard navigation & Shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an editable field
      const activeElement = document.activeElement;
      const isInput = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).isContentEditable
      );

      // 1. Global Shortcuts (work even inside inputs if specified)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('linkvault:focus-search'));
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('linkvault:focus-add-url'));
        return;
      }

      if (e.key === '?' && !isInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
        return;
      }

      // If user is typing in an input/textarea, do NOT handle grid navigation keys
      if (isInput) return;

      // 2. Select All Visible (Ctrl+A)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setIsSelectionMode(true);
        setSelectedIds(new Set(visibleBookmarkIds));
        return;
      }

      // 3. Escape key clears selection or resets focus
      if (e.key === 'Escape') {
        if (selectedIds.size > 0 || isSelectionMode) {
          e.preventDefault();
          handleClearSelection();
        } else if (focusedIndex !== null) {
          e.preventDefault();
          setFocusedIndex(null);
        }
        return;
      }

      // 4. Delete / Backspace key triggers delete modal
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size > 0) {
          e.preventDefault();
          setShowBulkDeleteModal(true);
        } else if (focusedIndex !== null && paginatedBookmarks[focusedIndex]) {
          e.preventDefault();
          setSelectedIds(new Set([paginatedBookmarks[focusedIndex].id]));
          setShowBulkDeleteModal(true);
        }
        return;
      }

      // 5. Arrow Keys Navigation
      const totalCount = paginatedBookmarks.length;
      if (totalCount === 0) return;

      let cols = 1;
      if (viewMode === 'list') {
        cols = 1;
      } else if (viewMode === 'compact') {
        // approx responsive columns
        const width = window.innerWidth;
        if (width >= 1280) cols = 6;
        else if (width >= 1024) cols = 5;
        else if (width >= 768) cols = 4;
        else if (width >= 640) cols = 3;
        else cols = 2;
      } else {
        // comfortable
        const width = window.innerWidth;
        if (width >= 1280) cols = 4;
        else if (width >= 1024) cols = 3;
        else if (width >= 768) cols = 2;
        else cols = 1;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev === null ? 0 : Math.min(totalCount - 1, prev + 1);
          if (e.shiftKey && next !== prev) {
            handleSelectRange(paginatedBookmarks[next].id);
          }
          return next;
        });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev === null ? 0 : Math.max(0, prev - 1);
          if (e.shiftKey && next !== prev) {
            handleSelectRange(paginatedBookmarks[next].id);
          }
          return next;
        });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev === null ? 0 : Math.min(totalCount - 1, prev + cols);
          if (e.shiftKey && next !== prev) {
            handleSelectRange(paginatedBookmarks[next].id);
          }
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev === null ? 0 : Math.max(0, prev - cols);
          if (e.shiftKey && next !== prev) {
            handleSelectRange(paginatedBookmarks[next].id);
          }
          return next;
        });
      } else if (e.key === 'Home') {
        e.preventDefault();
        setFocusedIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setFocusedIndex(totalCount - 1);
      } else if (e.key === ' ') {
        // Space toggles selection on focused card
        if (focusedIndex !== null && paginatedBookmarks[focusedIndex]) {
          e.preventDefault();
          handleToggleSelect(paginatedBookmarks[focusedIndex].id);
        }
      } else if (e.key === 'Enter') {
        // Enter opens focused bookmark in browser
        if (focusedIndex !== null && paginatedBookmarks[focusedIndex]) {
          e.preventDefault();
          const target = paginatedBookmarks[focusedIndex];
          openBookmark(target.url, target.title || undefined);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    paginatedBookmarks,
    visibleBookmarkIds,
    selectedIds,
    focusedIndex,
    viewMode,
    handleToggleSelect,
    handleSelectRange,
    handleClearSelection,
    openBookmark
  ]);

  // Bulk operation actions
  const selectedBookmarksList = useMemo(() => {
    return sortedBookmarks.filter(b => selectedIds.has(b.id));
  }, [sortedBookmarks, selectedIds]);

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    try {
      if (onBulkDeleteBookmarks) {
        await onBulkDeleteBookmarks(ids);
      } else {
        for (const id of ids) {
          await onDeleteBookmark(id);
        }
      }
      success('Bookmarks Deleted', `${ids.length} ${ids.length === 1 ? 'bookmark was' : 'bookmarks were'} moved to the Recycle Bin.`);
      handleClearSelection();
    } catch (err: any) {
      error('Delete Failed', err?.message || 'Could not delete selected bookmarks.');
    }
  };

  const handleBulkAddTags = async (tagNames: string[]) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    try {
      if (onBulkAddTags) {
        await onBulkAddTags(ids, tagNames);
      } else {
        // @ts-ignore
        await window.electronAPI?.tags?.bulkAdd?.(ids, tagNames);
      }
      success('Tags Applied', `Added ${tagNames.length} ${tagNames.length === 1 ? 'tag' : 'tags'} to ${ids.length} bookmarks.`);
      handleClearSelection();
    } catch (err: any) {
      error('Tagging Failed', err?.message || 'Could not apply tags to selected bookmarks.');
    }
  };

  const handleBulkRemoveTags = async (tagIds: number[]) => {
    const ids = Array.from(selectedIds);
    if (!ids.length || !tagIds.length) return;
    try {
      if (onBulkRemoveTags) {
        await onBulkRemoveTags(ids, tagIds);
      } else {
        // @ts-ignore
        await window.electronAPI?.tags?.bulkRemove?.(ids, tagIds);
      }
      success('Tags Removed', `Removed ${tagIds.length} ${tagIds.length === 1 ? 'tag' : 'tags'} from ${ids.length} bookmarks.`);
      handleClearSelection();
    } catch (err: any) {
      error('Tag Removal Failed', err?.message || 'Could not remove tags from selected bookmarks.');
    }
  };

  const handleBulkAddToCollection = async (collectionId: number) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    try {
      if (onBulkAddToCollection) {
        await onBulkAddToCollection(collectionId, ids);
      } else {
        // @ts-ignore
        await window.electronAPI?.collections?.bulkAdd?.(collectionId, ids);
      }
      success('Added to Collection', `Added ${ids.length} bookmarks to the collection.`);
      handleClearSelection();
    } catch (err: any) {
      error('Action Failed', err?.message || 'Could not add selected bookmarks to collection.');
    }
  };

  const handleBulkChangeHideMode = async (hideMode: number) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    try {
      if (onBulkUpdateBookmarks) {
        await onBulkUpdateBookmarks(ids, { hide_mode: hideMode });
      } else {
        for (const id of ids) {
          await onUpdateBookmark(id, { hide_mode: hideMode });
        }
      }
      success('Visibility Updated', `Updated visibility setting for ${ids.length} bookmarks.`);
      handleClearSelection();
    } catch (err: any) {
      error('Update Failed', err?.message || 'Could not update bookmark visibility.');
    }
  };

  const isAllSelectedFavorite = useMemo(() => {
    if (selectedBookmarksList.length === 0) return false;
    return selectedBookmarksList.every(b => b.is_favorite);
  }, [selectedBookmarksList]);

  const isAllSelectedImportant = useMemo(() => {
    if (selectedBookmarksList.length === 0) return false;
    return selectedBookmarksList.every(b => b.is_important);
  }, [selectedBookmarksList]);

  const handleBulkFavorite = async (isFavorite: boolean) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    try {
      if (onBulkUpdateBookmarks) {
        await onBulkUpdateBookmarks(ids, { is_favorite: isFavorite });
      } else {
        for (const id of ids) {
          await onUpdateBookmark(id, { is_favorite: isFavorite });
        }
      }
      success(
        'Favorites Updated', 
        isFavorite ? `Marked ${ids.length} bookmarks as favorite.` : `Removed ${ids.length} bookmarks from favorites.`
      );
    } catch (err: any) {
      error('Update Failed', err?.message || 'Could not update favorite status.');
    }
  };

  const handleBulkImportant = async (isImportant: boolean) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    try {
      if (onBulkUpdateBookmarks) {
        await onBulkUpdateBookmarks(ids, { is_important: isImportant });
      } else {
        for (const id of ids) {
          await onUpdateBookmark(id, { is_important: isImportant });
        }
      }
      success(
        'Priority Updated', 
        isImportant ? `Marked ${ids.length} bookmarks as important.` : `Removed priority flag from ${ids.length} bookmarks.`
      );
    } catch (err: any) {
      error('Update Failed', err?.message || 'Could not update importance status.');
    }
  };

  return (
    <>
      {/* Gallery Header Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          {headerTitle && (
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {headerTitle}
            </h2>
          )}
          {headerSubtitle ? (
            <div className="text-gray-500 text-sm">{headerSubtitle}</div>
          ) : (
            <p className="text-gray-500 text-sm">
              {sortedBookmarks.length} {sortedBookmarks.length === 1 ? 'bookmark' : 'bookmarks'} found
            </p>
          )}
        </div>

        {/* Right side controls: Multi-select, Sort, ViewMode, and custom header actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {headerActions}

          {/* Multi-select toggle button */}
          <button
            type="button"
            onClick={handleToggleSelectionMode}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border shadow-2xs ${
              (isSelectionMode || selectedIds.size > 0)
                ? 'bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-500/20'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-900'
            }`}
            title={isSelectionMode ? "Exit multi-select mode (Esc)" : "Toggle multi-select mode (or hold Shift/Ctrl)"}
          >
            <CheckSquare className={`w-4 h-4 ${(isSelectionMode || selectedIds.size > 0) ? 'text-blue-600' : 'text-gray-500'}`} />
            <span className="hidden sm:inline">{isSelectionMode ? 'Selecting' : 'Select'}</span>
            {selectedIds.size > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-xs font-bold bg-blue-600 text-white">
                {selectedIds.size}
              </span>
            )}
          </button>

          {/* Sort dropdown */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs font-medium"
            aria-label="Sort order"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title-asc">Title (A-Z)</option>
            <option value="title-desc">Title (Z-A)</option>
          </select>

          {/* View mode toggle */}
          <ViewModeToggle
            viewMode={viewMode}
            onChange={handleViewModeChange}
          />
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
          <p>Loading your library...</p>
        </div>
      ) : sortedBookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <div className="bg-gray-100 p-6 rounded-full mb-4 text-gray-300">
            <Search className="w-12 h-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">{emptyStateTitle}</h3>
          <p className="text-sm">{emptyStateDescription}</p>
        </div>
      ) : (
        <div
          className={
            viewMode === 'list'
              ? 'flex flex-col gap-2.5'
              : viewMode === 'compact'
              ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3'
              : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          }
        >
          {paginatedBookmarks.map((bookmark, idx) => (
            <BookmarkCard
              key={bookmark.id}
              cardIndex={idx}
              bookmark={bookmark}
              viewMode={viewMode}
              isSelected={selectedIds.has(bookmark.id)}
              isFocused={focusedIndex === idx}
              isSelectionActive={selectedIds.size > 0}
              isSelectionMode={isSelectionMode || isModifierDown}
              onToggleSelect={handleToggleSelect}
              onClickCard={(_id, e) => {
                setFocusedIndex(idx);
                if (e.shiftKey) {
                  setIsSelectionMode(true);
                  handleSelectRange(bookmark.id);
                }
              }}
              onDelete={onDeleteBookmark}
              onToggleFavorite={onToggleFavorite}
              onToggleImportant={onToggleImportant}
              onEdit={setEditingBookmark}
              onUpdate={onUpdateBookmark}
              onRefetch={onRefetchBookmark}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && sortedBookmarks.length > itemsPerPage && (
        <div className="flex items-center justify-between mt-8 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-semibold text-gray-900">{Math.min(currentPage * itemsPerPage, sortedBookmarks.length)}</span> of <span className="font-semibold text-gray-900">{sortedBookmarks.length}</span> results
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-gray-900 px-3 py-1 bg-gray-100 rounded-lg">
                Page {currentPage} of {totalPages}
              </span>
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Bulk Actions Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        totalVisibleCount={paginatedBookmarks.length}
        isAllVisibleSelected={isAllVisibleSelected}
        isAllSelectedFavorite={isAllSelectedFavorite}
        isAllSelectedImportant={isAllSelectedImportant}
        onToggleSelectAllVisible={handleToggleSelectAllVisible}
        onOpenBulkTag={() => setShowBulkTagModal(true)}
        onOpenBulkCollection={() => setShowBulkCollectionModal(true)}
        onOpenBulkHideMode={() => setShowBulkHideModeModal(true)}
        onOpenBulkDelete={() => setShowBulkDeleteModal(true)}
        onBulkFavorite={handleBulkFavorite}
        onBulkImportant={handleBulkImportant}
        onClearSelection={handleClearSelection}
      />

      {/* Bulk Delete / Recycle Bin Modal */}
      {showBulkDeleteModal && (
        <BulkDeleteModal
          selectedCount={selectedIds.size}
          selectedBookmarks={selectedBookmarksList}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={handleBulkDelete}
        />
      )}

      {/* Bulk Tag Modal (Add & Remove Tags) */}
      {showBulkTagModal && (
        <BulkTagModal
          selectedCount={selectedIds.size}
          selectedBookmarks={selectedBookmarksList}
          onClose={() => setShowBulkTagModal(false)}
          onConfirmAdd={handleBulkAddTags}
          onConfirmRemove={handleBulkRemoveTags}
        />
      )}

      {/* Bulk Collection Modal */}
      {showBulkCollectionModal && (
        <BulkCollectionModal
          selectedCount={selectedIds.size}
          onClose={() => setShowBulkCollectionModal(false)}
          onConfirm={handleBulkAddToCollection}
        />
      )}

      {/* Bulk Hide Mode Modal (Visible / Method 1 / Method 2) */}
      {showBulkHideModeModal && (
        <BulkHideModeModal
          selectedCount={selectedIds.size}
          initialMode={
            selectedBookmarksList.length > 0 && selectedBookmarksList.every(b => b.hide_mode === selectedBookmarksList[0].hide_mode)
              ? selectedBookmarksList[0].hide_mode
              : 0
          }
          onClose={() => setShowBulkHideModeModal(false)}
          onConfirm={handleBulkChangeHideMode}
        />
      )}

      {/* Keyboard Shortcuts Cheatsheet Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* Single Bookmark Edit Modal */}
      {editingBookmark && (
        <BookmarkDetailsModal
          bookmark={editingBookmark}
          onClose={() => setEditingBookmark(null)}
          onSave={onUpdateBookmark}
        />
      )}
    </>
  );
};
