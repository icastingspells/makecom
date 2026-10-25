import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

type Event = 'http.completed' | 'http.aborted' | 'server.started' | 'server.stopping' | 'server.error' | 'generation.started' | 'generation.updated' | 'generation.finished' | 'generation.journal_failed' | 'provider.models_failed' | 'provider.response';
type Fields = { requestId?: string; operationId?: string; method?: string; route?: string; status?: number; durationMs?: number; kind?: string; stage?: string; attempt?: number; succeeded?: boolean; port?: number; driver?: string; signal?: string };
const allowed = new Set(['requestId', 'operationId', 'method', 'route', 'status', 'durationMs', 'kind', 'stage', 'attempt', 'succeeded', 'port', 'driver', 'signal']);

/** Metadata only: never accept error objects, URLs, headers, bodies or provider text. */
export function logEvent(event: Event, fields: Fields = {}, level: 'info' | 'warn' | 'error' = 'info'): void {
  const metadata = Object.fromEntries(Object.entries(fields).filter(([key, value]) => allowed.has(key) && (typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value) || typeof value === 'string' && value.length <= 120 && !/sk-or-|Bearer|[\r\n]/i.test(value))));
  try { console[level](JSON.stringify({ time: new Date().toISOString(), level, event, ...metadata })); } catch { /* Logging must not interrupt application work. */ }
}

export const requestLogging: RequestHandler = (req, res, next) => {
  const requestId = randomUUID();
  const started = performance.now();
  res.locals.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  const record = (aborted: boolean) => {
    if (req.path === '/health' && res.statusCode < 400 && !aborted) return;
    // route.path is the server's route template; never log user-supplied URL/query/IDs.
    const route = typeof req.route?.path === 'string' ? req.route.path : 'unmatched';
    logEvent(aborted ? 'http.aborted' : 'http.completed', { requestId, method: req.method, route, status: res.statusCode, durationMs: Math.round(performance.now() - started) }, aborted || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info');
  };
  res.once('finish', () => record(false));
  res.once('close', () => { if (!res.writableFinished) record(true); });
  next();
};
