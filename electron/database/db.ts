import type { Database as DatabaseType } from 'better-sqlite3';
const dbName = ['better', 'sqlite3'].join('-');
const Database = require(dbName);
import path from 'node:path';
import { app } from 'electron';
import fs from 'node:fs';

export class DbManager {
  private db: DatabaseType | null = null;
  private readonly dbPath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'bookmark_manager.sqlite');
    this.init();
  }

  private init() {
    try {
      this.db = new Database(this.dbPath);
      this.db!.pragma('journal_mode = WAL');
      this.db!.pragma('foreign_keys = ON');
      console.log(`Database initialized at: ${this.dbPath}`);
      this.runMigrations();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  public getDb(): DatabaseType {
    if (!this.db) {
      throw new Error('Database is not initialized');
    }
    return this.db;
  }

  private runMigrations() {
    const db = this.getDb();
    
    // Create migrations table if not exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const currentVersionRow = db.prepare('SELECT MAX(version) as version FROM schema_migrations').get() as { version: number | null };
    const currentVersion = currentVersionRow?.version || 0;

    // Define migrations
    const migrations = [
      {
        version: 1,
        up: `
          CREATE TABLE application_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
          );

          CREATE TABLE domains (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            domain TEXT NOT NULL UNIQUE,
            favicon_path TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE bookmarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT NOT NULL UNIQUE,
            title TEXT,
            description TEXT,
            domain_id INTEGER,
            thumbnail_path TEXT,
            preview_path TEXT,
            is_favorite INTEGER DEFAULT 0,
            is_important INTEGER DEFAULT 0,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(domain_id) REFERENCES domains(id) ON DELETE SET NULL
          );

          CREATE TABLE tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE COLLATE NOCASE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE bookmark_tags (
            bookmark_id INTEGER,
            tag_id INTEGER,
            PRIMARY KEY(bookmark_id, tag_id),
            FOREIGN KEY(bookmark_id) REFERENCES bookmarks(id) ON DELETE CASCADE,
            FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
          );

          CREATE TABLE collections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE COLLATE NOCASE,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE bookmark_collections (
            bookmark_id INTEGER,
            collection_id INTEGER,
            PRIMARY KEY(bookmark_id, collection_id),
            FOREIGN KEY(bookmark_id) REFERENCES bookmarks(id) ON DELETE CASCADE,
            FOREIGN KEY(collection_id) REFERENCES collections(id) ON DELETE CASCADE
          );

          -- Create Indexes for performance
          CREATE INDEX idx_bookmarks_url ON bookmarks(url);
          CREATE INDEX idx_bookmarks_domain_id ON bookmarks(domain_id);
          CREATE INDEX idx_domains_domain ON domains(domain);
        `,
      },
      {
        version: 2,
        up: `
          CREATE VIRTUAL TABLE bookmarks_fts USING fts5(
            title, url, description, notes,
            content='bookmarks', content_rowid='id'
          );

          CREATE TRIGGER bookmarks_ai AFTER INSERT ON bookmarks BEGIN
            INSERT INTO bookmarks_fts(rowid, title, url, description, notes)
            VALUES (new.id, new.title, new.url, new.description, new.notes);
          END;

          CREATE TRIGGER bookmarks_ad AFTER DELETE ON bookmarks BEGIN
            INSERT INTO bookmarks_fts(bookmarks_fts, rowid, title, url, description, notes)
            VALUES ('delete', old.id, old.title, old.url, old.description, old.notes);
          END;

          CREATE TRIGGER bookmarks_au AFTER UPDATE ON bookmarks BEGIN
            INSERT INTO bookmarks_fts(bookmarks_fts, rowid, title, url, description, notes)
            VALUES ('delete', old.id, old.title, old.url, old.description, old.notes);
            INSERT INTO bookmarks_fts(rowid, title, url, description, notes)
            VALUES (new.id, new.title, new.url, new.description, new.notes);
          END;

          INSERT INTO bookmarks_fts(rowid, title, url, description, notes)
          SELECT id, title, url, description, notes FROM bookmarks;
        `,
      },
      {
        version: 3,
        up: `
          ALTER TABLE domains ADD COLUMN display_name TEXT;
        `,
      },
      {
        version: 4,
        up: `
          ALTER TABLE bookmarks ADD COLUMN deleted_at DATETIME DEFAULT NULL;
          CREATE INDEX idx_bookmarks_deleted_at ON bookmarks(deleted_at);
        `,
      },
      {
        version: 5,
        up: `
          ALTER TABLE collections ADD COLUMN deleted_at DATETIME DEFAULT NULL;
          ALTER TABLE collections ADD COLUMN deleted_with_bookmarks INTEGER DEFAULT 0;
          CREATE INDEX idx_collections_deleted_at ON collections(deleted_at);
        `,
      }
    ];

    // Apply pending migrations using transactions
    const applyMigration = db.transaction((migration: { version: number; up: string }) => {
      db.exec(migration.up);
      db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(migration.version);
    });

    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        console.log(`Applying database migration version ${migration.version}...`);
        try {
          applyMigration(migration);
          console.log(`Migration version ${migration.version} applied successfully.`);
        } catch (error) {
          console.error(`Failed to apply migration version ${migration.version}:`, error);
          throw error;
        }
      }
    }
  }
}

// Export a singleton instance manager (to be initialized by the main process)
export const dbManager = new DbManager();
