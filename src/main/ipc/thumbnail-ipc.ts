import { ipcMain, BrowserWindow } from 'electron';
import { thumbnailGenerator } from '../services/thumbnail-generator';
import { getSavedSearches, saveSavedSearch, updateSearchExecutionCount } from '../services/saved-searches';
import { SavedSearch } from '../../shared/types/thumbnail';

function broadcast(channel: string, ...args: any[]) {
  BrowserWindow.getAllWindows().forEach(w => {
    try { w.webContents.send(channel, ...args); } catch {}
  });
}

export function registerThumbnailIpc() {
  // start generation
  ipcMain.handle('thumbnail-start', async (_, filePaths: string[]) => {
    setImmediate(() => {
      thumbnailGenerator.generateThumbnails(filePaths).catch(() => {});
    });
    return { started: true };
  });

  ipcMain.handle('thumbnail-pause', async () => {
    thumbnailGenerator.pause();
    return { ok: true };
  });

  ipcMain.handle('thumbnail-resume', async () => {
    thumbnailGenerator.resume();
    return { ok: true };
  });

  ipcMain.handle('thumbnail-cancel', async () => {
    thumbnailGenerator.cancel();
    return { ok: true };
  });

  thumbnailGenerator.on('progress', (data) => {
    broadcast('thumbnail-progress', data);
  });

  thumbnailGenerator.on('error', (err) => {
    broadcast('thumbnail-error', err);
  });

  // saved searches
  ipcMain.handle('get-saved-searches', async () => {
    return await getSavedSearches();
  });

  ipcMain.handle('save-saved-search', async (_, search: SavedSearch) => {
    await saveSavedSearch(search);
    return { ok: true };
  });

  ipcMain.handle('execute-search', async (_, query) => {
    // 実装側で検索実行の IPC を受け取る想定。ここは起点のみ。
    broadcast('execute-search', query);
    return { ok: true };
  });

  ipcMain.handle('update-search-execution-count', async (_, id: string) => {
    await updateSearchExecutionCount(id);
    return { ok: true };
  });

  // テスト用 ping/pong ハンドラ
  ipcMain.handle('ipc-test-ping', async (_, payload: any) => {
    const res = { ok: true, echo: payload, ts: Date.now() };
    // 全ウィンドウへイベントも送る（購読テスト用）
    BrowserWindow.getAllWindows().forEach(w => {
      try { w.webContents.send('ipc-test-pong', res); } catch {}
    });
    return res;
  });
}
