import { contextBridge, ipcRenderer } from 'electron';

const expose = {
  // 汎用 invoke
  invoke: (channel: string, ...args: any[]) => {
    return ipcRenderer.invoke(channel, ...args);
  },

  // 互換 / 個別 API
  ping: () => {
    return ipcRenderer.invoke('ping');
  },
  reindexFTS: (opts?: { force?: boolean }) => {
    return ipcRenderer.invoke('reindex-ft', opts);
  },

  // ファイル操作 / タグ等（必要に応じ追加）
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  readHead: (filePath: string, length?: number) =>
    ipcRenderer.invoke('read-head', filePath, length),
  getFileStat: (filePath: string) => ipcRenderer.invoke('get-file-stat', filePath),
  getThumbnailPath: (filePath: string) => ipcRenderer.invoke('get-thumbnail-path', filePath),
  getTags: () => ipcRenderer.invoke('tags.getAll'),
  createTag: (payload: any) => ipcRenderer.invoke('tags.create', payload),
  updateTag: (id: string, payload: any) => ipcRenderer.invoke('tags.update', id, payload),
  deleteTag: (id: string) => ipcRenderer.invoke('tags.delete', id),
  getFileTags: (filePath: string) => ipcRenderer.invoke('tags.getForFile', filePath),
  setFileTags: (filePath: string, tagIds: string[]) =>
    ipcRenderer.invoke('tags.setForFile', filePath, tagIds),
};

try {
  contextBridge.exposeInMainWorld('electronAPI', expose);
  console.log('[preload] electronAPI exposed (src)');
} catch (e) {
  console.warn('[preload] exposeInMainWorld failed, merging to globalThis.electronAPI', e);
  try {
    const existing: any = (globalThis as any).electronAPI || {};
    Object.assign(existing, expose);
    (globalThis as any).electronAPI = existing;
    console.log('[preload] electronAPI merged to globalThis.electronAPI (src)');
  } catch (e2) {
    console.error('[preload] failed to merge electronAPI to global', e2);
  }
}
