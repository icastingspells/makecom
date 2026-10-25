import { spawn } from 'child_process';

const key = 'REDACTED';
const body = JSON.stringify({
  model: 'openrouter/auto',
  messages: [{ role: 'user', content: 'Say hi' }]
});

const args = [
  '-sS',
  '-X', 'POST',
  'https://openrouter.ai/api/v1/chat/completions',
  '-H', `Authorization: Bearer ${key}`,
  '-H', 'Content-Type: application/json',
  '-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  '-H', 'Accept: application/json, text/plain, */*',
  '-H', 'HTTP-Referer: https://openrouter.ai/',
  '-H', 'X-Title: OpenRouter',
  '--connect-timeout', '30',
  '--max-time', '60',
  '--data-binary', body
];

const p = spawn('curl', args);
let out = '';
let err = '';
p.stdout.on('data', d => out += d.toString());
p.stderr.on('data', d => err += d.toString());
p.on('close', code => {
  console.log('CODE:', code);
  console.log(out.slice(0, 500));
  if (err) console.log('ERR:', err.slice(0, 200));
});
