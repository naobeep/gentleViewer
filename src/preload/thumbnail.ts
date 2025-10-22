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

// ここで invoke を明示的に追加し、すべての API が値を return するようにする
const expose = {
  // 汎用 invoke（必須）
  invoke: (channel: string, ...args: any[]) => {
    return safeInvoke(channel, ...args);
  },

  // 追加: Renderer が期待している startThumbnailGeneration のラッパー
  // チャンネル名の違いに備えて複数の候補を試す（フォールバック）
  startThumbnailGeneration: async (opts?: any) => {
    const channels = [
      'start-thumbnail-generation',
      'startThumbnailGeneration',
      'generate-thumbnails',
    ];
    for (const ch of channels) {
      try {
        const res = await safeInvoke(ch, opts);
        // 成功したら結果を返す（undefined でも呼び出し自体は成功）
        return res;
      } catch (e) {
        // 次のチャンネルを試す
      }
    }
    throw new Error('startThumbnailGeneration: no ipc channel handled the request');
  },

  // data / repo
  getTags: async () => {
    return await safeInvoke('get-tags');
  },
  getFiles: async (opts?: any) => {
    return await safeInvoke('get-files', opts);
  },
  reindexFTS: async (opts?: any) => {
    return await safeInvoke('reindex-ft', opts);
  },

  // migration / debug
  applyMigration: async (filePath: string) => {
    return await safeInvoke('apply-migration-file', filePath);
  },
  runSql: async (sql: string) => {
    return await safeInvoke('run-sql', sql);
  },

  // viewer / shell
  openFileExternally: async (filePath: string) => {
    return await safeInvoke('open-file-externally', filePath);
  },
  openViewer: async (filePath: string) => {
    try {
      return await safeInvoke('open-viewer', filePath);
    } catch (err) {
      return await safeInvoke('open-file-externally', filePath);
    }
  },

  // thumbnail events / progress (subscribe helpers)
  onThumbnailProgress: (cb: (data: any) => void) => safeOn('thumbnail-progress', cb),
  onThumbnailError: (cb: (data: any) => void) => safeOn('thumbnail-error', cb),
  on: (channel: string, cb: (data: any) => void) => safeOn(channel, cb),

  // simple ping for health check
  ping: async () => {
    return await safeInvoke('ping');
  },

  // scan / files
  scanFolder: async (dirPath: string, opts?: any) => {
    const res = await safeInvoke('scan-folder', dirPath, opts || {});
    if (!res?.ok) throw new Error(res?.error ?? 'scan-folder failed');
    return res;
  },
  scanFiles: async (paths: string[]) => {
    const res = await safeInvoke('scan-files', paths);
    if (!res?.ok) throw new Error(res?.error ?? 'scan-files failed');
    return res;
  },

  // thumbnail path / data helpers (略：既存ロジックをそのまま残す)
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

// exposeInMainWorld に失敗した場合は globalThis にマージするフォールバックを入れる
try {
  contextBridge.exposeInMainWorld('electronAPI', expose);
  // eslint-disable-next-line no-console
  console.log('[preload-src] electronAPI exposed (src/preload/thumbnail.ts)');
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('[preload-src] exposeInMainWorld failed, merging to globalThis.electronAPI', e);
  try {
    const existing: any = (globalThis as any).electronAPI || {};
    Object.assign(existing, expose);
    (globalThis as any).electronAPI = existing;
    // eslint-disable-next-line no-console
    console.log(
      '[preload-src] electronAPI merged to globalThis.electronAPI (src/preload/thumbnail.ts)'
    );
  } catch (e2) {
    // eslint-disable-next-line no-console
    console.error('[preload-src] failed to merge electronAPI to global', e2);
  }
}
export {};
