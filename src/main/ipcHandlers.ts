import { app, ipcMain, BrowserWindow } from 'electron';
import { thumbnailGenerator } from './services/thumbnail-generator';
import { loadThumbnailConfig, saveThumbnailConfig } from './services/thumbnailConfig';
import { runWithConcurrency } from './services/promisePool';
import path from 'path';
import fs from 'fs';
import * as nodeCrypto from 'crypto';
import { listArchive, extractArchive } from './archive';
import { pruneCache, getCacheInfo, loadPolicy, savePolicy } from './services/cache';

const fsp = fs.promises;

console.log('[main] ipcHandlers module load');

type Tag = { id: string; name: string; color?: string };

async function loadTagsStore(): Promise<{ tags: Tag[]; fileTags: Record<string, string[]> }> {
  try {
    const userData = app.getPath ? app.getPath('userData') : path.resolve('.');
    const tagsFile = path.join(userData, 'tags.json');
    const raw = await fsp
      .readFile(tagsFile, 'utf8')
      .catch(() => JSON.stringify({ tags: [], fileTags: {} }));
    return JSON.parse(raw);
  } catch {
    return { tags: [], fileTags: {} };
  }
}
async function saveTagsStore(store: { tags: Tag[]; fileTags: Record<string, string[]> }) {
  const userData = app.getPath ? app.getPath('userData') : path.resolve('.');
  const tagsFile = path.join(userData, 'tags.json');
  await fsp.mkdir(path.dirname(tagsFile), { recursive: true });
  await fsp.writeFile(tagsFile, JSON.stringify(store, null, 2), 'utf8');
}

