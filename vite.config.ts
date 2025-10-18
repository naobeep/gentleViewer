import { defineConfig } from 'vite';
// @ts-ignore: TypeScript moduleResolution currently can't resolve @vitejs/plugin-react's types in this project setup
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.join(__dirname, 'src/renderer'),
  base: './',
  // publicDir をプロジェクトの src/icon フォルダに変更（/64.png として配信される）
  publicDir: path.join(__dirname, 'src', 'icon'),
  build: {
    outDir: path.join(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.join(__dirname, 'src/renderer/index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@shared': path.join(__dirname, 'src/shared'),
      '@renderer': path.join(__dirname, 'src/renderer'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
