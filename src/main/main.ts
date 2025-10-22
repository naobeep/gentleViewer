import path from 'path';
import { app, BrowserWindow } from 'electron';
import { registerIpcHandlers } from './ipcHandlers';

console.log('[main] starting main source');

function getPreloadPath() {
  // 開発中は dist/preload/thumbnail.js を使っているログがあるため dev でも同パスを指定
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'dist', 'preload', 'thumbnail.js');
  }
  // 開発環境: アプリルートから dist/preload を参照
  return path.join(app.getAppPath(), 'dist', 'preload', 'thumbnail.js');
}

async function createMainWindow() {
  const preloadPath = getPreloadPath();
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 開発サーバ URL が環境変数で渡されるプロジェクト構成を想定
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173/';
  if (!app.isPackaged && process.env.VITE_DEV_SERVER_URL) {
    await win.loadURL(devUrl);
  } else if (!app.isPackaged && process.env.NODE_ENV !== 'production') {
    // 運用上 localhost:5173 を使うケースがあるのでフォールバック
    try {
      await win.loadURL(devUrl);
    } catch (e) {
      console.warn('[main] loadURL dev failed, falling back to file:', e);
      const indexHtml = path.join(app.getAppPath(), 'dist', 'renderer', 'index.html');
      await win.loadFile(indexHtml).catch(() => {}); // best-effort
    }
  } else {
    const indexHtml = path.join(process.resourcesPath, 'dist', 'renderer', 'index.html');
    await win.loadFile(indexHtml).catch(e => console.error('[main] loadFile failed', e));
  }

  // 開発時に DevTools を自動で開きたければここを有効化
  // if (!app.isPackaged) win.webContents.openDevTools();
  return win;
}

app.whenReady().then(async () => {
  console.log('[main] app.whenReady start');

  try {
    // IPC ハンドラを先に登録（renderer からの呼び出しより前に必須）
    registerIpcHandlers();
    console.log('[main] registerIpcHandlers called (from src/main/main.ts)');
  } catch (e) {
    console.error('[main] registerIpcHandlers error', e);
  }

  try {
    await createMainWindow();
    console.log('[main] main window created');
  } catch (e) {
    console.error('[main] failed to create main window', e);
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // macOS 以外では全ウィンドウ閉じたら終了
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
