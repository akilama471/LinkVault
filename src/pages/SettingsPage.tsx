import React from 'react';
import { SettingsView } from '../components/settings/SettingsView';

interface SettingsPageProps {
  hasPassword: boolean;
  showHiddenBookmarks: boolean;
  onSetPassword: (password: string) => Promise<boolean>;
  onRemovePassword?: () => Promise<boolean>;
  onToggleShowHiddenBookmarks: (show: boolean) => void;
  onRefreshAll: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ 
  hasPassword, 
  showHiddenBookmarks,
  onSetPassword, 
  onRemovePassword,
  onToggleShowHiddenBookmarks,
  onRefreshAll 
}) => {
  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-500">Manage your application preferences and data</p>
      </div>
      <SettingsView 
        hasPassword={hasPassword} 
        showHiddenBookmarks={showHiddenBookmarks}
        onSetPassword={onSetPassword}
        onRemovePassword={onRemovePassword}
        onToggleShowHiddenBookmarks={onToggleShowHiddenBookmarks}
        onRefreshAll={onRefreshAll}
      />
    </>
  );
};
