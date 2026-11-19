'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const path = require('node:path');
const { tmpdir } = require('node:os');

const ROOT = path.resolve(__dirname, '..');
const PORT = 39190;
let child;
let dataDir;

async function waitForHealth() {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  throw new Error('production health timeout');
}

test.before(async () => {
  dataDir = mkdtempSync(path.join(tmpdir(), 'skynet-production-test-'));
  child = spawn(process.execPath, ['server.cjs', '--host', '127.0.0.1', '--port', String(PORT)], {
    cwd: ROOT,
    env: { ...process.env, SKYNET_DATA_DIR: dataDir },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await waitForHealth();
});

test.after(async () => {
  if (child?.exitCode === null && child.signalCode === null) {
    await new Promise(resolve => {
      child.once('close', resolve);
      child.kill();
    });
  }
  if (dataDir) rmSync(dataDir, { recursive: true, force: true, maxRetries: 3 });
});

test('production server serves the built dashboard and SPA fallback', async () => {
  for (const pathname of ['/', '/control']) {
    const response = await fetch(`http://127.0.0.1:${PORT}${pathname}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /text\/html/);
    assert.match(await response.text(), /<div id="root"><\/div>/);
  }
});

test('production server keeps API and missing API responses as JSON', async () => {
  const state = await fetch(`http://127.0.0.1:${PORT}/api/state`);
  assert.equal(state.status, 200);
  assert.equal((await state.json()).ok, true);

  const missing = await fetch(`http://127.0.0.1:${PORT}/api/missing`);
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error, 'NOT_FOUND');
});
