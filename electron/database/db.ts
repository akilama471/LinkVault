import type { Database as DatabaseType } from 'better-sqlite3';
const dbName = ['better', 'sqlite3'].join('-');
const Database = require(dbName);
import path from 'node:path';
import { app } from 'electron';
import fs from 'node:fs';
import { DatabaseStorageStats, DatabaseOptimizationResult } from '../../src/types/models';
import { encryptionService } from '../services/encryption.service';

export class DbManager {
  private db: DatabaseType | null = null;
  private readonly dbPath: string;
  private readonly encryptedDbPath: string;
  private checkpointTimer: NodeJS.Timeout | null = null;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'bookmark_manager.sqlite');
    this.encryptedDbPath = path.join(userDataPath, 'bookmark_manager.sqlite.enc');
    this.init();
  }

  private init() {
    try {
      // If the database is encrypted at rest and not yet unlocked
      if (fs.existsSync(this.encryptedDbPath) && !fs.existsSync(this.dbPath)) {
        console.log(`[DbManager] Encrypted vault detected at: ${this.encryptedDbPath}. Awaiting master password unlock.`);
        this.db = null;
        return;
      }

      this.openDatabase();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  public openDatabase(): void {
    if (this.db) return;
    this.db = new Database(this.dbPath);
    this.db!.pragma('journal_mode = WAL');
    this.db!.pragma('foreign_keys = ON');
    console.log(`Database initialized at: ${this.dbPath}`);
    this.runMigrations();
    this.startPeriodicCheckpoint();
  }

  public isDatabaseOpen(): boolean {
    return this.db !== null;
  }

  public isEncryptedAtRest(): boolean {
    return fs.existsSync(this.encryptedDbPath);
  }

  public getDb(): DatabaseType {
    if (!this.db) {
      throw new Error('Database is locked or not initialized. Master password authentication required.');
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
      },
      {
        version: 8,
        up: `
          ALTER TABLE bookmarks ADD COLUMN http_status INTEGER DEFAULT NULL;
          ALTER TABLE bookmarks ADD COLUMN health_status TEXT DEFAULT NULL;
          ALTER TABLE bookmarks ADD COLUMN health_error TEXT DEFAULT NULL;
          ALTER TABLE bookmarks ADD COLUMN last_checked_at DATETIME DEFAULT NULL;

          CREATE INDEX IF NOT EXISTS idx_bookmarks_health_status ON bookmarks(health_status);
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

  /**
   * Executes a WAL checkpoint to flush pending write-ahead log frames into the main database file.
   * TRUNCATE flushes and truncates the WAL file to 0 bytes.
   */
  public checkpoint(mode: 'PASSIVE' | 'FULL' | 'RESTART' | 'TRUNCATE' = 'TRUNCATE'): { busy: number; log: number; checkpointed: number } {
    const db = this.getDb();
    try {
      const res = db.pragma(`wal_checkpoint(${mode})`) as Array<{ busy: number; log: number; checkpointed: number }>;
      return res && res.length > 0 ? res[0] : { busy: 0, log: 0, checkpointed: 0 };
    } catch (error) {
      console.error(`[DbManager] Failed to run wal_checkpoint(${mode}):`, error);
      throw error;
    }
  }

  /**
   * Executes SQLite VACUUM to defragment the database, rebuild indices, and reclaim free space.
   */
  public vacuum(): void {
    const db = this.getDb();
    try {
      db.exec('VACUUM');
    } catch (error) {
      console.error('[DbManager] Failed to run VACUUM:', error);
      throw error;
    }
  }

  /**
   * Runs SQLite PRAGMA optimize to refresh query planner statistics and optimize internal structures.
   */
  public optimize(): void {
    const db = this.getDb();
    try {
      db.pragma('optimize');
    } catch (error) {
      console.warn('[DbManager] Failed to run PRAGMA optimize:', error);
    }
  }

  /**
   * Gathers detailed storage footprint metrics for the main sqlite database and WAL files.
   */
  public getStorageStats(): DatabaseStorageStats {
    if (!this.db && fs.existsSync(this.encryptedDbPath)) {
      const encryptedSize = fs.existsSync(this.encryptedDbPath) ? fs.statSync(this.encryptedDbPath).size : 0;
      return {
        dbSizeBytes: encryptedSize,
        walSizeBytes: 0,
        shmSizeBytes: 0,
        totalSizeBytes: encryptedSize,
        pageCount: 0,
        pageSize: 4096,
        freelistCount: 0,
        freelistSizeBytes: 0,
        journalMode: 'encrypted-at-rest'
      };
    }

    const db = this.getDb();
    const walPath = `${this.dbPath}-wal`;
    const shmPath = `${this.dbPath}-shm`;

    const getFileSize = (filePath: string): number => {
      try {
        return fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
      } catch {
        return 0;
      }
    };

    const dbSizeBytes = getFileSize(this.dbPath);
    const walSizeBytes = getFileSize(walPath);
    const shmSizeBytes = getFileSize(shmPath);
    const totalSizeBytes = dbSizeBytes + walSizeBytes + shmSizeBytes;

    let pageCount = 0;
    let pageSize = 4096;
    let freelistCount = 0;
    let journalMode = 'wal';

    try {
      pageCount = (db.pragma('page_count', { simple: true }) as number) || 0;
      pageSize = (db.pragma('page_size', { simple: true }) as number) || 4096;
      freelistCount = (db.pragma('freelist_count', { simple: true }) as number) || 0;
      journalMode = (db.pragma('journal_mode', { simple: true }) as string) || 'wal';
    } catch (err) {
      console.warn('[DbManager] Failed to read database pragmas:', err);
    }

    const freelistSizeBytes = freelistCount * pageSize;

    return {
      dbSizeBytes,
      walSizeBytes,
      shmSizeBytes,
      totalSizeBytes,
      pageCount,
      pageSize,
      freelistCount,
      freelistSizeBytes,
      journalMode,
    };
  }

  /**
   * Checkpoints WAL, runs full VACUUM, and optimizes SQLite indices, returning reclaimed space metrics.
   */
  public optimizeAndCompact(): DatabaseOptimizationResult {
    const beforeStats = this.getStorageStats();
    const beforeSizeBytes = beforeStats.totalSizeBytes;

    // 1. Flush and truncate WAL log file
    const checkpointResult = this.checkpoint('TRUNCATE');

    // 2. Rebuild and defragment database
    this.vacuum();

    // 3. Optimize query planner
    this.optimize();

    const afterStats = this.getStorageStats();
    const afterSizeBytes = afterStats.totalSizeBytes;
    const reclaimedBytes = Math.max(0, beforeSizeBytes - afterSizeBytes);

    console.log(`[DbManager] Database optimized: reclaimed ${reclaimedBytes} bytes. (Before: ${beforeSizeBytes}B, After: ${afterSizeBytes}B)`);

    return {
      beforeSizeBytes,
      afterSizeBytes,
      reclaimedBytes,
      checkpointResult,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Starts a periodic WAL checkpoint timer (default every 15 minutes) to prevent WAL file bloat.
   */
  public startPeriodicCheckpoint(intervalMs: number = 15 * 60 * 1000): void {
    if (this.checkpointTimer) {
      clearInterval(this.checkpointTimer);
    }
    this.checkpointTimer = setInterval(() => {
      try {
        const res = this.checkpoint('PASSIVE');
        console.log('[DbManager] Periodic WAL checkpoint completed:', res);
      } catch (err) {
        console.warn('[DbManager] Periodic WAL checkpoint failed:', err);
      }
    }, intervalMs);
  }

  /**
   * Stops the periodic checkpoint timer.
   */
  public stopPeriodicCheckpoint(): void {
    if (this.checkpointTimer) {
      clearInterval(this.checkpointTimer);
      this.checkpointTimer = null;
    }
  }

  /**
   * Performs clean shutdown checkpoint and optimization before closing database connection.
   */
  public close(): void {
    this.stopPeriodicCheckpoint();
    if (!this.db) return;
    try {
      this.checkpoint('TRUNCATE');
      this.optimize();
      this.db.close();
      this.db = null;
      console.log('[DbManager] Database checkpointed and closed cleanly.');
    } catch (err) {
      console.error('[DbManager] Error while closing database:', err);
    }
  }

  /**
   * Decrypts the database from ciphertext at rest and initializes SQLite.
   */
  public async unlockAndOpen(key: Buffer): Promise<void> {
    if (this.db) return;

    if (fs.existsSync(this.encryptedDbPath)) {
      console.log(`[DbManager] Decrypting database at rest (${this.encryptedDbPath}) with derived master key...`);
      await encryptionService.decryptFile(this.encryptedDbPath, this.dbPath, key);
    }

    this.openDatabase();
  }

  /**
   * Checkpoints WAL, closes connection, encrypts the database with AES-256-GCM, and securely shreds plaintext files.
   */
  public async lockAndEncrypt(key: Buffer): Promise<void> {
    this.stopPeriodicCheckpoint();
    if (this.db) {
      try {
        this.checkpoint('TRUNCATE');
        this.optimize();
        this.db.close();
      } catch (e) {
        console.warn('[DbManager] Warning during lock checkpoint:', e);
      }
      this.db = null;
    }

    if (fs.existsSync(this.dbPath)) {
      console.log(`[DbManager] Encrypting database at rest into ${this.encryptedDbPath}...`);
      await encryptionService.encryptFile(this.dbPath, this.encryptedDbPath, key);

      // Securely shred unencrypted database and WAL files
      await encryptionService.secureShredFile(this.dbPath);
      const walPath = `${this.dbPath}-wal`;
      const shmPath = `${this.dbPath}-shm`;
      if (fs.existsSync(walPath)) await encryptionService.secureShredFile(walPath);
      if (fs.existsSync(shmPath)) await encryptionService.secureShredFile(shmPath);
      console.log(`[DbManager] Plaintext database files shredded. Database secured at rest with AES-256-GCM.`);
    }
  }

  /**
   * Removes encrypted database file when master password protection is permanently removed.
   */
  public removeEncryptionAtRest(): void {
    if (fs.existsSync(this.encryptedDbPath)) {
      try {
        fs.unlinkSync(this.encryptedDbPath);
      } catch (err) {
        console.warn('[DbManager] Failed to remove encrypted database file:', err);
      }
    }
  }
}

// Export a singleton instance manager (to be initialized by the main process)
export const dbManager = new DbManager();
