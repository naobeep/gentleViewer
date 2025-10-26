import { contextBridge, ipcRenderer } from 'electron';

// 以下を既存の expose オブジェクトに統合するか、既存の expose 内にマージしてください。
contextBridge.exposeInMainWorld('electronAPI', {
  // ...existing props...
  tag: {
    getAll: async () => ipcRenderer.invoke('tag.getAll'),
    getForFiles: async (paths: string[]) => ipcRenderer.invoke('tag.getForFiles', paths),
    create: async (tag: any) => ipcRenderer.invoke('tag.create', tag),
    update: async (id: string, patch: any) => ipcRenderer.invoke('tag.update', id, patch),
    delete: async (id: string) => ipcRenderer.invoke('tag.delete', id),
    assign: async (filePath: string, tagIds: string[]) =>
      ipcRenderer.invoke('tag.assign', filePath, tagIds),
    assignMultiple: async (paths: string[], tagIds: string[]) =>
      ipcRenderer.invoke('tag.assignMultiple', paths, tagIds),
  },
  // ...existing props...
});
