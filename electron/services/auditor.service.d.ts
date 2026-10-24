import { HealthCheckProgress, AuditSummary, DuplicateGroup } from '../../src/types/models';
export interface HealthCheckResult {
    status: 'ok' | 'dead' | 'server_error' | 'dns_error' | 'timeout' | 'unreachable';
    httpStatus: number | null;
    error: string | null;
}
export declare class AuditorService {
    private isChecking;
    private shouldStop;
    private progress;
    private periodicTimer;
    private readonly DEFAULT_USER_AGENT;
    constructor();
    /**
     * Initializes periodic background health checker (runs every 6 hours)
     */
    private initPeriodicChecker;
    getProgress(): HealthCheckProgress;
    stopHealthCheck(): void;
    /**
     * Pings a URL and accurately classifies dead links (404, 500, DNS failures, timeouts, etc.)
     */
    checkUrlHealth(urlStr: string): Promise<HealthCheckResult>;
    private classifyResponse;
    private classifyNetworkError;
    /**
     * Checks a single bookmark immediately and persists the health result
     */
    checkBookmark(id: number): Promise<HealthCheckResult>;
    /**
     * Starts a background health check across saved bookmarks
     */
    startHealthCheck(options?: {
        forceRecheck?: boolean;
        onlyFlagged?: boolean;
    }): Promise<void>;
    /**
     * Scans active bookmarks and groups duplicates (exact vs normalized)
     */
    getDuplicates(): DuplicateGroup[];
    /**
     * Merges duplicate bookmarks into a primary bookmark
     */
    mergeDuplicates(primaryId: number, duplicateIds: number[], moveToTrash?: boolean): {
        success: boolean;
        mergedCount: number;
    };
    /**
     * Generates summary metrics for the Auditor dashboard
     */
    getAuditSummary(): AuditSummary;
    private broadcastProgress;
    private broadcastCompleted;
    private broadcastUpdated;
}
export declare const auditorService: AuditorService;
