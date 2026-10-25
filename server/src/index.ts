import 'dotenv/config';
import { logEvent } from './logging.js';
import { createApp } from './app.js';
import { getEnv } from './config/env.js';
import { closeStorageConnections } from './storage/index.js';

const server = createApp().listen(Number(getEnv().PORT), '0.0.0.0', () => {
  const address = server.address();
  logEvent('server.started', { port: typeof address === 'object' && address ? address.port : Number(getEnv().PORT), driver: getEnv().STORAGE_DRIVER });
});

server.on('error', () => { logEvent('server.error', {}, 'error'); process.exitCode = 1; });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    logEvent('server.stopping', { signal });
    server.close(() => { closeStorageConnections(); process.exit(0); });
  });
}
