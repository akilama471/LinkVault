import React, { useState } from 'react';
import { useDomains } from '../hooks/useDomains';
import { DomainsView } from '../components/domains/DomainsView';
import { BookmarkCard } from '../components/bookmarks/BookmarkCard';
import { BookmarkDetailsModal } from '../components/bookmarks/BookmarkDetailsModal';
import { ListViewMenu } from '../components/common/ListViewMenu';
import { Bookmark, Domain } from '../types/models';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface DomainsPageProps {
  bookmarks: Bookmark[];
  showHiddenBookmarks?: boolean;
  onDeleteBookmark: (id: number) => void;
  onToggleFavorite: (id: number, current: boolean) => void;
  onToggleImportant: (id: number, current: boolean) => void;
  onUpdateBookmark: (id: number, data: Partial<Bookmark>) => any;
  onRefetchBookmark?: (id: number) => Promise<{ success: boolean; data?: Bookmark; error?: string }>;
}

export const DomainsPage: React.FC<DomainsPageProps> = ({ 
  bookmarks, 
  showHiddenBookmarks = false,
  onDeleteBookmark, 
  onToggleFavorite, 
  onToggleImportant, 
  onUpdateBookmark,
  onRefetchBookmark
}) => {
  const { domains, loading, refetchDomain, renameDomain, deleteDomain } = useDomains();
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'title-asc' | 'title-desc'>('newest');
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [showHiddenInView, setShowHiddenInView] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const isShowingHidden = showHiddenBookmarks || showHiddenInView;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedDomain, sortOrder, isShowingHidden]);

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

  const sortedBookmarks = [...domainBookmarks].sort((a, b) => {
    if (sortOrder === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortOrder === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortOrder === 'title-asc') return (a.title || a.url).localeCompare(b.title || b.url);
    if (sortOrder === 'title-desc') return (b.title || b.url).localeCompare(a.title || a.url);
    return 0;
  });

  const totalPages = Math.ceil(sortedBookmarks.length / ITEMS_PER_PAGE);
  const validCurrentPage = totalPages > 0 ? Math.min(Math.max(1, currentPage), totalPages) : 1;
  const paginatedBookmarks = sortedBookmarks.slice((validCurrentPage - 1) * ITEMS_PER_PAGE, validCurrentPage * ITEMS_PER_PAGE);

  const selectedDisplayName = selectedDomain.display_name || selectedDomain.domain;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              setSelectedDomain(null);
              setShowHiddenInView(false);
            }}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium bg-blue-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            ← Back to Domains
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span>{selectedDisplayName}</span>
              {selectedDomain.display_name && selectedDomain.display_name !== selectedDomain.domain && (
                <span className="text-sm font-normal text-gray-500">({selectedDomain.domain})</span>
              )}
            </h2>
            <p className="text-gray-500">
              {sortedBookmarks.length} {sortedBookmarks.length === 1 ? 'bookmark' : 'bookmarks'} found
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
          <ListViewMenu
            showHidden={isShowingHidden}
            onToggleShowHidden={() => setShowHiddenInView(prev => !prev)}
            disabledTooltip={showHiddenBookmarks ? "Hidden bookmarks enabled in Settings" : undefined}
          />
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

      {sortedBookmarks.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between mt-8 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{(validCurrentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-semibold text-gray-900">{Math.min(validCurrentPage * ITEMS_PER_PAGE, sortedBookmarks.length)}</span> of <span className="font-semibold text-gray-900">{sortedBookmarks.length}</span> results
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={validCurrentPage <= 1}
              className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-gray-900 px-3 py-1 bg-gray-100 rounded-lg">
                Page {validCurrentPage} of {totalPages}
              </span>
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage >= totalPages}
              className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white transition-colors cursor-pointer"
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
