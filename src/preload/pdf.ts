import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // 他 API と衝突しないように namespace を使う
  pdf: {
    getData: async (filePath: string) => {
      const res = await ipcRenderer.invoke('pdf.getData', filePath);
      return res;
    },
    // 将来的に open-in-new-window などを追加可能
  },
});
