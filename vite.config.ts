import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'app/client',
  publicDir: '../../public',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app'),
      '@shared': path.resolve(__dirname, './app/shared'),
      '@server': path.resolve(__dirname, './app/server'),
      '@client': path.resolve(__dirname, './app/client'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
});
