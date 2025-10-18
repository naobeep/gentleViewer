import { ipcMain, BrowserWindow } from 'electron';
import { thumbnailGenerator, getCachedThumbnailPathFor } from '../services/thumbnail-generator';

/**
 * サムネイル生成用 IPC ハンドラを登録
 * - thumbnail-start: filePaths[] を受け取り生成を開始 (returns { ok: true })
 * - thumbnail-pause / resume / cancel: control
 * 進捗は 'thumbnail-progress'、エラーは 'thumbnail-error' イベントで renderer に通知する
 */
export function registerThumbnailIpc() {
  // 冪等: 既存ハンドラを削除
  const channels = ['thumbnail-start', 'thumbnail-pause', 'thumbnail-resume', 'thumbnail-cancel'];
  for (const ch of channels) {
    try {
      ipcMain.removeHandler(ch);
    } catch {}
  }

  // リスナの重複防止
  thumbnailGenerator.removeAllListeners('progress');
  thumbnailGenerator.removeAllListeners('error');

  // broadcast helper
  const broadcast = (channel: string, payload: any) => {
    const wins = BrowserWindow.getAllWindows();
    for (const w of wins) {
      try {
        w.webContents.send(channel, payload);
      } catch {}
    }
  };

  thumbnailGenerator.on('progress', p => {
    broadcast('thumbnail-progress', p);
  });
  thumbnailGenerator.on('error', e => {
    broadcast('thumbnail-error', e);
  });

  ipcMain.handle('thumbnail-start', async (_evt, filePaths: string[] = []) => {
    try {
      const arr = Array.isArray(filePaths) ? filePaths : [];
      const isDev = process.env.NODE_ENV !== 'production' || !!process.env.ELECTRON_START_URL;

      // Dev-simulate: 空配列で呼ばれた場合、開発用の進捗シミュレーションを非同期で行う
      if (isDev && arr.length === 0) {
        (async () => {
          try {
            const total = 5;
            let completed = 0;
            let skipped = 0;
            let errors = 0;
            for (let i = 1; i <= total; i++) {
              if (thumbnailGenerator['\u005FisCancelled']) break;
              // simulate processing delay
              await new Promise(r => setTimeout(r, 300));
              completed++;
              const progress = {
                status: i === total ? 'completed' : 'running',
                total,
                completed,
                skipped,
                errors,
                currentFile: `dev-sample-${i}.jpg`,
                startedAt: Date.now(),
                updatedAt: Date.now(),
              };
              broadcast('thumbnail-progress', progress);
            }
            // final emit
            broadcast('thumbnail-progress', {
              status: 'completed',
              total: 5,
              completed,
              skipped,
              errors,
              updatedAt: Date.now(),
            });
          } catch (e) {
            broadcast('thumbnail-error', { error: e instanceof Error ? e.message : String(e) });
          }
        })();
        return { ok: true, started: true, simulated: true };
      }

      // production / normal flow: delegate to generator (non-blocking)
      thumbnailGenerator.generateThumbnails(arr).catch(e => {
        broadcast('thumbnail-error', { error: e instanceof Error ? e.message : String(e) });
      });
      return { ok: true, started: true };
    } catch (err) {
      console.error('[ipc] thumbnail-start error', err);
      return { ok: false, error: String(err) };
    }
  });

  ipcMain.handle('thumbnail-pause', async () => {
    try {
      thumbnailGenerator.pause();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  ipcMain.handle('thumbnail-resume', async () => {
    try {
      thumbnailGenerator.resume();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  ipcMain.handle('thumbnail-cancel', async () => {
    try {
      thumbnailGenerator.cancel();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  // get single thumbnail path
  ipcMain.handle('get-thumbnail-path', async (_evt, filePath: string) => {
    try {
      const p = await getCachedThumbnailPathFor(String(filePath));
      return { ok: true, path: p };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });
  // get multiple thumbnail paths (preserves order)
  ipcMain.handle('get-thumbnail-paths', async (_evt, filePaths: string[] = []) => {
    try {
      const arr = Array.isArray(filePaths) ? filePaths : [];
      const results = await Promise.all(arr.map(fp => getCachedThumbnailPathFor(String(fp))));
      return { ok: true, paths: results };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });
}
