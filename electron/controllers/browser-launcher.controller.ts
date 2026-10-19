import { ipcMain } from 'electron';
import { 
  browserLauncherService, 
  BrowserOption, 
  SupportedBrowserName 
} from '../services/browser-launcher.service';
import { passwordService } from '../services/password.service';

export function registerBrowserLauncherController() {
  ipcMain.handle('settings:getDefaultBrowser', async () => {
    try {
      passwordService.checkAuth();
      const defaultBrowser = browserLauncherService.getDefaultBrowser();
      return { success: true, data: defaultBrowser };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('settings:setDefaultBrowser', async (_event, browser: BrowserOption) => {
    try {
      passwordService.checkAuth();
      browserLauncherService.setDefaultBrowser(browser);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('settings:getBrowserStatuses', async () => {
    try {
      passwordService.checkAuth();
      const statuses = browserLauncherService.getAllBrowserStatuses();
      return { success: true, data: statuses };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('settings:setCustomBrowserPath', async (_event, browser: SupportedBrowserName, customPath: string) => {
    try {
      passwordService.checkAuth();
      browserLauncherService.setCustomPath(browser, customPath);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('settings:clearCustomBrowserPath', async (_event, browser: SupportedBrowserName) => {
    try {
      passwordService.checkAuth();
      browserLauncherService.clearCustomPath(browser);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('settings:browseBrowserExecutable', async (_event, browser: SupportedBrowserName) => {
    try {
      passwordService.checkAuth();
      const result = await browserLauncherService.browseForBrowser(browser);
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('browser:openUrl', async (_event, url: string, browserName?: BrowserOption) => {
    try {
      passwordService.checkAuth();
      const result = await browserLauncherService.openUrl(url, browserName);
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
