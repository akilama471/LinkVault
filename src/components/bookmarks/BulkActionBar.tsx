import React from 'react';
import { 
  Star, 
  Flag, 
  Hash, 
  Folder, 
  EyeOff, 
  Trash2, 
  X, 
  CheckSquare, 
  Square 
} from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  totalVisibleCount: number;
  isAllVisibleSelected: boolean;
  onToggleSelectAllVisible: () => void;
  onOpenBulkTag: () => void;
  onOpenBulkCollection: () => void;
  onOpenBulkHideMode: () => void;
  onOpenBulkDelete: () => void;
  onBulkFavorite: (isFavorite: boolean) => void;
  onBulkImportant: (isImportant: boolean) => void;
  onClearSelection: () => void;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  totalVisibleCount,
  isAllVisibleSelected,
  onToggleSelectAllVisible,
  onOpenBulkTag,
  onOpenBulkCollection,
  onOpenBulkHideMode,
  onOpenBulkDelete,
  onBulkFavorite,
  onBulkImportant,
  onClearSelection
}) => {
  if (selectedCount === 0) return null;

  return (
    <div 
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-6 fade-in duration-200"
      role="toolbar"
      aria-label="Bulk actions toolbar"
    >
      <div className="bg-gray-900/95 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl border border-gray-700/80 flex items-center gap-3">
        {/* Select all visible toggle */}
        <button
          type="button"
          onClick={onToggleSelectAllVisible}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
          title={isAllVisibleSelected ? "Deselect all visible" : `Select all ${totalVisibleCount} on this page`}
        >
          {isAllVisibleSelected ? (
            <CheckSquare className="w-4 h-4 text-blue-400" />
          ) : (
            <Square className="w-4 h-4 text-gray-400" />
          )}
          <span className="hidden sm:inline">
            {isAllVisibleSelected ? "Deselect Page" : "Select Page"}
          </span>
        </button>

        {/* Selected count pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-600/90 text-white text-xs font-bold shadow-xs">
          <span>{selectedCount}</span>
          <span className="font-medium text-blue-100 hidden sm:inline">selected</span>
        </div>

        <div className="h-5 w-px bg-gray-700/80" />

        {/* Actions group */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Tag */}
          <button
            type="button"
            onClick={onOpenBulkTag}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-gray-200 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
            title="Add or remove tags for selected bookmarks"
          >
            <Hash className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Tag</span>
          </button>

          {/* Collection */}
          <button
            type="button"
            onClick={onOpenBulkCollection}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-gray-200 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
            title="Move / Add selected bookmarks to collection"
          >
            <Folder className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Collection</span>
          </button>

          {/* Hide mode */}
          <button
            type="button"
            onClick={onOpenBulkHideMode}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-gray-200 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
            title="Change visibility / hide mode"
          >
            <EyeOff className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline">Visibility</span>
          </button>

          {/* Favorite */}
          <button
            type="button"
            onClick={() => onBulkFavorite(true)}
            className="p-1.5 rounded-xl text-gray-300 hover:text-yellow-400 hover:bg-gray-800 transition-colors cursor-pointer"
            title="Star all selected"
          >
            <Star className="w-4 h-4" />
          </button>

          {/* Important */}
          <button
            type="button"
            onClick={() => onBulkImportant(true)}
            className="p-1.5 rounded-xl text-gray-300 hover:text-red-400 hover:bg-gray-800 transition-colors cursor-pointer"
            title="Mark all selected as important"
          >
            <Flag className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-gray-700/80 mx-0.5" />

          {/* Delete */}
          <button
            type="button"
            onClick={onOpenBulkDelete}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-red-300 hover:text-white hover:bg-red-600/90 transition-colors cursor-pointer"
            title="Delete selected bookmarks (Del)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>

        <div className="h-5 w-px bg-gray-700/80" />

        {/* Clear selection */}
        <button
          type="button"
          onClick={onClearSelection}
          className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
          title="Clear selection (Esc)"
          aria-label="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
