import { dialog } from 'electron';
import { bookmarkExchangeService, ExportFilterOptions } from '../services/bookmark-exchange.service';
import { collectionModel } from '../models/collection.model';
import { tagModel } from '../models/tag.model';
import { dbManager } from '../database/db';
import { registerSecureHandler } from '../utils/ipc.guard';

export function registerBookmarkExchangeController() {
  registerSecureHandler('exchange:export', async (_event, filter: ExportFilterOptions) => {
    let defaultFilename = 'LinkVault_Bookmarks.html';
    let filterName = 'Netscape HTML Bookmarks (*.html)';
    let extensions = ['html', 'htm'];

    if (filter.format === 'json') {
      defaultFilename = 'LinkVault_Bookmarks.json';
      filterName = 'JSON Document (*.json)';
      extensions = ['json'];
    } else if (filter.format === 'csv') {
      defaultFilename = 'LinkVault_Bookmarks.csv';
      filterName = 'CSV Spreadsheet (*.csv)';
      extensions = ['csv'];
    }

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Bookmarks',
      defaultPath: defaultFilename,
      filters: [{ name: filterName, extensions }]
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    const result = await bookmarkExchangeService.exportToFile(filePath, filter);
    return { success: true, total: result.total, filePath };
  });

  registerSecureHandler('exchange:importHtml', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import HTML Bookmarks',
      properties: ['openFile'],
      filters: [
        { name: 'HTML Bookmarks (*.html, *.htm)', extensions: ['html', 'htm'] },
        { name: 'All Files (*.*)', extensions: ['*'] }
      ]
    });

    if (canceled || filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    const result = await bookmarkExchangeService.importFromHtmlFile(filePaths[0]);
    return { success: true, data: result };
  });

  registerSecureHandler('exchange:getMetadata', () => {
    const collections = collectionModel.getAll();
    const tags = tagModel.getAll();
    const countRow = dbManager.getDb().prepare('SELECT count(*) as count FROM bookmarks WHERE deleted_at IS NULL').get() as { count: number };

    return {
      success: true,
      data: {
        totalBookmarks: countRow?.count || 0,
        collections: collections.map(c => ({ id: c.id, name: c.name })),
        tags: tags.map(t => ({ id: t.id, name: t.name }))
      }
    };
  });
}
