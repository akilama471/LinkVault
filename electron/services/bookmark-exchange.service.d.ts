export interface ExportFilterOptions {
    format: 'html' | 'json' | 'csv';
    scope: 'all' | 'collection' | 'tag';
    collectionId?: number;
    tagId?: number;
    includeRecycleBin?: boolean;
}
export interface BookmarkExportItem {
    id: number;
    url: string;
    title: string | null;
    description: string | null;
    notes: string | null;
    domain: string | null;
    collections: string[];
    tags: string[];
    isFavorite: boolean;
    isImportant: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface ParsedHtmlBookmark {
    url: string;
    title: string;
    description?: string;
    addDate?: number;
    folderPath: string[];
    tags: string[];
}
export interface HtmlImportResult {
    imported: number;
    duplicates: number;
    total: number;
    collectionsCreated: number;
    tagsCreated: number;
}
export declare class BookmarkExchangeService {
    /**
     * Parses standard Netscape Bookmark HTML files (exported by Chrome, Firefox, Safari, Edge, Raindrop, etc.)
     */
    parseNetscapeHtml(htmlContent: string): ParsedHtmlBookmark[];
    /**
     * Imports parsed bookmarks into LinkVault, creating collections for folders and assigning tags in chunked batches.
     */
    importFromHtmlFile(filePath: string): Promise<HtmlImportResult>;
    /**
     * Fetches bookmarks formatted with associated domain, collections, and tags for export.
     */
    fetchExportData(filter: ExportFilterOptions): BookmarkExportItem[];
    /**
     * Generates a standard Netscape Bookmark HTML file (<!DOCTYPE NETSCAPE-Bookmark-file-1>)
     * compatible with Chrome, Firefox, Safari, Edge, Brave, and other bookmark managers.
     */
    generateNetscapeHtml(items: BookmarkExportItem[]): string;
    /**
     * Generates structured JSON export with metadata.
     */
    generateJson(items: BookmarkExportItem[]): string;
    /**
     * Generates RFC 4180 CSV export with UTF-8 BOM for Microsoft Excel and spreadsheet tools.
     */
    generateCsv(items: BookmarkExportItem[]): string;
    /**
     * Exports bookmarks to destination path in HTML, JSON, or CSV format.
     */
    exportToFile(destinationPath: string, filter: ExportFilterOptions): Promise<{
        total: number;
    }>;
}
export declare const bookmarkExchangeService: BookmarkExchangeService;
