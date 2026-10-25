import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import { Server } from 'http';
import { AddressInfo } from 'net';
import { createServer, ViteDevServer } from 'vite';
import clientConfig from '../../../../client/vite.config.js';
import { sameOriginApiGuard } from '../same-origin.js';

async function listen(app: express.Express): Promise<{ server: Server; url: string }> {
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  return { server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}
async function close(server: Server) {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

describe('same-origin API through the actual Vite proxy', () => {
  let backend: Server, frontend: Server, vite: ViteDevServer, url: string;
  beforeAll(async () => {
    const app = express(); app.set('trust proxy', 1);
    app.use('/api', sameOriginApiGuard('https://personal.example'));
    app.post('/api/session', (_req, res) => res.json({ ok: true }));
    app.post('/api/core/create', (_req, res) => res.json({ ok: true }));
    const target = await listen(app); backend = target.server;
    const configured = clientConfig as { server: { proxy: Record<string, { changeOrigin: boolean }> } };
    expect(configured.server.proxy['/api'].changeOrigin).toBe(false);
    vite = await createServer({ configFile: false, server: { middlewareMode: true, watch: null, proxy: { '/api': { ...configured.server.proxy['/api'], target: target.url } } }, appType: 'custom' });
    const proxy = express(); proxy.use(vite.middlewares);
    const listener = await listen(proxy); frontend = listener.server; url = listener.url;
  });
  afterAll(async () => { await vite?.close(); if (frontend) await close(frontend); if (backend) await close(backend); });
  it('allows same-origin connection and company-generation requests through Vite', async () => {
    for (const route of ['/api/session', '/api/core/create']) {
      const response = await fetch(url + route, { method: 'POST', headers: { Origin: url, 'Sec-Fetch-Site': 'same-origin' } });
      expect(response.status).toBe(200); expect(await response.json()).toEqual({ ok: true });
    }
  });
  it('still rejects an external Origin and cross-site fetch metadata', async () => {
    expect((await fetch(url + '/api/session', { method: 'POST', headers: { Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site' } })).status).toBe(403);
    expect((await fetch(url + '/api/session', { method: 'POST', headers: { Origin: url, 'Sec-Fetch-Site': 'cross-site' } })).status).toBe(403);
  });
  it('supports the explicitly configured production origin behind a reverse proxy', async () => {
    expect((await fetch(url + '/api/session', { method: 'POST', headers: { Origin: 'https://personal.example', 'Sec-Fetch-Site': 'same-origin', 'X-Forwarded-Proto': 'https' } })).status).toBe(200);
  });
});
