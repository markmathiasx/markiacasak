'use strict';

const baseUrl = (process.env.SKYNET_BASE_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');

async function post(path, body) {
  const start=performance.now();
  const r=await fetch(`${baseUrl}${path}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const data=await r.json();
  return {status:r.status,ms:+(performance.now()-start).toFixed(2),data};
}
(async()=>{
  const samples=[];
  for(const intensity of [10,25,50,100]){
    samples.push({intensity,...await post('/api/operation',{provider:'PGSOFT',vector:'BENCHMARK',intensity})});
    await new Promise(r=>setTimeout(r,150));
  }
  console.log(JSON.stringify({timestamp:new Date().toISOString(),samples},null,2));
})();
