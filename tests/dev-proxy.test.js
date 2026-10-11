// @vitest-environment node
import { createServer as createHttpServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, writeFile, unlink, rmdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { createServer } from 'vite';
import { expect, it, vi } from 'vitest';
import viteConfig from '../vite.config.js';

it('uses the local API in development even when .env points at a deployed API', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'toodle-dev-proxy-'));
  const development = await readFile(new URL('../.env.development', import.meta.url), 'utf8');
  const cwd = vi.spyOn(process, 'cwd').mockReturnValue(directory);
  vi.stubEnv('VITE_API_URL', undefined);
  try {
    await writeFile(join(directory, '.env'), 'VITE_API_URL=https://deployed.example/api/v1\n');
    await writeFile(join(directory, '.env.development'), development);
    const local = viteConfig({ mode: 'development' });
    expect(local.server.proxy['/api/v1'].target).toBe('http://localhost:3000');
    const production = viteConfig({ mode: 'production' });
    expect(production.server.proxy['/api/v1'].target).toBe('https://deployed.example');
    await writeFile(
      join(directory, '.env.development.local'),
      'VITE_API_URL=https://preview.example/api/v1\n'
    );
    expect(viteConfig({ mode: 'development' }).server.proxy['/api/v1'].target).toBe(
      'https://preview.example'
    );
  } finally {
    cwd.mockRestore();
    vi.unstubAllEnvs();
    for (const name of ['.env', '.env.development', '.env.development.local']) {
      await unlink(join(directory, name)).catch(() => {});
    }
    await rmdir(directory);
  }
});

it('proxies local authenticated API requests to the configured backend path', async () => {
  const upstream = createHttpServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        path: req.url,
        method: req.method,
        authorization: req.headers.authorization,
        origin: req.headers.origin ?? null,
      })
    );
  });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  let vite;
  try {
    vi.stubEnv('VITE_API_URL', `http://127.0.0.1:${upstream.address().port}/custom/api/`);
    const config = viteConfig({ mode: 'test' });
    vite = await createServer({
      ...config,
      configFile: false,
      plugins: [],
      server: { ...config.server, host: '127.0.0.1', port: 0, watch: null },
    });
    await vite.listen();
    const response = await fetch(
      `http://127.0.0.1:${vite.httpServer.address().port}/api/v1/auth/callback?check=1`,
      {
        method: 'POST',
        headers: { Authorization: 'Bearer test-token', Origin: 'http://localhost:5173' },
      }
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      path: '/custom/api/auth/callback?check=1',
      method: 'POST',
      authorization: 'Bearer test-token',
      origin: null,
    });
  } finally {
    vi.unstubAllEnvs();
    await vite?.close();
    upstream.closeAllConnections();
    await new Promise((resolve) => upstream.close(resolve));
  }
});
