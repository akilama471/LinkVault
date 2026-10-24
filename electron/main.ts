import { app, BrowserWindow, ipcMain, dialog, session, protocol } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerBookmarkController } from './controllers/bookmark.controller';
import { registerDomainController } from './controllers/domain.controller';
import { registerTagController } from './controllers/tag.controller';
import { registerCollectionController } from './controllers/collection.controller';
import { registerBrowserImportController } from './controllers/browser-import.controller';
import { enrichmentService } from './services/enrichment.service';
import fs from 'node:fs';
import { registerAuthController } from './controllers/auth.controller';
import { registerBackupController } from './controllers/backup.controller';
import { registerBrowserLauncherController } from './controllers/browser-launcher.controller';
import { registerSettingsController } from './controllers/settings.controller';
import { registerAssetController } from './controllers/asset.controller';
import { registerDatabaseController } from './controllers/database.controller';
import { registerBookmarkExchangeController } from './controllers/bookmark-exchange.controller';
import { registerAuditorController } from './controllers/auditor.controller';
import { browserLauncherService } from './services/browser-launcher.service';
import { bookmarkService } from './services/bookmark.service';
import { collectionService } from './services/collection.service';
import { dbManager } from './database/db';
import { passwordService } from './services/password.service';

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

  // Enable Developer Tools for debugging
  win.webContents.openDevTools();

  // Allow toggling DevTools using F12 or Ctrl+Shift+I (or Cmd+Option+I on macOS)
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown') {
      const isF12 = input.key === 'F12';
      const isDevToolsCombo = (input.control || input.meta) && input.shift && (input.key === 'I' || input.key === 'i');
      if (isF12 || isDevToolsCombo) {
        win?.webContents.toggleDevTools();
        event.preventDefault();
      }
    }
  });

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

app.on('before-quit', async () => {
  try {
    await passwordService.shutdown();
  } catch (error) {
    console.error('Error during shutdown database encryption / checkpoint:', error);
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  // Set Content-Security-Policy headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: asset: blob: https: http:; font-src 'self' data: https:; connect-src 'self' ws: http: https:;"
        ]
      }
    });
  });

  // Initialize Database if not encrypted at rest
  try {
    if (passwordService.isAuth()) {
      dbManager.getDb();
    }
  } catch (error) {
    console.log('[Main] Database awaits master password unlock on startup');
  }

  // Register custom protocol for local assets
  protocol.handle('asset', async (request) => {
    // Block unauthorized asset access if master password protection is active
    if (passwordService.hasPasswordSet() && !passwordService.isAuth()) {
      return new Response(null, { status: 401 });
    }

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
  registerSettingsController();
  registerAssetController();
  registerDatabaseController();
  registerBookmarkExchangeController();
  registerAuditorController();
  
  // Start background jobs only if authenticated
  if (passwordService.isAuth()) {
    try {
      bookmarkService.purgeExpiredBookmarks();
      collectionService.purgeExpiredCollections();
      enrichmentService.startEnrichmentJob();
    } catch (e) {
      console.warn('Initial background jobs deferred until unlock:', e);
    }
  }

  setInterval(() => {
    try {
      if (passwordService.isAuth()) {
        bookmarkService.purgeExpiredBookmarks();
        collectionService.purgeExpiredCollections();
      }
    } catch (e) {
      console.error('Failed to purge expired Recycle Bin items:', e);
    }
  }, 60 * 60 * 1000);
  
  createWindow();
});

// Example IPC handler to ensure secure bridge is working
ipcMain.handle('ping', () => 'pong');

