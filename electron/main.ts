import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerBookmarkController } from './controllers/bookmark.controller';
import { registerDomainController } from './controllers/domain.controller';
import { registerTagController } from './controllers/tag.controller';
import { registerCollectionController } from './controllers/collection.controller';
import { registerBrowserImportController } from './controllers/browser-import.controller';
import { enrichmentService } from './services/enrichment.service';
import { protocol } from 'electron';
import fs from 'node:fs';
import { registerAuthController } from './controllers/auth.controller';
import { registerBackupController } from './controllers/backup.controller';
import { registerBrowserLauncherController } from './controllers/browser-launcher.controller';
import { browserLauncherService } from './services/browser-launcher.service';
import { dbManager } from './database/db';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.APP_ROOT = path.join(__dirname, '..');

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }

  // Hide menu bar by default for a modern look
  win.setMenuBarVisibility(false);

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      browserLauncherService.openUrl(url).catch(console.error);
    }
    return { action: 'deny' };
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  // Initialize Database
  try {
    dbManager.getDb();
  } catch (error) {
    console.error('Failed to initialize database on startup:', error);
  }

  // Register custom protocol for local assets
  protocol.handle('asset', async (request) => {
    // request.url is something like asset://thumb_abcd123.webp
    const urlFilename = request.url.slice('asset://'.length);
    // Use path.basename to prevent path traversal
    const filename = path.basename(decodeURIComponent(urlFilename));
    
    const assetsDir = path.join(app.getPath('userData'), 'assets');
    const assetPath = path.resolve(assetsDir, filename);
    
    // Ensure the resolved path is within the assets directory
    if (!assetPath.startsWith(assetsDir)) {
      return new Response(null, { status: 403 });
    }
    
    // Check if file exists, if not, return 404
    if (!fs.existsSync(assetPath)) {
      return new Response(null, { status: 404 });
    }
    
    // Return file with image/webp content type since .bdi is not a known image extension
    const data = await fs.promises.readFile(assetPath);
    return new Response(data, {
      headers: {
        'Content-Type': 'image/webp'
      }
    });
  });

  // Register IPC Controllers
  registerAuthController();
  registerBookmarkController();
  registerDomainController();
  registerTagController();
  registerCollectionController();
  registerBrowserImportController();
  registerBackupController();
  registerBrowserLauncherController();
  
  // Start background jobs
  enrichmentService.startEnrichmentJob();
  
  createWindow();
});

// Example IPC handler to ensure secure bridge is working
ipcMain.handle('ping', () => 'pong');

