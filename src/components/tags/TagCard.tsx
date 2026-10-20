import React, { useState, useRef, useEffect } from 'react';
import { Tag } from '../../types/models';
import { Hash, MoreVertical, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface TagCardProps {
  tag: Tag;
  bookmarkCount: number;
  isRenaming: boolean;
  onSelect: () => void;
  onStartRename: () => void;
  onFinishRename: (newName: string) => Promise<void>;
  onCancelRename: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onOpenMenu: (e: React.MouseEvent) => void;
}

export const TagCard: React.FC<TagCardProps> = ({
  tag,
  bookmarkCount,
  isRenaming,
  onSelect,
  onStartRename,
  onFinishRename,
  onCancelRename,
  onContextMenu,
  onOpenMenu,
}) => {
  const [editValue, setEditValue] = useState(tag.name);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);

  // Sync editValue when tag.name or isRenaming changes
  useEffect(() => {
    if (isRenaming) {
      isSubmittingRef.current = false;
      setEditValue(tag.name);
    }
  }, [isRenaming, tag.name]);

  // Focus and select text when entering rename mode
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
    const trimmed = editValue.trim().replace(/^#+/, '');
    if (!trimmed || trimmed === tag.name) {
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
        if (!isRenaming) {
          onSelect();
        }
      }}
      onContextMenu={onContextMenu}
      className={clsx(
        'relative flex flex-col items-center justify-between p-5 bg-white rounded-2xl shadow-xs border transition-all duration-200 group select-none cursor-pointer',
        isRenaming
          ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md cursor-default'
          : 'border-gray-200/80 hover:shadow-lg hover:border-emerald-300 hover:-translate-y-0.5'
      )}
    >
      {/* Top Bar: Bookmark count & Context Menu button */}
      <div className="w-full flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium text-gray-500 bg-gray-100/80 px-2 py-0.5 rounded-full border border-gray-200/60 transition-colors group-hover:bg-emerald-50 group-hover:text-emerald-700 group-hover:border-emerald-200">
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

      {/* Tag Icon Container */}
      <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-b from-emerald-50/80 to-teal-100/70 border border-emerald-200/70 flex items-center justify-center my-3 overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-200">
        <Hash className="w-8 h-8 text-emerald-600" />
      </div>

      {/* Tag Name / Inline Renaming */}
      <div className="w-full flex flex-col items-center px-1 min-h-[44px] justify-center">
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
                className="w-full text-center font-semibold text-sm text-gray-900 bg-white border border-emerald-500 rounded-lg px-2 py-1 shadow-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Tag name"
              />
              {isSaving && (
                <div className="absolute right-2 top-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                </div>
              )}
            </div>
            <span className="text-[10px] text-gray-400 mt-1 select-none">
              Enter to save • Esc to cancel
            </span>
          </div>
        ) : (
          <h3
            onDoubleClick={(e) => {
              e.stopPropagation();
              onStartRename();
            }}
            className="font-semibold text-gray-800 text-sm truncate max-w-full text-center group-hover:text-emerald-700 transition-colors"
            title={`#${tag.name} (Double-click or right-click to rename)`}
          >
            #{tag.name}
          </h3>
        )}
      </div>
    </div>
  );
};
