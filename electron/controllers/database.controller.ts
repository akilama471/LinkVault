import { ipcMain } from 'electron';
import { dbManager } from '../database/db';
import { passwordService } from '../services/password.service';

export function registerDatabaseController() {
  ipcMain.handle('database:getStats', async () => {
    try {
      passwordService.checkAuth();
      const stats = dbManager.getStorageStats();
      return { success: true, data: stats };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('database:optimize', async () => {
    try {
      passwordService.checkAuth();
      const result = dbManager.optimizeAndCompact();
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
