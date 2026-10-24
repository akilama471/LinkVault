import React, { useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';

interface BulkHideModeModalProps {
  selectedCount: number;
  initialMode?: number;
  onClose: () => void;
  onConfirm: (hideMode: number) => Promise<void> | void;
}

export const BulkHideModeModal: React.FC<BulkHideModeModalProps> = ({
  selectedCount,
  initialMode = 0,
  onClose,
  onConfirm
}) => {
  const [selectedMode, setSelectedMode] = useState<number>(initialMode);
  const [saving, setSaving] = useState(false);

  const options = [
    {
      mode: 0,
      title: 'Visible Everywhere',
      description: 'Bookmarks appear normally across all pages, collections, tags, and domain views.',
      icon: Eye,
      badge: 'Normal'
    },
    {
      mode: 1,
      title: 'Hide from "All Bookmarks" Only',
      description: 'Hidden from the primary All Bookmarks library, but remains visible in Collections, Tags, and Domain pages.',
      icon: EyeOff,
      badge: 'Method 1'
    },
    {
      mode: 2,
      title: 'Hide Completely Everywhere',
      description: 'Completely hidden from all views unless "Show Hidden Bookmarks" is explicitly enabled.',
      icon: EyeOff,
      badge: 'Method 2'
    }
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      await onConfirm(selectedMode);
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
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <EyeOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Bulk Change Visibility
              </h3>
              <p className="text-xs text-gray-500">Update privacy mode for {selectedCount} bookmarks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {options.map((opt) => {
            const isSelected = selectedMode === opt.mode;
            const Icon = opt.icon;
            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => setSelectedMode(opt.mode)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50/50 ring-2 ring-purple-500/20'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className={`p-2 rounded-lg mt-0.5 ${isSelected ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-gray-900">{opt.title}</span>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-600 border">
                      {opt.badge}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{opt.description}</p>
                </div>
              </button>
            );
          })}
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
            disabled={saving}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors shadow-sm cursor-pointer"
          >
            {saving ? 'Updating...' : `Apply to ${selectedCount} items`}
          </button>
        </div>
      </div>
    </div>
  );
};
