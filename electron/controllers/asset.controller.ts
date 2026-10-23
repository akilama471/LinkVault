import { ipcMain } from 'electron';
import { assetService } from '../services/asset.service';
import { passwordService } from '../services/password.service';

export function registerAssetController() {
  ipcMain.handle('assets:getStorageStats', async () => {
    try {
      passwordService.checkAuth();
      const stats = await assetService.getStorageStats();
      return { success: true, data: stats };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('assets:vacuum', async () => {
    try {
      passwordService.checkAuth();
      const result = await assetService.pruneOrphanAssets();
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
