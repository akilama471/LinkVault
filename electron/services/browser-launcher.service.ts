import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';
import { shell, dialog } from 'electron';
import { dbManager } from '../database/db';

export const SUPPORTED_BROWSERS = [
  'Google Chrome',
  'Mozilla Firefox',
  'Microsoft Edge',
  'Opera',
  'Yandex',
  'Brave'
] as const;

export type SupportedBrowserName = typeof SUPPORTED_BROWSERS[number];

export const ALL_BROWSER_OPTIONS = [
  'Always Ask',
  'Default Browser',
  ...SUPPORTED_BROWSERS
] as const;

export type BrowserOption = typeof ALL_BROWSER_OPTIONS[number];

interface BrowserConfig {
  keyword: string;
  exes: string[];
  regAppPaths: string[];
  startMenuMatch: RegExp[];
  relativePaths: string[];
  macAppNames: string[];
  linuxCommands: string[];
}

const BROWSER_CONFIGS: Record<SupportedBrowserName, BrowserConfig> = {
  'Google Chrome': {
    keyword: 'chrome',
    exes: ['chrome.exe'],
    regAppPaths: ['chrome.exe'],
    startMenuMatch: [/google.*chrome/i, /^chrome$/i],
    relativePaths: [
      path.join('Google', 'Chrome', 'Application', 'chrome.exe')
    ],
    macAppNames: ['Google Chrome'],
    linuxCommands: ['google-chrome-stable', 'google-chrome', 'chromium-browser', 'chromium']
  },
  'Mozilla Firefox': {
    keyword: 'firefox',
    exes: ['firefox.exe'],
    regAppPaths: ['firefox.exe'],
    startMenuMatch: [/firefox/i, /mozilla/i],
    relativePaths: [
      path.join('Mozilla Firefox', 'firefox.exe')
    ],
    macAppNames: ['Firefox'],
    linuxCommands: ['firefox']
  },
  'Microsoft Edge': {
    keyword: 'edge',
    exes: ['msedge.exe'],
    regAppPaths: ['msedge.exe'],
    startMenuMatch: [/edge/i, /microsoft.*edge/i],
    relativePaths: [
      path.join('Microsoft', 'Edge', 'Application', 'msedge.exe')
    ],
    macAppNames: ['Microsoft Edge'],
    linuxCommands: ['microsoft-edge', 'microsoft-edge-stable', 'microsoft-edge-dev']
  },
  'Opera': {
    keyword: 'opera',
    exes: ['opera.exe'],
    regAppPaths: ['opera.exe'],
    startMenuMatch: [/opera/i],
    relativePaths: [
      path.join('Opera', 'launcher.exe'),
      path.join('Opera', 'opera.exe'),
      path.join('Programs', 'Opera', 'launcher.exe'),
      path.join('Programs', 'Opera', 'opera.exe'),
      path.join('Programs', 'Opera GX', 'launcher.exe')
    ],
    macAppNames: ['Opera'],
    linuxCommands: ['opera']
  },
  'Yandex': {
    keyword: 'yandex',
    exes: ['browser.exe', 'yandex.exe'],
    regAppPaths: ['browser.exe', 'yandex.exe'],
    startMenuMatch: [/yandex/i],
    relativePaths: [
      path.join('Yandex', 'YandexBrowser', 'Application', 'browser.exe'),
      path.join('Yandex', 'Application', 'browser.exe')
    ],
    macAppNames: ['Yandex'],
    linuxCommands: ['yandex-browser-stable', 'yandex-browser']
  },
  'Brave': {
    keyword: 'brave',
    exes: ['brave.exe'],
    regAppPaths: ['brave.exe'],
    startMenuMatch: [/brave/i],
    relativePaths: [
      path.join('BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe')
    ],
    macAppNames: ['Brave Browser'],
    linuxCommands: ['brave-browser', 'brave']
  }
};

export interface BrowserStatus {
  name: SupportedBrowserName;
  detected: boolean;
  path: string | null;
  isCustom: boolean;
}

