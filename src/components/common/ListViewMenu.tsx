import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Check, EyeOff } from 'lucide-react';
import clsx from 'clsx';

interface ListViewMenuProps {
  showHidden: boolean;
  onToggleShowHidden: () => void;
  disabledTooltip?: string;
}

export const ListViewMenu: React.FC<ListViewMenuProps> = ({
  showHidden,
  onToggleShowHidden,
  disabledTooltip,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "p-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors flex items-center justify-center",
          showHidden && "border-blue-500 text-blue-600 bg-blue-50/50"
        )}
        title="More options"
        aria-label="More options"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-gray-200 z-50 p-1.5 text-sm animate-in fade-in zoom-in-95 duration-100 select-none">
          <button
            type="button"
            onClick={() => {
              onToggleShowHidden();
              setIsOpen(false);
            }}
            title={disabledTooltip}
            className={clsx(
              "w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors cursor-pointer",
              showHidden
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-gray-700 hover:bg-gray-100 font-medium"
            )}
          >
            <div className="flex items-center gap-2">
              <EyeOff className={clsx("w-4 h-4", showHidden ? "text-blue-600" : "text-gray-500")} />
              <span className="text-xs">Show Hidden Bookmarks</span>
            </div>
            {showHidden && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
          </button>
        </div>
      )}
    </div>
  );
};
