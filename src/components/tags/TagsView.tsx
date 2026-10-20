import React, { useState } from 'react';
import { Tag } from '../../types/models';
import { TagCard } from './TagCard';
import { TagContextMenu } from './TagContextMenu';
import { DeleteTagModal } from './DeleteTagModal';
import { CreateTagModal } from './CreateTagModal';
import { Hash, Loader2, Plus } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface TagsViewProps {
  tags: Tag[];
  loading: boolean;
  isCreateModalOpen?: boolean;
  onOpenCreateModal?: () => void;
  onCloseCreateModal?: () => void;
  onSelectTag: (tag: Tag) => void;
  onCreateTag: (name: string) => Promise<{ success: boolean; data?: Tag; error?: string } | any>;
  onRenameTag: (id: number, newName: string) => Promise<{ success: boolean; data?: Tag; error?: string } | any>;
  onDeleteTag: (id: number) => Promise<{ success: boolean; error?: string } | any>;
}

export const TagsView: React.FC<TagsViewProps> = ({
  tags,
  loading,
  isCreateModalOpen = false,
  onOpenCreateModal,
  onCloseCreateModal,
  onSelectTag,
  onCreateTag,
  onRenameTag,
  onDeleteTag,
}) => {
  const { success, error } = useToast();
  const [localCreateModalOpen, setLocalCreateModalOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    tag: Tag;
    x: number;
    y: number;
  } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    tag: Tag;
    bookmarkCount: number;
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

  const getBookmarkCount = (tag: Tag) => tag.bookmark_count ?? 0;

  const handleCreate = async (name: string) => {
    const result = await onCreateTag(name);
    if (result && result.success) {
      success('Tag Created', `Successfully created #${name}`);
    }
    return result;
  };

  const handleFinishRename = async (tag: Tag, newName: string) => {
    try {
      const result = await onRenameTag(tag.id, newName);
      if (result && result.success) {
        success('Tag Renamed', `Renamed #${tag.name} to #${newName}`);
        setRenamingId(null);
      } else {
        error('Rename Failed', result?.error || 'Could not rename tag');
      }
    } catch (err: any) {
      error('Rename Failed', err?.message || 'Could not rename tag');
    }
  };

  const handleConfirmDelete = async (tag: Tag) => {
    try {
      const result = await onDeleteTag(tag.id);
      if (result && result.success) {
        success('Tag Deleted', `Tag #${tag.name} was removed.`);
      } else {
        error('Delete Failed', result?.error || 'Could not delete tag');
      }
    } catch (err: any) {
      error('Delete Failed', err?.message || 'Could not delete tag');
    }
  };

  const handleContextMenu = (e: React.MouseEvent, tag: Tag) => {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('close-context-menus'));
    setContextMenu({
      tag,
      x: e.clientX,
      y: e.clientY,
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-emerald-600" />
        <p className="text-sm font-medium">Loading tags...</p>
      </div>
    );
  }

  return (
    <>
      {tags.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-72 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300 p-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-4 shadow-inner">
            <Hash className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No tags yet</h3>
          <p className="text-sm text-gray-500 max-w-sm text-center mb-6">
            Create tags to label, filter, and organize your bookmark library.
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Tag</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {tags.map((tag) => (
            <TagCard
              key={tag.id}
              tag={tag}
              bookmarkCount={getBookmarkCount(tag)}
              isRenaming={renamingId === tag.id}
              onSelect={() => onSelectTag(tag)}
              onStartRename={() => setRenamingId(tag.id)}
              onFinishRename={(newName) => handleFinishRename(tag, newName)}
              onCancelRename={() => setRenamingId(null)}
              onContextMenu={(e) => handleContextMenu(e, tag)}
              onOpenMenu={(e) => handleContextMenu(e, tag)}
            />
          ))}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <TagContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          tag={contextMenu.tag}
          bookmarkCount={getBookmarkCount(contextMenu.tag)}
          onClose={() => setContextMenu(null)}
          onRename={() => {
            setRenamingId(contextMenu.tag.id);
            setContextMenu(null);
          }}
          onDelete={() => {
            setDeleteModal({
              tag: contextMenu.tag,
              bookmarkCount: getBookmarkCount(contextMenu.tag),
            });
            setContextMenu(null);
          }}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateTagModal
          onClose={handleCloseCreate}
          onCreate={handleCreate}
        />
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <DeleteTagModal
          tag={deleteModal.tag}
          bookmarkCount={deleteModal.bookmarkCount}
          onClose={() => setDeleteModal(null)}
          onConfirm={() => handleConfirmDelete(deleteModal.tag)}
        />
      )}
    </>
  );
};
