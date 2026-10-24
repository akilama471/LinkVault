import { contextBridge, ipcRenderer, clipboard } from 'electron';

// --- IPC API ---
export const electronAPI = {
  ping: () => ipcRenderer.invoke('ping'),
  bookmarks: {
    add: (url: string) => ipcRenderer.invoke('bookmarks:add', url),
    getAll: () => ipcRenderer.invoke('bookmarks:getAll'),
    getDeleted: () => ipcRenderer.invoke('bookmarks:getDeleted'),
    search: (query: string) => ipcRenderer.invoke('bookmarks:search', query),
    update: (id: number, data: any) => ipcRenderer.invoke('bookmarks:update', id, data),
    refetch: (id: number) => ipcRenderer.invoke('bookmarks:refetch', id),
    delete: (id: number) => ipcRenderer.invoke('bookmarks:delete', id),
    bulkDelete: (ids: number[]) => ipcRenderer.invoke('bookmarks:bulkDelete', ids),
    bulkUpdate: (ids: number[], data: any) => ipcRenderer.invoke('bookmarks:bulkUpdate', ids, data),
    restore: (id: number) => ipcRenderer.invoke('bookmarks:restore', id),
    permanentDelete: (id: number) => ipcRenderer.invoke('bookmarks:permanentDelete', id),
    emptyTrash: () => ipcRenderer.invoke('bookmarks:emptyTrash')
  },
  domains: {
    getAll: () => ipcRenderer.invoke('domains:getAll'),
    refetch: (id: number) => ipcRenderer.invoke('domains:refetch', id),
    rename: (id: number, newName: string) => ipcRenderer.invoke('domains:rename', id, newName),
    delete: (id: number, deleteBookmarks: boolean) => ipcRenderer.invoke('domains:delete', id, deleteBookmarks)
  },
  tags: {
    getAll: () => ipcRenderer.invoke('tags:getAll'),
    create: (name: string) => ipcRenderer.invoke('tags:create', name),
    rename: (id: number, newName: string) => ipcRenderer.invoke('tags:rename', id, newName),
    delete: (id: number) => ipcRenderer.invoke('tags:delete', id),
    getForBookmark: (bookmarkId: number) => ipcRenderer.invoke('tags:getForBookmark', bookmarkId),
    setForBookmark: (bookmarkId: number, tagNames: string[]) => ipcRenderer.invoke('tags:setForBookmark', bookmarkId, tagNames),
    bulkAdd: (bookmarkIds: number[], tagNames: string[]) => ipcRenderer.invoke('tags:bulkAdd', bookmarkIds, tagNames),
    bulkRemove: (bookmarkIds: number[], tagIds: number[]) => ipcRenderer.invoke('tags:bulkRemove', bookmarkIds, tagIds),
    getBookmarkIds: (tagId: number) => ipcRenderer.invoke('tags:getBookmarkIds', tagId)
  },
  collections: {
    getAll: () => ipcRenderer.invoke('collections:getAll'),
    getDeleted: () => ipcRenderer.invoke('collections:getDeleted'),
    create: (name: string, description?: string) => ipcRenderer.invoke('collections:create', name, description),
    rename: (id: number, newName: string, description?: string) => ipcRenderer.invoke('collections:rename', id, newName, description),
    refetch: (id: number) => ipcRenderer.invoke('collections:refetch', id),
    delete: (id: number, deleteBookmarks = false) => ipcRenderer.invoke('collections:delete', id, deleteBookmarks),
    restore: (id: number) => ipcRenderer.invoke('collections:restore', id),
    permanentDelete: (id: number) => ipcRenderer.invoke('collections:permanentDelete', id),
    emptyTrash: () => ipcRenderer.invoke('collections:emptyTrash'),
    getForBookmark: (bookmarkId: number) => ipcRenderer.invoke('collections:getForBookmark', bookmarkId),
    setForBookmark: (bookmarkId: number, colNames: string[]) => ipcRenderer.invoke('collections:setForBookmark', bookmarkId, colNames),
    bulkAdd: (collectionId: number, bookmarkIds: number[]) => ipcRenderer.invoke('collections:bulkAdd', collectionId, bookmarkIds),
    getBookmarkIds: (collectionId: number) => ipcRenderer.invoke('collections:getBookmarkIds', collectionId)
  },
  auth: {
    hasPassword: () => ipcRenderer.invoke('auth:hasPassword'),
    setPassword: (password: string) => ipcRenderer.invoke('auth:setPassword', password),
    removePassword: () => ipcRenderer.invoke('auth:removePassword'),
    verifyPassword: (password: string) => ipcRenderer.invoke('auth:verifyPassword', password),
    lock: () => ipcRenderer.invoke('auth:lock')
  },
  backup: {
    export: () => ipcRenderer.invoke('backup:export'),
    import: () => ipcRenderer.invoke('backup:import'),
    wipeData: () => ipcRenderer.invoke('backup:wipeData')
  },
  browserImport: {
    getProfiles: (browser: string) => ipcRenderer.invoke('import:getProfiles', browser),
    extract: (browser: string, profilePath: string) => ipcRenderer.invoke('import:extract', browser, profilePath),
    execute: (bookmarks: { title: string; url: string }[]) => ipcRenderer.invoke('import:execute', bookmarks)
  },
  browser: {
    getDefault: () => ipcRenderer.invoke('settings:getDefaultBrowser'),
    setDefault: (browser: string) => ipcRenderer.invoke('settings:setDefaultBrowser', browser),
    getStatuses: () => ipcRenderer.invoke('settings:getBrowserStatuses'),
    setCustomPath: (browser: string, customPath: string) => ipcRenderer.invoke('settings:setCustomBrowserPath', browser, customPath),
    clearCustomPath: (browser: string) => ipcRenderer.invoke('settings:clearCustomBrowserPath', browser),
    browseExecutable: (browser: string) => ipcRenderer.invoke('settings:browseBrowserExecutable', browser),
    openUrl: (url: string, browserName?: string) => ipcRenderer.invoke('browser:openUrl', url, browserName)
  },
  settings: {
    getShowHiddenBookmarks: () => ipcRenderer.invoke('settings:getShowHiddenBookmarks'),
    setShowHiddenBookmarks: (show: boolean) => ipcRenderer.invoke('settings:setShowHiddenBookmarks', show),
    getSpaFallback: () => ipcRenderer.invoke('settings:getSpaFallback'),
    setSpaFallback: (enabled: boolean) => ipcRenderer.invoke('settings:setSpaFallback', enabled)
  },
  assets: {
    getStorageStats: () => ipcRenderer.invoke('assets:getStorageStats'),
    vacuum: () => ipcRenderer.invoke('assets:vacuum')
  },
  database: {
    getStats: () => ipcRenderer.invoke('database:getStats'),
    optimize: () => ipcRenderer.invoke('database:optimize')
  },
  events: {
    onBookmarksUpdated: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('bookmarks:updated', listener);
      return () => ipcRenderer.removeListener('bookmarks:updated', listener);
    },
    onShowHiddenUpdated: (callback: (show: boolean) => void) => {
      const listener = (_e: any, show: boolean) => callback(show);
      ipcRenderer.on('settings:show-hidden-updated', listener);
      return () => ipcRenderer.removeListener('settings:show-hidden-updated', listener);
    },
    onSpaFallbackUpdated: (callback: (enabled: boolean) => void) => {
      const listener = (_e: any, enabled: boolean) => callback(enabled);
      ipcRenderer.on('settings:spa-fallback-updated', listener);
      return () => ipcRenderer.removeListener('settings:spa-fallback-updated', listener);
    },
    onDomainsUpdated: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('domains:updated', listener);
      return () => ipcRenderer.removeListener('domains:updated', listener);
    },
    onCollectionsUpdated: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('collections:updated', listener);
      return () => ipcRenderer.removeListener('collections:updated', listener);
    },
    onTagsUpdated: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('tags:updated', listener);
      return () => ipcRenderer.removeListener('tags:updated', listener);
    },
    onJobsUpdated: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('jobs:logs-updated', listener);
      return () => ipcRenderer.removeListener('jobs:logs-updated', listener);
    },
    onAuditorProgress: (callback: (progress: any) => void) => {
      const listener = (_e: any, progress: any) => callback(progress);
      ipcRenderer.on('auditor:progress', listener);
      return () => ipcRenderer.removeListener('auditor:progress', listener);
    },
    onAuditorCompleted: (callback: (summary: any) => void) => {
      const listener = (_e: any, summary: any) => callback(summary);
      ipcRenderer.on('auditor:completed', listener);
      return () => ipcRenderer.removeListener('auditor:completed', listener);
    },
    onAuditorUpdated: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('auditor:updated', listener);
      return () => ipcRenderer.removeListener('auditor:updated', listener);
    }
  },
  auditor: {
    startHealthCheck: (options?: { forceRecheck?: boolean; onlyFlagged?: boolean }) => ipcRenderer.invoke('auditor:startHealthCheck', options),
    stopHealthCheck: () => ipcRenderer.invoke('auditor:stopHealthCheck'),
    getProgress: () => ipcRenderer.invoke('auditor:getProgress'),
    checkBookmark: (id: number) => ipcRenderer.invoke('auditor:checkBookmark', id),
    getSummary: () => ipcRenderer.invoke('auditor:getSummary'),
    getDuplicates: () => ipcRenderer.invoke('auditor:getDuplicates'),
    mergeDuplicates: (primaryId: number, duplicateIds: number[], moveToTrash = true) => ipcRenderer.invoke('auditor:mergeDuplicates', primaryId, duplicateIds, moveToTrash)
  },
  exchange: {
    export: (options: any) => ipcRenderer.invoke('exchange:export', options),
    importHtml: () => ipcRenderer.invoke('exchange:importHtml'),
    getMetadata: () => ipcRenderer.invoke('exchange:getMetadata')
  },
  jobs: {
    getEnrichmentLogs: () => ipcRenderer.invoke('jobs:getEnrichmentLogs')
  },
  clipboard: {
    readText: () => clipboard.readText()
  }
};

// Expose the API to the renderer process
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (for type checking)
  window.electronAPI = electronAPI;
}
