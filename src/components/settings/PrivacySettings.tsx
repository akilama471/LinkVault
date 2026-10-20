import React from 'react';
import { EyeOff } from 'lucide-react';

interface PrivacySettingsProps {
  showHiddenBookmarks: boolean;
  onToggleShowHiddenBookmarks: (show: boolean) => void;
}

export const PrivacySettings: React.FC<PrivacySettingsProps> = ({
  showHiddenBookmarks,
  onToggleShowHiddenBookmarks,
}) => {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
          <EyeOff className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Privacy & Visibility</h3>
          <p className="text-sm text-gray-500">Manage hidden bookmark display preferences</p>
        </div>
      </div>

      <div className="pt-2">
        <label
          htmlFor="show-hidden-bookmarks-checkbox"
          className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <div className="pr-4">
            <span className="font-medium text-sm text-gray-900 block">
              Show Hidden Bookmarks
            </span>
            <p className="text-xs text-gray-500 mt-0.5">
              Display bookmarks hidden from all locations (Method 2).
            </p>
          </div>
          <input
            id="show-hidden-bookmarks-checkbox"
            type="checkbox"
            checked={showHiddenBookmarks}
            onChange={(e) => onToggleShowHiddenBookmarks(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
};
