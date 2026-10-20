import { ipcMain } from 'electron';
import { settingsService } from '../services/settings.service';
import { passwordService } from '../services/password.service';

export function registerSettingsController() {
  ipcMain.handle('settings:getShowHiddenBookmarks', async () => {
    try {
      passwordService.checkAuth();
      const show = settingsService.getShowHiddenBookmarks();
      return { success: true, data: show };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('settings:setShowHiddenBookmarks', async (_event, show: boolean) => {
    try {
      passwordService.checkAuth();
      settingsService.setShowHiddenBookmarks(show);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
