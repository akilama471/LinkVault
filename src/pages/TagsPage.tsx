import React, { useState } from 'react';
import { useTags } from '../hooks/useTags';
import { TagsView } from '../components/tags/TagsView';
import { BookmarkGallery } from '../components/bookmarks/BookmarkGallery';
import { ListViewMenu } from '../components/common/ListViewMenu';
import { Bookmark, Tag } from '../types/models';
import { Plus } from 'lucide-react';

interface TagsPageProps {
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

export const TagsPage: React.FC<TagsPageProps> = ({ 
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
  onBulkAddToCollection
}) => {
  const { tags, loading, createTag, renameTag, deleteTag, getBookmarkIds } = useTags();
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [filteredTagBookmarkIds, setFilteredTagBookmarkIds] = useState<number[]>([]);
  const [showHiddenInView, setShowHiddenInView] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const isShowingHidden = showHiddenBookmarks || showHiddenInView;

  const handleSelectTag = async (tag: Tag) => {
    setShowHiddenInView(false);
    const ids = await getBookmarkIds(tag.id);
    setFilteredTagBookmarkIds(ids);
    setSelectedTag(tag);
  };

  if (!selectedTag) {
    return (
      <>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Tags</h2>
            <p className="text-gray-500">
              {tags.length} {tags.length === 1 ? 'tag' : 'tags'} found
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Tag</span>
          </button>
        </div>
        <TagsView 
          tags={tags} 
          loading={loading}
          isCreateModalOpen={isCreateModalOpen}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onCloseCreateModal={() => setIsCreateModalOpen(false)}
          onSelectTag={handleSelectTag}
          onCreateTag={createTag}
          onRenameTag={renameTag}
          onDeleteTag={deleteTag}
        />
      </>
    );
  }

  const tagBookmarks = bookmarks.filter(b => {
    if (!filteredTagBookmarkIds.includes(b.id)) return false;
    // Method 1 bookmarks remain visible in Tags.
    // Method 2 bookmarks are visible only when isShowingHidden is true.
    if (b.hide_mode === 2 && !isShowingHidden) return false;
    return true;
  });

  return (
    <BookmarkGallery
      bookmarks={tagBookmarks}
      headerTitle={
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setSelectedTag(null);
              setShowHiddenInView(false);
            }}
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-sm font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            ← Back to Tags
          </button>
          <span>#{selectedTag.name}</span>
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
