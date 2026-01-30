import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type { Connect } from 'vite';

// SPA fallback middleware - redirect all non-file requests to index.html
function spaFallbackMiddleware(): Connect.NextHandleFunction {
  return (req, _res, next) => {
    // Only handle GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const url = req.url || '/';

    // Skip API requests (handled by proxy)
    if (url.startsWith('/api')) {
      return next();
    }

    // Skip requests for actual files (have extensions)
    if (url.includes('.') && !url.endsWith('.html')) {
      return next();
    }

    // Skip Vite internal requests
    if (url.startsWith('/@') || url.startsWith('/__')) {
      return next();
    }

    // Rewrite to index.html for SPA routing
    req.url = '/index.html';
    next();
  };
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'spa-fallback',
      configureServer(server) {
        // Add middleware before Vite's default middleware
        server.middlewares.use(spaFallbackMiddleware());
      },
    },
  ],
  root: 'app/client',
  publicDir: '../../public',
  appType: 'spa',
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
    host: true, // Allow connections from other devices on the network
    allowedHosts: true, // Allow ngrok and other tunnel services
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
    hmr: {
      timeout: 60000, // Increase HMR timeout to 60 seconds
    },
    // Enable SPA fallback - serve index.html for all non-file routes
    fs: {
      strict: false,
    },
  },
  // Explicitly handle SPA routing for preview mode too
  preview: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
});
