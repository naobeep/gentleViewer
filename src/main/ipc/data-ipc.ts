import { ipcMain, BrowserWindow } from 'electron';
import * as filesRepo from '../repositories/filesRepository';
import * as savedRepo from '../repositories/savedSearchRepository';

/**
 * データ層用の IPC ハンドラを登録する（冪等: 既存ハンドラを先に削除）
 */
export function registerDataIpc() {
  const channels = [
    // files
    'get-files',
    'get-file-by-id',
    'get-file-by-path',
    'upsert-file',
    'delete-file',
    // saved searches
    'get-saved-searches',
    'create-saved-search',
    'update-saved-search',
    'delete-saved-search',
    'increment-search-count',
  ];

  // 既存ハンドラがあれば削除しておく（再登録を安全にする）
  for (const ch of channels) {
    try {
      ipcMain.removeHandler(ch);
    } catch (e) {
      // ignore
    }
  }

  // テスト用 ping/pong ハンドラ（冪等）
  try {
    ipcMain.removeHandler('ipc-test-ping');
  } catch {}
  ipcMain.handle('ipc-test-ping', async (_event, payload: any) => {
    try {
      // 全ウィンドウへ pong を送る
      for (const w of BrowserWindow.getAllWindows()) {
        try {
          w.webContents.send('ipc-test-pong', payload);
        } catch {}
      }
      return { ok: true, echo: payload };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  // files
  ipcMain.handle('get-files', async (_event, opts?: { limit?: number; offset?: number }) => {
    try {
      const limit = opts?.limit ?? 100;
      const offset = opts?.offset ?? 0;
      return { ok: true, data: filesRepo.listFiles(limit, offset) };
    } catch (err) {
      console.error('[ipc] get-files error', err);
      return { ok: false, error: String(err) };
    }
  });

  ipcMain.handle('get-file-by-id', async (_event, id: string) => {
    try {
      return { ok: true, data: filesRepo.getFileById(id) ?? null };
    } catch (err) {
      console.error('[ipc] get-file-by-id error', err);
      return { ok: false, error: String(err) };
    }
  });

  ipcMain.handle('get-file-by-path', async (_event, pathStr: string) => {
    try {
      return { ok: true, data: filesRepo.getFileByPath(pathStr) ?? null };
    } catch (err) {
      console.error('[ipc] get-file-by-path error', err);
      return { ok: false, error: String(err) };
    }
  });

  ipcMain.handle('upsert-file', async (_event, file: any) => {
    try {
      const rec = filesRepo.upsertFile(file);
      return { ok: true, data: rec };
    } catch (err) {
      console.error('[ipc] upsert-file error', err);
      return { ok: false, error: String(err) };
    }
  });

  ipcMain.handle('delete-file', async (_event, id: string) => {
    try {
      filesRepo.deleteFile(id);
      return { ok: true };
    } catch (err) {
      console.error('[ipc] delete-file error', err);
      return { ok: false, error: String(err) };
    }
  });

  // saved searches
  ipcMain.handle('get-saved-searches', async () => {
    try {
      return { ok: true, data: savedRepo.listSavedSearches() };
    } catch (err) {
      console.error('[ipc] get-saved-searches error', err);
      return { ok: false, error: String(err) };
    }
  });

  ipcMain.handle('create-saved-search', async (_event, payload: any) => {
    try {
      const rec = savedRepo.createSavedSearch(payload);
      return { ok: true, data: rec };
    } catch (err) {
      console.error('[ipc] create-saved-search error', err);
      return { ok: false, error: String(err) };
    }
  });

  ipcMain.handle('update-saved-search', async (_event, id: string, patch: any) => {
    try {
      const rec = savedRepo.updateSavedSearch(id, patch);
      return { ok: true, data: rec };
    } catch (err) {
      console.error('[ipc] update-saved-search error', err);
      return { ok: false, error: String(err) };
    }
  });

  ipcMain.handle('delete-saved-search', async (_event, id: string) => {
    try {
      savedRepo.deleteSavedSearch(id);
      return { ok: true };
    } catch (err) {
      console.error('[ipc] delete-saved-search error', err);
      return { ok: false, error: String(err) };
    }
  });

  ipcMain.handle('increment-search-count', async (_event, id: string) => {
    try {
      const rec = savedRepo.incrementExecutionCount(id);
      return { ok: true, data: rec };
    } catch (err) {
      console.error('[ipc] increment-search-count error', err);
      return { ok: false, error: String(err) };
    }
  });
}
