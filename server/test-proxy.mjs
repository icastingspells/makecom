import './dist/http-proxy.js';
const res = await fetch('https://openrouter.ai/api/v1/models',{headers:{Authorization:'Bearer REDACTED'}});
console.log('STATUS', res.status);
const text = await res.text();
console.log(text.slice(0, 160));
