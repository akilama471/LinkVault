export declare const electronAPI: {
    ping: () => Promise<any>;
    bookmarks: {
        add: (url: string) => Promise<any>;
        getAll: () => Promise<any>;
        getDeleted: () => Promise<any>;
        search: (query: string) => Promise<any>;
        update: (id: number, data: any) => Promise<any>;
        refetch: (id: number) => Promise<any>;
        delete: (id: number) => Promise<any>;
        restore: (id: number) => Promise<any>;
        permanentDelete: (id: number) => Promise<any>;
        emptyTrash: () => Promise<any>;
    };
    domains: {
        getAll: () => Promise<any>;
        refetch: (id: number) => Promise<any>;
        rename: (id: number, newName: string) => Promise<any>;
        delete: (id: number, deleteBookmarks: boolean) => Promise<any>;
    };
    tags: {
        getAll: () => Promise<any>;
        create: (name: string) => Promise<any>;
        rename: (id: number, newName: string) => Promise<any>;
        delete: (id: number) => Promise<any>;
        getForBookmark: (bookmarkId: number) => Promise<any>;
        setForBookmark: (bookmarkId: number, tagNames: string[]) => Promise<any>;
        getBookmarkIds: (tagId: number) => Promise<any>;
    };
    collections: {
        getAll: () => Promise<any>;
        getDeleted: () => Promise<any>;
        create: (name: string, description?: string) => Promise<any>;
        rename: (id: number, newName: string, description?: string) => Promise<any>;
        refetch: (id: number) => Promise<any>;
        delete: (id: number, deleteBookmarks?: boolean) => Promise<any>;
        restore: (id: number) => Promise<any>;
        permanentDelete: (id: number) => Promise<any>;
        emptyTrash: () => Promise<any>;
        getForBookmark: (bookmarkId: number) => Promise<any>;
        setForBookmark: (bookmarkId: number, colNames: string[]) => Promise<any>;
        getBookmarkIds: (collectionId: number) => Promise<any>;
    };
    auth: {
        hasPassword: () => Promise<any>;
        setPassword: (password: string) => Promise<any>;
        removePassword: () => Promise<any>;
        verifyPassword: (password: string) => Promise<any>;
        lock: () => Promise<any>;
    };
    backup: {
        export: () => Promise<any>;
        import: () => Promise<any>;
        wipeData: () => Promise<any>;
    };
    browserImport: {
        getProfiles: (browser: string) => Promise<any>;
        extract: (browser: string, profilePath: string) => Promise<any>;
        execute: (bookmarks: {
            title: string;
            url: string;
        }[]) => Promise<any>;
    };
    browser: {
        getDefault: () => Promise<any>;
        setDefault: (browser: string) => Promise<any>;
        getStatuses: () => Promise<any>;
        setCustomPath: (browser: string, customPath: string) => Promise<any>;
        clearCustomPath: (browser: string) => Promise<any>;
        browseExecutable: (browser: string) => Promise<any>;
        openUrl: (url: string, browserName?: string) => Promise<any>;
    };
    settings: {
        getShowHiddenBookmarks: () => Promise<any>;
        setShowHiddenBookmarks: (show: boolean) => Promise<any>;
    };
    assets: {
        getStorageStats: () => Promise<any>;
        vacuum: () => Promise<any>;
    };
    events: {
        onBookmarksUpdated: (callback: () => void) => () => Electron.IpcRenderer;
        onShowHiddenUpdated: (callback: (show: boolean) => void) => () => Electron.IpcRenderer;
        onDomainsUpdated: (callback: () => void) => () => Electron.IpcRenderer;
        onCollectionsUpdated: (callback: () => void) => () => Electron.IpcRenderer;
        onTagsUpdated: (callback: () => void) => () => Electron.IpcRenderer;
        onJobsUpdated: (callback: () => void) => () => Electron.IpcRenderer;
    };
    jobs: {
        getEnrichmentLogs: () => Promise<any>;
    };
    clipboard: {
        readText: () => Promise<string>;
    };
};
