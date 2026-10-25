import express, { type ErrorRequestHandler } from 'express';
import { requestLogging } from './logging.js';
import { timingSafeEqual } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import healthRouter from './routes/health.js';
import modelsRouter from './routes/models.js';
import coreRouter from './routes/core.js';
import operationsRouter from './routes/operations.js';
import siteRouter from './routes/site.js';
import sessionRouter from './routes/session.js';
import { getEnv } from './config/env.js';
import { sameOriginApiGuard } from './security/same-origin.js';

export function createApp() {
  const env = getEnv();

  const app = express();
  app.set('trust proxy', 1);
  app.use(requestLogging);
  app.use(express.json({ limit: '512kb' }));
  app.use((req, res, next) => {
    if (req.path === '/health' || !env.APP_ACCESS_PASSWORD) return next();
    const authorization = req.headers.authorization || '';
    const decoded = authorization.startsWith('Basic ') ? Buffer.from(authorization.slice(6), 'base64').toString('utf8') : '';
    const password = Buffer.from(decoded.slice(decoded.indexOf(':') + 1));
    const expected = Buffer.from(env.APP_ACCESS_PASSWORD);
    if (password.length === expected.length && timingSafeEqual(password, expected)) return next();
    res.setHeader('WWW-Authenticate', 'Basic realm="Makecom", charset="UTF-8"');
    res.status(401).send('Authentication required');
  });
  app.use('/api', sameOriginApiGuard(env.APP_BASE_URL));

  app.use('/health', healthRouter);
  app.use('/api/models', modelsRouter);
  app.use('/api/core', coreRouter);
  app.use('/api/site', siteRouter);
  app.use('/api/operations', operationsRouter);
  app.use('/api/session', sessionRouter);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(express.static(fileURLToPath(new URL('../../client/dist', import.meta.url))));
  app.get('/', (_req, res) => res.sendFile(path.resolve(fileURLToPath(new URL('../../client/dist/index.html', import.meta.url)))));

  // Do not let Express's default error handler print request-derived error bodies.
  const safeErrorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (res.headersSent) { res.destroy(); return; }
    const status = error?.status === 400 ? 400 : error?.status === 413 ? 413 : 500;
    res.status(status).json({ error: status === 400 ? 'Invalid request' : status === 413 ? 'Request too large' : 'Internal server error', requestId: res.locals.requestId });
  };
  app.use(safeErrorHandler);

  return app;
}
