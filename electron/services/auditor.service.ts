import { net, webContents } from 'electron';
import { dbManager } from '../database/db';
import { bookmarkModel } from '../models/bookmark.model';
import { tagModel } from '../models/tag.model';
import { collectionModel } from '../models/collection.model';
import { normalizeUrl, compareDuplicateReasons } from '../utils/url-normalizer';
import { Bookmark, HealthCheckProgress, AuditSummary, DuplicateGroup } from '../../src/types/models';
import { passwordService } from './password.service';

export interface HealthCheckResult {
  status: 'ok' | 'dead' | 'server_error' | 'dns_error' | 'timeout' | 'unreachable';
  httpStatus: number | null;
  error: string | null;
}

export class AuditorService {
  private isChecking = false;
  private shouldStop = false;
  private progress: HealthCheckProgress = {
    isRunning: false,
    total: 0,
    checked: 0,
    deadCount: 0,
    errorCount: 0
  };

  private periodicTimer: NodeJS.Timeout | null = null;
  private readonly DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 LinkVaultAuditor/1.0';

  constructor() {
    this.initPeriodicChecker();
  }

  /**
   * Initializes periodic background health checker (runs every 6 hours)
   */
  private initPeriodicChecker() {
    // Check every 6 hours
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    this.periodicTimer = setInterval(() => {
      try {
        if (passwordService.isAuth() && !this.isChecking) {
          console.log('[AuditorService] Starting scheduled periodic background health check...');
          this.startHealthCheck({ forceRecheck: false }).catch(err => {
            console.error('[AuditorService] Error during periodic health check:', err);
          });
        }
      } catch (e) {
        console.error('[AuditorService] Failed to run periodic health check:', e);
      }
    }, SIX_HOURS);
  }

  public getProgress(): HealthCheckProgress {
    return { ...this.progress };
  }

  public stopHealthCheck(): void {
    if (this.isChecking) {
      this.shouldStop = true;
      this.isChecking = false;
      this.progress.isRunning = false;
      this.broadcastProgress();
    }
  }

  /**
   * Pings a URL and accurately classifies dead links (404, 500, DNS failures, timeouts, etc.)
   */
  public async checkUrlHealth(urlStr: string): Promise<HealthCheckResult> {
    let targetUrl = (urlStr || '').trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    // Try HEAD request first
    try {
      const headController = new AbortController();
      const timeoutId = setTimeout(() => headController.abort(), 10000); // 10s timeout

      const headRes = await net.fetch(targetUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': this.DEFAULT_USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: headController.signal,
        redirect: 'follow'
      });

      clearTimeout(timeoutId);

      // If HEAD is supported and returns standard status
      if (headRes.status !== 405 && headRes.status !== 403 && headRes.status !== 501) {
        return this.classifyResponse(headRes.status);
      }
    } catch (headErr: any) {
      // If error is definitely a network/DNS error, no need to fallback to GET
      const classified = this.classifyNetworkError(headErr);
      if (classified.status === 'dns_error' || classified.status === 'timeout') {
        return classified;
      }
    }

