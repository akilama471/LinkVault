import { assetService } from '../services/asset.service';
import { registerSecureHandler } from '../utils/ipc.guard';

export function registerAssetController() {
  registerSecureHandler('assets:getStorageStats', async () => {
    const stats = await assetService.getStorageStats();
    return { success: true, data: stats };
  });

  registerSecureHandler('assets:vacuum', async () => {
    const result = await assetService.pruneOrphanAssets();
    return { success: true, data: result };
  });
}
