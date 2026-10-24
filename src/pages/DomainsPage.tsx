import React, { useState } from 'react';
import { useDomains } from '../hooks/useDomains';
import { DomainsView } from '../components/domains/DomainsView';
import { BookmarkGallery } from '../components/bookmarks/BookmarkGallery';
import { ListViewMenu } from '../components/common/ListViewMenu';
import { Bookmark, Domain } from '../types/models';

interface DomainsPageProps {
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

export const DomainsPage: React.FC<DomainsPageProps> = ({ 
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
  const { domains, loading, refetchDomain, renameDomain, deleteDomain } = useDomains();
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [showHiddenInView, setShowHiddenInView] = useState(false);

  const isShowingHidden = showHiddenBookmarks || showHiddenInView;

  if (!selectedDomain) {
    return (
      <>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Websites</h2>
          <p className="text-gray-500">
            {domains.length} {domains.length === 1 ? 'website' : 'websites'} found
          </p>
        </div>
        <DomainsView 
          domains={domains} 
          bookmarks={bookmarks}
          showHiddenBookmarks={showHiddenBookmarks}
          loading={loading} 
          onSelectDomain={(d) => {
            setShowHiddenInView(false);
            setSelectedDomain(d);
          }}
          onRefetchDomain={refetchDomain}
          onRenameDomain={renameDomain}
          onDeleteDomain={deleteDomain}
        />
      </>
    );
  }

  const domainBookmarks = bookmarks.filter(b => {
    if (b.domain_id !== selectedDomain.id) return false;
    // Method 1 bookmarks remain visible in Domains.
    // Method 2 bookmarks are visible only when isShowingHidden is true.
    if (b.hide_mode === 2 && !isShowingHidden) return false;
    return true;
  });

  const selectedDisplayName = selectedDomain.display_name || selectedDomain.domain;

  return (
    <BookmarkGallery
      bookmarks={domainBookmarks}
      headerTitle={
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setSelectedDomain(null);
              setShowHiddenInView(false);
            }}
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-sm font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            ← Back to Domains
          </button>
          <span className="flex items-center gap-2">
            <span>{selectedDisplayName}</span>
            {selectedDomain.display_name && selectedDomain.display_name !== selectedDomain.domain && (
              <span className="text-sm font-normal text-gray-500">({selectedDomain.domain})</span>
            )}
          </span>
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
