import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // renderer ソースをルートに設定
  root: path.resolve(__dirname, 'src', 'renderer'),
  // src/icon を publicDir にして /64.png を配信
  publicDir: path.resolve(__dirname, 'src', 'icon'),
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    // HMR が Electron と共存しやすいように設定
    watch: {
      // ネイティブの file watcher を優先して問題を減らす
      usePolling: false,
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist', 'renderer'),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src', 'renderer', 'index.html'),
    },
  },
  resolve: {
    alias: {
      // renderer 内での絶対 import 用
      '@': path.resolve(__dirname, 'src', 'renderer'),
      // main/preload/shared 用のショートカット
      '@shared': path.resolve(__dirname, 'src', 'shared'),
    },
  },
  optimizeDeps: {
    // electron はバンドルしない
    exclude: ['electron'],
  },
});
