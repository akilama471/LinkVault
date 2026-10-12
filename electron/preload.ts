import { contextBridge, ipcRenderer } from 'electron';

// --- IPC API ---
export const electronAPI = {
  ping: () => ipcRenderer.invoke('ping'),
  bookmarks: {
    add: (url: string) => ipcRenderer.invoke('bookmarks:add', url),
    getAll: () => ipcRenderer.invoke('bookmarks:getAll'),
    search: (query: string) => ipcRenderer.invoke('bookmarks:search', query),
    update: (id: number, data: any) => ipcRenderer.invoke('bookmarks:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('bookmarks:delete', id)
  },
  domains: {
    getAll: () => ipcRenderer.invoke('domains:getAll')
  },
  tags: {
    getAll: () => ipcRenderer.invoke('tags:getAll'),
    create: (name: string) => ipcRenderer.invoke('tags:create', name),
    rename: (id: number, newName: string) => ipcRenderer.invoke('tags:rename', id, newName),
    delete: (id: number) => ipcRenderer.invoke('tags:delete', id),
    getForBookmark: (bookmarkId: number) => ipcRenderer.invoke('tags:getForBookmark', bookmarkId),
    setForBookmark: (bookmarkId: number, tagNames: string[]) => ipcRenderer.invoke('tags:setForBookmark', bookmarkId, tagNames),
    getBookmarkIds: (tagId: number) => ipcRenderer.invoke('tags:getBookmarkIds', tagId)
  },
  collections: {
    getAll: () => ipcRenderer.invoke('collections:getAll'),
    create: (name: string, description?: string) => ipcRenderer.invoke('collections:create', name, description),
    rename: (id: number, newName: string, description?: string) => ipcRenderer.invoke('collections:rename', id, newName, description),
    delete: (id: number) => ipcRenderer.invoke('collections:delete', id),
    getForBookmark: (bookmarkId: number) => ipcRenderer.invoke('collections:getForBookmark', bookmarkId),
    setForBookmark: (bookmarkId: number, colNames: string[]) => ipcRenderer.invoke('collections:setForBookmark', bookmarkId, colNames),
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
  events: {
    onBookmarksUpdated: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('bookmarks:updated', listener);
      return () => ipcRenderer.removeListener('bookmarks:updated', listener);
    },
    onJobsUpdated: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('jobs:logs-updated', listener);
      return () => ipcRenderer.removeListener('jobs:logs-updated', listener);
    }
  },
  jobs: {
    getEnrichmentLogs: () => ipcRenderer.invoke('jobs:getEnrichmentLogs')
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
