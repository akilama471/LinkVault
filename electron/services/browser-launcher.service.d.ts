export declare const SUPPORTED_BROWSERS: readonly ['Google Chrome', 'Mozilla Firefox', 'Microsoft Edge', 'Opera', 'Yandex', 'Brave'];
export type SupportedBrowserName = typeof SUPPORTED_BROWSERS[number];
export declare const ALL_BROWSER_OPTIONS: readonly ["Always Ask", "Default Browser", "Google Chrome", "Mozilla Firefox", "Microsoft Edge", "Opera", "Yandex", "Brave"];
export type BrowserOption = typeof ALL_BROWSER_OPTIONS[number];
export interface BrowserStatus {
    name: SupportedBrowserName;
    detected: boolean;
    path: string | null;
    isCustom: boolean;
}
export declare class BrowserLauncherService {
    private readonly SETTING_DEFAULT_BROWSER;
    private readonly SETTING_CUSTOM_PATHS;
    /**
     * Retrieves the current default browser preference. Defaults to 'Always Ask'.
     */
    getDefaultBrowser(): BrowserOption;
    /**
     * Sets the default bookmark opening browser.
     */
    setDefaultBrowser(browser: BrowserOption): void;
    /**
     * Retrieves stored custom paths mapping.
     */
    getCustomPaths(): Record<string, string>;
    /**
     * Saves a custom executable path for a specific browser.
     */
    setCustomPath(browser: SupportedBrowserName, customPath: string): void;
    /**
     * Clears a custom path for a specific browser (resets to auto-detection).
     */
    clearCustomPath(browser: SupportedBrowserName): void;
    /**
     * Cleans and verifies a raw path string.
     */
    private cleanPath;
    /**
     * Queries Windows registry for App Paths.
     */
    private queryRegistry;
    /**
     * Queries Windows StartMenuInternet registered browsers.
     */
    private findFromStartMenuInternet;
    /**
     * Checks if an executable is reachable via system PATH (where.exe).
     */
    private findFromWhere;
    /**
     * Searches standard directories across all available drive roots.
     */
    private findFromFilesystem;
    /**
     * Resolves the executable path or launch command for a given browser on Windows.
     */
    private resolveWindowsBrowser;
    /**
     * Finds the executable path for a browser (checks custom user path first, then auto-detection).
     */
    getBrowserExecutable(name: SupportedBrowserName): {
        path: string | null;
        isCustom: boolean;
    };
    /**
     * Returns detection status and paths for all supported browsers.
     */
    getAllBrowserStatuses(): Record<SupportedBrowserName, BrowserStatus>;
    /**
     * Prompts the user to select an executable file (.exe) for a browser using Electron dialog.
     */
    browseForBrowser(name: SupportedBrowserName): Promise<{
        success: boolean;
        path?: string;
        canceled?: boolean;
        error?: string;
    }>;
    /**
     * Launches a URL in the specified browser.
     */
    openUrl(url: string, browserPreference?: BrowserOption): Promise<{
        success: boolean;
        requiresChoice?: boolean;
        notFound?: boolean;
        browserName?: string;
        error?: string;
    }>;
}
export declare const browserLauncherService: BrowserLauncherService;
