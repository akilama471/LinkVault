import { dbManager } from '../database/db';
import { Domain } from '../../src/types/models';

export class DomainModel {
  public findByDomain(domain: string): Domain | null {
    const db = dbManager.getDb();
    const stmt = db.prepare('SELECT * FROM domains WHERE domain = ?');
    return stmt.get(domain) as Domain | null;
  }

  public create(domain: string, faviconPath: string | null): Domain {
    const db = dbManager.getDb();
    const stmt = db.prepare('INSERT INTO domains (domain, favicon_path) VALUES (?, ?)');
    const info = stmt.run(domain, faviconPath);
    return this.findById(info.lastInsertRowid as number)!;
  }

  public updateFavicon(id: number, faviconPath: string | null): void {
    const db = dbManager.getDb();
    const stmt = db.prepare('UPDATE domains SET favicon_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(faviconPath, id);
  }

  public findById(id: number): Domain | null {
    const db = dbManager.getDb();
    const stmt = db.prepare('SELECT * FROM domains WHERE id = ?');
    return stmt.get(id) as Domain | null;
  }

  public updateDisplayName(id: number, displayName: string | null): Domain {
    const db = dbManager.getDb();
    const stmt = db.prepare('UPDATE domains SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(displayName, id);
    return this.findById(id)!;
  }

  public delete(id: number): void {
    const db = dbManager.getDb();
    db.prepare('DELETE FROM domains WHERE id = ?').run(id);
  }

  public getAll(): Domain[] {
    const db = dbManager.getDb();
    const stmt = db.prepare('SELECT * FROM domains ORDER BY COALESCE(display_name, domain) COLLATE NOCASE ASC');
    return stmt.all() as Domain[];
  }
}

export const domainModel = new DomainModel();
