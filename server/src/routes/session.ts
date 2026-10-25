import { Router, Request } from 'express';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { getEnv } from '../config/env.js';

const cookieName = 'makecom_openrouter';
const developmentSecret = randomBytes(32);
function encryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === 'production' && (!secret || secret.length < 32)) throw new Error('SESSION_SECRET must contain at least 32 characters');
  return secret ? createHash('sha256').update(secret).digest() : developmentSecret;
}
export function sealSessionToken(token: string): string {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}
export function openSessionToken(value: string): string | undefined {
  try {
    const buffer = Buffer.from(value, 'base64url');
    if (buffer.length < 29 || buffer.length > 3000) return;
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), buffer.subarray(0, 12));
    decipher.setAuthTag(buffer.subarray(12, 28));
    return Buffer.concat([decipher.update(buffer.subarray(28)), decipher.final()]).toString('utf8');
  } catch { return undefined; }
}
export function sessionToken(req: Request): string | undefined {
  const cookie = req.headers.cookie?.split(';').map(c => c.trim()).find(c => c.startsWith(`${cookieName}=`));
  return cookie ? openSessionToken(cookie.slice(cookieName.length + 1)) : undefined;
}
export function requireOpenRouterSession(req: Request): string | undefined {
  const token = sessionToken(req);
  if (!token && getEnv().MOCK_LLM !== 'true') throw new MissingSessionError('Добавьте ключ OpenRouter в разделе «Подключение».');
  return token;
}
export class MissingSessionError extends Error {}

const router = Router();
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
router.get('/', (req, res) => res.json({ connected: !!sessionToken(req), mock: getEnv().MOCK_LLM === 'true' }));
router.post('/', (req, res) => {
  const token: unknown = req.body?.token;
  if (typeof token !== 'string' || !/^sk-or-[A-Za-z0-9_-]{10,500}$/.test(token.trim())) return res.status(400).json({ error: 'Введите корректный ключ OpenRouter.' });
  res.cookie(cookieName, sealSessionToken(token.trim()), { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/api' });
  res.json({ connected: true });
});
router.delete('/', (_req, res) => {
  res.clearCookie(cookieName, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/api' });
  res.json({ connected: false });
});
export default router;