export class BrowserLauncherService {
  private readonly SETTING_DEFAULT_BROWSER = 'default_bookmark_browser';
  private readonly SETTING_CUSTOM_PATHS = 'custom_browser_paths';

  /**
   * Retrieves the current default browser preference. Defaults to 'Always Ask'.
   */
  public getDefaultBrowser(): BrowserOption {
    try {
      const db = dbManager.getDb();
      const row = db.prepare('SELECT value FROM application_settings WHERE key = ?')
        .get(this.SETTING_DEFAULT_BROWSER) as { value: string } | undefined;

      if (row && ALL_BROWSER_OPTIONS.includes(row.value as BrowserOption)) {
        return row.value as BrowserOption;
      }
    } catch (error) {
      console.error('Failed to get default browser setting:', error);
    }
    return 'Always Ask';
  }

  /**
   * Sets the default bookmark opening browser.
   */
  public setDefaultBrowser(browser: BrowserOption): void {
    if (!ALL_BROWSER_OPTIONS.includes(browser)) {
      throw new Error(`Invalid browser option: ${browser}`);
    }

    const db = dbManager.getDb();
    db.prepare(`
      INSERT INTO application_settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(this.SETTING_DEFAULT_BROWSER, browser);
  }

  /**
   * Retrieves stored custom paths mapping.
   */
  public getCustomPaths(): Record<string, string> {
    try {
      const db = dbManager.getDb();
      const row = db.prepare('SELECT value FROM application_settings WHERE key = ?')
        .get(this.SETTING_CUSTOM_PATHS) as { value: string } | undefined;

      if (row && row.value) {
        return JSON.parse(row.value);
      }
    } catch (error) {
      console.error('Failed to read custom browser paths:', error);
    }
    return {};
  }

  /**
   * Saves a custom executable path for a specific browser.
   */
  public setCustomPath(browser: SupportedBrowserName, customPath: string): void {
    if (!fs.existsSync(customPath)) {
      throw new Error(`Executable not found at path: ${customPath}`);
    }

    const paths = this.getCustomPaths();
    paths[browser] = customPath;

    const db = dbManager.getDb();
    db.prepare(`
      INSERT INTO application_settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(this.SETTING_CUSTOM_PATHS, JSON.stringify(paths));
  }

  /**
   * Clears a custom path for a specific browser (resets to auto-detection).
   */
  public clearCustomPath(browser: SupportedBrowserName): void {
    const paths = this.getCustomPaths();
    delete paths[browser];

    const db = dbManager.getDb();
    db.prepare(`
      INSERT INTO application_settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(this.SETTING_CUSTOM_PATHS, JSON.stringify(paths));
  }

  /**
   * Cleans and verifies a raw path string.
   */
  private cleanPath(raw: string | null | undefined, mustInclude?: string): string | null {
    if (!raw) return null;
    let p = raw.trim();
    if (p.startsWith('"') && p.endsWith('"')) {
      p = p.substring(1, p.length - 1);
    }
    const exeIndex = p.toLowerCase().indexOf('.exe');
    if (exeIndex !== -1) {
      p = p.substring(0, exeIndex + 4);
      if (p.startsWith('"')) p = p.substring(1);
    }
    if (!fs.existsSync(p)) return null;
    if (mustInclude && !p.toLowerCase().includes(mustInclude.toLowerCase())) {
      return null;
    }
    return p;
  }

  /**
   * Queries Windows registry for App Paths.
   */
  private queryRegistry(key: string, keyword: string): string | null {
    try {
      const out = execSync(`reg query "${key}" /ve`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const match = out.match(/REG_SZ\s+(.*)/);
      if (match) return this.cleanPath(match[1], keyword);
    } catch {
      // Ignore registry query error
    }
    return null;
  }

  /**
   * Queries Windows StartMenuInternet registered browsers.
   */
  private findFromStartMenuInternet(patterns: RegExp[], keyword: string): string | null {
    for (const root of ['HKLM', 'HKCU']) {
      try {
        const out = execSync(`reg query "${root}\\SOFTWARE\\Clients\\StartMenuInternet" /s`, {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore']
        });
        const lines = out.split('\n');
        let currentKey = '';
        for (const line of lines) {
          if (line.startsWith('HKEY_')) {
            currentKey = line.trim();
          } else if (line.includes('REG_SZ') && currentKey.toLowerCase().includes('shell\\open\\command')) {
            for (const pattern of patterns) {
              if (pattern.test(currentKey)) {
                const match = line.match(/REG_SZ\s+(.*)/);
                if (match) {
                  const p = this.cleanPath(match[1], keyword);
                  if (p) return p;
                }
              }
            }
          }
        }
      } catch {
        // Ignore registry query error
      }
    }
    return null;
  }

  /**
   * Checks if an executable is reachable via system PATH (where.exe).
   */
  private findFromWhere(exes: string[], keyword: string): string | null {
    for (const exe of exes) {
      try {
        const out = execSync(`where.exe ${exe}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        const lines = out.split('\n');
        for (const line of lines) {
          const p = this.cleanPath(line, keyword);
          if (p) return p;
        }
      } catch {
        // Ignore where.exe failure
      }
    }
    return null;
  }

