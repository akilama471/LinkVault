import React from 'react';
import { LayoutGrid, Grid3X3, List } from 'lucide-react';
import clsx from 'clsx';

export type ViewMode = 'comfortable' | 'compact' | 'list';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode,
  onChange,
  className
}) => {
  const options: { mode: ViewMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { mode: 'comfortable', label: 'Comfortable Grid', icon: LayoutGrid },
    { mode: 'compact', label: 'Compact Grid', icon: Grid3X3 },
    { mode: 'list', label: 'Detailed List View', icon: List }
  ];

  return (
    <div
      className={clsx(
        "flex items-center p-0.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 shadow-2xs select-none",
        className
      )}
      role="group"
      aria-label="View Density"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = viewMode === opt.mode;
        return (
          <button
            key={opt.mode}
            type="button"
            onClick={() => onChange(opt.mode)}
            title={opt.label}
            aria-label={opt.label}
            aria-pressed={isActive}
            className={clsx(
              "p-1.5 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center justify-center",
              isActive
                ? "bg-white text-blue-600 shadow-xs font-semibold"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/60"
            )}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
};
