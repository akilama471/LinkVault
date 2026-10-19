export type SupportedBrowser = 'chrome' | 'edge' | 'opera' | 'firefox' | 'yandex';
export interface BrowserProfile {
    id: string;
    name: string;
    path: string;
}
export declare class BrowserImportService {
    private getLocalDataPath;
    private getRoamingDataPath;
    private getBrowserDataDir;
    getProfiles(browser: SupportedBrowser): BrowserProfile[];
    extractBookmarks(browser: SupportedBrowser, profilePath: string): {
        title: string;
        url: string;
    }[];
    importBookmarks(bookmarks: {
        title: string;
        url: string;
    }[]): Promise<{
        imported: number;
        duplicates: number;
        total: number;
    }>;
}
export declare const browserImportService: BrowserImportService;
