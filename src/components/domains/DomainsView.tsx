import React, { useState } from 'react';
import { Domain, Bookmark } from '../../types/models';
import { DomainCard } from './DomainCard';
import { DomainContextMenu } from './DomainContextMenu';
import { DeleteDomainModal } from './DeleteDomainModal';
import { Globe, Loader2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface DomainsViewProps {
  domains: Domain[];
  bookmarks: Bookmark[];
  loading: boolean;
  showHiddenBookmarks?: boolean;
  onSelectDomain: (domain: Domain) => void;
  onRefetchDomain: (id: number) => Promise<{ success: boolean; data?: Domain; error?: string }>;
  onRenameDomain: (id: number, newName: string) => Promise<{ success: boolean; data?: Domain; error?: string }>;
  onDeleteDomain: (id: number, deleteBookmarks: boolean) => Promise<{ success: boolean; error?: string }>;
}

export const DomainsView: React.FC<DomainsViewProps> = ({
  domains,
  bookmarks,
  loading,
  showHiddenBookmarks = false,
  onSelectDomain,
  onRefetchDomain,
  onRenameDomain,
  onDeleteDomain
}) => {
  const { success, error } = useToast();
  const [refetchingIds, setRefetchingIds] = useState<Set<number>>(new Set());
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    domain: Domain;
    x: number;
    y: number;
  } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    domain: Domain;
    bookmarkCount: number;
    initialDeleteBookmarks?: boolean;
  } | null>(null);

  // Helper to count bookmarks for a given domain
  const getBookmarkCount = (domainId: number) => {
    return bookmarks.filter(b => b.domain_id === domainId && (showHiddenBookmarks || b.hide_mode !== 2)).length;
  };

  const handleRefetch = async (domain: Domain) => {
    setRefetchingIds(prev => new Set(prev).add(domain.id));
    const result = await onRefetchDomain(domain.id);
    setRefetchingIds(prev => {
      const next = new Set(prev);
      next.delete(domain.id);
      return next;
    });

    const displayName = domain.display_name || domain.domain;
    if (result.success) {
      success('Website Updated', `Successfully updated details for ${displayName}`);
    } else {
      error('Refetch Failed', result.error || `Could not fetch updated details for ${displayName}`);
    }
  };

  const handleFinishRename = async (domain: Domain, newName: string) => {
    const result = await onRenameDomain(domain.id, newName);
    if (result.success) {
      success('Website Renamed', `Display name updated to "${newName}"`);
      setRenamingId(null);
    } else {
      error('Rename Failed', result.error || 'Failed to update website name.');
    }
  };

  const handleConfirmDelete = async (deleteBookmarks: boolean) => {
    if (!deleteModal) return;
    const { domain } = deleteModal;
    const displayName = domain.display_name || domain.domain;
    const result = await onDeleteDomain(domain.id, deleteBookmarks);

    if (result.success) {
      success(
        'Website Deleted',
        deleteBookmarks
          ? `Removed ${displayName} and its associated bookmarks.`
          : `Removed ${displayName}. Bookmarks were preserved.`
      );
    } else {
      error('Delete Failed', result.error || `Failed to delete ${displayName}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
        <p>Loading websites...</p>
      </div>
    );
  }

  if (domains.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <div className="bg-gray-100 p-6 rounded-full mb-4 text-gray-300">
          <Globe className="w-12 h-12" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No websites found</h3>
        <p>Add some bookmarks to see their domains here.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
        {domains.map((domain) => {
          const count = getBookmarkCount(domain.id);
          const isRefetching = refetchingIds.has(domain.id);
          const isRenaming = renamingId === domain.id;

          return (
            <DomainCard
              key={domain.id}
              domain={domain}
              bookmarkCount={count}
              isRefetching={isRefetching}
              isRenaming={isRenaming}
              onSelect={() => onSelectDomain(domain)}
              onStartRename={() => setRenamingId(domain.id)}
              onFinishRename={(newName) => handleFinishRename(domain, newName)}
              onCancelRename={() => setRenamingId(null)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('close-context-menus'));
                setContextMenu({
                  domain,
                  x: e.clientX,
                  y: e.clientY
                });
              }}
              onOpenMenu={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setContextMenu({
                  domain,
                  x: rect.left,
                  y: rect.bottom + 4
                });
              }}
            />
          );
        })}
      </div>

      {/* Right-click / Action Context Menu */}
      {contextMenu && (
        <DomainContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          domain={contextMenu.domain}
          bookmarkCount={getBookmarkCount(contextMenu.domain.id)}
          isRefetching={refetchingIds.has(contextMenu.domain.id)}
          onClose={() => setContextMenu(null)}
          onRefetch={() => handleRefetch(contextMenu.domain)}
          onRename={() => setRenamingId(contextMenu.domain.id)}
          onOpenDeleteModal={() => {
            setDeleteModal({
              domain: contextMenu.domain,
              bookmarkCount: getBookmarkCount(contextMenu.domain.id)
            });
          }}
          onQuickDelete={(deleteBookmarks) => {
            setDeleteModal({
              domain: contextMenu.domain,
              bookmarkCount: getBookmarkCount(contextMenu.domain.id),
              initialDeleteBookmarks: deleteBookmarks
            });
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <DeleteDomainModal
          domain={deleteModal.domain}
          bookmarkCount={deleteModal.bookmarkCount}
          initialDeleteBookmarks={deleteModal.initialDeleteBookmarks}
          onClose={() => setDeleteModal(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  );
};
