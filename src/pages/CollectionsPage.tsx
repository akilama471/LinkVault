import React, { useState } from 'react';
import { useCollections } from '../hooks/useCollections';
import { CollectionsView } from '../components/collections/CollectionsView';
import { BookmarkCard } from '../components/bookmarks/BookmarkCard';
import { BookmarkDetailsModal } from '../components/bookmarks/BookmarkDetailsModal';
import { Bookmark, Collection } from '../types/models';
import { Search } from 'lucide-react';

interface CollectionsPageProps {
  bookmarks: Bookmark[];
  onDeleteBookmark: (id: number) => void;
  onToggleFavorite: (id: number, current: boolean) => void;
  onToggleImportant: (id: number, current: boolean) => void;
  onUpdateBookmark: (id: number, data: Partial<Bookmark>) => any;
  onRefetchBookmark?: (id: number) => Promise<{ success: boolean; data?: Bookmark; error?: string }>;
}

export const CollectionsPage: React.FC<CollectionsPageProps> = ({ 
  bookmarks, 
  onDeleteBookmark, 
  onToggleFavorite, 
  onToggleImportant, 
  onUpdateBookmark,
  onRefetchBookmark
}) => {
  const { collections, loading, createCollection, renameCollection, deleteCollection, getBookmarkIds } = useCollections();
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [filteredColBookmarkIds, setFilteredColBookmarkIds] = useState<number[]>([]);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'title-asc' | 'title-desc'>('newest');
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);

  const handleSelectCollection = async (col: Collection) => {
    const ids = await getBookmarkIds(col.id);
    setFilteredColBookmarkIds(ids);
    setSelectedCollection(col);
  };

  if (!selectedCollection) {
    return (
      <>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Collections</h2>
          <p className="text-gray-500">
            {collections.length} {collections.length === 1 ? 'collection' : 'collections'} found
          </p>
        </div>
        <CollectionsView 
          collections={collections} 
          loading={loading} 
          onSelectCollection={handleSelectCollection}
          onCreateCollection={createCollection}
          onRenameCollection={renameCollection}
          onDeleteCollection={deleteCollection}
        />
      </>
    );
  }

  const colBookmarks = bookmarks.filter(b => filteredColBookmarkIds.includes(b.id));
  const sortedBookmarks = [...colBookmarks].sort((a, b) => {
    if (sortOrder === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortOrder === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortOrder === 'title-asc') return (a.title || a.url).localeCompare(b.title || b.url);
    if (sortOrder === 'title-desc') return (b.title || b.url).localeCompare(a.title || a.url);
    return 0;
  });

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedCollection(null)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            ← Back to Collections
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{selectedCollection.name}</h2>
            <p className="text-gray-500">
              {sortedBookmarks.length} {sortedBookmarks.length === 1 ? 'bookmark' : 'bookmarks'} found
            </p>
          </div>
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

      {sortedBookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <div className="bg-gray-100 p-6 rounded-full mb-4 text-gray-300">
            <Search className="w-12 h-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No bookmarks here</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedBookmarks.map(bookmark => (
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
