export declare const BROWSER_OPTIONS: readonly ['Always Ask', 'Default Browser', 'Google Chrome', 'Mozilla Firefox', 'Microsoft Edge', 'Opera', 'Yandex', 'Brave'];
export type BrowserOption = typeof BROWSER_OPTIONS[number];
export declare const SUPPORTED_SPECIFIC_BROWSERS: readonly ['Google Chrome', 'Mozilla Firefox', 'Microsoft Edge', 'Opera', 'Yandex', 'Brave'];
export type SupportedSpecificBrowser = typeof SUPPORTED_SPECIFIC_BROWSERS[number];
export interface BrowserStatusInfo {
    name: string;
    detected: boolean;
    path: string | null;
    isCustom: boolean;
}
