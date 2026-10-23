import { passwordService } from '../services/password.service';
import { bookmarkService } from '../services/bookmark.service';
import { collectionService } from '../services/collection.service';
import { enrichmentService } from '../services/enrichment.service';
import { registerSecureHandler } from '../utils/ipc.guard';

export function registerAuthController() {
  registerSecureHandler('auth:hasPassword', () => {
    return passwordService.hasPasswordSet();
  }, { requiresAuth: false });

  registerSecureHandler('auth:setPassword', async (_event, password: string) => {
    await passwordService.setPassword(password);
    return { success: true };
  }, { requiresAuth: false });

  registerSecureHandler('auth:removePassword', async () => {
    await passwordService.removePassword();
    return { success: true };
  }, { requiresAuth: true });

  registerSecureHandler('auth:verifyPassword', async (_event, password: string) => {
    const success = await passwordService.verifyPassword(password);
    if (success) {
      try {
        bookmarkService.purgeExpiredBookmarks();
        collectionService.purgeExpiredCollections();
        enrichmentService.startEnrichmentJob();
      } catch (err) {
        console.warn('Failed to launch deferred background jobs on login:', err);
      }
    }
    return { success };
  }, { requiresAuth: false });

  registerSecureHandler('auth:lock', async () => {
    await passwordService.lock();
    return { success: true };
  }, { requiresAuth: false });
}
