import React from 'react';
import { BookmarkGallery } from '../components/bookmarks/BookmarkGallery';
import { Bookmark } from '../types/models';

interface BookmarksPageProps {
  type: 'all' | 'favorites' | 'important';
  bookmarks: Bookmark[];
  loading: boolean;
  showHiddenBookmarks?: boolean;
  onDeleteBookmark: (id: number) => void;
  onToggleFavorite: (id: number, current: boolean) => void;
  onToggleImportant: (id: number, current: boolean) => void;
  onUpdateBookmark: (id: number, data: Partial<Bookmark>) => any;
  onRefetchBookmark?: (id: number) => Promise<{ success: boolean; data?: Bookmark; error?: string }>;
  onBulkDeleteBookmarks?: (ids: number[]) => Promise<{ success: boolean; count?: number; error?: string }>;
  onBulkUpdateBookmarks?: (ids: number[], data: Partial<Bookmark>) => Promise<{ success: boolean; count?: number; error?: string }>;
  onBulkAddTags?: (bookmarkIds: number[], tagNames: string[]) => Promise<any>;
  onBulkAddToCollection?: (collectionId: number, bookmarkIds: number[]) => Promise<any>;
}

export const BookmarksPage: React.FC<BookmarksPageProps> = ({ 
  type, 
  bookmarks, 
  loading,
  showHiddenBookmarks = false,
  onDeleteBookmark,
  onToggleFavorite,
  onToggleImportant,
  onUpdateBookmark,
  onRefetchBookmark,
  onBulkDeleteBookmarks,
  onBulkUpdateBookmarks,
  onBulkAddTags,
  onBulkAddToCollection
}) => {
  const filteredBookmarks = bookmarks.filter(b => {
    // Method 1: Hidden ONLY from "All Bookmarks"
    if (type === 'all' && b.hide_mode === 1) {
      return false;
    }
    // Method 2: Hidden from all pages unless "Show Hidden Bookmarks" is enabled
    if (b.hide_mode === 2 && !showHiddenBookmarks) {
      return false;
    }

    if (type === 'favorites') return b.is_favorite;
    if (type === 'important') return b.is_important;
    return true;
  });

  const pageTitle = type === 'all' ? 'All Bookmarks' : type === 'favorites' ? 'Favorites' : 'Important';

  return (
    <BookmarkGallery
      bookmarks={filteredBookmarks}
      loading={loading}
      headerTitle={<span className="capitalize">{pageTitle}</span>}
      onDeleteBookmark={onDeleteBookmark}
      onToggleFavorite={onToggleFavorite}
      onToggleImportant={onToggleImportant}
      onUpdateBookmark={onUpdateBookmark}
      onRefetchBookmark={onRefetchBookmark}
      onBulkDeleteBookmarks={onBulkDeleteBookmarks}
      onBulkUpdateBookmarks={onBulkUpdateBookmarks}
      onBulkAddTags={onBulkAddTags}
      onBulkAddToCollection={onBulkAddToCollection}
    />
  );
};
