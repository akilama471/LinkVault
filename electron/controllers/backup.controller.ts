import { dialog } from 'electron';
import { backupService } from '../services/backup.service';
import { registerSecureHandler } from '../utils/ipc.guard';

export function registerBackupController() {
  registerSecureHandler('backup:export', async () => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Backup',
      defaultPath: 'bookmark_manager_backup.zip',
      filters: [{ name: 'ZIP Archives', extensions: ['zip'] }]
    });

    if (canceled || !filePath) return { success: false, canceled: true };

    await backupService.exportBackup(filePath);
    return { success: true };
  });

  registerSecureHandler('backup:import', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import Backup',
      properties: ['openFile'],
      filters: [{ name: 'ZIP Archives', extensions: ['zip'] }]
    });

    if (canceled || filePaths.length === 0) return { success: false, canceled: true };

    // Prompt warning since it overrides data
    const result = await dialog.showMessageBox({
      type: 'warning',
      title: 'Overwrite Data?',
      message: 'Importing a backup will overwrite all current bookmarks, collections, and settings. The application will restart automatically. Are you sure you want to proceed?',
      buttons: ['Cancel', 'Import and Restart'],
      defaultId: 0,
      cancelId: 0
    });

    if (result.response === 0) return { success: false, canceled: true };

    await backupService.importBackup(filePaths[0]);
    return { success: true };
  });

  registerSecureHandler('backup:wipeData', async () => {
    const result = await dialog.showMessageBox({
      type: 'warning',
      title: 'Wipe All Data?',
      message: 'This will permanently delete all bookmarks, tags, collections, domains, and cached images. This action cannot be undone. Are you sure you want to wipe all data?',
      buttons: ['Cancel', 'Yes, Delete Everything'],
      defaultId: 0,
      cancelId: 0
    });

    if (result.response === 0) return { success: false, canceled: true };

    await backupService.wipeAllData();
    return { success: true };
  });
}