export function registerIpcHandlers() {
  console.log('[main] registerIpcHandlers start');

  // --- サムネイル設定取得 / 保存 ハンドラ ---
  try {
    ipcMain.removeHandler('thumbnail.getConfig');
  } catch {}
  ipcMain.handle('thumbnail.getConfig', async () => {
    try {
      const cfg = await loadThumbnailConfig(app.getPath('userData'));
      return { ok: true, config: cfg };
    } catch (err) {
      console.error('[ipc] thumbnail.getConfig error', err);
      return { ok: false, error: String(err) };
    }
  });

  try {
    ipcMain.removeHandler('thumbnail.setConfig');
  } catch {}
  ipcMain.handle('thumbnail.setConfig', async (_evt, cfg: any) => {
    try {
      await saveThumbnailConfig(app.getPath('userData'), cfg);
      return { ok: true };
    } catch (err) {
      console.error('[ipc] thumbnail.setConfig error', err);
      return { ok: false, error: String(err) };
    }
  });

  // --- 並列生成を管理して開始するハンドラ（レンダーの ThumbnailSettings から呼ばれる想定） ---
  try {
    ipcMain.removeHandler('thumbnail.startManaged');
  } catch {}
  ipcMain.handle('thumbnail.startManaged', async (_evt, paths: string[] = [], opts: any = {}) => {
    try {
      const arr = Array.isArray(paths) ? paths.filter(p => !!p) : [];
      // 保存された設定があればマージ
      let curCfg: any = {};
      try {
        curCfg = await loadThumbnailConfig(app.getPath('userData'));
      } catch {
        curCfg = {};
      }
      const concurrency = Number(opts?.concurrency ?? curCfg?.concurrency ?? 2);

      // thumbnailGenerator が内部フィールドで並列度を管理している場合に一時的に設定（既存実装に依存）
      try {
        if (typeof (thumbnailGenerator as any)._concurrency === 'number') {
          (thumbnailGenerator as any)._concurrency = concurrency;
        }
      } catch {}

      // 非同期で生成を開始（呼び出し元は即座に戻る）
      thumbnailGenerator.generateThumbnails(arr).catch(err => {
        console.error('[thumbnail] generateThumbnails failed', err);
      });

      // optionally persist concurrency to config
      try {
        await saveThumbnailConfig(app.getPath('userData'), { ...(curCfg || {}), concurrency });
      } catch {}

      return { ok: true, started: true, count: arr.length };
    } catch (err) {
      console.error('[ipc] thumbnail.startManaged error', err);
      return { ok: false, error: String(err) };
    }
  });

  // cache handlers
  try {
    ipcMain.handle('cache.getInfo', async () => {
      try {
        const userData = app.getPath ? app.getPath('userData') : process.cwd();
        return { ok: true, info: await getCacheInfo(userData) };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    });

    ipcMain.handle('cache.clear', async () => {
      try {
        const userData = app.getPath ? app.getPath('userData') : process.cwd();
        return await clearCache(userData);
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    });

    ipcMain.handle('cache.prune', async (evt, opts?: { force?: boolean }) => {
      try {
        const userData = app.getPath ? app.getPath('userData') : process.cwd();
        const sender = evt && (evt as any).sender;
        // progress callback -> send to renderer(s) that initiated invoke
        const progressCb = (p: any) => {
          try {
            if (sender && typeof sender.send === 'function') {
              sender.send('cache-prune-progress', p);
            } else {
              // fallback broadcast
              for (const w of BrowserWindow.getAllWindows()) {
                try {
                  w.webContents.send('cache-prune-progress', p);
                } catch {}
              }
            }
          } catch {}
        };
        const result = await pruneCache(userData, opts, progressCb);
        // final info after pruning
        const info = await getCacheInfo(userData);
        progressCb({
          phase: 'done',
          remainingBytes: result.totalRemainingBytes,
          totalFiles: info.fileCount,
        });
        return result;
      } catch (e) {
        try {
          if (evt && (evt as any).sender)
            (evt as any).sender.send('cache-prune-progress', {
              phase: 'error',
              message: String(e),
            });
        } catch {}
        return { ok: false, error: String(e) };
      }
    });

    ipcMain.handle('cache.getPolicy', async () => {
      try {
        const userData = app.getPath ? app.getPath('userData') : process.cwd();
        const policy = loadPolicy(userData);
        return { ok: true, policy };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    });

    ipcMain.handle(
      'cache.setPolicy',
      async (_evt, policy: { maxSizeMB?: number; ttlDays?: number }) => {
        try {
          const userData = app.getPath ? app.getPath('userData') : process.cwd();
          const cur = loadPolicy(userData);
          const next = {
            maxSizeBytes:
              typeof policy.maxSizeMB === 'number'
                ? Math.floor(policy.maxSizeMB * 1024 * 1024)
                : cur.maxSizeBytes,
            ttlSeconds:
              typeof policy.ttlDays === 'number'
                ? Math.floor(policy.ttlDays * 24 * 3600)
                : cur.ttlSeconds,
          };
          const ok = savePolicy(userData, next);
          return ok ? { ok: true, policy: next } : { ok: false, error: 'failed to save policy' };
        } catch (e) {
          return { ok: false, error: String(e) };
        }
      }
    );
  } catch (e) {
    console.error('[main] cache handlers registration failed', e);
  }
  // tags など既存ハンドラ
  ipcMain.handle('tags.getAll', async () => {
    const store = await loadTagsStore();
    return store.tags;
  });
  ipcMain.handle('tags.create', async (_evt, payload: { name: string; color?: string }) => {
    const store = await loadTagsStore();
    const id = nodeCrypto.randomBytes(8).toString('hex');
    const t: Tag = { id, name: payload.name, color: payload.color };
    store.tags.push(t);
    await saveTagsStore(store);
    return t;
  });
  ipcMain.handle('tags.getForFile', async (_evt, filePath: string) => {
    const store = await loadTagsStore();
    return store.fileTags[filePath] || [];
  });
  ipcMain.handle('tags.setForFile', async (_evt, filePath: string, tagIds: string[]) => {
    const store = await loadTagsStore();
    store.fileTags[filePath] = Array.isArray(tagIds) ? tagIds : [];
    await saveTagsStore(store);
    return true;
  });

  // ping (必須)
  try {
    ipcMain.handle('ping', async () => 'pong');
    console.log('[main] ping handler registered (ipcHandlers)');
  } catch (e) {
    console.error('[main] failed to register ping handler (ipcHandlers)', e);
  }

  // reindex-ft (FTS 再構築)
  try {
    ipcMain.handle('reindex-ft', async (_evt, opts?: { force?: boolean }) => {
      console.log('[main] reindex-ft handler called', opts);
      const sendReindexDone = (payload: any) => {
        try {
          for (const w of BrowserWindow.getAllWindows()) {
            try {
              w.webContents.send('reindex-done', payload);
            } catch {}
          }
        } catch {}
      };
      try {
        const userData = app.getPath ? app.getPath('userData') : process.cwd();

        // 複数のファイル名候補を試して既存の DB を探す（大小ハイフン差などを吸収）
        const dbCandidates = [
          'gentleviewer.sqlite3',
          'gentle-viewer.sqlite3',
          'gentleViewer.sqlite3',
          'gentleViewer.sqlite',
        ];
        let dbPath = dbCandidates.map(n => path.join(userData, n)).find(p => fs.existsSync(p));
        if (!dbPath) {
          dbPath = path.join(userData, dbCandidates[0]);
          console.warn('[main] reindex-ft: DB not found, tried candidates', dbCandidates);
          return { ok: false, error: 'DB not found', path: dbPath };
        }

        let BetterSqlite3: any;
        try {
          BetterSqlite3 = require('better-sqlite3');
        } catch (e) {
          console.error('[main] reindex-ft: better-sqlite3 require failed', e);
          return { ok: false, error: 'better-sqlite3 not available: ' + String(e) };
        }

        const db = new BetterSqlite3(dbPath);
        try {
          db.exec('PRAGMA foreign_keys = ON;');

          // ensure FTS table and triggers exist (migrations might not have run / DB created earlier)
          try {
            db.exec(`
              CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
                path, name, tokenize='unicode61', content=''
              );

              CREATE TRIGGER IF NOT EXISTS files_ai AFTER INSERT ON files BEGIN
                INSERT OR REPLACE INTO files_fts(rowid, path, name) VALUES (new.rowid, new.path, new.name);
              END;
              CREATE TRIGGER IF NOT EXISTS files_au AFTER UPDATE ON files BEGIN
                INSERT OR REPLACE INTO files_fts(rowid, path, name) VALUES (new.rowid, new.path, new.name);
              END;
              CREATE TRIGGER IF NOT EXISTS files_ad AFTER DELETE ON files BEGIN
                DELETE FROM files_fts WHERE rowid = old.rowid;
              END;
            `);
          } catch (e) {
            console.warn('[main] reindex-ft: failed to ensure files_fts/triggers exist', e);
            // 続行して再構築を試みる
          }

          // 注意: 外側での BEGIN を行わず、各ブランチ内でトランザクションを管理する（多重トランザクション回避）
          if (opts?.force) {
            // contentless FTS cannot be DELETE'd — drop & recreate then populate
            try {
              db.exec('DROP TABLE IF EXISTS files_fts;');
            } catch {}
            db.exec(`
              CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
                path, name, tokenize='unicode61', content=''
              );
            `);
            db.exec('BEGIN');
            db.exec(
              'INSERT INTO files_fts(rowid, path, name) SELECT rowid, path, name FROM files;'
            );
            db.exec('COMMIT');
          } else {
            // try incremental insert first; if it fails (e.g. table/schema mismatch), recreate and populate
            try {
              db.exec('BEGIN');
              db.exec(
                'INSERT INTO files_fts(rowid, path, name) SELECT rowid, path, name FROM files WHERE rowid NOT IN (SELECT rowid FROM files_fts);'
              );
              db.exec('COMMIT');
            } catch (e) {
              try {
                db.exec('ROLLBACK');
              } catch {}
              // fallback: drop & recreate and populate
              try {
                db.exec('DROP TABLE IF EXISTS files_fts;');
                db.exec(`
                  CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
                    path, name, tokenize='unicode61', content=''
                  );
                `);
                db.exec('BEGIN');
                db.exec(
                  'INSERT INTO files_fts(rowid, path, name) SELECT rowid, path, name FROM files;'
                );
                db.exec('COMMIT');
              } catch (err2) {
                try {
                  db.exec('ROLLBACK');
                } catch {}
                throw err2;
              }
            }
          }
          console.log('[main] reindex-ft: OK');
          sendReindexDone({ ok: true });
          return { ok: true };
        } catch (e) {
          try {
            db.exec('ROLLBACK');
          } catch {}
          console.error('[main] reindex-ft error', e);
          sendReindexDone({ ok: false, error: String(e) });
          return { ok: false, error: String(e) };
        } finally {
          try {
            db.close();
          } catch {}
        }
      } catch (err) {
        console.error('[main] reindex-ft outer error', err);
        sendReindexDone({ ok: false, error: String(err) });
        return { ok: false, error: String(err) };
      }
    });
    console.log('[main] reindex-ft handler registered (ipcHandlers)');
  } catch (e) {
    console.error('[main] failed to register reindex-ft handler (ipcHandlers)', e);
  }

  // PDF データ取得ハンドラ（preload 経由で呼ぶ）
  try {
    ipcMain.removeHandler('pdf.getData');
  } catch {}
  ipcMain.handle('pdf.getData', async (_evt, filePath: string) => {
    try {
      const buf = await fs.promises.readFile(filePath);
      return { ok: true, data: buf };
    } catch (err) {
      console.error('[ipc] pdf.getData error', err);
      return { ok: false, error: String(err) };
    }
  });

  // 既存ハンドラ群の後に追加してください
  try {
    ipcMain.handle('archive.list', async (_evt, filePath: string) => {
      try {
        return { ok: true, entries: await listArchive(filePath) };
      } catch (e) {
        console.error('[main] archive.list error', e);
        return { ok: false, error: String(e) };
      }
    });

    ipcMain.handle('archive.extract', async (_evt, filePath: string, destDir?: string) => {
      try {
        return await extractArchive(filePath, destDir);
      } catch (e) {
        console.error('[main] archive.extract error', e);
        return { ok: false, error: String(e) };
      }
    });

    console.info('[main] archive IPC handlers registered');
  } catch (e) {
    console.error('[main] failed to register archive IPC handlers', e);
  }

  console.log('[main] registerIpcHandlers done');
}
function clearCache(userData: string): any {
  return (async () => {
    try {
      // pruneCache を force で実行してキャッシュを削減（完全クリアに近い動作）
      const result = await pruneCache(userData, { force: true }, () => {});
      // 最終的な情報を返す
      const info = await getCacheInfo(userData);
      return { ok: true, result, info };
    } catch (e) {
      console.error('[main] clearCache error', e);
      return { ok: false, error: String(e) };
    }
  })();
}
