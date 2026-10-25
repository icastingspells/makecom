// Public endpoint only: no credentials, dotenv loading or proxy configuration.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fetch as undiciFetch } from 'undici';

const endpoint = 'https://openrouter.ai/api/v1/models';
for (const [client, request] of [['node-native-direct', fetch], ['undici-direct', undiciFetch]]) {
  const start = Date.now();
  try {
    const response = await request(endpoint, { signal: AbortSignal.timeout(15000) });
    console.log(JSON.stringify({ client, status: response.status, contentType: response.headers.get('content-type'), cloudflare: !!response.headers.get('cf-ray'), elapsedMs: Date.now() - start }));
    await response.body?.cancel();
  } catch (error) { console.log(JSON.stringify({ client, error: error.name, code: error.cause?.code, elapsedMs: Date.now() - start })); }
}
try {
  const { stdout } = await promisify(execFile)('curl', ['--noproxy', '*', '--max-time', '15', '-s', '-o', process.platform === 'win32' ? 'NUL' : '/dev/null', '-w', 'curl-direct HTTP %{http_code} total %{time_total}', endpoint]);
  console.log(stdout);
} catch (error) { console.log(JSON.stringify({ client: 'curl-direct', error: error.code || error.name })); }
