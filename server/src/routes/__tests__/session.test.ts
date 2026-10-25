import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { AddressInfo } from 'net';
import { Server } from 'http';
import sessionRouter, { sealSessionToken, openSessionToken } from '../session.js';

describe('encrypted browser-only OpenRouter session', () => {
  let server: Server, base: string;
  const token = 'sk-or-v1-test-session-credential';
  beforeAll(async () => {
    const app = express(); app.use(express.json()); app.use('/api/session', sessionRouter);
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/session`;
  });
  afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve())); });
  it('encrypts with authentication and rejects tampering', () => {
    const cookie = sealSessionToken(token);
    expect(cookie).not.toContain(token); expect(openSessionToken(cookie)).toBe(token);
    const buffer = Buffer.from(cookie, 'base64url'); buffer[15] ^= 1;
    expect(openSessionToken(buffer.toString('base64url'))).toBeUndefined();
  });
  it('sets HttpOnly, session-only cookie and never returns the credential', async () => {
    const response = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
    const cookie = response.headers.get('set-cookie')!;
    expect(response.status).toBe(200);
    expect(cookie).toContain('HttpOnly'); expect(cookie).toContain('SameSite=Strict'); expect(cookie).toContain('Path=/api');
    expect(cookie).not.toMatch(/Max-Age|Expires/); expect(cookie).not.toContain(token);
    expect(await response.text()).not.toContain(token);
    const status = await fetch(base, { headers: { Cookie: cookie.split(';')[0] } });
    expect(await status.json()).toMatchObject({ connected: true });
    expect((await fetch(base).then(r => r.json())).connected).toBe(false);
    const cleared = await fetch(base, { method: 'DELETE' });
    expect(cleared.headers.get('set-cookie')).toContain('Expires=');
  });
  it('rejects invalid tokens without setting a cookie', async () => {
    const response = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: 'invalid' }) });
    expect(response.status).toBe(400); expect(response.headers.get('set-cookie')).toBeNull();
  });
  it('sets Secure in production and needs a separate encryption secret', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('SESSION_SECRET', 'test-encryption-secret-at-least-32-characters');
    try {
      const response = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
      expect(response.headers.get('set-cookie')).toContain('Secure');
      vi.stubEnv('SESSION_SECRET', '');
      expect(() => sealSessionToken(token)).toThrow('SESSION_SECRET');
    } finally { vi.unstubAllEnvs(); }
  });
});
