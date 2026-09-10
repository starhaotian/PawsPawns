import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base 设为相对路径，方便部署到 GitHub Pages 子路径或任意静态托管。
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  worker: {
    format: 'es',
  },
});
