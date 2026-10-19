import React, { useState } from 'react';
import { Collection } from '../../types/models';
import { CollectionCard } from './CollectionCard';
import { CollectionContextMenu } from './CollectionContextMenu';
import { DeleteCollectionModal } from './DeleteCollectionModal';
import { CreateCollectionModal } from './CreateCollectionModal';
import { Folder, Loader2, Plus } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface CollectionsViewProps {
  collections: Collection[];
  loading: boolean;
  isCreateModalOpen?: boolean;
  onOpenCreateModal?: () => void;
  onCloseCreateModal?: () => void;
  onSelectCollection: (col: Collection) => void;
  onCreateCollection: (name: string, desc?: string) => Promise<{ success: boolean; data?: Collection; error?: string } | any>;
  onRenameCollection: (id: number, newName: string, desc?: string) => Promise<{ success: boolean; data?: Collection; error?: string } | any>;
  onDeleteCollection: (id: number, deleteBookmarks: boolean) => Promise<{ success: boolean; error?: string } | any>;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  collections,
  loading,
  isCreateModalOpen = false,
  onOpenCreateModal,
  onCloseCreateModal,
  onSelectCollection,
  onCreateCollection,
  onRenameCollection,
  onDeleteCollection,
}) => {
  const { success, error } = useToast();
  const [localCreateModalOpen, setLocalCreateModalOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    collection: Collection;
    x: number;
    y: number;
  } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    collection: Collection;
    bookmarkCount: number;
    initialDeleteBookmarks?: boolean;
  } | null>(null);

  const showCreateModal = isCreateModalOpen || localCreateModalOpen;
  const handleOpenCreate = () => {
    if (onOpenCreateModal) onOpenCreateModal();
    else setLocalCreateModalOpen(true);
  };
  const handleCloseCreate = () => {
    if (onCloseCreateModal) onCloseCreateModal();
    setLocalCreateModalOpen(false);
  };

  const getBookmarkCount = (col: Collection) => col.bookmark_count ?? 0;

  const handleCreate = async (name: string, desc?: string) => {
    const result = await onCreateCollection(name, desc);
    if (result && result.success !== false) {
      success('Collection Created', `Created collection "${name}".`);
    } else if (result && result.error) {
      error('Create Failed', result.error);
    }
    return result;
  };

  const handleFinishRename = async (col: Collection, newName: string) => {
    const result = await onRenameCollection(col.id, newName, col.description || undefined);
    if (result && result.success !== false) {
      success('Collection Renamed', `Collection name updated to "${newName}".`);
      setRenamingId(null);
    } else {
      error('Rename Failed', result?.error || 'Failed to rename collection.');
    }
  };

  const handleConfirmDelete = async (deleteBookmarks: boolean) => {
    if (!deleteModal) return;
    const { collection } = deleteModal;
    const result = await onDeleteCollection(collection.id, deleteBookmarks);

    if (result && result.success !== false) {
      success(
        'Moved to Recycle Bin',
        deleteBookmarks
          ? `"${collection.name}" and its bookmarks were moved to the Recycle Bin.`
          : `"${collection.name}" was moved to the Recycle Bin. Bookmarks were preserved.`
      );
    } else {
      error('Delete Failed', result?.error || `Failed to delete "${collection.name}".`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
        <p>Loading collections...</p>
      </div>
    );
  }

  return (
    <>
      {collections.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <div className="bg-gray-100 p-6 rounded-full mb-4 text-gray-300">
            <Folder className="w-12 h-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No collections yet</h3>
          <p className="mb-4">Create a collection to group and organize your bookmarks.</p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Collection</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {collections.map((col) => {
            const count = getBookmarkCount(col);
            const isRenaming = renamingId === col.id;

            return (
              <CollectionCard
                key={col.id}
                collection={col}
                bookmarkCount={count}
                isRenaming={isRenaming}
                onSelect={() => onSelectCollection(col)}
                onStartRename={() => setRenamingId(col.id)}
                onFinishRename={(newName) => handleFinishRename(col, newName)}
                onCancelRename={() => setRenamingId(null)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.dispatchEvent(new CustomEvent('close-context-menus'));
                  setContextMenu({
                    collection: col,
                    x: e.clientX,
                    y: e.clientY,
                  });
                }}
                onOpenMenu={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  window.dispatchEvent(new CustomEvent('close-context-menus'));
                  setContextMenu({
                    collection: col,
                    x: rect.left,
                    y: rect.bottom + 4,
                  });
                }}
              />
            );
          })}
        </div>
      )}

      {/* Right-click / Action Context Menu */}
      {contextMenu && (
        <CollectionContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          collection={contextMenu.collection}
          bookmarkCount={getBookmarkCount(contextMenu.collection)}
          onClose={() => setContextMenu(null)}
          onRename={() => setRenamingId(contextMenu.collection.id)}
          onOpenDeleteModal={() => {
            setDeleteModal({
              collection: contextMenu.collection,
              bookmarkCount: getBookmarkCount(contextMenu.collection),
            });
          }}
          onQuickDelete={(deleteBookmarks) => {
            setDeleteModal({
              collection: contextMenu.collection,
              bookmarkCount: getBookmarkCount(contextMenu.collection),
              initialDeleteBookmarks: deleteBookmarks,
            });
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <DeleteCollectionModal
          collection={deleteModal.collection}
          bookmarkCount={deleteModal.bookmarkCount}
          initialDeleteBookmarks={deleteModal.initialDeleteBookmarks}
          onClose={() => setDeleteModal(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {/* Create Collection Modal */}
      {showCreateModal && (
        <CreateCollectionModal
          onClose={handleCloseCreate}
          onCreate={handleCreate}
        />
      )}
    </>
  );
};
