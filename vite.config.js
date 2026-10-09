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
    build: {
      rollupOptions: {
        output: {
          // Split third-party code into stable, cacheable vendor chunks so the
          // app bundle stays small and heavy per-page libraries (dnd-kit,
          // FullCalendar) are only downloaded when the relevant route loads.
          // Order matters: more specific packages are matched before the
          // generic 'react' catch-all (e.g. react-router, @auth0/*-react).
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('@fullcalendar')) return 'vendor-calendar';
            if (id.includes('@dnd-kit')) return 'vendor-dnd';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('@auth0')) return 'vendor-auth0';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('react-router')) return 'vendor-router';
            if (id.includes('axios')) return 'vendor-axios';
            if (id.includes('react')) return 'vendor-react';
            // Everything else: let Rollup decide. Returning a single catch-all
            // chunk would merge route-only deps into one eagerly-loaded chunk;
            // auto-splitting keeps lazy-route vendor code with its route chunk.
            return undefined;
          },
        },
      },
    },
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
