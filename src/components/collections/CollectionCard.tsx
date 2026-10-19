import React, { useState, useRef, useEffect } from 'react';
import { Collection } from '../../types/models';
import { Folder, RotateCw, MoreVertical, Loader2, Globe } from 'lucide-react';
import clsx from 'clsx';

interface CollectionCardProps {
  collection: Collection;
  bookmarkCount: number;
  isRefetching?: boolean;
  isRenaming: boolean;
  onSelect: () => void;
  onStartRename: () => void;
  onFinishRename: (newName: string) => Promise<void>;
  onCancelRename: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onOpenMenu: (e: React.MouseEvent) => void;
}

export const CollectionCard: React.FC<CollectionCardProps> = ({
  collection,
  bookmarkCount,
  isRefetching = false,
  isRenaming,
  onSelect,
  onStartRename,
  onFinishRename,
  onCancelRename,
  onContextMenu,
  onOpenMenu,
}) => {
  const [editValue, setEditValue] = useState(collection.name);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);

  // Sync editValue when collection.name or isRenaming changes
  useEffect(() => {
    if (isRenaming) {
      isSubmittingRef.current = false;
      setEditValue(collection.name);
    }
  }, [isRenaming, collection.name]);

  // Focus and select text when entering rename mode (like Windows File Explorer)
  useEffect(() => {
    if (isRenaming) {
      const focusAndSelect = () => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      };
      focusAndSelect();
      const timer = setTimeout(focusAndSelect, 15);
      return () => clearTimeout(timer);
    }
  }, [isRenaming]);

  const handleSave = async () => {
    if (!isRenaming || isSubmittingRef.current) return;
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === collection.name) {
      onCancelRename();
      return;
    }

    isSubmittingRef.current = true;
    setIsSaving(true);
    try {
      await onFinishRename(trimmed);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
      isSubmittingRef.current = false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onCancelRename();
    }
  };

  const handleBlur = () => {
    if (!isSaving) {
      handleSave();
    }
  };

  return (
    <div
      onClick={() => {
        if (!isRenaming && !isRefetching) {
          onSelect();
        }
      }}
      onContextMenu={onContextMenu}
      className={clsx(
        'relative flex flex-col items-center justify-between p-5 bg-white rounded-2xl shadow-xs border transition-all duration-200 group select-none cursor-pointer',
        isRenaming
          ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md cursor-default'
          : 'border-gray-200/80 hover:shadow-lg hover:border-blue-300 hover:-translate-y-0.5',
        isRefetching && 'opacity-90 pointer-events-none'
      )}
    >
      {/* Top Bar: Bookmark count & Context Menu button */}
      <div className="w-full flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium text-gray-500 bg-gray-100/80 px-2 py-0.5 rounded-full border border-gray-200/60 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100">
          {bookmarkCount} {bookmarkCount === 1 ? 'bookmark' : 'bookmarks'}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenMenu(e);
          }}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
          title="More actions"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Collection Icon Container */}
      <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-b from-indigo-50/70 to-indigo-100/60 border border-indigo-200/60 flex items-center justify-center my-3 overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-200">
        {/* Loading Indicator for Refetch */}
        {isRefetching && (
          <div className="absolute inset-0 bg-white/85 backdrop-blur-xs flex flex-col items-center justify-center z-10 animate-in fade-in duration-200">
            <Globe className="w-7 h-7 text-indigo-300/60 absolute" />
            <RotateCw className="w-6 h-6 text-indigo-600 animate-spin relative" />
          </div>
        )}

        <Folder className="w-8 h-8 text-indigo-500" />
      </div>

      {/* Collection Name & Description / Inline Renaming */}
      <div className="w-full flex flex-col items-center px-1 min-h-[48px] justify-center">
        {isRenaming ? (
          <div
            className="w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full">
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                disabled={isSaving}
                className="w-full text-center font-semibold text-sm text-gray-900 bg-white border border-blue-500 rounded-lg px-2 py-1 shadow-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Collection name"
              />
              {isSaving && (
                <div className="absolute right-2 top-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                </div>
              )}
            </div>
            <span className="text-[10px] text-gray-400 mt-1 select-none">
              Enter to save • Esc to cancel
            </span>
          </div>
        ) : (
          <>
            <h3
              onDoubleClick={(e) => {
                e.stopPropagation();
                onStartRename();
              }}
              className="font-semibold text-gray-800 text-sm truncate max-w-full text-center group-hover:text-indigo-600 transition-colors"
              title={`${collection.name} (Double-click or right-click to rename)`}
            >
              {collection.name}
            </h3>
            {collection.description && (
              <span
                className="text-xs text-gray-400 truncate max-w-full text-center mt-0.5"
                title={collection.description}
              >
                {collection.description}
              </span>
            )}
          </>
        )}
      </div>

      {/* Refetching Status Badge */}
      {isRefetching && (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 mt-2 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Updating...</span>
        </div>
      )}
    </div>
  );
};
