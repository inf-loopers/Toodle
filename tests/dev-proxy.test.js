// @vitest-environment node
import { createServer as createHttpServer } from 'node:http';
import { once } from 'node:events';
import { createServer } from 'vite';
import { expect, it, vi } from 'vitest';
import viteConfig from '../vite.config.js';

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
