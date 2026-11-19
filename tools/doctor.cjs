'use strict';

const baseUrl = (process.env.SKYNET_BASE_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');

async function check(url) {
  const start = performance.now();
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const text = await r.text();
    let body = null;
    try { body = JSON.parse(text); } catch {}
    const expectsJson = new URL(url).pathname !== '/';
    const validPayload = !expectsJson || body?.ok === true;
    return { url, ok: r.ok && validPayload, status: r.status, ms: +(performance.now()-start).toFixed(2), json: !!body };
  } catch (e) {
    return { url, ok: false, error: String(e), ms: +(performance.now()-start).toFixed(2) };
  }
}

(async()=>{
  const checks = await Promise.all([
    check(`${baseUrl}/`),
    check(`${baseUrl}/health`),
    check(`${baseUrl}/api/state`),
    check(`${baseUrl}/api/metrics`),
  ]);
  console.log(JSON.stringify({timestamp:new Date().toISOString(),checks},null,2));
  process.exitCode = checks.every(x => x.ok) ? 0 : 2;
})();
