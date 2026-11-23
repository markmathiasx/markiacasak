'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const WebSocket = require('ws');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

const PORT=39189;
let child;
let dataDir;

async function health(){
  for(let i=0;i<100;i++){
    try{const r=await fetch(`http://127.0.0.1:${PORT}/health`);if(r.ok)return r.json()}catch{}
    await new Promise(r=>setTimeout(r,40));
  }
  throw new Error('health timeout');
}

test.before(async()=>{
  dataDir = mkdtempSync(path.join(tmpdir(), 'skynet-integration-test-'));
  child=spawn(process.execPath,['server.cjs','--host','127.0.0.1','--port',String(PORT)],{
    cwd:require('path').resolve(__dirname,'..'),
    env:{...process.env,SKYNET_PORT:'45555',SKYNET_HOST:'0.0.0.0',SKYNET_DATA_DIR:dataDir},
    stdio:['ignore','pipe','pipe']
  });
  await health();
});
test.after(async () => {
  if (child?.exitCode === null && child.signalCode === null) {
    await new Promise(resolve => { child.once('close', resolve); child.kill(); });
  }
  if (dataDir) rmSync(dataDir, { recursive: true, force: true, maxRetries: 3 });
});

test('cenários A/B/C isolam as sessões e ativam o bônus uma única vez', async () => {
  const url = `http://127.0.0.1:${PORT}/api/scenario-lab`;
  async function call(endpoint, session, body) {
    const response = await fetch(url + endpoint, {
      ...(body !== undefined && { method: 'POST', body: JSON.stringify(body) }),
      headers: { 'content-type': 'application/json', ...(session && { 'x-lab-session': session }) },
    });
    return { status: response.status, ...await response.json() };
  }
  const { session: first } = await call('/session', null, {});
  const { session: second } = await call('/session', null, {});
  assert.equal((await call('/action', first, { mode: 'C' })).status, 409);
  assert.equal((await call('/action', first, { mode: 'D' })).status, 400);
  assert.equal((await fetch(url + '/session', {
    method: 'POST', headers: { origin: 'https://example.test' },
  })).status, 403);
  const sample = { mode: 'A', seed: 42, profile: 'frequent' };
  const a = await call('/action', first, sample);
  assert.equal(a.scope, 'LOCAL_SYNTHETIC_ONLY');
  assert.equal(a.round.results[0].samples, 512);
  assert.deepEqual((await call('/action', first, sample)).round.results, a.round.results);
  const b = await call('/action', first, { ...sample, mode: 'B', comparison: 'asymmetric' });
  assert.equal(b.round.results.length, 2);
  assert.deepEqual(b.round.results[0], a.round.results[0]);
  assert.equal((await call('/action', first, { mode: 'C', roundId: a.round.id })).status, 409);
  assert.equal((await call('/action', second, { mode: 'C', roundId: b.round.id })).status, 409);
  const activate = { mode: 'C', roundId: b.round.id };
  const activations = await Promise.all([call('/action', first, activate), call('/action', first, activate)]);
  assert.deepEqual(activations.map(entry => entry.repeated).sort(), [false, true]);
  assert.deepEqual(activations[0].round.bonus, activations[1].round.bonus);
  assert.equal(activations[0].round.bonus.type, 'SYNTHETIC_BONUS_ACTIVATED');
  assert.deepEqual((await call('/state', first)).round, activations[0].round);
  assert.equal((await call('/state', second)).round, null);
});

test('cenário aceita origem same-origin publicada e rejeita origem divergente', async () => {
  function request(origin) {
    return new Promise((resolve, reject) => {
      const call = http.request({
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/scenario-lab/session',
        method: 'POST',
        headers: {
          host: 'preview.example.test',
          origin,
          'content-type': 'application/json',
          'content-length': 2,
        },
      }, response => {
        response.resume();
        response.once('end', () => resolve(response.statusCode));
      });
      call.once('error', reject);
      call.end('{}');
    });
  }
  assert.equal(await request('https://preview.example.test'), 201);
  assert.equal(await request('https://attacker.example.test'), 403);
});

test('CLI host/port beats stale environment', async()=>{
  const h=await health();
  assert.equal(h.service,'skynet-v8-lucifer-core');
  assert.equal(h.port,PORT);
});

