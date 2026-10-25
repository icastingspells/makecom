const {spawn} = require('child_process');
function curlFetch(url, init={}) {
  return new Promise((resolve, reject) => {
    const args = ['-sS', '-X', init.method||'GET', url];
    const headers = init.headers || {};
    for (const [k,v] of Object.entries(headers)) {
      args.push('-H', k+': '+v);
    }
    if (init.body) {
      args.push('--data-binary', init.body);
    }
    const p = spawn('curl', args);
    let data = Buffer.alloc(0);
    p.stdout.on('data', d => data = Buffer.concat([data,d]));
    p.stderr.on('data', ()=>{});
    p.on('close', code => {
      resolve({status: code===0?200:500, text: ()=>Promise.resolve(data.toString())});
    });
    p.on('error', reject);
  });
}
const h = {'Authorization':'Bearer REDACTED','Content-Type':'application/json'};
curlFetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:h,body:JSON.stringify({model:'google/gemini-2.5-flash-preview',messages:[{role:'user',content:'hi'}]})})
  .then(r=>r.text()).then(t=>{console.log(t.slice(0,300));});
