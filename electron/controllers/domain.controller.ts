import { ipcMain } from 'electron';
import { domainModel } from '../models/domain.model';
import { domainService } from '../services/domain.service';
import { passwordService } from '../services/password.service';

export function registerDomainController() {
  ipcMain.handle('domains:getAll', async () => {
    try {
      passwordService.checkAuth();
      const domains = domainModel.getAll();
      return { success: true, data: domains };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('domains:refetch', async (event, id: number) => {
    try {
      passwordService.checkAuth();
      const domain = await domainService.refetchDomain(id);
      return { success: true, data: domain };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('domains:rename', async (event, id: number, newName: string) => {
    try {
      passwordService.checkAuth();
      const domain = domainService.renameDomain(id, newName);
      return { success: true, data: domain };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('domains:delete', async (event, id: number, deleteBookmarks: boolean) => {
    try {
      passwordService.checkAuth();
      await domainService.deleteDomain(id, deleteBookmarks);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
