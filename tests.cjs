'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const WebSocket = require('ws');

const ROOT = __dirname;
const PORT = 39188;
let child;
let dataDir;

async function waitHealth() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/health`);
      if (r.ok) return await r.json();
    } catch {}
    await new Promise(r => setTimeout(r, 50));
  }
  throw new Error('health timeout');
}

test.before(async () => {
  dataDir = mkdtempSync(path.join(tmpdir(), 'skynet-core-test-'));
  child = spawn(process.execPath, ['server.cjs', '--host', '127.0.0.1', '--port', String(PORT)], {
    cwd: ROOT,
    env: { ...process.env, SKYNET_PORT: '49999', SKYNET_HOST: '0.0.0.0', SKYNET_DATA_DIR: dataDir },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await waitHealth();
});

test.after(async () => {
  if (child?.exitCode === null && child.signalCode === null) {
    await new Promise(resolve => { child.once('close', resolve); child.kill(); });
  }
  if (dataDir) rmSync(dataDir, { recursive: true, force: true, maxRetries: 3 });
});

test('health is JSON and CLI port wins over stale env', async () => {
  const r = await fetch(`http://127.0.0.1:${PORT}/health`);
  assert.match(r.headers.get('content-type') || '', /application\/json/);
  const h = await r.json();
  assert.equal(h.ok, true);
  assert.equal(h.service, 'skynet-v8-lucifer-core');
  assert.equal(h.version, '8.10.0'); // Versão atual do sistema
  assert.equal(h.port, PORT);
});

test('operation engine generates local synthetic frames', async () => {
  const r = await fetch(`http://127.0.0.1:${PORT}/api/operation`, {
    method: 'POST',
    headers: {'content-type':'application/json'},
    body: JSON.stringify({ provider:'PGSOFT', vector:'RACE_CONDITION', intensity: 12 }),
  });
  assert.equal(r.status, 202);
  const b = await r.json();
  assert.equal(b.ok, true);
  assert.equal(b.status, 'QUEUED');
  assert.ok(b.job?.id);
  assert.equal(b.job.provider, 'PGSOFT');
  assert.equal(b.job.vector, 'RACE_CONDITION');

  // V8.9 is asynchronous: poll the persisted state, not an obsolete
  // synchronous `b.operation` response.  This asserts real frame output.
  let completed;
  for (let attempt = 0; attempt < 100; attempt++) {
    const stateResponse = await fetch(`http://127.0.0.1:${PORT}/api/state`);
    assert.equal(stateResponse.status, 200);
    const state = await stateResponse.json();
    completed = state.operations.find(op => op.id === b.job.id && op.status === 'DONE');
    if (completed) break;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.ok(completed, `Operation ${b.job.id} must complete and persist`);
  assert.equal(completed.framesGenerated, 12);
  assert.equal(completed.provider, 'PGSOFT');
  assert.equal(completed.sampleHashes.length, 8);
});

test('site observer accepts only page metadata', async () => {
  const r = await fetch(`http://127.0.0.1:${PORT}/api/observe-site`, {
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({
      provider:'PGSOFT', game:'AnubisWrath', host:'www.jogajunto.bet.br',
      pathname:'/pb/gameplay/ss_pgsoft_pgsoft:AnubisWrath/realgames',
      title:'Game', token:'SHOULD_NOT_BE_STORED', cookie:'SHOULD_NOT_BE_STORED'
    })
  });
  const b = await r.json();
  assert.equal(b.ok, true);
  assert.equal(b.observation.game, 'AnubisWrath');
  assert.equal('token' in b.observation, false);
  assert.equal('cookie' in b.observation, false);
});

test('websocket handshake and PONG', async () => {
  // Test WebSocket endpoint instead of non-existent /api/ws-session
  const response = await fetch(`http://127.0.0.1:${PORT}/ws/session`, { method: 'POST' });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie').split(';', 1)[0];
  await new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws`, { headers: { cookie } });
    const timer = setTimeout(() => reject(new Error('ws timeout')), 5000);
    let connected = false;
    ws.on('open', () => ws.send('PING'));
    ws.on('message', data => {
      const msg = JSON.parse(String(data));
      if (msg.type === 'CONNECTED') connected = true;
      if (msg.type === 'PONG' && connected) {
        clearTimeout(timer);
        ws.close();
        resolve();
      }
    });
    ws.on('error', reject);
  });
});
