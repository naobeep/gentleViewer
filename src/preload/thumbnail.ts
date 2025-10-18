import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type {
  ThumbnailGenerationProgress,
  ThumbnailError,
  SavedSearch,
  SearchQuery,
} from '../shared/types/thumbnail';

const expose = {
  // thumbnail events / commands
  onThumbnailProgress: (cb: (p: ThumbnailGenerationProgress) => void) => {
    const listener = (_: IpcRendererEvent, data: ThumbnailGenerationProgress) => cb(data);
    ipcRenderer.on('thumbnail-progress', listener);
    return () => ipcRenderer.removeListener('thumbnail-progress', listener);
  },
  onThumbnailError: (cb: (e: ThumbnailError) => void) => {
    const listener = (_: IpcRendererEvent, data: ThumbnailError) => cb(data);
    ipcRenderer.on('thumbnail-error', listener);
    return () => ipcRenderer.removeListener('thumbnail-error', listener);
  },
  startThumbnailGeneration: (filePaths: string[]) =>
    ipcRenderer.invoke('thumbnail-start', filePaths),
  pauseThumbnailGeneration: () => ipcRenderer.invoke('thumbnail-pause'),
  resumeThumbnailGeneration: () => ipcRenderer.invoke('thumbnail-resume'),
  cancelThumbnailGeneration: () => ipcRenderer.invoke('thumbnail-cancel'),

  // data APIs (unwrap IPC response -> return raw data / sensible fallback)
  getFiles: async (opts?: { limit?: number; offset?: number }) => {
    const res = await ipcRenderer.invoke('get-files', opts);
    return res?.ok ? res.data : [];
  },
  getFileById: async (id: string) => {
    const res = await ipcRenderer.invoke('get-file-by-id', id);
    return res?.ok ? res.data : null;
  },
  getFileByPath: async (p: string) => {
    const res = await ipcRenderer.invoke('get-file-by-path', p);
    return res?.ok ? res.data : null;
  },
  upsertFile: async (file: any) => {
    const res = await ipcRenderer.invoke('upsert-file', file);
    if (!res?.ok) throw new Error(res?.error ?? 'upsertFile failed');
    return res.data;
  },
  deleteFile: async (id: string) => {
    const res = await ipcRenderer.invoke('delete-file', id);
    return res?.ok ?? false;
  },

  // saved searches (unwrap)
  getSavedSearches: async () => {
    const res = await ipcRenderer.invoke('get-saved-searches');
    return res?.ok ? res.data : [];
  },
  createSavedSearch: async (payload: any) => {
    const res = await ipcRenderer.invoke('create-saved-search', payload);
    if (!res?.ok) throw new Error(res?.error ?? 'createSavedSearch failed');
    return res.data;
  },
  updateSavedSearch: async (id: string, patch: any) => {
    const res = await ipcRenderer.invoke('update-saved-search', id, patch);
    if (!res?.ok) throw new Error(res?.error ?? 'updateSavedSearch failed');
    return res.data;
  },
  deleteSavedSearch: async (id: string) => {
    const res = await ipcRenderer.invoke('delete-saved-search', id);
    return res?.ok ?? false;
  },
  incrementSearchCount: async (id: string) => {
    const res = await ipcRenderer.invoke('increment-search-count', id);
    return res?.ok ? res.data : null;
  },

  // debug
  ipcTestPing: (payload: any) => ipcRenderer.invoke('ipc-test-ping', payload),
  onIpcTestPong: (cb: (data: any) => void) => {
    const listener = (_: IpcRendererEvent, data: any) => cb(data);
    ipcRenderer.on('ipc-test-pong', listener);
    return () => ipcRenderer.removeListener('ipc-test-pong', listener);
  },

  // サムネイル取得ラッパー
  getThumbnailPath: async (filePath: string) => {
    const res = await ipcRenderer.invoke('get-thumbnail-path', filePath);
    if (!res?.ok) return null;
    return res.path as string | null;
  },
  getThumbnailPaths: async (filePaths: string[]) => {
    const res = await ipcRenderer.invoke('get-thumbnail-paths', filePaths);
    if (!res?.ok) return [];
    return res.paths as (string | null)[];
  },

  // viewer
  openViewer: async (filePath: string) => {
    const res = await ipcRenderer.invoke('open-viewer', filePath);
    if (!res?.ok) throw new Error(res?.error ?? 'open-viewer failed');
    return true;
  },
};

contextBridge.exposeInMainWorld('electronAPI', expose);
export {};
