import { ipcMain } from 'electron';
import { passwordService } from '../services/password.service';

export function registerAuthController() {
  ipcMain.handle('auth:hasPassword', () => {
    return passwordService.hasPasswordSet();
  });

  ipcMain.handle('auth:setPassword', async (event, password: string) => {
    try {
      await passwordService.setPassword(password);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:removePassword', async () => {
    try {
      await passwordService.removePassword();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:verifyPassword', async (event, password: string) => {
    try {
      const success = await passwordService.verifyPassword(password);
      return { success };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:lock', () => {
    passwordService.lock();
    return { success: true };
  });
}
