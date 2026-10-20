import React, { useState, useRef, useEffect } from 'react';
import { Domain } from '../../types/models';
import { Globe, RotateCw, MoreVertical, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface DomainCardProps {
  domain: Domain;
  bookmarkCount: number;
  isRefetching: boolean;
  isRenaming: boolean;
  onSelect: () => void;
  onStartRename: () => void;
  onFinishRename: (newName: string) => Promise<void>;
  onCancelRename: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onOpenMenu: (e: React.MouseEvent) => void;
}

export const DomainCard: React.FC<DomainCardProps> = ({
  domain,
  bookmarkCount,
  isRefetching,
  isRenaming,
  onSelect,
  onStartRename,
  onFinishRename,
  onCancelRename,
  onContextMenu,
  onOpenMenu
}) => {
  const displayName = domain.display_name || domain.domain;
  const [editValue, setEditValue] = useState(displayName);
  const [isSaving, setIsSaving] = useState(false);
  const [imgError, setImgError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync editValue when displayName or isRenaming changes
  useEffect(() => {
    if (isRenaming) {
      setEditValue(displayName);
    }
  }, [isRenaming, displayName]);

  // Focus and select text when entering rename mode (like Windows File Explorer)
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  // Reset img error on favicon_path change
  useEffect(() => {
    setImgError(false);
  }, [domain.favicon_path]);

  const handleSave = async () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === displayName) {
      onCancelRename();
      return;
    }

    setIsSaving(true);
    try {
      await onFinishRename(trimmed);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
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

  const iconUrl = (!imgError && domain.favicon_path)
    ? `asset://${domain.favicon_path}`
    : (!imgError ? `https://www.google.com/s2/favicons?domain=${domain.domain}&sz=64` : null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('close-context-menus'));
    onContextMenu(e);
  };

  return (
    <div
      onClick={() => {
        if (!isRenaming && !isRefetching) {
          onSelect();
        }
      }}
      onContextMenu={handleContextMenu}
      className={clsx(
        "relative flex flex-col items-center justify-between p-5 bg-white rounded-2xl shadow-xs border transition-all duration-200 group select-none cursor-pointer",
        isRenaming
          ? "border-blue-500 ring-2 ring-blue-500/20 shadow-md cursor-default"
          : "border-gray-200/80 hover:shadow-lg hover:border-blue-300 hover:-translate-y-0.5",
        isRefetching && "opacity-90"
      )}
    >
      {/* Top Bar: Bookmark count & Context Menu button */}
      <div className="w-full flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium text-gray-500 bg-gray-100/80 px-2 py-0.5 rounded-full border border-gray-200/60 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100">
          {bookmarkCount} {bookmarkCount === 1 ? 'bookmark' : 'bookmarks'}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('close-context-menus'));
            onOpenMenu(e);
          }}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
          title="More actions"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Website Icon Container */}
      <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-b from-gray-50 to-gray-100 border border-gray-200/70 flex items-center justify-center my-3 overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-200">
        {/* Loading Indicator for Refetch */}
        {isRefetching && (
          <div className="absolute inset-0 bg-white/85 backdrop-blur-xs flex flex-col items-center justify-center z-10 animate-in fade-in duration-200">
            <RotateCw className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        )}

        {iconUrl ? (
          <img
            src={iconUrl}
            alt={displayName}
            onError={() => setImgError(true)}
            className="w-9 h-9 object-contain drop-shadow-xs"
          />
        ) : (
          <Globe className="w-8 h-8 text-gray-400" />
        )}
      </div>

      {/* Domain Name & Subtitle / Inline Renaming */}
      <div className="w-full flex flex-col items-center px-1 min-h-[46px] justify-center">
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
                placeholder="Domain name"
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
              className="font-semibold text-gray-800 text-sm truncate max-w-full text-center group-hover:text-blue-600 transition-colors"
              title={`${displayName} (Double-click or right-click to rename)`}
            >
              {displayName}
            </h3>
            {domain.display_name && domain.display_name !== domain.domain && (
              <span 
                className="text-xs text-gray-400 truncate max-w-full text-center mt-0.5"
                title={domain.domain}
              >
                {domain.domain}
              </span>
            )}
          </>
        )}
      </div>

      {/* Refetching Status Badge */}
      {isRefetching && (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-blue-600 mt-2 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Updating...</span>
        </div>
      )}
    </div>
  );
};
