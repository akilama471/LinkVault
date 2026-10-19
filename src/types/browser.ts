export const BROWSER_OPTIONS = [
  'Always Ask',
  'Default Browser',
  'Google Chrome',
  'Mozilla Firefox',
  'Microsoft Edge',
  'Opera',
  'Yandex',
  'Brave'
] as const;

export type BrowserOption = typeof BROWSER_OPTIONS[number];

export const SUPPORTED_SPECIFIC_BROWSERS = [
  'Google Chrome',
  'Mozilla Firefox',
  'Microsoft Edge',
  'Opera',
  'Yandex',
  'Brave'
] as const;

export type SupportedSpecificBrowser = typeof SUPPORTED_SPECIFIC_BROWSERS[number];

export interface BrowserStatusInfo {
  name: string;
  detected: boolean;
  path: string | null;
  isCustom: boolean;
}
