import { settingsService } from '../services/settings.service';
import { registerSecureHandler } from '../utils/ipc.guard';

export function registerSettingsController() {
  registerSecureHandler('settings:getShowHiddenBookmarks', () => {
    const show = settingsService.getShowHiddenBookmarks();
    return { success: true, data: show };
  });

  registerSecureHandler('settings:setShowHiddenBookmarks', (_event, show: boolean) => {
    settingsService.setShowHiddenBookmarks(show);
    return { success: true };
  });

  registerSecureHandler('settings:getSpaFallback', () => {
    const enabled = settingsService.getSpaFallbackEnabled();
    return { success: true, data: enabled };
  });

  registerSecureHandler('settings:setSpaFallback', (_event, enabled: boolean) => {
    settingsService.setSpaFallbackEnabled(enabled);
    return { success: true };
  });
}
