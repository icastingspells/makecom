import { afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { logEvent, requestLogging } from './logging.js';
import type { AddressInfo } from 'node:net';

afterEach(() => vi.restoreAllMocks());

describe('safe operational logs', () => {
  it('drops unknown fields, credential strings and multiline metadata', () => {
    const sink = vi.spyOn(console, 'info').mockImplementation(() => {});
    logEvent('http.completed', { status: 200, route: 'sk-or-test-secret', method: 'GET\nsecret', authorization: 'private-value', body: { secret: true } } as never);
    const record = JSON.parse(sink.mock.calls[0][0]);
    expect(record).toMatchObject({ event: 'http.completed', status: 200 });
    expect(record).not.toHaveProperty('route');
    expect(record).not.toHaveProperty('method');
    expect(JSON.stringify(record)).not.toMatch(/private-value|secret|authorization|body/);
  });

  it('logs route templates and status without query, headers, body or path parameters', async () => {
    const sink = vi.spyOn(console, 'info').mockImplementation(() => {});
    const app = express();
    app.use(requestLogging);
    app.post('/cards/:id', (_req, res) => res.sendStatus(204));
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    try {
      const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/cards/private-id?key=query-secret`, { method: 'POST', headers: { Authorization: 'Bearer header-secret', Cookie: 'cookie-secret' }, body: 'body-secret' });
      expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
      const records = sink.mock.calls.map(call => String(call[0]));
      expect(records.join('')).not.toMatch(/private-id|query-secret|header-secret|cookie-secret|body-secret/);
      expect(records.some(line => JSON.parse(line).route === '/cards/:id' && JSON.parse(line).status === 204)).toBe(true);
    } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
  });
});
