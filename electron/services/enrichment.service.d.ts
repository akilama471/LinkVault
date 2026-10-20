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
    stopEnrichmentJob(): void;
    clearLogs(): void;
    constructor();
    private addLog;
    startEnrichmentJob(): Promise<void>;
}
export declare const enrichmentService: EnrichmentService;
export {};
