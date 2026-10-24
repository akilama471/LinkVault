import React, { useState, useEffect } from 'react';
import { Folder, Plus, X, Check, Loader2 } from 'lucide-react';
import { Collection } from '../../types/models';

interface BulkCollectionModalProps {
  selectedCount: number;
  onClose: () => void;
  onConfirm: (collectionId: number) => Promise<void> | void;
}

export const BulkCollectionModal: React.FC<BulkCollectionModalProps> = ({
  selectedCount,
  onClose,
  onConfirm
}) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedColId, setSelectedColId] = useState<number | null>(null);
  const [newColName, setNewColName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // @ts-ignore
    window.electronAPI?.collections?.getAll?.().then((res: any) => {
      if (res && res.success) {
        setCollections(res.data);
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newColName.trim();
    if (!clean) return;
    setIsCreating(true);
    try {
      // @ts-ignore
      const res = await window.electronAPI?.collections?.create?.(clean);
      if (res && res.success && res.data) {
        setCollections(prev => [...prev, res.data]);
        setSelectedColId(res.data.id);
        setNewColName('');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleSave = async () => {
    if (!selectedColId) return;
    setSaving(true);
    try {
      await onConfirm(selectedColId);
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
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Add to Collection
              </h3>
              <p className="text-xs text-gray-500">Group {selectedCount} bookmarks into a collection</p>
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
          <form onSubmit={handleCreateCollection} className="flex gap-2">
            <div className="relative flex-1">
              <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                placeholder="New collection name..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={!newColName.trim() || isCreating}
              className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-xl text-sm font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create
            </button>
          </form>

          <div>
            <span className="text-xs font-semibold text-gray-500 block mb-2">
              Select destination collection:
            </span>
            {loading ? (
              <p className="text-xs text-gray-400 py-3">Loading collections...</p>
            ) : collections.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">No collections yet. Create your first one above!</p>
            ) : (
              <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                {collections.map(col => {
                  const isSelected = selectedColId === col.id;
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setSelectedColId(col.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 border-2 border-indigo-500 text-indigo-900 font-semibold'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Folder className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-gray-400'}`} />
                        <span className="truncate">{col.name}</span>
                      </div>
                      {isSelected ? (
                        <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                      ) : (
                        <span className="text-[11px] text-gray-400 shrink-0">
                          {col.bookmark_count ?? 0} items
                        </span>
                      )}
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
            disabled={saving || !selectedColId}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors shadow-sm cursor-pointer"
          >
            {saving ? 'Adding...' : `Add to Collection`}
          </button>
        </div>
      </div>
    </div>
  );
};
