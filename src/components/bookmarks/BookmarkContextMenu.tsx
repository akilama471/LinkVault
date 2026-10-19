import React, { useEffect, useRef, useState } from 'react';
import { Bookmark } from '../../types/models';
import { RotateCw, Edit3, Trash2 } from 'lucide-react';
import clsx from 'clsx';

interface BookmarkContextMenuProps {
  x: number;
  y: number;
  bookmark: Bookmark;
  isRefetching: boolean;
  onClose: () => void;
  onRefetch: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export const BookmarkContextMenu: React.FC<BookmarkContextMenuProps> = ({
  x,
  y,
  bookmark,
  isRefetching,
  onClose,
  onRefetch,
  onRename,
  onDelete,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: y, left: x });

  // Adjust menu position so it doesn't overflow screen boundaries
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const padding = 12;

    let adjustedX = x;
    let adjustedY = y;

    if (x + rect.width > window.innerWidth - padding) {
      adjustedX = Math.max(padding, window.innerWidth - rect.width - padding);
    }

    if (y + rect.height > window.innerHeight - padding) {
      adjustedY = Math.max(padding, window.innerHeight - rect.height - padding);
    }

    setPosition({ top: adjustedY, left: adjustedX });
  }, [x, y]);

  // Handle outside click, escape key, scroll, and other context menus
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleCloseAll = () => {
      onClose();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('scroll', handleCloseAll, true);
    window.addEventListener('close-context-menus', handleCloseAll);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('scroll', handleCloseAll, true);
      window.removeEventListener('close-context-menus', handleCloseAll);
    };
  }, [onClose]);

  const displayName = bookmark.title || 'Untitled';

  return (
    <div
      ref={menuRef}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      className="fixed z-[9999] min-w-[210px] bg-white/95 backdrop-blur-md rounded-xl border border-gray-200/90 shadow-2xl p-1.5 text-sm select-none animate-in fade-in zoom-in-95 duration-100 text-gray-800"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* Header with Bookmark Info */}
      <div className="px-2.5 py-1.5 border-b border-gray-100 mb-1">
        <p className="font-semibold text-gray-900 truncate max-w-[200px]" title={displayName}>
          {displayName}
        </p>
        <p className="text-[11px] text-gray-400 truncate max-w-[200px]" title={bookmark.url}>
          {bookmark.url}
        </p>
      </div>

      {/* Refetch Option */}
      <button
        type="button"
        onClick={() => {
          if (!isRefetching) {
            onRefetch();
            onClose();
          }
        }}
        disabled={isRefetching}
        className={clsx(
          "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer",
          isRefetching
            ? "text-gray-400 bg-gray-50 cursor-not-allowed"
            : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
        )}
      >
        <RotateCw
          className={clsx(
            "w-4 h-4 shrink-0",
            isRefetching ? "animate-spin text-blue-500" : "text-gray-500"
          )}
        />
        <div className="flex flex-col">
          <span className="font-medium text-xs leading-none">
            {isRefetching ? 'Refetching...' : 'Refetch'}
          </span>
          <span className="text-[10px] text-gray-400 mt-0.5">Update link details</span>
        </div>
      </button>

      {/* Rename Option */}
      <button
        type="button"
        onClick={() => {
          onRename();
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
      >
        <Edit3 className="w-4 h-4 text-gray-500 shrink-0" />
        <div className="flex flex-col">
          <span className="font-medium text-xs leading-none">Rename</span>
          <span className="text-[10px] text-gray-400 mt-0.5">Change display name</span>
        </div>
      </button>

      <div className="my-1 border-t border-gray-100" />

      {/* Delete Option */}
      <button
        type="button"
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer group"
      >
        <Trash2 className="w-4 h-4 text-red-500 shrink-0 group-hover:scale-110 transition-transform" />
        <div className="flex flex-col">
          <span className="font-medium text-xs leading-none">Delete</span>
          <span className="text-[10px] text-red-400 mt-0.5">Move to Recycle Bin</span>
        </div>
      </button>
    </div>
  );
};