  /**
   * Searches standard directories across all available drive roots.
   */
  private findFromFilesystem(relativePaths: string[], keyword: string): string | null {
    const baseDirs = [
      process.env['ProgramFiles'],
      process.env['ProgramFiles(x86)'],
      process.env['LOCALAPPDATA'],
      process.env['APPDATA'],
      process.env['ProgramData']
    ].filter(Boolean) as string[];

    const drives = ['C:', 'D:', 'E:', 'F:', 'G:'];
    for (const d of drives) {
      try {
        if (fs.existsSync(d + '\\')) {
          baseDirs.push(d + '\\Program Files');
          baseDirs.push(d + '\\Program Files (x86)');
          baseDirs.push(d + '\\');
        }
      } catch {
        // Ignore drive check error
      }
    }

    for (const rel of relativePaths) {
      for (const base of baseDirs) {
        try {
          const full = path.join(base, rel);
          const cleaned = this.cleanPath(full, keyword);
          if (cleaned) return cleaned;
        } catch {
          // Ignore path resolution error
        }
      }
    }
    return null;
  }

  /**
   * Resolves the executable path or launch command for a given browser on Windows.
   */
  private resolveWindowsBrowser(name: SupportedBrowserName): string | null {
    const conf = BROWSER_CONFIGS[name];
    if (!conf) return null;

    // 1. App Paths registry
    for (const exe of conf.regAppPaths) {
      for (const root of ['HKCU', 'HKLM']) {
        const found = this.queryRegistry(`${root}\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\${exe}`, conf.keyword);
        if (found) return found;
      }
    }

    // 2. StartMenuInternet registry
    const startMenuFound = this.findFromStartMenuInternet(conf.startMenuMatch, conf.keyword);
    if (startMenuFound) return startMenuFound;

    // 3. where.exe in system PATH
    const whereFound = this.findFromWhere(conf.exes, conf.keyword);
    if (whereFound) return whereFound;

    // 4. Filesystem scan across common paths and drives
    const fsFound = this.findFromFilesystem(conf.relativePaths, conf.keyword);
    if (fsFound) return fsFound;

    return null;
  }

