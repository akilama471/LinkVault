import React, { useEffect, useRef, useState } from 'react';
import { Domain } from '../../types/models';
import { RotateCw, Edit3, Trash2, ChevronRight, Globe, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

interface DomainContextMenuProps {
  x: number;
  y: number;
  domain: Domain;
  bookmarkCount: number;
  isRefetching: boolean;
  onClose: () => void;
  onRefetch: () => void;
  onRename: () => void;
  onOpenDeleteModal: () => void;
  onQuickDelete: (deleteBookmarks: boolean) => void;
}

export const DomainContextMenu: React.FC<DomainContextMenuProps> = ({
  x,
  y,
  domain,
  bookmarkCount,
  isRefetching,
  onClose,
  onRefetch,
  onRename,
  onOpenDeleteModal,
  onQuickDelete
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: y, left: x });
  const [showDeleteSubmenu, setShowDeleteSubmenu] = useState(false);
  const [submenuSide, setSubmenuSide] = useState<'right' | 'left'>('right');

  // Adjust menu position so it doesn't overflow screen boundaries
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const padding = 12;

    let adjustedX = x;
    let adjustedY = y;

    if (x + rect.width > window.innerWidth - padding) {
      adjustedX = Math.max(padding, window.innerWidth - rect.width - padding);
      setSubmenuSide('left');
    } else {
      setSubmenuSide('right');
    }

    if (y + rect.height > window.innerHeight - padding) {
      adjustedY = Math.max(padding, window.innerHeight - rect.height - padding);
    }

    setPosition({ top: adjustedY, left: adjustedX });
  }, [x, y]);

  // Handle outside click & escape key
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

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [onClose]);

  const displayName = domain.display_name || domain.domain;

  return (
    <div
      ref={menuRef}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      className="fixed z-[9999] min-w-[210px] bg-white/95 backdrop-blur-md rounded-xl border border-gray-200/90 shadow-2xl p-1.5 text-sm select-none animate-in fade-in zoom-in-95 duration-100 text-gray-800"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with Domain Info */}
      <div className="px-2.5 py-1.5 border-b border-gray-100 mb-1">
        <p className="font-semibold text-gray-900 truncate max-w-[200px]" title={displayName}>
          {displayName}
        </p>
        <p className="text-[11px] text-gray-400 truncate max-w-[200px]" title={domain.domain}>
          {domain.domain} • {bookmarkCount} {bookmarkCount === 1 ? 'bookmark' : 'bookmarks'}
        </p>
      </div>

      {/* Refetch Option */}
      <button
        onClick={() => {
          if (!isRefetching) {
            onRefetch();
            onClose();
          }
        }}
        disabled={isRefetching}
        className={clsx(
          "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer",
          isRefetching ? "text-gray-400 bg-gray-50 cursor-not-allowed" : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
        )}
      >
        <RotateCw className={clsx("w-4 h-4 shrink-0", isRefetching ? "animate-spin text-blue-500" : "text-gray-500")} />
        <div className="flex flex-col">
          <span className="font-medium text-xs leading-none">
            {isRefetching ? 'Refetching...' : 'Refetch'}
          </span>
          <span className="text-[10px] text-gray-400 mt-0.5">Update icon & metadata</span>
        </div>
      </button>

      {/* Rename Option */}
      <button
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

      {/* Delete Option with Submenu and Click Action */}
      <div 
        className="relative"
        onMouseEnter={() => setShowDeleteSubmenu(true)}
        onMouseLeave={() => setShowDeleteSubmenu(false)}
      >
        <button
          onClick={() => {
            onOpenDeleteModal();
            onClose();
          }}
          className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2.5">
            <Trash2 className="w-4 h-4 text-red-500 shrink-0 group-hover:scale-110 transition-transform" />
            <div className="flex flex-col">
              <span className="font-medium text-xs leading-none">Delete</span>
              <span className="text-[10px] text-red-400 mt-0.5">Remove domain...</span>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-red-400 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Delete Flyout Submenu */}
        {showDeleteSubmenu && (
          <div 
            className={clsx(
              "absolute top-0 min-w-[220px] bg-white/95 backdrop-blur-md rounded-xl border border-gray-200/90 shadow-2xl p-1.5 z-[10000] text-sm animate-in fade-in duration-100",
              submenuSide === 'right' ? "left-full ml-1" : "right-full mr-1"
            )}
          >
            <div className="px-2.5 py-1 text-[11px] font-semibold text-gray-400 border-b border-gray-100 mb-1">
              Deletion Options
            </div>

            {/* Option 1: Delete only domain details */}
            <button
              onClick={() => {
                onQuickDelete(false);
                onClose();
              }}
              className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <Globe className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="font-medium text-xs text-gray-900 leading-tight">Delete domain only</span>
                <span className="text-[10px] text-gray-500 mt-0.5 leading-snug">
                  Keep {bookmarkCount} bookmark{bookmarkCount === 1 ? '' : 's'}
                </span>
              </div>
            </button>

            {/* Option 2: Delete both domain details and bookmarks */}
            <button
              onClick={() => {
                onQuickDelete(true);
                onClose();
              }}
              className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="font-medium text-xs leading-tight">Delete domain & bookmarks</span>
                <span className="text-[10px] text-red-400 mt-0.5 leading-snug">
                  Remove all {bookmarkCount} bookmark{bookmarkCount === 1 ? '' : 's'}
                </span>
              </div>
            </button>

            <div className="my-1 border-t border-gray-100" />

            {/* Modal opener for detailed review */}
            <button
              onClick={() => {
                onOpenDeleteModal();
                onClose();
              }}
              className="w-full text-center px-2 py-1.5 rounded text-[11px] text-gray-500 hover:text-gray-800 hover:bg-gray-100 font-medium cursor-pointer"
            >
              Open confirmation dialog...
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
