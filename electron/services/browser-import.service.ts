import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const dbName = ['better', 'sqlite3'].join('-');
const Database = require(dbName);
import { dbManager } from '../database/db';
import { domainModel } from '../models/domain.model';

export type SupportedBrowser = 'chrome' | 'edge' | 'opera' | 'firefox' | 'yandex';

export interface BrowserProfile {
  id: string;
  name: string;
  path: string;
}

export class BrowserImportService {
  private getLocalDataPath(): string {
    return process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  }

  private getRoamingDataPath(): string {
    return process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  }

  private getBrowserDataDir(browser: SupportedBrowser): string | null {
    const local = this.getLocalDataPath();
    const roaming = this.getRoamingDataPath();

    switch (browser) {
      case 'chrome':
        return path.join(local, 'Google', 'Chrome', 'User Data');
      case 'edge':
        return path.join(local, 'Microsoft', 'Edge', 'User Data');
      case 'yandex':
        return path.join(local, 'Yandex', 'YandexBrowser', 'User Data');
      case 'opera':
        return path.join(roaming, 'Opera Software', 'Opera Stable');
      case 'firefox':
        return path.join(roaming, 'Mozilla', 'Firefox', 'Profiles');
      default:
        return null;
    }
  }

  public getProfiles(browser: SupportedBrowser): BrowserProfile[] {
    const dataDir = this.getBrowserDataDir(browser);
    if (!dataDir || !fs.existsSync(dataDir)) {
      throw new Error('Browser data not found on this computer. Ensure the browser is installed.');
    }

    const profiles: BrowserProfile[] = [];

    if (browser === 'firefox') {
      const dirs = fs.readdirSync(dataDir, { withFileTypes: true });
      for (const dir of dirs) {
        if (dir.isDirectory()) {
          const placesPath = path.join(dataDir, dir.name, 'places.sqlite');
          if (fs.existsSync(placesPath)) {
            profiles.push({
              id: dir.name,
              name: dir.name.includes('.') ? dir.name.split('.')[1] || dir.name : dir.name,
              path: path.join(dataDir, dir.name)
            });
          }
        }
      }
    } else if (browser === 'opera') {
      const bookmarksPath = path.join(dataDir, 'Bookmarks');
      if (fs.existsSync(bookmarksPath)) {
        profiles.push({
          id: 'default',
          name: 'Default Profile',
          path: dataDir
        });
      }
    } else {
      const dirs = fs.readdirSync(dataDir, { withFileTypes: true });
      for (const dir of dirs) {
        if (dir.isDirectory() && (dir.name === 'Default' || dir.name.startsWith('Profile '))) {
          const bookmarksPath = path.join(dataDir, dir.name, 'Bookmarks');
          if (fs.existsSync(bookmarksPath)) {
            profiles.push({
              id: dir.name,
              name: dir.name === 'Default' ? 'Default Profile' : dir.name,
              path: path.join(dataDir, dir.name)
            });
          }
        }
      }
    }

    if (profiles.length === 0) {
      throw new Error('No profiles with bookmarks found for this browser.');
    }

    return profiles;
  }

  public extractBookmarks(browser: SupportedBrowser, profilePath: string): { title: string; url: string }[] {
    if (!fs.existsSync(profilePath)) throw new Error('Profile path not found');

    const bookmarks: { title: string; url: string }[] = [];

    if (browser === 'firefox') {
      const placesPath = path.join(profilePath, 'places.sqlite');
      if (!fs.existsSync(placesPath)) throw new Error('places.sqlite not found');

      // Copy to temp to avoid DB locks
      const tempDbPath = path.join(os.tmpdir(), `temp_places_${Date.now()}.sqlite`);
      fs.copyFileSync(placesPath, tempDbPath);

      try {
        const ffDb = new Database(tempDbPath, { readonly: true });
        const stmt = ffDb.prepare(`
          SELECT b.title, p.url 
          FROM moz_bookmarks b
          JOIN moz_places p ON b.fk = p.id
          WHERE b.type = 1 AND p.url LIKE 'http%'
        `);
        
        for (const row of stmt.iterate() as IterableIterator<{ title: string | null; url: string }>) {
          if (row.url) {
            bookmarks.push({ title: row.title || 'Untitled', url: row.url });
          }
        }
        ffDb.close();
      } finally {
        if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
      }
    } else {
      // Chromium based JSON
      const bookmarksPath = path.join(profilePath, 'Bookmarks');
      if (!fs.existsSync(bookmarksPath)) throw new Error('Bookmarks file not found');

      const data = JSON.parse(fs.readFileSync(bookmarksPath, 'utf8'));
      
      const traverse = (node: any) => {
        if (!node) return;
        if (node.type === 'url' && node.url && node.url.startsWith('http')) {
          bookmarks.push({ title: node.name || 'Untitled', url: node.url });
        } else if (node.type === 'folder' && node.children) {
          for (const child of node.children) {
            traverse(child);
          }
        }
      };

      if (data.roots) {
        if (data.roots.bookmark_bar) traverse(data.roots.bookmark_bar);
        if (data.roots.other) traverse(data.roots.other);
        if (data.roots.synced) traverse(data.roots.synced);
      }
    }

    return bookmarks;
  }

  public async importBookmarks(bookmarks: { title: string; url: string }[]): Promise<{ imported: number; duplicates: number; total: number }> {
    if (!bookmarks || bookmarks.length === 0) return { imported: 0, duplicates: 0, total: 0 };

    const db = dbManager.getDb();
    const insert = db.prepare(`
      INSERT INTO bookmarks (url, title, domain_id, thumbnail_path) 
      VALUES (?, ?, ?, 'pending')
      ON CONFLICT(url) DO NOTHING
    `);
    
    const domainCache = new Map<string, number>();
    
    const getDomainIdSync = (urlStr: string): number | null => {
      try {
        const hostname = new URL(urlStr).hostname;
        if (domainCache.has(hostname)) return domainCache.get(hostname)!;
        
        let domain = domainModel.findByDomain(hostname);
        if (!domain) {
           domain = domainModel.create(hostname, null);
        }
        domainCache.set(hostname, domain.id);
        return domain.id;
      } catch {
        return null;
      }
    };
    
    let importedCount = 0;
    let duplicateCount = 0;
    const CHUNK_SIZE = 100;
    
    for (let i = 0; i < bookmarks.length; i += CHUNK_SIZE) {
      const chunk = bookmarks.slice(i, i + CHUNK_SIZE);
      db.transaction(() => {
        for (const b of chunk) {
          const domainId = getDomainIdSync(b.url);
          const info = insert.run(b.url, b.title, domainId);
          if (info.changes > 0) {
            importedCount++;
          } else {
            duplicateCount++;
          }
        }
      })();
      // Yield to event loop to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    return {
      imported: importedCount,
      duplicates: duplicateCount,
      total: bookmarks.length
    };
  }
}

export const browserImportService = new BrowserImportService();
