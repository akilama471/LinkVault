export interface JobLog {
    id: number;
    timestamp: string;
    bookmarkId: number;
    url: string;
    status: 'processing' | 'success' | 'error';
    message: string;
}
declare class EnrichmentService {
    private isProcessing;
    private hasPendingWork;
    private shouldStop;
    private logs;
    private logCounter;
    private domainStates;
    private readonly BASE_SAME_DOMAIN_DELAY_MS;
    private readonly BASE_GLOBAL_DELAY_MS;
    private readonly JITTER_MAX_MS;
    private readonly BASE_BACKOFF_MS;
    private readonly MAX_BACKOFF_MS;
    private lastDomainRequested;
    stopEnrichmentJob(): void;
    clearLogs(): void;
    constructor();
    private getDomainState;
    private getHostname;
    private getJitter;
    private delay;
    private addLog;
    startEnrichmentJob(): Promise<void>;
}
export declare const enrichmentService: EnrichmentService;
export {};