    // Fallback to lightweight GET request
    try {
      const getController = new AbortController();
      const timeoutId = setTimeout(() => getController.abort(), 12000); // 12s timeout

      const getRes = await net.fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': this.DEFAULT_USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Range': 'bytes=0-1024' // Download only first 1KB
        },
        signal: getController.signal,
        redirect: 'follow'
      });

      clearTimeout(timeoutId);
      // Abort body stream to save bandwidth
      try { getController.abort(); } catch {}

      return this.classifyResponse(getRes.status);
    } catch (getErr: any) {
      return this.classifyNetworkError(getErr);
    }
  }

  private classifyResponse(status: number): HealthCheckResult {
    if (status >= 200 && status < 400) {
      return { status: 'ok', httpStatus: status, error: null };
    }
    if (status === 404 || status === 410) {
      return { status: 'dead', httpStatus: status, error: status === 404 ? '404 Not Found' : '410 Gone' };
    }
    if (status >= 500 && status < 600) {
      return { status: 'server_error', httpStatus: status, error: `Server Error (${status})` };
    }
    // 400, 401, 403, etc.
    return { status: 'dead', httpStatus: status, error: `HTTP ${status}` };
  }

  private classifyNetworkError(err: any): HealthCheckResult {
    const msg = (err?.message || '').toLowerCase();
    const code = (err?.code || '').toLowerCase();

    if (err?.name === 'AbortError' || msg.includes('timeout') || code.includes('timedout') || msg.includes('err_connection_timed_out')) {
      return { status: 'timeout', httpStatus: null, error: 'Connection Timed Out (10s)' };
    }
    if (code.includes('notfound') || msg.includes('enotfound') || msg.includes('eai_again') || msg.includes('err_name_not_resolved')) {
      return { status: 'dns_error', httpStatus: null, error: 'DNS Resolution Failed (Domain does not exist)' };
    }
    if (code.includes('refused') || msg.includes('econnrefused') || msg.includes('err_connection_refused')) {
      return { status: 'unreachable', httpStatus: null, error: 'Connection Refused by remote server' };
    }
    if (msg.includes('cert') || msg.includes('ssl') || msg.includes('err_cert_')) {
      return { status: 'unreachable', httpStatus: null, error: 'SSL / TLS Certificate Validation Failed' };
    }

    return { status: 'dead', httpStatus: null, error: err?.message || 'Network Request Failed' };
  }

  /**
   * Checks a single bookmark immediately and persists the health result
   */
  public async checkBookmark(id: number): Promise<HealthCheckResult> {
    const bookmark = bookmarkModel.findById(id);
    if (!bookmark) {
      throw new Error(`Bookmark with id ${id} not found`);
    }

    const result = await this.checkUrlHealth(bookmark.url);
    const now = new Date().toISOString();

    bookmarkModel.updateHealth(id, {
      http_status: result.httpStatus,
      health_status: result.status,
      health_error: result.error,
      last_checked_at: now
    });

    this.broadcastUpdated();
    return result;
  }

  /**
   * Starts a background health check across saved bookmarks
   */
  public async startHealthCheck(options?: { forceRecheck?: boolean; onlyFlagged?: boolean }): Promise<void> {
    if (this.isChecking) return;
    this.isChecking = true;
    this.shouldStop = false;

    const db = dbManager.getDb();
    let query = 'SELECT * FROM bookmarks WHERE deleted_at IS NULL';
    if (options?.onlyFlagged) {
      query += " AND health_status IN ('dead', 'server_error', 'dns_error', 'timeout', 'unreachable')";
    }

    const rows = db.prepare(query).all() as any[];
    const total = rows.length;

    this.progress = {
      isRunning: true,
      total,
      checked: 0,
      deadCount: 0,
      errorCount: 0,
      startedAt: new Date().toISOString()
    };
    this.broadcastProgress();

    const CONCURRENCY = 2;
    let cursor = 0;

    const processBookmark = async (row: any) => {
      if (this.shouldStop) return;

      this.progress.currentUrl = row.url;
      this.broadcastProgress();

      try {
        const result = await this.checkUrlHealth(row.url);
        const now = new Date().toISOString();

        bookmarkModel.updateHealth(row.id, {
          http_status: result.httpStatus,
          health_status: result.status,
          health_error: result.error,
          last_checked_at: now
        });

        if (result.status === 'dead') {
          this.progress.deadCount += 1;
        } else if (result.status !== 'ok') {
          this.progress.errorCount += 1;
        }
      } catch (err) {
        console.error(`[AuditorService] Error checking bookmark #${row.id}:`, err);
        this.progress.errorCount += 1;
      } finally {
        this.progress.checked += 1;
        this.broadcastProgress();
      }

      // Small throttle pause to be polite to servers
      await new Promise(r => setTimeout(r, 150));
    };

    // Worker pool
    const workers = Array.from({ length: CONCURRENCY }).map(async () => {
      while (cursor < total && !this.shouldStop) {
        const index = cursor++;
        await processBookmark(rows[index]);
      }
    });

    try {
      await Promise.all(workers);
    } finally {
      this.isChecking = false;
      this.progress.isRunning = false;
      this.progress.currentUrl = undefined;
      this.broadcastProgress();
      this.broadcastCompleted();
      this.broadcastUpdated();
    }
  }

  /**
   * Scans active bookmarks and groups duplicates (exact vs normalized)
   */
  public getDuplicates(): DuplicateGroup[] {
    const db = dbManager.getDb();
    const rows = db.prepare('SELECT * FROM bookmarks WHERE deleted_at IS NULL ORDER BY created_at ASC').all() as any[];
    
    const groupsMap = new Map<string, any[]>();

    for (const row of rows) {
      const norm = normalizeUrl(row.url);
      const key = norm.normalizedUrl;
      const list = groupsMap.get(key) || [];
      list.push({ ...row, normResult: norm });
      groupsMap.set(key, list);
    }

    const duplicateGroups: DuplicateGroup[] = [];

    for (const [normalizedUrl, items] of groupsMap.entries()) {
      if (items.length <= 1) continue;

      // Determine match type: exact or normalized
      const firstRaw = items[0].url.trim();
      const isExact = items.every(item => item.url.trim() === firstRaw);
      const matchType: 'exact' | 'normalized' = isExact ? 'exact' : 'normalized';

      // Collect reasons for normalized duplicate
      const differenceReasons: string[] = [];
      if (!isExact) {
        for (let i = 1; i < items.length; i++) {
          const reasons = compareDuplicateReasons(firstRaw, items[i].url);
          reasons.forEach(r => {
            if (!differenceReasons.includes(r)) differenceReasons.push(r);
          });
        }
      }

      // Recommend primary bookmark: the oldest or one with favorites/tags
      const primaryBookmark = items[0];

      duplicateGroups.push({
        normalizedUrl,
        matchType,
        differenceReasons,
        bookmarks: items.map(i => {
          const { normResult, ...rest } = i;
          return {
            ...rest,
            is_favorite: Boolean(rest.is_favorite),
            is_important: Boolean(rest.is_important),
            hide_mode: rest.hide_mode ?? 0
          };
        }),
        primaryBookmarkId: primaryBookmark.id
      });
    }

    // Sort: exact duplicates first, then by number of duplicates
    return duplicateGroups.sort((a, b) => b.bookmarks.length - a.bookmarks.length);
  }

  /**
   * Merges duplicate bookmarks into a primary bookmark
   */
  public mergeDuplicates(primaryId: number, duplicateIds: number[], moveToTrash = true): { success: boolean; mergedCount: number } {
    const db = dbManager.getDb();

    // 1. Collect all tags from duplicate bookmarks and assign to primaryId
    for (const dupId of duplicateIds) {
      const tags = tagModel.getTagsForBookmark(dupId);
      if (tags.length > 0) {
        tagModel.bulkAddTagsToBookmarks([primaryId], tags.map(t => t.id));
      }

      // Collect all collections from duplicate bookmarks and assign to primaryId
      const colRows = db.prepare('SELECT collection_id FROM bookmark_collections WHERE bookmark_id = ?').all(dupId) as { collection_id: number }[];
      for (const col of colRows) {
        try {
          db.prepare('INSERT OR IGNORE INTO bookmark_collections (bookmark_id, collection_id) VALUES (?, ?)').run(primaryId, col.collection_id);
        } catch {}
      }

      // If moving to trash
      if (moveToTrash) {
        bookmarkModel.delete(dupId);
      }
    }

    this.broadcastUpdated();
    webContents.getAllWebContents().forEach(wc => {
      wc.send('bookmarks:updated');
      wc.send('tags:updated');
      wc.send('collections:updated');
    });

    return { success: true, mergedCount: duplicateIds.length };
  }

  /**
   * Generates summary metrics for the Auditor dashboard
   */
  public getAuditSummary(): AuditSummary {
    const db = dbManager.getDb();

    const counts = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN health_status = 'ok' THEN 1 ELSE 0 END) as healthy,
        SUM(CASE WHEN health_status = 'dead' THEN 1 ELSE 0 END) as dead,
        SUM(CASE WHEN health_status = 'server_error' THEN 1 ELSE 0 END) as server_error,
        SUM(CASE WHEN health_status = 'dns_error' THEN 1 ELSE 0 END) as dns_error,
        SUM(CASE WHEN health_status = 'timeout' THEN 1 ELSE 0 END) as timeout,
        SUM(CASE WHEN health_status = 'unreachable' THEN 1 ELSE 0 END) as unreachable,
        SUM(CASE WHEN health_status IS NULL THEN 1 ELSE 0 END) as unchecked
      FROM bookmarks 
      WHERE deleted_at IS NULL
    `).get() as any;

    const duplicates = this.getDuplicates();
    let exactDuplicatesCount = 0;
    let normalizedDuplicatesCount = 0;

    for (const group of duplicates) {
      if (group.matchType === 'exact') {
        exactDuplicatesCount += group.bookmarks.length - 1;
      } else {
        normalizedDuplicatesCount += group.bookmarks.length - 1;
      }
    }

    return {
      totalBookmarks: counts?.total || 0,
      healthyCount: counts?.healthy || 0,
      deadCount: counts?.dead || 0,
      serverErrorCount: counts?.server_error || 0,
      dnsErrorCount: counts?.dns_error || 0,
      timeoutCount: counts?.timeout || 0,
      unreachableCount: counts?.unreachable || 0,
      uncheckedCount: counts?.unchecked || 0,
      exactDuplicatesCount,
      normalizedDuplicatesCount,
      duplicateGroupCount: duplicates.length
    };
  }

  private broadcastProgress(): void {
    webContents.getAllWebContents().forEach(wc => {
      wc.send('auditor:progress', this.getProgress());
    });
  }

  private broadcastCompleted(): void {
    webContents.getAllWebContents().forEach(wc => {
      wc.send('auditor:completed', this.getAuditSummary());
    });
  }

  private broadcastUpdated(): void {
    webContents.getAllWebContents().forEach(wc => {
      wc.send('auditor:updated');
    });
  }
}

export const auditorService = new AuditorService();
