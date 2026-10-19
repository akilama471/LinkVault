import React, { useState } from 'react';
import { BookmarkCard } from '../components/bookmarks/BookmarkCard';
import { BookmarkDetailsModal } from '../components/bookmarks/BookmarkDetailsModal';
import { Bookmark } from '../types/models';
import { Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface BookmarksPageProps {
  type: 'all' | 'favorites' | 'important';
  bookmarks: Bookmark[];
  loading: boolean;
  onDeleteBookmark: (id: number) => void;
  onToggleFavorite: (id: number, current: boolean) => void;
  onToggleImportant: (id: number, current: boolean) => void;
  onUpdateBookmark: (id: number, data: Partial<Bookmark>) => any;
  onRefetchBookmark?: (id: number) => Promise<{ success: boolean; data?: Bookmark; error?: string }>;
}

export const BookmarksPage: React.FC<BookmarksPageProps> = ({ 
  type, 
  bookmarks, 
  loading,
  onDeleteBookmark,
  onToggleFavorite,
  onToggleImportant,
  onUpdateBookmark,
  onRefetchBookmark
}) => {
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'title-asc' | 'title-desc'>('newest');
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [type, sortOrder]);

  const filteredBookmarks = bookmarks.filter(b => {
    if (type === 'favorites') return b.is_favorite;
    if (type === 'important') return b.is_important;
    return true;
  });

  const sortedBookmarks = [...filteredBookmarks].sort((a, b) => {
    if (sortOrder === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortOrder === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortOrder === 'title-asc') return (a.title || a.url).localeCompare(b.title || b.url);
    if (sortOrder === 'title-desc') return (b.title || b.url).localeCompare(a.title || a.url);
    return 0;
  });

  const totalPages = Math.ceil(sortedBookmarks.length / ITEMS_PER_PAGE);

  React.useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedBookmarks = sortedBookmarks.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 capitalize">
            {type === 'all' ? 'All Bookmarks' : type}
          </h2>
          <p className="text-gray-500">
            {sortedBookmarks.length} {sortedBookmarks.length === 1 ? 'bookmark' : 'bookmarks'} found
          </p>
        </div>
        <div>
          <select 
            value={sortOrder} 
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title-asc">Title (A-Z)</option>
            <option value="title-desc">Title (Z-A)</option>
          </select>
        </div>
      </div>

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
          <h3 className="text-lg font-medium text-gray-900 mb-1">No bookmarks here</h3>
          <p>Try saving a new URL or adjusting your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedBookmarks.map(bookmark => (
            <BookmarkCard 
              key={bookmark.id} 
              bookmark={bookmark} 
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

      {!loading && sortedBookmarks.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between mt-8 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-semibold text-gray-900">{Math.min(currentPage * ITEMS_PER_PAGE, sortedBookmarks.length)}</span> of <span className="font-semibold text-gray-900">{sortedBookmarks.length}</span> results
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
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
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

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
