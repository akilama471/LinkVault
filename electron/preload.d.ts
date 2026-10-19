export declare const electronAPI: {
    ping: () => Promise<any>;
    bookmarks: {
        add: (url: string) => Promise<any>;
        getAll: () => Promise<any>;
        search: (query: string) => Promise<any>;
        update: (id: number, data: any) => Promise<any>;
        delete: (id: number) => Promise<any>;
    };
    domains: {
        getAll: () => Promise<any>;
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
        create: (name: string, description?: string) => Promise<any>;
        rename: (id: number, newName: string, description?: string) => Promise<any>;
        delete: (id: number) => Promise<any>;
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
    events: {
        onBookmarksUpdated: (callback: () => void) => () => Electron.IpcRenderer;
        onJobsUpdated: (callback: () => void) => () => Electron.IpcRenderer;
    };
    jobs: {
        getEnrichmentLogs: () => Promise<any>;
    };
    clipboard: {
        readText: () => Promise<string>;
    };
};
