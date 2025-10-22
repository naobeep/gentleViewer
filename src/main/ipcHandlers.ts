import { app, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import fsp from 'fs/promises';
import crypto from 'crypto';

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

  // tags など既存ハンドラ
  ipcMain.handle('tags.getAll', async () => {
    const store = await loadTagsStore();
    return store.tags;
  });
  ipcMain.handle('tags.create', async (_evt, payload: { name: string; color?: string }) => {
    const store = await loadTagsStore();
    const id = crypto.randomBytes(8).toString('hex');
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
          // 見つからなければデフォルト候補を最初の要素で指定（エラーメッセージ用）
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
          db.exec('BEGIN');
          if (opts?.force) {
            db.exec('DELETE FROM file_content_fts;');
            db.exec('INSERT INTO file_content_fts(rowid, content) SELECT id, content FROM files;');
          } else {
            db.exec(
              'INSERT INTO file_content_fts(rowid, content) SELECT id, content FROM files WHERE id NOT IN (SELECT rowid FROM file_content_fts);'
            );
          }
          db.exec('COMMIT');
          console.log('[main] reindex-ft: OK');
          return { ok: true };
        } catch (e) {
          try {
            db.exec('ROLLBACK');
          } catch {}
          console.error('[main] reindex-ft error', e);
          return { ok: false, error: String(e) };
        } finally {
          try {
            db.close();
          } catch {}
        }
      } catch (err) {
        console.error('[main] reindex-ft outer error', err);
        return { ok: false, error: String(err) };
      }
    });
    console.log('[main] reindex-ft handler registered (ipcHandlers)');
  } catch (e) {
    console.error('[main] failed to register reindex-ft handler (ipcHandlers)', e);
  }

  console.log('[main] registerIpcHandlers done');
}
