import { ipcMain, BrowserWindow } from 'electron';
import path from 'path';

export function registerViewerIpc() {
  try {
    ipcMain.removeHandler('open-viewer');
  } catch {}
  ipcMain.handle('open-viewer', async (_evt, filePath: string) => {
    try {
      const isDev = process.env.NODE_ENV !== 'production' || !!process.env.ELECTRON_START_URL;
      const base = isDev
        ? process.env.ELECTRON_START_URL || 'http://localhost:5173'
        : `file://${path.join(__dirname, '../renderer/index.html')}`;
      const viewerUrl = `${base}#viewer?path=${encodeURIComponent(String(filePath))}`;

      const win = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          preload: path.join(__dirname, '../preload/thumbnail.js'),
        },
      });

      await win.loadURL(viewerUrl);
      return { ok: true };
    } catch (err) {
      console.error('[ipc] open-viewer error', err);
      return { ok: false, error: String(err) };
    }
  });
}
