import 'dotenv/config';
import { createApp } from './app.js';
import { getEnv } from './config/env.js';
import { closeStorageConnections } from './storage/index.js';

const server = createApp().listen(Number(getEnv().PORT), '0.0.0.0', () => {
  const address = server.address();
  console.log('Server running on port ' + (typeof address === 'object' ? address?.port : getEnv().PORT));
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => server.close(() => { closeStorageConnections(); process.exit(0); }));
}
