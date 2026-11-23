'use strict';
function localOrigin(value, fallback) {
  const port = Number(value || fallback);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('INVALID_LOCAL_PORT');
  return `http://127.0.0.1:${port}`;
}

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
  const core = localOrigin(process.env.SKYNET_LOCAL_CORE_PORT, 39188);
  const ui = localOrigin(process.env.SKYNET_LOCAL_UI_PORT, 5173);
  const checks = await Promise.all([
<<<<<<< Updated upstream
    check(`${baseUrl}/`),
    check(`${baseUrl}/health`),
    check(`${baseUrl}/api/state`),
    check(`${baseUrl}/api/metrics`),
=======
    check(core + '/health'),
    check(ui + '/'),
    check(ui + '/health'),
    check(ui + '/api/state'),
>>>>>>> Stashed changes
  ]);
  console.log(JSON.stringify({timestamp:new Date().toISOString(),checks},null,2));
  process.exitCode = checks.every(x => x.ok) ? 0 : 2;
})().catch(error => { console.error(error.message); process.exitCode = 1; });

