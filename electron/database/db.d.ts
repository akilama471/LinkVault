import type { Database as DatabaseType } from 'better-sqlite3';
import { DatabaseStorageStats, DatabaseOptimizationResult } from '../../src/types/models';
export declare class DbManager {
    private db;
    private readonly dbPath;
    private checkpointTimer;
    constructor();
    private init;
    getDb(): DatabaseType;
    private runMigrations;
    /**
     * Executes a WAL checkpoint to flush pending write-ahead log frames into the main database file.
     * TRUNCATE flushes and truncates the WAL file to 0 bytes.
     */
    checkpoint(mode?: 'PASSIVE' | 'FULL' | 'RESTART' | 'TRUNCATE'): {
        busy: number;
        log: number;
        checkpointed: number;
    };
    /**
     * Executes SQLite VACUUM to defragment the database, rebuild indices, and reclaim free space.
     */
    vacuum(): void;
    /**
     * Runs SQLite PRAGMA optimize to refresh query planner statistics and optimize internal structures.
     */
    optimize(): void;
    /**
     * Gathers detailed storage footprint metrics for the main sqlite database and WAL files.
     */
    getStorageStats(): DatabaseStorageStats;
    /**
     * Checkpoints WAL, runs full VACUUM, and optimizes SQLite indices, returning reclaimed space metrics.
     */
    optimizeAndCompact(): DatabaseOptimizationResult;
    /**
     * Starts a periodic WAL checkpoint timer (default every 15 minutes) to prevent WAL file bloat.
     */
    startPeriodicCheckpoint(intervalMs?: number): void;
    /**
     * Stops the periodic checkpoint timer.
     */
    stopPeriodicCheckpoint(): void;
    /**
     * Performs clean shutdown checkpoint and optimization before closing database connection.
     */
    close(): void;
}
export declare const dbManager: DbManager;
