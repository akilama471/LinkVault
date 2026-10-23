import { dbManager } from '../database/db';
import { webContents } from 'electron';

export class SettingsService {
  public getShowHiddenBookmarks(): boolean {
    const db = dbManager.getDb();
    const row = db.prepare("SELECT value FROM application_settings WHERE key = 'show_hidden_bookmarks'").get() as { value: string } | undefined;
    return row?.value === 'true';
  }

  public setShowHiddenBookmarks(show: boolean): void {
    const db = dbManager.getDb();
    const val = show ? 'true' : 'false';
    db.prepare(`
      INSERT INTO application_settings (key, value)
      VALUES ('show_hidden_bookmarks', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(val);

    webContents.getAllWebContents().forEach(wc => {
      wc.send('settings:show-hidden-updated', show);
      wc.send('bookmarks:updated');
      wc.send('collections:updated');
    });
  }

  public getSpaFallbackEnabled(): boolean {
    const db = dbManager.getDb();
    const row = db.prepare("SELECT value FROM application_settings WHERE key = 'enable_spa_fallback'").get() as { value: string } | undefined;
    // Default to true if not explicitly set to 'false'
    return row?.value !== 'false';
  }

  public setSpaFallbackEnabled(enabled: boolean): void {
    const db = dbManager.getDb();
    const val = enabled ? 'true' : 'false';
    db.prepare(`
      INSERT INTO application_settings (key, value)
      VALUES ('enable_spa_fallback', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(val);

    webContents.getAllWebContents().forEach(wc => {
      wc.send('settings:spa-fallback-updated', enabled);
    });
  }
}

export const settingsService = new SettingsService();
