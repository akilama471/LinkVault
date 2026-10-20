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
      },
      {
        version: 6,
        up: `
          ALTER TABLE bookmarks ADD COLUMN hide_mode INTEGER DEFAULT 0;
          CREATE INDEX idx_bookmarks_hide_mode ON bookmarks(hide_mode);
        `,
      },
      {
        version: 7,
        up: `
          -- Drop legacy triggers and FTS table
          DROP TRIGGER IF EXISTS bookmarks_ai;
          DROP TRIGGER IF EXISTS bookmarks_au;
          DROP TRIGGER IF EXISTS bookmarks_ad;
          DROP TABLE IF EXISTS bookmarks_fts;

          -- Create unified FTS5 virtual table indexing title, url, description, notes, tags, and domain
          CREATE VIRTUAL TABLE bookmarks_fts USING fts5(
            title, url, description, notes, tags, domain
          );

          -- Trigger: Insert bookmark into FTS5
          CREATE TRIGGER bookmarks_fts_ai AFTER INSERT ON bookmarks BEGIN
            INSERT INTO bookmarks_fts(rowid, title, url, description, notes, tags, domain)
            VALUES (
              new.id,
              new.title,
              new.url,
              new.description,
              new.notes,
              (SELECT GROUP_CONCAT(t.name, ' ') FROM bookmark_tags bt JOIN tags t ON bt.tag_id = t.id WHERE bt.bookmark_id = new.id),
              (SELECT d.domain || ' ' || COALESCE(d.display_name, '') FROM domains d WHERE d.id = new.domain_id)
            );
          END;

          -- Trigger: Update bookmark in FTS5
          CREATE TRIGGER bookmarks_fts_au AFTER UPDATE ON bookmarks BEGIN
            DELETE FROM bookmarks_fts WHERE rowid = old.id;
            INSERT INTO bookmarks_fts(rowid, title, url, description, notes, tags, domain)
            VALUES (
              new.id,
              new.title,
              new.url,
              new.description,
              new.notes,
              (SELECT GROUP_CONCAT(t.name, ' ') FROM bookmark_tags bt JOIN tags t ON bt.tag_id = t.id WHERE bt.bookmark_id = new.id),
              (SELECT d.domain || ' ' || COALESCE(d.display_name, '') FROM domains d WHERE d.id = new.domain_id)
            );
          END;

          -- Trigger: Delete bookmark from FTS5
          CREATE TRIGGER bookmarks_fts_ad AFTER DELETE ON bookmarks BEGIN
            DELETE FROM bookmarks_fts WHERE rowid = old.id;
          END;

          -- Trigger: Add tag to bookmark
          CREATE TRIGGER bookmark_tags_fts_ai AFTER INSERT ON bookmark_tags BEGIN
            DELETE FROM bookmarks_fts WHERE rowid = new.bookmark_id;
            INSERT INTO bookmarks_fts(rowid, title, url, description, notes, tags, domain)
            SELECT 
              b.id, b.title, b.url, b.description, b.notes,
              (SELECT GROUP_CONCAT(t.name, ' ') FROM bookmark_tags bt JOIN tags t ON bt.tag_id = t.id WHERE bt.bookmark_id = b.id),
              (SELECT d.domain || ' ' || COALESCE(d.display_name, '') FROM domains d WHERE d.id = b.domain_id)
            FROM bookmarks b WHERE b.id = new.bookmark_id;
          END;

          -- Trigger: Remove tag from bookmark
          CREATE TRIGGER bookmark_tags_fts_ad AFTER DELETE ON bookmark_tags BEGIN
            DELETE FROM bookmarks_fts WHERE rowid = old.bookmark_id;
            INSERT INTO bookmarks_fts(rowid, title, url, description, notes, tags, domain)
            SELECT 
              b.id, b.title, b.url, b.description, b.notes,
              (SELECT GROUP_CONCAT(t.name, ' ') FROM bookmark_tags bt JOIN tags t ON bt.tag_id = t.id WHERE bt.bookmark_id = b.id),
              (SELECT d.domain || ' ' || COALESCE(d.display_name, '') FROM domains d WHERE d.id = b.domain_id)
            FROM bookmarks b WHERE b.id = old.bookmark_id;
          END;

          -- Trigger: Tag name updated
          CREATE TRIGGER tags_fts_au AFTER UPDATE OF name ON tags BEGIN
            DELETE FROM bookmarks_fts WHERE rowid IN (SELECT bookmark_id FROM bookmark_tags WHERE tag_id = new.id);
            INSERT INTO bookmarks_fts(rowid, title, url, description, notes, tags, domain)
            SELECT 
              b.id, b.title, b.url, b.description, b.notes,
              (SELECT GROUP_CONCAT(t.name, ' ') FROM bookmark_tags bt JOIN tags t ON bt.tag_id = t.id WHERE bt.bookmark_id = b.id),
              (SELECT d.domain || ' ' || COALESCE(d.display_name, '') FROM domains d WHERE d.id = b.domain_id)
            FROM bookmarks b WHERE b.id IN (SELECT bookmark_id FROM bookmark_tags WHERE tag_id = new.id);
          END;

          -- Trigger: Domain updated
          CREATE TRIGGER domains_fts_au AFTER UPDATE ON domains BEGIN
            DELETE FROM bookmarks_fts WHERE rowid IN (SELECT id FROM bookmarks WHERE domain_id = new.id);
            INSERT INTO bookmarks_fts(rowid, title, url, description, notes, tags, domain)
            SELECT 
              b.id, b.title, b.url, b.description, b.notes,
              (SELECT GROUP_CONCAT(t.name, ' ') FROM bookmark_tags bt JOIN tags t ON bt.tag_id = t.id WHERE bt.bookmark_id = b.id),
              (SELECT d.domain || ' ' || COALESCE(d.display_name, '') FROM domains d WHERE d.id = b.domain_id)
            FROM bookmarks b WHERE b.domain_id = new.id;
          END;

          -- Trigger: Domain deleted
          CREATE TRIGGER domains_fts_ad AFTER DELETE ON domains BEGIN
            DELETE FROM bookmarks_fts WHERE rowid IN (SELECT id FROM bookmarks WHERE domain_id = old.id);
            INSERT INTO bookmarks_fts(rowid, title, url, description, notes, tags, domain)
            SELECT 
              b.id, b.title, b.url, b.description, b.notes,
              (SELECT GROUP_CONCAT(t.name, ' ') FROM bookmark_tags bt JOIN tags t ON bt.tag_id = t.id WHERE bt.bookmark_id = b.id),
              NULL
            FROM bookmarks b WHERE b.domain_id = old.id;
          END;

          -- Initial population of unified bookmarks_fts with all existing bookmarks, tags, and domains
          INSERT INTO bookmarks_fts(rowid, title, url, description, notes, tags, domain)
          SELECT 
            b.id, b.title, b.url, b.description, b.notes,
            (SELECT GROUP_CONCAT(t.name, ' ') FROM bookmark_tags bt JOIN tags t ON bt.tag_id = t.id WHERE bt.bookmark_id = b.id),
            (SELECT d.domain || ' ' || COALESCE(d.display_name, '') FROM domains d WHERE d.id = b.domain_id)
          FROM bookmarks b;
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
