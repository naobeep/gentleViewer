import { ipcMain, BrowserWindow, shell } from 'electron';
import * as filesRepo from '../repositories/filesRepository';
import * as savedRepo from '../repositories/savedSearchRepository';
import * as tagsRepo from '../repositories/tagsRepository';
import { initDb } from '../services/db';

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
    // tags: CRUD / file-tag
    'get-tags',
    'create-tag',
    'delete-tag',
    'add-tag-to-file',
    'remove-tag-from-file',
    'list-tags-for-file',
    'search-files',
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

  // tags: CRUD / file-tag
  try {
    ipcMain.removeHandler('get-tags');
  } catch {}
  ipcMain.handle('get-tags', async () => {
    try {
      return { ok: true, data: tagsRepo.listTags() };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  try {
    ipcMain.removeHandler('create-tag');
  } catch {}
  ipcMain.handle(
    'create-tag',
    async (_evt, payload: { name: string; color?: string; description?: string }) => {
      try {
        const rec = tagsRepo.createTag(payload.name, payload.color, payload.description);
        return { ok: true, data: rec };
      } catch (err) {
        return { ok: false, error: String(err) };
      }
    }
  );

  try {
    ipcMain.removeHandler('delete-tag');
  } catch {}
  ipcMain.handle('delete-tag', async (_evt, id: string) => {
    try {
      tagsRepo.deleteTag(id);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  try {
    ipcMain.removeHandler('add-tag-to-file');
  } catch {}
  ipcMain.handle('add-tag-to-file', async (_evt, fileId: string, tagId: string) => {
    try {
      tagsRepo.addTagToFile(fileId, tagId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  try {
    ipcMain.removeHandler('remove-tag-from-file');
  } catch {}
  ipcMain.handle('remove-tag-from-file', async (_evt, fileId: string, tagId: string) => {
    try {
      tagsRepo.removeTagFromFile(fileId, tagId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  try {
    ipcMain.removeHandler('list-tags-for-file');
  } catch {}
  ipcMain.handle('list-tags-for-file', async (_evt, fileId: string) => {
    try {
      const rows = tagsRepo.listTagsForFile(fileId);
      return { ok: true, data: rows };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  // search-files: simple FTS + tag filter
  try {
    ipcMain.removeHandler('search-files');
  } catch {}
  ipcMain.handle(
    'search-files',
    async (
      _evt,
      payload: {
        text?: string;
        includeTagIds?: string[];
        excludeTagIds?: string[];
        limit?: number;
        offset?: number;
      } = {}
    ) => {
      try {
        const db = initDb();
        const text = payload.text ? String(payload.text).trim() : '';
        const include = Array.isArray(payload.includeTagIds) ? payload.includeTagIds : [];
        const exclude = Array.isArray(payload.excludeTagIds) ? payload.excludeTagIds : [];
        const limit = Number(payload.limit) || 100;
        const offset = Number(payload.offset) || 0;

        let baseSql = `SELECT f.* FROM files f`;
        const joins: string[] = [];
        const wheres: string[] = [];
        const params: any[] = [];

        if (text) {
          joins.push(`INNER JOIN files_fts ft ON ft.rowid = f.rowid OR ft.name = f.name`);
          wheres.push(`files_fts MATCH ?`);
          params.push(text + '*');
        }

        if (include.length > 0) {
          joins.push(
            `INNER JOIN file_tags fit_in ON fit_in.file_id = f.id AND fit_in.tag_id IN (${include.map(() => '?').join(',')})`
          );
          params.push(...include);
        }

        if (exclude.length > 0) {
          wheres.push(
            `f.id NOT IN (SELECT file_id FROM file_tags WHERE tag_id IN (${exclude.map(() => '?').join(',')}))`
          );
          params.push(...exclude);
        }

        const sql = `${baseSql} ${joins.join(' ')} ${wheres.length ? 'WHERE ' + wheres.join(' AND ') : ''} ORDER BY f.updated_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);
        const rows = db.prepare(sql).all(...params);
        return { ok: true, data: rows };
      } catch (err) {
        return { ok: false, error: String(err) };
      }
    }
  );

  // ファイルを既定アプリで開く（冪等登録）
  try {
    ipcMain.removeHandler('open-file-default');
  } catch {}
  ipcMain.handle('open-file-default', async (_evt, filePath: string) => {
    try {
      if (!filePath) return { ok: false, error: 'no path' };
      const res = await shell.openPath(String(filePath));
      // shell.openPath returns empty string on success
      if (typeof res === 'string' && res.length > 0) {
        return { ok: false, error: res };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });
}
