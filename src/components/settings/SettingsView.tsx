import React from 'react';
import { SecuritySettings } from './SecuritySettings';
import { PrivacySettings } from './PrivacySettings';
import { BrowserSettings } from './BrowserSettings';
import { BrowserImportSettings } from './BrowserImportSettings';
import { ScrapingSettings } from './ScrapingSettings';
import { AssetStorageSettings } from './AssetStorageSettings';
import { DatabaseSettings } from './DatabaseSettings';
import { BackupSettings } from './BackupSettings';
import { DangerZoneSettings } from './DangerZoneSettings';

interface SettingsViewProps {
  hasPassword: boolean;
  showHiddenBookmarks: boolean;
  onSetPassword: (password: string) => Promise<boolean>;
  onRemovePassword?: () => Promise<boolean>;
  onToggleShowHiddenBookmarks: (show: boolean) => void;
  onRefreshAll: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  hasPassword, 
  showHiddenBookmarks,
  onSetPassword, 
  onRemovePassword, 
  onToggleShowHiddenBookmarks,
  onRefreshAll 
}) => {
  return (
    <div className="max-w-2xl space-y-6">
      <SecuritySettings 
        hasPassword={hasPassword} 
        onSetPassword={onSetPassword} 
        onRemovePassword={onRemovePassword}
      />
      <PrivacySettings
        showHiddenBookmarks={showHiddenBookmarks}
        onToggleShowHiddenBookmarks={onToggleShowHiddenBookmarks}
      />
      <BrowserSettings />
      <BrowserImportSettings onRefreshAll={onRefreshAll} />
      <ScrapingSettings />
      <AssetStorageSettings />
      <DatabaseSettings onRefreshAll={onRefreshAll} />
      <BackupSettings />
      <DangerZoneSettings onRefreshAll={onRefreshAll} />
    </div>
  );
};
