import { 
  browserLauncherService, 
  BrowserOption, 
  SupportedBrowserName 
} from '../services/browser-launcher.service';
import { registerSecureHandler } from '../utils/ipc.guard';

export function registerBrowserLauncherController() {
  registerSecureHandler('settings:getDefaultBrowser', () => {
    const defaultBrowser = browserLauncherService.getDefaultBrowser();
    return { success: true, data: defaultBrowser };
  });

  registerSecureHandler('settings:setDefaultBrowser', (_event, browser: BrowserOption) => {
    browserLauncherService.setDefaultBrowser(browser);
    return { success: true };
  });

  registerSecureHandler('settings:getBrowserStatuses', () => {
    const statuses = browserLauncherService.getAllBrowserStatuses();
    return { success: true, data: statuses };
  });

  registerSecureHandler('settings:setCustomBrowserPath', (_event, browser: SupportedBrowserName, customPath: string) => {
    browserLauncherService.setCustomPath(browser, customPath);
    return { success: true };
  });

  registerSecureHandler('settings:clearCustomBrowserPath', (_event, browser: SupportedBrowserName) => {
    browserLauncherService.clearCustomPath(browser);
    return { success: true };
  });

  registerSecureHandler('settings:browseBrowserExecutable', async (_event, browser: SupportedBrowserName) => {
    return await browserLauncherService.browseForBrowser(browser);
  });

  registerSecureHandler('browser:openUrl', async (_event, url: string, browserName?: BrowserOption) => {
    return await browserLauncherService.openUrl(url, browserName);
  });
}
