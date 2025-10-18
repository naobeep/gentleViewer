import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type {
  ThumbnailGenerationProgress,
  ThumbnailError,
  SavedSearch,
  SearchQuery,
} from '../shared/types/thumbnail';

const expose = {
  // progress / error subscribe
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

  // commands
  startThumbnailGeneration: (filePaths: string[]) =>
    ipcRenderer.invoke('thumbnail-start', filePaths),
  pauseThumbnailGeneration: () => ipcRenderer.invoke('thumbnail-pause'),
  resumeThumbnailGeneration: () => ipcRenderer.invoke('thumbnail-resume'),
  cancelThumbnailGeneration: () => ipcRenderer.invoke('thumbnail-cancel'),

  // saved searches
  getSavedSearches: () => ipcRenderer.invoke('get-saved-searches'),
  saveSavedSearch: (s: SavedSearch) => ipcRenderer.invoke('save-saved-search', s),
  executeSearch: (q: SearchQuery) => ipcRenderer.invoke('execute-search', q),
  updateSearchExecutionCount: (id: string) =>
    ipcRenderer.invoke('update-search-execution-count', id),

  // debug test
  ipcTestPing: (payload: any) => ipcRenderer.invoke('ipc-test-ping', payload),
  onIpcTestPong: (cb: (data: any) => void) => {
    const listener = (_: IpcRendererEvent, data: any) => cb(data);
    ipcRenderer.on('ipc-test-pong', listener);
    return () => ipcRenderer.removeListener('ipc-test-pong', listener);
  },
};

contextBridge.exposeInMainWorld('electronAPI', expose);
export {};
