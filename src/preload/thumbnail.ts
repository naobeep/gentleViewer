import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { pathToFileURL } from 'url';

const safeInvoke = async (channel: string, ...args: any[]) => {
  if (!ipcRenderer || typeof ipcRenderer.invoke !== 'function') {
    throw new Error(`ipcRenderer.invoke not available (channel: ${channel})`);
  }
  return ipcRenderer.invoke(channel, ...args);
};

const safeOn = (channel: string, cb: (data: any) => void) => {
  if (!ipcRenderer || typeof ipcRenderer.on !== 'function') {
    throw new Error(`ipcRenderer.on not available (channel: ${channel})`);
  }
  const listener = (_: IpcRendererEvent, data: any) => cb(data);
  ipcRenderer.on(channel, listener);
  return () => {
    try {
      ipcRenderer.removeListener(channel, listener);
    } catch {}
  };
};

// 最小限の安全な API（デバッグ用）
const expose = {
  // data / repo
  getTags: async () => await safeInvoke('get-tags'),
  getFiles: async (opts?: any) => await safeInvoke('get-files', opts),
  reindexFTS: async () => await safeInvoke('reindex-ft'),

  // migration / debug
  applyMigration: async (filePath: string) => await safeInvoke('apply-migration-file', filePath),
  runSql: async (sql: string) => {
    const res = await safeInvoke('run-sql', sql);
    return res;
  },

  // viewer / shell
  openFileExternally: async (filePath: string) =>
    await safeInvoke('open-file-externally', filePath),

  // ビューアを開く（'open-viewer' ハンドラがあれば使い、なければ 'open-file-externally' を試す）
  openViewer: async (filePath: string) => {
    try {
      return await safeInvoke('open-viewer', filePath);
    } catch (err) {
      // フォールバック
      try {
        return await safeInvoke('open-file-externally', filePath);
      } catch (err2) {
        const message = err2 && (err2 as any).message ? (err2 as any).message : String(err);
        throw new Error(message || 'openViewer failed');
      }
    }
  },

  // thumbnail events / progress (subscribe helpers)
  onThumbnailProgress: (cb: (data: any) => void) => safeOn('thumbnail-progress', cb),
  onThumbnailError: (cb: (data: any) => void) => safeOn('thumbnail-error', cb),

  // generic on/off
  on: (channel: string, cb: (data: any) => void) => safeOn(channel, cb),

  // simple ping for health check
  ping: async () => {
    try {
      return await safeInvoke('ping');
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },

  // フォルダスキャン（再帰）: window.electronAPI.scanFolder(path, { exts: [...] })
  scanFolder: async (dirPath: string, opts?: { exts?: string[] }) => {
    const res = await ipcRenderer.invoke('scan-folder', dirPath, opts || {});
    if (!res?.ok) throw new Error(res?.error ?? 'scan-folder failed');
    return res;
  },

  // ファイル配列を一括登録: window.electronAPI.scanFiles([path1, path2])
  scanFiles: async (paths: string[]) => {
    const res = await ipcRenderer.invoke('scan-files', paths);
    if (!res?.ok) throw new Error(res?.error ?? 'scan-files failed');
    return res;
  },

  // 検索 API を公開（main の 'search-files' ハンドラを呼ぶ）
  searchFiles: async (
    payload: {
      text?: string;
      includeTagIds?: string[];
      excludeTagIds?: string[];
      limit?: number;
      offset?: number;
    } = {}
  ) => {
    const res = await safeInvoke('search-files', payload);
    if (!res?.ok) throw new Error(res?.error ?? 'search-files failed');
    return res.data;
  },

  // サムネイル生成を開始（folder または paths を指定）
  startThumbnailGeneration: async (opts?: {
    folder?: string;
    paths?: string[];
    exts?: string[];
    limit?: number;
  }) => {
    const res = await safeInvoke('start-thumbnail-generation', opts || {});
    if (!res?.ok) throw new Error(res?.error ?? 'start-thumbnail-generation failed');
    return res;
  },

  generateThumbnails: async (opts?: any) => {
    const res = await safeInvoke('start-thumbnail-generation', opts || {});
    if (!res?.ok) throw new Error(res?.error ?? 'generate-thumbnails failed');
    return res;
  },

  createThumbnails: async (opts?: any) => {
    const res = await safeInvoke('start-thumbnail-generation', opts || {});
    if (!res?.ok) throw new Error(res?.error ?? 'create-thumbnails failed');
    return res;
  },

  // サムネイルの file:// URL を取得（main は生パスを返す想定）
  getThumbnailPath: async (filePath: string) => {
    const res = await safeInvoke('get-thumb-path', filePath);
    if (res?.ok && res.path) {
      try {
        let p = String(res.path);
        // if it's already a file:// or file:/// URL, parse and extract local path
        if (p.startsWith('file://')) {
          try {
            const u = new URL(p);
            p = u.pathname;
            // Windows: URL.pathname starts with a leading slash like /C:/...
            if (process.platform === 'win32' && p.startsWith('/')) p = p.slice(1);
          } catch {
            // fallback to stripping scheme
            p = p.replace(/^file:\/+/, '');
          }
        }
        // If we still have an odd leading slash on Windows, remove it
        if (process.platform === 'win32' && /^[\\/][A-Za-z]:/.test(p)) p = p.replace(/^[\\/]+/, '');
        return pathToFileURL(p).toString();
      } catch {
        return null;
      }
    }
    return null;
  },

  // 追加: 複数パスを一括で解決して { [path]: url|null } を返す
  getThumbnailPaths: async (paths: string[]) => {
    if (!Array.isArray(paths)) return {};
    const results: Record<string, string | null> = {};
    await Promise.all(
      paths.map(async p => {
        try {
          // まず短いハンドラでパス取得
          const res = await safeInvoke('get-thumb-path', p);
          let url: string | null = null;
          if (res?.ok && res.path) {
            // 同じロジック as getThumbnailPath: normalize/respect file:// or raw path
            try {
              let rp = String(res.path);
              if (rp.startsWith('file://')) {
                try {
                  const u = new URL(rp);
                  rp = u.pathname;
                  if (process.platform === 'win32' && rp.startsWith('/')) rp = rp.slice(1);
                } catch {
                  rp = rp.replace(/^file:\/+/, '');
                }
              }
              if (process.platform === 'win32' && /^[\\/][A-Za-z]:/.test(rp))
                rp = rp.replace(/^[\\/]+/, '');
              url = pathToFileURL(rp).toString();
            } catch {
              url = null;
            }
          } else {
            // フォールバックで base64 data を取得
            try {
              const dres = await safeInvoke('get-thumb-data', p);
              if (dres?.ok && dres.dataUrl) url = dres.dataUrl;
            } catch {}
          }
          results[p] = url;
        } catch {
          results[p] = null;
        }
      })
    );
    return results;
  },

  // 追加: thumbnail を base64 data URL で取得（file:// が使えない場合のフォールバック）
  getThumbnailData: async (filePath: string) => {
    const res = await safeInvoke('get-thumb-data', filePath);
    if (res?.ok) return res.dataUrl;
    return null;
  },
};

try {
  contextBridge.exposeInMainWorld('electronAPI', expose);
} catch (e) {
  // expose に失敗してもプロセスを止めない。Renderer 側で検出できるようログを出す。
  // eslint-disable-next-line no-console
  console.error('preload: exposeInMainWorld failed', e);
}
export {};
