import React, { useState } from 'react';
import { useCollections } from '../hooks/useCollections';
import { CollectionsView } from '../components/collections/CollectionsView';
import { BookmarkGallery } from '../components/bookmarks/BookmarkGallery';
import { ListViewMenu } from '../components/common/ListViewMenu';
import { Bookmark, Collection } from '../types/models';
import { Plus } from 'lucide-react';

interface CollectionsPageProps {
  bookmarks: Bookmark[];
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

export const CollectionsPage: React.FC<CollectionsPageProps> = ({
  bookmarks,
  showHiddenBookmarks = false,
  onDeleteBookmark,
  onToggleFavorite,
  onToggleImportant,
  onUpdateBookmark,
  onRefetchBookmark,
  onBulkDeleteBookmarks,
  onBulkUpdateBookmarks,
  onBulkAddTags,
  onBulkAddToCollection,
}) => {
  const {
    collections,
    loading,
    createCollection,
    renameCollection,
    deleteCollection,
    getBookmarkIds,
  } = useCollections();
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [filteredColBookmarkIds, setFilteredColBookmarkIds] = useState<number[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showHiddenInView, setShowHiddenInView] = useState(false);

  const isShowingHidden = showHiddenBookmarks || showHiddenInView;

  const handleSelectCollection = async (col: Collection) => {
    setShowHiddenInView(false);
    const ids = await getBookmarkIds(col.id);
    setFilteredColBookmarkIds(ids);
    setSelectedCollection(col);
  };

  if (!selectedCollection) {
    return (
      <>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Collections</h2>
            <p className="text-gray-500">
              {collections.length} {collections.length === 1 ? 'collection' : 'collections'} found
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Collection</span>
          </button>
        </div>
        <CollectionsView
          collections={collections}
          loading={loading}
          isCreateModalOpen={isCreateModalOpen}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onCloseCreateModal={() => setIsCreateModalOpen(false)}
          onSelectCollection={handleSelectCollection}
          onCreateCollection={createCollection}
          onRenameCollection={renameCollection}
          onDeleteCollection={deleteCollection}
        />
      </>
    );
  }

  const colBookmarks = bookmarks.filter((b) => {
    if (!filteredColBookmarkIds.includes(b.id)) return false;
    // Method 1 bookmarks remain visible in Collections.
    // Method 2 bookmarks are visible only when isShowingHidden is true.
    if (b.hide_mode === 2 && !isShowingHidden) return false;
    return true;
  });

  const activeCollection =
    collections.find((c) => c.id === selectedCollection.id) || selectedCollection;

  return (
    <BookmarkGallery
      bookmarks={colBookmarks}
      headerTitle={
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedCollection(null);
              setShowHiddenInView(false);
            }}
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-sm font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            ← Back to Collections
          </button>
          <span>{activeCollection.name}</span>
        </div>
      }
      headerActions={
        <ListViewMenu
          showHidden={isShowingHidden}
          onToggleShowHidden={() => setShowHiddenInView(prev => !prev)}
          disabledTooltip={showHiddenBookmarks ? "Hidden bookmarks enabled in Settings" : undefined}
        />
      }
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
