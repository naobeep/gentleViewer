import { app, BrowserWindow, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { registerThumbnailIpc } from './ipc/thumbnail-ipc';
const _dataIpc: any = require('./ipc/data-ipc');
const registerDataIpc: any = _dataIpc.registerDataIpc ?? _dataIpc.default ?? undefined;
import { registerViewerIpc } from './ipc/viewer-ipc';
import { runAllMigrations } from './services/db';
import os from 'os';
const BetterSqlite3: typeof import('better-sqlite3') = require('better-sqlite3');

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV !== 'production' || !!process.env.ELECTRON_START_URL;

function resolvePreload(): string | undefined {
  const candidates = [
    path.join(__dirname, '../preload/thumbnail.js'), // dist/preload when built
    path.join(process.cwd(), 'dist', 'preload', 'thumbnail.js'),
    path.join(process.cwd(), 'src', 'preload', 'thumbnail.js'), // ts -> js in dev sometimes
    path.join(__dirname, '../../src/preload/thumbnail.js'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        console.info('preload found:', p);
        return p;
      }
    } catch {}
  }
  console.warn('preload not found in candidates:', candidates);
  return undefined;
}

async function createWindow() {
  const preloadPath = resolvePreload();

  // CSP を global session に追加（dev では localhost を許可）
  try {
    const allowHosts = isDev
      ? ["'self'", 'http://localhost:5173', 'ws://localhost:5173']
      : ["'self'"];
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const csp = `default-src ${allowHosts.join(' ')} data: blob:; script-src ${allowHosts.join(' ')} 'unsafe-inline' 'unsafe-eval'; style-src ${allowHosts.join(' ')} 'unsafe-inline'; img-src * data: blob:;`;
      const headers = Object.assign({}, details.responseHeaders, {
        'Content-Security-Policy': [csp],
      });
      callback({ responseHeaders: headers });
    });
  } catch (e) {
    console.warn('failed to install CSP header handler:', e);
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath ?? undefined,
      contextIsolation: true,
      nodeIntegration: false,
      // sandbox: true, // 有効化する場合は preload の実行方式とビルドを確認してください
    },
    icon: (() => {
      if (isDev) return path.join(__dirname, '../../src/icon/64.png');
      return path.join(__dirname, '../renderer/64.png');
    })(),
  });

  if (isDev) {
    const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
    await mainWindow.loadURL(devUrl);
    if (process.env.SHOW_DEVTOOLS === '1') mainWindow.webContents.openDevTools();
  } else {
    const indexHtml = path.join(__dirname, '../renderer/index.html');
    await mainWindow.loadFile(indexHtml);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  try {
    // マイグレーション実行（migrations フォルダ内の未適用 SQL を順次実行）
    try {
      const migrationsDir = path.join(__dirname, '../migrations');
      const applied = runAllMigrations(migrationsDir);
      console.info(`DB migrations applied: ${applied.length} files`);
    } catch (migErr) {
      console.error('Failed to apply DB migrations:', migErr);
    }
    try {
      registerThumbnailIpc();
      console.info('registerThumbnailIpc: OK');
      // data IPC 登録
      if (typeof registerDataIpc === 'function') {
        registerDataIpc();
        console.info('registerDataIpc: OK');
      } else {
        console.warn('registerDataIpc is not exported from ./ipc/data-ipc; skipping registration');
      }
      // viewer IPC 登録
      registerViewerIpc();
      console.info('registerViewerIpc: OK');
    } catch (e) {
      console.error('registerThumbnailIpc failed (caught):', e);
    }

    await createWindow();
  } catch (err) {
    console.error('Error during app ready:', err);
  }
});

app.on('window-all-closed', () => {
  // macOS 以外は終了
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});

// 安全のための uncaught ハンドリング
process.on('uncaughtException', err => {
  console.error('Uncaught exception:', err);
});

function initDb(): import('better-sqlite3').Database {
  // Prefer Electron userData; fall back to a sensible home-directory path for tests/dev.
  const baseDir =
    app && typeof app.getPath === 'function'
      ? app.getPath('userData')
      : path.join(os.homedir(), '.gentleViewer');

  fs.mkdirSync(baseDir, { recursive: true });
  const dbPath = path.join(baseDir, 'gentleViewer.sqlite3');

  const db = new BetterSqlite3(dbPath);

  // Safe default pragmas
  try {
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('foreign_keys = ON');
  } catch (e) {
    console.warn('Failed to set SQLite pragmas:', e);
  }

  return db;
}
// duplicate stub removed; keep the implemented initDb above
