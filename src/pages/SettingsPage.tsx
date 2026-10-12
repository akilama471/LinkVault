import React from 'react';
import { SettingsView } from '../components/settings/SettingsView';

interface SettingsPageProps {
  hasPassword: boolean;
  onSetPassword: (password: string) => Promise<boolean>;
  onRemovePassword?: () => Promise<boolean>;
  onRefreshAll: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ 
  hasPassword, 
  onSetPassword, 
  onRemovePassword,
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
        onSetPassword={onSetPassword}
        onRemovePassword={onRemovePassword}
        onRefreshAll={onRefreshAll}
      />
    </>
  );
};
