import React, { useState, useEffect } from 'react';
import { Hash, Plus, X, Check } from 'lucide-react';
import { Tag } from '../../types/models';

interface BulkTagModalProps {
  selectedCount: number;
  onClose: () => void;
  onConfirm: (tagNames: string[]) => Promise<void> | void;
}

export const BulkTagModal: React.FC<BulkTagModalProps> = ({
  selectedCount,
  onClose,
  onConfirm
}) => {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // @ts-ignore
    window.electronAPI?.tags?.getAll?.().then((res: any) => {
      if (res && res.success) {
        setAvailableTags(res.data);
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleToggleTag = (name: string) => {
    setSelectedTagNames(prev =>
      prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]
    );
  };

  const handleAddNewTag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTagInput.trim().replace(/^#/, '');
    if (!clean) return;
    if (!selectedTagNames.includes(clean)) {
      setSelectedTagNames(prev => [...prev, clean]);
    }
    setNewTagInput('');
  };

  const handleSave = async () => {
    if (selectedTagNames.length === 0) return;
    setSaving(true);
    try {
      await onConfirm(selectedTagNames);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Bulk Add Tags
              </h3>
              <p className="text-xs text-gray-500">Apply tags to {selectedCount} selected bookmarks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <form onSubmit={handleAddNewTag} className="flex gap-2">
            <div className="relative flex-1">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                placeholder="Add tag name..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={!newTagInput.trim()}
              className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-xl text-sm font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </form>

          {/* Currently chosen tags */}
          {selectedTagNames.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-gray-500 block mb-2">Tags to be applied:</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedTagNames.map(tagName => (
                  <span
                    key={tagName}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                  >
                    <Hash className="w-3 h-3" />
                    {tagName}
                    <button
                      type="button"
                      onClick={() => handleToggleTag(tagName)}
                      className="text-blue-400 hover:text-blue-700 ml-1 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Available tags to click */}
          <div>
            <span className="text-xs font-semibold text-gray-500 block mb-2">
              Existing tags:
            </span>
            {loading ? (
              <p className="text-xs text-gray-400 py-3">Loading available tags...</p>
            ) : availableTags.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">No existing tags found. Create one above!</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1">
                {availableTags.map(tag => {
                  const isSelected = selectedTagNames.includes(tag.name);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleToggleTag(tag.name)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
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

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || selectedTagNames.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors shadow-sm cursor-pointer"
          >
            {saving ? 'Applying...' : `Apply Tags to ${selectedCount} items`}
          </button>
        </div>
      </div>
    </div>
  );
};