  /**
   * Finds the executable path for a browser (checks custom user path first, then auto-detection).
   */
  public getBrowserExecutable(name: SupportedBrowserName): { path: string | null; isCustom: boolean } {
    const customPaths = this.getCustomPaths();
    if (customPaths[name] && fs.existsSync(customPaths[name])) {
      return { path: customPaths[name], isCustom: true };
    }

    if (process.platform === 'win32') {
      const detected = this.resolveWindowsBrowser(name);
      return { path: detected, isCustom: false };
    }

    // macOS check
    if (process.platform === 'darwin') {
      const conf = BROWSER_CONFIGS[name];
      if (conf) {
        for (const appName of conf.macAppNames) {
          const appPath = `/Applications/${appName}.app`;
          if (fs.existsSync(appPath)) {
            return { path: appPath, isCustom: false };
          }
        }
      }
    }

    // Linux check
    if (process.platform === 'linux') {
      const conf = BROWSER_CONFIGS[name];
      if (conf) {
        for (const cmd of conf.linuxCommands) {
          try {
            const out = execSync(`which ${cmd}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
            if (out && fs.existsSync(out)) {
              return { path: out, isCustom: false };
            }
          } catch {
            // Ignore
          }
        }
      }
    }

    return { path: null, isCustom: false };
  }

  /**
   * Returns detection status and paths for all supported browsers.
   */
  public getAllBrowserStatuses(): Record<SupportedBrowserName, BrowserStatus> {
    const result: Partial<Record<SupportedBrowserName, BrowserStatus>> = {};
    for (const name of SUPPORTED_BROWSERS) {
      const { path: exePath, isCustom } = this.getBrowserExecutable(name);
      result[name] = {
        name,
        detected: exePath !== null,
        path: exePath,
        isCustom
      };
    }
    return result as Record<SupportedBrowserName, BrowserStatus>;
  }

  /**
   * Prompts the user to select an executable file (.exe) for a browser using Electron dialog.
   */
  public async browseForBrowser(name: SupportedBrowserName): Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }> {
    try {
      const result = await dialog.showOpenDialog({
        title: `Select ${name} Executable`,
        filters: process.platform === 'win32' 
          ? [{ name: 'Executable Files', extensions: ['exe'] }, { name: 'All Files', extensions: ['*'] }]
          : process.platform === 'darwin'
          ? [{ name: 'Applications', extensions: ['app'] }, { name: 'All Files', extensions: ['*'] }]
          : [{ name: 'All Files', extensions: ['*'] }],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const selectedPath = result.filePaths[0];
      if (!fs.existsSync(selectedPath)) {
        return { success: false, error: 'Selected file does not exist.' };
      }

      this.setCustomPath(name, selectedPath);
      return { success: true, path: selectedPath };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to select executable.' };
    }
  }

  /**
   * Launches a URL in the specified browser.
   */
  public async openUrl(url: string, browserPreference?: BrowserOption): Promise<{
    success: boolean;
    requiresChoice?: boolean;
    notFound?: boolean;
    browserName?: string;
    error?: string;
  }> {
    const targetBrowser = browserPreference || this.getDefaultBrowser();

    if (targetBrowser === 'Always Ask') {
      return { success: true, requiresChoice: true };
    }

    if (targetBrowser === 'Default Browser') {
      try {
        await shell.openExternal(url);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to open in default browser.' };
      }
    }

    // Specific browser selected
    const supportedName = targetBrowser as SupportedBrowserName;
    const { path: exePath } = this.getBrowserExecutable(supportedName);

    if (!exePath) {
      return {
        success: false,
        notFound: true,
        browserName: supportedName,
        error: `${supportedName} was not found on this computer.`
      };
    }

    try {
      if (process.platform === 'win32') {
        const child = spawn(exePath, [url], { detached: true, stdio: 'ignore' });
        child.unref();
        return { success: true };
      } else if (process.platform === 'darwin') {
        const conf = BROWSER_CONFIGS[supportedName];
        const appName = conf?.macAppNames[0] || supportedName;
        const child = spawn('open', ['-a', appName, url], { detached: true, stdio: 'ignore' });
        child.unref();
        return { success: true };
      } else {
        const child = spawn(exePath, [url], { detached: true, stdio: 'ignore' });
        child.unref();
        return { success: true };
      }
    } catch (err: any) {
      return {
        success: false,
        error: err.message || `Failed to launch ${supportedName}.`
      };
    }
  }
}

export const browserLauncherService = new BrowserLauncherService();
