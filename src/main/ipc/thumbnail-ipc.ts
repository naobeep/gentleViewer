import { ipcMain, BrowserWindow } from 'electron';
import type {
  SavedSearch,
  SearchQuery,
  ThumbnailGenerationProgress,
  ThumbnailError,
} from '../../shared/types/thumbnail';
import { thumbnailGenerator } from '../services/thumbnail-generator';
import {
  getSavedSearches,
  saveSavedSearch,
  updateSearchExecutionCount,
} from '../services/saved-searches';

function broadcast(channel: string, ...args: any[]) {
  BrowserWindow.getAllWindows().forEach(w => {
    try {
      w.webContents.send(channel, ...args);
    } catch {
      // ignore send errors per-window
    }
  });
}

export function registerThumbnailIpc() {
  // thumbnail control handlers
  ipcMain.handle('thumbnail-start', async (_event, filePaths: string[]) => {
    try {
      // 開発時デバッグ用: 空配列ならサンプル進捗を送る
      if (
        Array.isArray(filePaths) &&
        filePaths.length === 0 &&
        process.env.NODE_ENV !== 'production'
      ) {
        console.info('[ipc] thumbnail-start: empty filePaths -> simulate progress (dev)');
        void (async () => {
          const total = 6;
          for (let i = 1; i <= total; i++) {
            await new Promise(r => setTimeout(r, 400));
            broadcast('thumbnail-progress', {
              status: i < total ? 'running' : 'completed',
              total,
              completed: i,
              skipped: 0,
              errors: 0,
              currentFile: `dev-simulated-${i}.jpg`,
              estimatedTimeRemaining: null,
              startedAt: Date.now(),
              updatedAt: Date.now(),
            } as ThumbnailGenerationProgress);
          }
        })();
        return { started: true, simulated: true };
      }

      void (async () => {
        try {
          await thumbnailGenerator.generateThumbnails(Array.isArray(filePaths) ? filePaths : []);
        } catch (e) {
          const msg = e instanceof Error ? e.stack || e.message : String(e);
          console.error('[thumbnail-generator] background error:', msg);
          broadcast('thumbnail-error', {
            error: msg,
            timestamp: Date.now(),
          } as ThumbnailError);
        }
      })();
      return { started: true };
    } catch (err) {
      console.error('[ipc] thumbnail-start handler failed:', err);
      return { started: false, error: (err as Error).message || String(err) };
    }
  });

  // テスト用 ping/pong ハンドラ（堅牢化）
  ipcMain.handle('ipc-test-ping', async (_event, payload: any) => {
    try {
      const res = { ok: true, echo: payload, ts: Date.now() };
      try {
        BrowserWindow.getAllWindows().forEach(w => {
          try {
            w.webContents.send('ipc-test-pong', res);
          } catch (sendErr) {
            console.warn(
              '[ipc] send to window failed:',
              sendErr instanceof Error ? sendErr.message : String(sendErr)
            );
          }
        });
      } catch (bErr) {
        console.warn('[ipc] broadcast iteration failed:', bErr);
      }
      return res;
    } catch (err) {
      console.error('[ipc] ipc-test-ping handler error:', err);
      throw err; // invoke 側にも例外情報を返す
    }
  });

  ipcMain.handle('thumbnail-pause', async () => {
    try {
      thumbnailGenerator.pause();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message || String(err) };
    }
  });

  ipcMain.handle('thumbnail-resume', async () => {
    try {
      thumbnailGenerator.resume();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message || String(err) };
    }
  });

  ipcMain.handle('thumbnail-cancel', async () => {
    try {
      thumbnailGenerator.cancel();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message || String(err) };
    }
  });

  // forward generator events to renderer windows
  try {
    thumbnailGenerator.on('progress', (data: ThumbnailGenerationProgress) => {
      broadcast('thumbnail-progress', data);
    });

    thumbnailGenerator.on('error', (err: ThumbnailError) => {
      broadcast('thumbnail-error', err);
    });
  } catch {
    // thumbnailGenerator may not support events -> ignore
  }

  // saved searches handlers
  ipcMain.handle('get-saved-searches', async () => {
    try {
      const list = await getSavedSearches();
      return list;
    } catch (err) {
      return [];
    }
  });

  ipcMain.handle('save-saved-search', async (_evt, search: SavedSearch) => {
    try {
      await saveSavedSearch(search);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message || String(err) };
    }
  });

  ipcMain.handle('execute-search', async (_evt, query: SearchQuery) => {
    try {
      // inform renderer(s) to run the search (UI layer handles actual execution)
      broadcast('execute-search', query);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message || String(err) };
    }
  });

  ipcMain.handle('update-search-execution-count', async (_evt, id: string) => {
    try {
      await updateSearchExecutionCount(id);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message || String(err) };
    }
  });
}
