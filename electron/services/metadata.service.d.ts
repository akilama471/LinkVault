export declare class RateLimitError extends Error {
    readonly status: number;
    readonly retryAfterSeconds?: number;
    readonly domain: string;
    constructor(domain: string, status?: number, retryAfterSeconds?: number);
}
export interface WebsiteMetadata {
    url: string;
    title: string | null;
    description: string | null;
    domain: string;
    faviconUrl: string | null;
    previewImageUrl: string | null;
    previewPath?: string | null;
}
export declare class MetadataService {
    /**
     * Fetches and parses website metadata from a given URL using Cheerio,
     * with an optional headless browser fallback for client-rendered SPAs.
     */
    extractMetadata(url: string, options?: {
        enableSpaFallback?: boolean;
    }): Promise<WebsiteMetadata>;
    /**
     * Fast static metadata extraction using net.fetch and Cheerio
     */
    private extractWithCheerio;
    /**
     * Headless browser fallback using a hidden Electron BrowserWindow
     * to render client-side SPAs (React/Vue/Twitter) and capture page snapshots if no OpenGraph image is found.
     */
    private extractWithHeadlessBrowser;
}
export declare const metadataService: MetadataService;
