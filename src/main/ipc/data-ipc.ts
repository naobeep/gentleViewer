import { ipcMain, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { initDb } from '../services/db';
import { getCachedThumbnailPathFor, thumbnailGenerator } from '../services/thumbnail-generator';
import crypto from 'crypto';

/* --- 追加: シンプルな repo 実装（runtime 用） --- */
const filesRepo = {
  listFiles: (limit = 100, offset = 0) => {
    const db = initDb();
    return db
      .prepare('SELECT * FROM files ORDER BY updated_at DESC LIMIT ? OFFSET ?')
      .all(limit, offset);
  },
  getFileById: (id: string) => {
    const db = initDb();
    return db.prepare('SELECT * FROM files WHERE id = ?').get(id);
  },
  getFileByPath: (p: string) => {
    const db = initDb();
    return db.prepare('SELECT * FROM files WHERE path = ?').get(p);
  },
  upsertFile: (file: any) => {
    const db = initDb();
    const now = Math.floor(Date.now() / 1000);
    const id =
      file.id || (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));
    // try update first
    const upd = db
      .prepare(
        `UPDATE files SET path = ?, name = ?, extension = ?, type = ?, size = ?, updated_at = ? WHERE id = ?`
      )
      .run(
        file.path || null,
        file.name || null,
        file.extension || null,
        file.type || null,
        file.size || null,
        now,
        id
      );
    if (upd.changes === 0) {
      db.prepare(
        `INSERT INTO files (id, path, name, extension, type, size, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        file.path || null,
        file.name || null,
        file.extension || null,
        file.type || null,
        file.size || null,
        now,
        now
      );
    }
    return db.prepare('SELECT * FROM files WHERE id = ?').get(id);
  },
  deleteFile: (id: string) => {
    const db = initDb();
    db.prepare('DELETE FROM files WHERE id = ?').run(id);
  },
};

const savedRepo = {
  listSavedSearches: () => {
    const db = initDb();
    if (
      !db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='saved_searches'")
        .get()
    )
      return [];
    return db.prepare('SELECT * FROM saved_searches ORDER BY created_at DESC').all();
  },
  createSavedSearch: (payload: any) => {
    const db = initDb();
    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`INSERT INTO saved_searches (id, name, query, created_at) VALUES (?, ?, ?, ?)`).run(
      id,
      payload.name || 'unnamed',
      payload.query || '',
      now
    );
    return db.prepare('SELECT * FROM saved_searches WHERE id = ?').get(id);
  },
  updateSavedSearch: (id: string, patch: any) => {
    const db = initDb();
    db.prepare(
      `UPDATE saved_searches SET name = COALESCE(?, name), query = COALESCE(?, query) WHERE id = ?`
    ).run(patch.name, patch.query, id);
    return db.prepare('SELECT * FROM saved_searches WHERE id = ?').get(id);
  },
  deleteSavedSearch: (id: string) => {
    const db = initDb();
    db.prepare('DELETE FROM saved_searches WHERE id = ?').run(id);
  },
  incrementExecutionCount: (id: string) => {
    const db = initDb();
    db.prepare('UPDATE saved_searches SET exec_count = COALESCE(exec_count,0)+1 WHERE id = ?').run(
      id
    );
    return db.prepare('SELECT * FROM saved_searches WHERE id = ?').get(id);
  },
};

const tagsRepo = {
  listTags: () => {
    const db = initDb();
    return db.prepare('SELECT * FROM tags ORDER BY name').all();
  },
  createTag: (name: string, color?: string, description?: string) => {
    const db = initDb();
    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const now = Math.floor(Date.now() / 1000);
    db.prepare(
      'INSERT INTO tags (id, name, color, description, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(id, name, color || null, description || null, now);
    return db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
  },
  deleteTag: (id: string) => {
    const db = initDb();
    db.prepare('DELETE FROM tags WHERE id = ?').run(id);
  },
  addTagToFile: (fileId: string, tagId: string) => {
    const db = initDb();
    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const now = Math.floor(Date.now() / 1000);
    db.prepare(
      'INSERT OR IGNORE INTO file_tags (id, file_id, tag_id, created_at) VALUES (?, ?, ?, ?)'
    ).run(id, fileId, tagId, now);
  },
  removeTagFromFile: (fileId: string, tagId: string) => {
    const db = initDb();
    db.prepare('DELETE FROM file_tags WHERE file_id = ? AND tag_id = ?').run(fileId, tagId);
  },
  listTagsForFile: (fileId: string) => {
    const db = initDb();
    return db
      .prepare(
        'SELECT t.* FROM tags t INNER JOIN file_tags ft ON ft.tag_id = t.id WHERE ft.file_id = ?'
      )
      .all(fileId);
  },
};
/* --- end repo impl --- */

/**
 * データ層用の IPC ハンドラを登録する（冪等: 既存ハンドラを先に削除）
 */
function registerDataIpc() {
  // idempotent: remove existing handlers before registering
  const channels = [
    'files:list',
    'files:getById',
    'files:getByPath',
    'files:upsert',
    'files:delete',
    'saved:list',
    'saved:create',
    'saved:update',
    'saved:delete',
    'saved:incExec',
    'tags:list',
    'tags:create',
    'tags:delete',
    'tags:addToFile',
    'tags:removeFromFile',
    'tags:listForFile',
    'get-files',
    'get-tags',
    'search-files',
  ];
  for (const ch of channels) {
    try {
      ipcMain.removeHandler(ch);
    } catch {}
  }

  ipcMain.handle('files:list', (_ev, limit = 100, offset = 0) =>
    filesRepo.listFiles(limit, offset)
  );
  ipcMain.handle('files:getById', (_ev, id: string) => filesRepo.getFileById(id));
  ipcMain.handle('files:getByPath', (_ev, p: string) => filesRepo.getFileByPath(p));
  ipcMain.handle('files:upsert', (_ev, file: any) => filesRepo.upsertFile(file));
  ipcMain.handle('files:delete', (_ev, id: string) => filesRepo.deleteFile(id));

  ipcMain.handle('saved:list', () => savedRepo.listSavedSearches());
  ipcMain.handle('saved:create', (_ev, payload: any) => savedRepo.createSavedSearch(payload));
  ipcMain.handle('saved:update', (_ev, id: string, patch: any) =>
    savedRepo.updateSavedSearch(id, patch)
  );
  ipcMain.handle('saved:delete', (_ev, id: string) => savedRepo.deleteSavedSearch(id));
  ipcMain.handle('saved:incExec', (_ev, id: string) => savedRepo.incrementExecutionCount(id));

  ipcMain.handle('tags:list', () => tagsRepo.listTags());
  ipcMain.handle('tags:create', (_ev, name: string, color?: string, description?: string) =>
    tagsRepo.createTag(name, color, description)
  );
  ipcMain.handle('tags:delete', (_ev, id: string) => tagsRepo.deleteTag(id));
  ipcMain.handle('tags:addToFile', (_ev, fileId: string, tagId: string) =>
    tagsRepo.addTagToFile(fileId, tagId)
  );
  ipcMain.handle('tags:removeFromFile', (_ev, fileId: string, tagId: string) =>
    tagsRepo.removeTagFromFile(fileId, tagId)
  );

  // 名前付きハンドラを確実に登録する関数（既存の registerDataIpc がある場合は統合してください）
  try {
    ipcMain.removeHandler('get-files');
  } catch {}
  ipcMain.handle('get-files', async (_evt, opts: any = {}) => {
    try {
      const limit = Number(opts?.limit) || 100;
      const offset = Number(opts?.offset) || 0;
      const rows = filesRepo.listFiles(limit, offset);
      return { ok: true, data: rows };
    } catch (err) {
      console.error('[ipc] get-files error', err);
      return { ok: false, error: String(err) };
    }
  });

  try {
    ipcMain.removeHandler('get-tags');
  } catch {}
  ipcMain.handle('get-tags', async () => {
    try {
      const rows = tagsRepo.listTags();
      return { ok: true, data: rows };
    } catch (err) {
      console.error('[ipc] get-tags error', err);
      return { ok: false, error: String(err) };
    }
  });

  try {
    ipcMain.removeHandler('search-files');
  } catch {}
  ipcMain.handle('search-files', async (_evt, payload: any = {}) => {
    try {
      const text = String(payload?.text || '').trim();
      const limit = Number(payload?.limit) || 50;
      const db = initDb();
      if (!text) {
        const rows = filesRepo.listFiles(limit, 0);
        return { ok: true, data: rows };
      }
      // simple FTS query (escape handled by prepared statement)
      const rows = db
        .prepare(
          `SELECT f.* FROM files f JOIN files_fts ft ON ft.rowid = f.rowid WHERE files_fts MATCH ? LIMIT ?`
        )
        .all(text, limit);
      return { ok: true, data: rows };
    } catch (err) {
      console.error('[ipc] search-files error', err);
      return { ok: false, error: String(err) };
    }
  });

  // run-sql: 任意の SQL を実行（開発用）
  try {
    ipcMain.removeHandler('run-sql');
  } catch {}
  ipcMain.handle('run-sql', async (_evt, sql: string) => {
    try {
      if (!sql || typeof sql !== 'string') return { ok: false, error: 'invalid sql' };
      const db = initDb();
      const s = sql.trim();
      // SELECT 判定
      if (/^\s*select/i.test(s)) {
        const rows = db.prepare(s).all();
        return { ok: true, data: rows };
      } else {
        const info = db.prepare(s).run();
        return { ok: true, info };
      }
    } catch (err) {
      console.error('[ipc] run-sql error', err);
      return { ok: false, error: String(err) };
    }
  });

  // scan-folder: 指定フォルダを再帰スキャンして files テーブルへ登録（簡易）
  try {
    ipcMain.removeHandler('scan-folder');
  } catch {}
  ipcMain.handle('scan-folder', async (_evt, folder: string, opts: any = {}) => {
    try {
      if (!folder || typeof folder !== 'string') return { ok: false, error: 'invalid folder' };
      const root = path.resolve(folder);
      if (!fs.existsSync(root) || !fs.statSync(root).isDirectory())
        return { ok: false, error: 'not a directory' };

      const allowedExts = Array.isArray(opts.exts)
        ? opts.exts.map((e: string) => e.toLowerCase())
        : null;
      const db = initDb();
      const insertStmt = db.prepare(
        `INSERT OR REPLACE INTO files (id, path, name, extension, type, size, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM files WHERE path = ?), ?), ?)`
      );

      const results: { inserted: number; skipped: number; total: number } = {
        inserted: 0,
        skipped: 0,
        total: 0,
      };

      const walk = (p: string) => {
        for (const name of fs.readdirSync(p)) {
          const full = path.join(p, name);
          try {
            const st = fs.statSync(full);
            if (st.isDirectory()) {
              walk(full);
              continue;
            }
            if (!st.isFile()) continue;
            const ext = path.extname(name).toLowerCase();
            if (allowedExts && !allowedExts.includes(ext)) {
              results.skipped++;
              continue;
            }
            results.total++;
            const id = require('crypto').randomUUID
              ? require('crypto').randomUUID()
              : require('crypto').randomBytes(16).toString('hex');
            const now = Math.floor(Date.now() / 1000);
            insertStmt.run(id, full, name, ext, null, st.size, full, now, now);
            results.inserted++;
          } catch (e) {
            // ignore individual file errors
          }
        }
      };

      walk(root);
      return { ok: true, ...results };
    } catch (err) {
      console.error('[ipc] scan-folder error', err);
      return { ok: false, error: String(err) };
    }
  });

  // --- 互換ハンドラ（preload/renderer が期待している短縮名に対応） ---
  try {
    ipcMain.removeHandler('get-thumb-path');
  } catch {}
  ipcMain.handle('get-thumb-path', async (_evt, filePath: string) => {
    try {
      const p = await getCachedThumbnailPathFor(String(filePath));
      if (!p) return { ok: false, error: 'not found' };
      // return plain filesystem path (preload will convert to file:// once)
      return { ok: true, path: p };
    } catch (err) {
      console.error('[ipc] get-thumb-path error', err);
      return { ok: false, error: String(err) };
    }
  });

  try {
    ipcMain.removeHandler('get-thumb-data');
  } catch {}
  ipcMain.handle('get-thumb-data', async (_evt, filePath: string) => {
    try {
      const p = await getCachedThumbnailPathFor(String(filePath));
      if (!p) return { ok: false, error: 'not found' };
      const buf = fs.readFileSync(p);
      const ext = path.extname(p).toLowerCase();
      const mime =
        ext === '.png'
          ? 'image/png'
          : ext === '.jpg' || ext === '.jpeg'
            ? 'image/jpeg'
            : 'application/octet-stream';
      const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
      return { ok: true, dataUrl };
    } catch (err) {
      console.error('[ipc] get-thumb-data error', err);
      return { ok: false, error: String(err) };
    }
  });

  // --- start-thumbnail-generation の実ロジックを切り出し ---
  const startThumbnailGenerationImpl = async (opts: any = {}) => {
    try {
      let list: string[] = [];
      if (Array.isArray(opts?.paths) && opts.paths.length) {
        list = opts.paths.map(String);
      } else if (typeof opts?.folder === 'string' && opts.folder) {
        const root = path.resolve(String(opts.folder));
        if (fs.existsSync(root) && fs.statSync(root).isDirectory()) {
          const walk: string[] = [];
          const scan = (p: string) => {
            for (const name of fs.readdirSync(p)) {
              const full = path.join(p, name);
              try {
                const st = fs.statSync(full);
                if (st.isDirectory()) {
                  scan(full);
                  continue;
                }
                if (!st.isFile()) continue;
                walk.push(full);
              } catch {}
            }
          };
          scan(root);
          list = walk;
        }
      }

      if (list.length === 0) {
        const rows = filesRepo.listFiles(Number(opts?.limit) || 500, 0);
        list = rows.map((r: any) => r.path).filter(Boolean);
      }

      // 非同期で生成を開始
      thumbnailGenerator.generateThumbnails(list).catch(err => {
        console.error('[thumbnail] generation failed', err);
      });

      return { ok: true, started: true, count: list.length };
    } catch (err) {
      console.error('[ipc] start-thumbnail-generation error', err);
      return { ok: false, error: String(err) };
    }
  };

  // --- ハンドラ登録: 元の start-thumbnail-generation は impl を呼ぶ ---
  try {
    ipcMain.removeHandler('start-thumbnail-generation');
  } catch {}
  ipcMain.handle('start-thumbnail-generation', async (_evt, opts: any = {}) =>
    startThumbnailGenerationImpl(opts)
  );

  // --- エイリアスは ipcMain.invoke を使わず impl を直接呼ぶ ---
  try {
    ipcMain.removeHandler('generate-thumbnails');
  } catch {}
  ipcMain.handle('generate-thumbnails', async (_evt, opts: any) =>
    startThumbnailGenerationImpl(opts)
  );

  try {
    ipcMain.removeHandler('create-thumbnails');
  } catch {}
  ipcMain.handle('create-thumbnails', async (_evt, opts: any) =>
    startThumbnailGenerationImpl(opts)
  );
}

// デフォルトエクスポートも出す
export { registerDataIpc };
export default registerDataIpc;
