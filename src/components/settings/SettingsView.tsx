import React from 'react';
import { SecuritySettings } from './SecuritySettings';
import { BrowserSettings } from './BrowserSettings';
import { BrowserImportSettings } from './BrowserImportSettings';
import { BackupSettings } from './BackupSettings';
import { DangerZoneSettings } from './DangerZoneSettings';

interface SettingsViewProps {
  hasPassword: boolean;
  onSetPassword: (password: string) => Promise<boolean>;
  onRemovePassword?: () => Promise<boolean>;
  onRefreshAll: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  hasPassword, 
  onSetPassword, 
  onRemovePassword, 
  onRefreshAll 
}) => {
  return (
    <div className="max-w-2xl space-y-6">
      <SecuritySettings 
        hasPassword={hasPassword} 
        onSetPassword={onSetPassword} 
        onRemovePassword={onRemovePassword}
      />
      <BrowserSettings />
      <BrowserImportSettings onRefreshAll={onRefreshAll} />
      <BackupSettings />
      <DangerZoneSettings onRefreshAll={onRefreshAll} />
    </div>
  );
};
