import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { registerThumbnailIpc } from './ipc/thumbnail-ipc';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV !== 'production' || process.env.ELECTRON_START_URL;

function resolvePreload(): string | undefined {
  // 探索候補（ビルド済み(dist)を優先）
  const candidates = [
    // compiled: dist/preload/thumbnail.js （実行時 __dirname が dist/main 等の場合に有効）
    path.join(__dirname, '../preload/thumbnail.js'),
    // プロジェクトルートの dist（実行コンテキストによっては有効）
    path.join(process.cwd(), 'dist', 'preload', 'thumbnail.js'),
    // 互換: src/preload (ts を直接置いたり dev 用に存在する場合)
    path.join(process.cwd(), 'src', 'preload', 'thumbnail.js'),
    // 旧候補（残しておく）
    path.join(__dirname, '../../src/preload/thumbnail.js'),
    path.join(__dirname, 'preload/thumbnail.js'),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      console.info('preload found:', p);
      return p;
    }
  }

  console.warn('preload not found in candidates:', candidates);
  return undefined;
}

async function createWindow() {
  const preloadPath = resolvePreload();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // preloadPath があれば使用、なければ undefined（その場合は dev-stub を注入）
      preload: preloadPath ?? undefined,
      contextIsolation: true,
      nodeIntegration: false,
    },
    // アイコン指定: 開発時とビルド後のパスを考慮
    icon: (() => {
      if (isDev) return path.join(__dirname, '../../src/icon/64.png');
      return path.join(__dirname, '../renderer/64.png');
    })(),
  });

  if (isDev) {
    const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
    await mainWindow.loadURL(devUrl);

    // DevTools を自動で開かない。必要なときだけ SHOW_DEVTOOLS=1 を指定して開く
    if (process.env.SHOW_DEVTOOLS === '1') {
      mainWindow.webContents.openDevTools();
    }

    // preload が無い場合にのみ dev-stub を注入（preload があるなら本物が機能します）
    if (!preloadPath) {
      const devApi = `
        window.electronAPI = {
          onThumbnailProgress: (cb) => { return () => {}; },
          onThumbnailError: (cb) => { return () => {}; },
          startThumbnailGeneration: (files) => Promise.resolve({ started: true }),
          pauseThumbnailGeneration: () => Promise.resolve(),
          resumeThumbnailGeneration: () => Promise.resolve(),
          cancelThumbnailGeneration: () => Promise.resolve(),
          getSavedSearches: () => Promise.resolve([]),
          saveSavedSearch: (s) => Promise.resolve(),
          executeSearch: (q) => Promise.resolve(),
          updateSearchExecutionCount: (id) => Promise.resolve()
        };
        true;
      `;
      try {
        await mainWindow.webContents.executeJavaScript(devApi, true);
        console.info('Dev electronAPI stub injected');
      } catch (e) {
        console.warn('failed to inject dev electronAPI stub:', e);
      }
    }

    // console-message ハンドラ（既存）
    mainWindow.webContents.on('console-message', (...args: any[]) => {
      try {
        let msg = '';
        if (args.length === 1 && args[0] && typeof args[0] === 'object') {
          msg = String((args[0] as any).message ?? '');
        } else {
          const possibleMessage = args.find(a => typeof a === 'string');
          msg = String(possibleMessage ?? '');
        }
        if (msg.includes('Autofill.')) return;
      } catch {}
    });
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
    // IPC 登録（存在すれば）
    try {
      registerThumbnailIpc();
    } catch (e) {
      // module 未作成等はログ出力のみ
      console.warn('registerThumbnailIpc failed:', (e as Error).message);
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
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
