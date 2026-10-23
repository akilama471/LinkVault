import { dbManager } from '../database/db';
import { registerSecureHandler } from '../utils/ipc.guard';

export function registerDatabaseController() {
  registerSecureHandler('database:getStats', () => {
    const stats = dbManager.getStorageStats();
    return { success: true, data: stats };
  });

  registerSecureHandler('database:optimize', () => {
    const result = dbManager.optimizeAndCompact();
    return { success: true, data: result };
  });
}
