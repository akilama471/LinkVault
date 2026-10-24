export interface Bookmark {
    id: number;
    url: string;
    title: string | null;
    description: string | null;
    domain_id: number | null;
    thumbnail_path: string | null;
    preview_path: string | null;
    is_favorite: boolean;
    is_important: boolean;
    notes: string | null;
    hide_mode?: number;
    deleted_at?: string | null;
    http_status?: number | null;
    health_status?: 'ok' | 'dead' | 'server_error' | 'dns_error' | 'timeout' | 'unreachable' | null;
    health_error?: string | null;
    last_checked_at?: string | null;
    created_at: string;
    updated_at: string;
}
export interface Domain {
    id: number;
    domain: string;
    display_name?: string | null;
    favicon_path: string | null;
    created_at: string;
    updated_at: string;
}
export interface Tag {
    id: number;
    name: string;
    bookmark_count?: number;
    created_at: string;
    updated_at: string;
}
export interface Collection {
    id: number;
    name: string;
    description: string | null;
    bookmark_count?: number;
    deleted_at?: string | null;
    created_at: string;
    updated_at: string;
}
export interface OrphanAssetInfo {
    filename: string;
    sizeBytes: number;
    modifiedAt: string;
    assetType: 'thumbnail' | 'preview' | 'favicon' | 'other';
}
export interface AssetStorageStats {
    totalFiles: number;
    totalSizeBytes: number;
    activeFiles: number;
    activeSizeBytes: number;
    orphanFiles: number;
    orphanSizeBytes: number;
    orphans: OrphanAssetInfo[];
}
export interface VacuumResult {
    deletedCount: number;
    reclaimedBytes: number;
    errors: string[];
}
export interface DatabaseStorageStats {
    dbSizeBytes: number;
    walSizeBytes: number;
    shmSizeBytes: number;
    totalSizeBytes: number;
    pageCount: number;
    pageSize: number;
    freelistCount: number;
    freelistSizeBytes: number;
    journalMode: string;
}
export interface DatabaseOptimizationResult {
    beforeSizeBytes: number;
    afterSizeBytes: number;
    reclaimedBytes: number;
    checkpointResult: {
        busy: number;
        log: number;
        checkpointed: number;
    };
    timestamp: string;
}
export interface ExportFilterOptions {
    format: 'html' | 'json' | 'csv';
    scope: 'all' | 'collection' | 'tag';
    collectionId?: number;
    tagId?: number;
    includeRecycleBin?: boolean;
}
export interface HtmlImportResult {
    imported: number;
    duplicates: number;
    total: number;
    collectionsCreated: number;
    tagsCreated: number;
}
export interface HealthCheckProgress {
    isRunning: boolean;
    total: number;
    checked: number;
    deadCount: number;
    errorCount: number;
    currentUrl?: string;
    startedAt?: string;
}
export interface AuditSummary {
    totalBookmarks: number;
    healthyCount: number;
    deadCount: number;
    serverErrorCount: number;
    dnsErrorCount: number;
    timeoutCount: number;
    unreachableCount: number;
    uncheckedCount: number;
    exactDuplicatesCount: number;
    normalizedDuplicatesCount: number;
    duplicateGroupCount: number;
}
export interface DuplicateGroup {
    normalizedUrl: string;
    matchType: 'exact' | 'normalized';
    differenceReasons: string[];
    bookmarks: Bookmark[];
    primaryBookmarkId: number;
}
