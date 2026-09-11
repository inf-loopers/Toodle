import { defineConfig, loadEnv } from 'vite';
import process from 'node:process';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiUrl = new URL(env.VITE_API_URL || 'http://localhost:3000/api/v1');

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      open: false,
      proxy: {
        '/api/v1': {
          target: apiUrl.origin,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/v1/, apiUrl.pathname.replace(/\/$/, '')),
          configure: (proxy) => {
            // The browser talks to Vite; the upstream request is server-to-server.
            proxy.on('proxyReq', (request) => request.removeHeader('origin'));
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './tests/setup.js',
      css: true,
    },
  };
});
