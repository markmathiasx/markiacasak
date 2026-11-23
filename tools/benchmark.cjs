'use strict';

<<<<<<< Updated upstream
const baseUrl = (process.env.SKYNET_BASE_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');

async function post(path, body) {
  const start=performance.now();
  const r=await fetch(`${baseUrl}${path}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const data=await r.json();
  return {status:r.status,ms:+(performance.now()-start).toFixed(2),data};
=======
const { setTimeout: delay } = require('node:timers/promises');
const corePort = Number(process.env.SKYNET_LOCAL_CORE_PORT || 39188);
if (!Number.isInteger(corePort) || corePort < 1 || corePort > 65535) throw new Error('INVALID_CORE_PORT');
const base = `http://127.0.0.1:${corePort}`;

async function request(path, options) {
  const response = await fetch(base + path, { ...options, signal: AbortSignal.timeout(3000) });
  const data = await response.json();
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status} ${data.error || ''}`);
  return data;
>>>>>>> Stashed changes
}

async function measure(intensity) {
  const started = performance.now();
  const { job } = await request('/api/operation', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ provider: 'PGSOFT', vector: 'BENCHMARK', intensity }),
  });
  if (!job?.id) throw new Error('Job ID ausente');
  const acceptedMs = performance.now() - started;
  while (performance.now() - started < 8000) {
    const state = await request('/api/state');
    const result = state.operations.find(entry => entry.id === job.id);
    if (result) {
      if (result.status !== 'DONE' || result.framesGenerated !== intensity) {
        throw new Error(`Job ${job.id}: ${result.error || 'resultado inesperado'}`);
      }
      return { jobId: job.id, intensity, acceptedMs, totalMs: performance.now() - started,
        engineMs: result.elapsedMs, framesGenerated: result.framesGenerated };
    }
    await delay(50);
  }
  throw new Error(`Job ${job.id}: tempo de espera esgotado`);
}

async function main() {
  const health = await request('/health');
  if (health.service !== 'skynet-v8-lucifer-core') throw new Error('Core SKYNET nao identificado');
  const samples = [];
  for (const intensity of [10, 25, 50, 100]) samples.push(await measure(intensity));
  console.log(JSON.stringify({ scope: 'LOCAL_SYNTHETIC_ONLY', pid: health.pid, samples }, null, 2));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });

