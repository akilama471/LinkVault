import React, { useState, useEffect } from 'react';
import { Hash, Plus, X, Check, Trash2, Tag as TagIcon, Search, Loader2 } from 'lucide-react';
import { Bookmark, Tag } from '../../types/models';

interface BulkTagModalProps {
  selectedCount: number;
  selectedBookmarks: Bookmark[];
  onClose: () => void;
  onConfirmAdd: (tagNames: string[]) => Promise<void> | void;
  onConfirmRemove: (tagIds: number[]) => Promise<void> | void;
}

export const BulkTagModal: React.FC<BulkTagModalProps> = ({
  selectedCount,
  selectedBookmarks,
  onClose,
  onConfirmAdd,
  onConfirmRemove
}) => {
  const [activeTab, setActiveTab] = useState<'add' | 'remove'>('add');
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Add Mode State
  const [selectedTagNamesToAdd, setSelectedTagNamesToAdd] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  // Remove Mode State
  const [selectedTagIdsToRemove, setSelectedTagIdsToRemove] = useState<number[]>([]);
  const [tagsOnSelected, setTagsOnSelected] = useState<{ tag: Tag; count: number }[]>([]);
  const [removeSearchQuery, setRemoveSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchTags = async () => {
      setLoading(true);
      try {
        // 1. Fetch all library tags
        // @ts-ignore
        const allRes = await window.electronAPI?.tags?.getAll?.();
        if (isMounted && allRes && allRes.success) {
          setAvailableTags(allRes.data);
        }

        // 2. Fetch tags for the selected bookmarks to calculate frequency
        const tagMap = new Map<number, { tag: Tag; count: number }>();
        await Promise.all(
          selectedBookmarks.map(async (b) => {
            // @ts-ignore
            const bRes = await window.electronAPI?.tags?.getForBookmark?.(b.id);
            if (bRes && bRes.success && Array.isArray(bRes.data)) {
              bRes.data.forEach((t: Tag) => {
                const existing = tagMap.get(t.id);
                if (existing) {
                  existing.count += 1;
                } else {
                  tagMap.set(t.id, { tag: t, count: 1 });
                }
              });
            }
          })
        );

        if (isMounted) {
          const sorted = Array.from(tagMap.values()).sort((a, b) => b.count - a.count);
          setTagsOnSelected(sorted);
        }
      } catch (err) {
        console.error('Failed to load tags for modal', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTags();
    return () => {
      isMounted = false;
    };
  }, [selectedBookmarks]);

  // Add Tag Handlers
  const handleToggleAddTag = (name: string) => {
    setSelectedTagNamesToAdd(prev =>
      prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]
    );
  };

  const handleAddNewTag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTagInput.trim().replace(/^#/, '');
    if (!clean) return;
    if (!selectedTagNamesToAdd.includes(clean)) {
      setSelectedTagNamesToAdd(prev => [...prev, clean]);
    }
    setNewTagInput('');
  };

  const handleSaveAdd = async () => {
    if (selectedTagNamesToAdd.length === 0) return;
    setSaving(true);
    try {
      await onConfirmAdd(selectedTagNamesToAdd);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // Remove Tag Handlers
  const handleToggleRemoveTag = (id: number) => {
    setSelectedTagIdsToRemove(prev =>
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const handleSaveRemove = async () => {
    if (selectedTagIdsToRemove.length === 0) return;
    setSaving(true);
    try {
      await onConfirmRemove(selectedTagIdsToRemove);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const filteredLibraryTagsForRemove = availableTags.filter(t => {
    if (removeSearchQuery.trim()) {
      return t.name.toLowerCase().includes(removeSearchQuery.toLowerCase());
    }
    // Only show ones not already in tagsOnSelected if no query
    return !tagsOnSelected.some(item => item.tag.id === t.id);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Batch Tag Management
              </h3>
              <p className="text-xs text-gray-500">
                Manage tags for <span className="font-semibold text-gray-800">{selectedCount}</span> selected bookmarks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-200 bg-gray-50/40 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'add'
                ? 'bg-white text-emerald-700 shadow-xs border border-gray-200/80'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
            }`}
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Add Tags</span>
            {selectedTagNamesToAdd.length > 0 && (
              <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                {selectedTagNamesToAdd.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('remove')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'remove'
                ? 'bg-white text-red-700 shadow-xs border border-gray-200/80'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
            <span>Remove Tags</span>
            {selectedTagIdsToRemove.length > 0 && (
              <span className="bg-red-100 text-red-700 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                {selectedTagIdsToRemove.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6">
          {activeTab === 'add' ? (
            <div className="space-y-4">
              {/* Add tag form */}
              <form onSubmit={handleAddNewTag} className="flex gap-2">
                <div className="relative flex-1">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    placeholder="Type a tag name and hit enter..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newTagInput.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </form>

              {/* Tags to be applied */}
              {selectedTagNamesToAdd.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-gray-500 block mb-2">
                    Tags to be added:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTagNamesToAdd.map(tagName => (
                      <span
                        key={tagName}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs"
                      >
                        <Hash className="w-3 h-3 text-emerald-600" />
                        <span>{tagName}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleAddTag(tagName)}
                          className="text-emerald-500 hover:text-emerald-800 ml-1 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Library tags selection */}
              <div>
                <span className="text-xs font-semibold text-gray-500 block mb-2">
                  Pick from existing tags:
                </span>
                {loading ? (
                  <div className="flex items-center gap-2 text-xs text-gray-400 py-3">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    <span>Loading available tags...</span>
                  </div>
                ) : availableTags.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">No existing tags found in library. Type one above!</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1 border border-gray-100 rounded-xl bg-gray-50/50">
                    {availableTags.map(tag => {
                      const isSelected = selectedTagNamesToAdd.includes(tag.name);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleToggleAddTag(tag.name)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          <Hash className="w-3 h-3" />
                          <span>{tag.name}</span>
                          {isSelected && <Check className="w-3 h-3" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">
                Select tags to remove from the selected bookmarks.
              </p>

              {/* Tags currently present on selected bookmarks */}
              <div>
                <span className="text-xs font-semibold text-gray-700 block mb-2">
                  Tags found on selected bookmarks:
                </span>
                {loading ? (
                  <div className="flex items-center gap-2 text-xs text-gray-400 py-3">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                    <span>Analyzing tags on selected bookmarks...</span>
                  </div>
                ) : tagsOnSelected.length === 0 ? (
                  <div className="text-xs text-gray-400 bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center gap-2">
                    <TagIcon className="w-4 h-4 text-gray-300" />
                    <span>None of the selected bookmarks currently have tags.</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                    {tagsOnSelected.map(({ tag, count }) => {
                      const isMarkedForRemoval = selectedTagIdsToRemove.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleToggleRemoveTag(tag.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                            isMarkedForRemoval
                              ? 'bg-red-600 text-white shadow-xs ring-2 ring-red-400/30'
                              : 'bg-red-50/80 text-red-800 hover:bg-red-100 border border-red-200'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>#{tag.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                            isMarkedForRemoval ? 'bg-red-800 text-white' : 'bg-red-100 text-red-700'
                          }`}>
                            {count}/{selectedCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Additional library tags to remove */}
              {availableTags.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500">
                      Other library tags to strip (if present):
                    </span>
                  </div>
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={removeSearchQuery}
                      onChange={(e) => setRemoveSearchQuery(e.target.value)}
                      placeholder="Filter other tags..."
                      className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-red-400"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                    {filteredLibraryTagsForRemove.map(tag => {
                      const isMarked = selectedTagIdsToRemove.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleToggleRemoveTag(tag.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            isMarked
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <Hash className="w-3 h-3" />
                          <span>{tag.name}</span>
                          {isMarked && <Check className="w-3 h-3" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          
          {activeTab === 'add' ? (
            <button
              type="button"
              onClick={handleSaveAdd}
              disabled={saving || selectedTagNamesToAdd.length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors shadow-sm cursor-pointer"
            >
              {saving ? 'Adding...' : `Add ${selectedTagNamesToAdd.length} ${selectedTagNamesToAdd.length === 1 ? 'Tag' : 'Tags'} to ${selectedCount} items`}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveRemove}
              disabled={saving || selectedTagIdsToRemove.length === 0}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors shadow-sm cursor-pointer"
            >
              {saving ? 'Removing...' : `Remove ${selectedTagIdsToRemove.length} ${selectedTagIdsToRemove.length === 1 ? 'Tag' : 'Tags'} from ${selectedCount} items`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
