import { defineConfig, loadEnv } from 'vite';
import process from 'node:process';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = process.env.VITE_API_URL || env.VITE_API_URL || 'http://localhost:3000/api/v1';

  // Parse the API URL to extract target origin and base path for the proxy
  let target = 'http://localhost:3000';
  let basePath = '/api/v1';
  try {
    const url = new URL(apiUrl);
    target = url.origin;
    basePath = url.pathname.replace(/\/$/, '') || '/api/v1';
  } catch {
    // Fall back to defaults if URL parsing fails
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      open: false,
      proxy: {
        '/api/v1': {
          target,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/v1/, basePath),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin');
            });
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './tests/setup.js',
      css: true,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{js,jsx}'],
        exclude: ['src/main.jsx'],
        reporter: ['text', 'text-summary', 'lcov'],
        reportsDirectory: 'coverage',
      },
    },
  };
});