test('invalid operation input and malformed JSON return actionable client errors', async () => {
  const url = `http://127.0.0.1:${PORT}/api/operation`;
  for (const [body, error] of [
    ['{"intensity":1.5}', 'INVALID_OPERATION_INTENSITY'],
    ['{"provider":[]}', 'INVALID_OPERATION_FIELD'],
    ['{', 'INVALID_JSON'],
  ]) {
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, error);
  }
});

test('session manager endpoint creates synthetic session', async()=>{
  const r=await fetch(`http://127.0.0.1:${PORT}/api/session`,{method:'POST',headers:{'content-type':'application/json'},body:'{"label":"test"}'});
  const b=await r.json();
  assert.equal(b.ok,true); assert.equal(b.session.synthetic,true); assert.ok(b.session.sid);
});

test('packet generator builds socketio text and binary', async()=>{
  for(const format of ['socketio','binary']){
    const r=await fetch(`http://127.0.0.1:${PORT}/api/packet`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({format,event:'lab.test',data:{x:1}})});
    const b=await r.json();
    assert.equal(b.ok,true); assert.ok(b.packet.sha256); assert.ok(b.packet.bytes>0);
  }
});

test('packet generator preserves trusted synthetic metadata', async()=>{
  const r=await fetch(`http://127.0.0.1:${PORT}/api/packet`,{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({format:'socketio',event:'lab.test',data:{id:'forged',timestamp:'forged',synthetic:false}})
  });
  const b=await r.json();
  const payload=JSON.parse(b.packet.frame.slice(2))[1];
  assert.notEqual(payload.id,'forged');
  assert.notEqual(payload.timestamp,'forged');
  assert.equal(payload.synthetic,true);
});

test('JSON inválido retorna erro de cliente', async()=>{
  const r=await fetch(`http://127.0.0.1:${PORT}/api/session`,{
    method:'POST',headers:{'content-type':'application/json'},body:'{'
  });
  assert.equal(r.status,400);
  assert.equal((await r.json()).error,'INVALID_JSON');
});

test('mutation lab mutates without touching external services', async()=>{
  const r=await fetch(`http://127.0.0.1:${PORT}/api/mutate`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({frame:'42["x",{"a":1}]',strategy:'truncate'})});
  const b=await r.json(); assert.equal(b.ok,true); assert.notEqual(b.mutated,'42["x",{"a":1}]');
});

test('queued operation completes and persists state', async()=>{
  const r=await fetch(`http://127.0.0.1:${PORT}/api/operation`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({provider:'PGSOFT',vector:'RACE_CONDITION',intensity:12})});
  const b=await r.json(); assert.equal(r.status,202); assert.equal(b.status,'QUEUED');
  let done=false;
  for(let i=0;i<80;i++){
    const s=await (await fetch(`http://127.0.0.1:${PORT}/api/state`)).json();
    if(s.operations.some(x=>x.id===b.job.id && x.status==='DONE')){done=true;break}
    await new Promise(r=>setTimeout(r,50));
  }
  assert.equal(done,true);
});

test('intensidade fracionária é normalizada para quadros inteiros', async()=>{
  const r=await fetch(`http://127.0.0.1:${PORT}/api/operation`,{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({provider:'PGSOFT',vector:'RACE_CONDITION',intensity:1.5})
  });
  const b=await r.json();
  assert.equal(b.job.status,'QUEUED');
  let operation;
  for(let i=0;i<80;i++){
    const state=await (await fetch(`http://127.0.0.1:${PORT}/api/state`)).json();
    operation=state.operations.find(item=>item.id===b.job.id);
    if(operation)break;
    await new Promise(resolve=>setTimeout(resolve,25));
  }
  assert.equal(operation.framesGenerated,1);
});

test('websocket PING/PONG', async()=>{
  const response = await fetch(`http://127.0.0.1:${PORT}/api/ws-session`, { method: 'POST' });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie').split(';', 1)[0];
  const dashboardSession = await fetch(`http://127.0.0.1:${PORT}/ws/session`, { method: 'POST' });
  assert.equal(dashboardSession.status, 200);
  assert.match(dashboardSession.headers.get('set-cookie') || '', /skynet-ws=/);
  await new Promise((resolve,reject)=>{
    const ws=new WebSocket(`ws://127.0.0.1:${PORT}/ws`, { headers: { cookie } });
    const t=setTimeout(()=>reject(new Error('timeout')),3000);
    ws.on('open',()=>ws.send('PING'));
    ws.on('message',raw=>{
      const m=JSON.parse(String(raw));
      if(m.type==='PONG'){clearTimeout(t);ws.close();resolve();}
    });
    ws.on('error',reject);
  });
});
