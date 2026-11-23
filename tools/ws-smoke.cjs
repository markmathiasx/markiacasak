'use strict';
const WebSocket = require('ws');

const url = process.argv[2] || 'ws://127.0.0.1:39188/ws';
async function main() {
  const endpoint = new URL('/api/ws-session', url);
  endpoint.protocol = endpoint.protocol === 'wss:' ? 'https:' : 'http:';
  const session = await fetch(endpoint, { method: 'POST', signal: AbortSignal.timeout(5000) });
  const cookie = session.headers.get('set-cookie')?.split(';', 1)[0];
  if (!session.ok || !cookie) throw new Error(`WS_SESSION_HTTP_${session.status}`);
  const ws = new WebSocket(url, { headers: { cookie } });
  const timer = setTimeout(() => {
    console.error('WS_TIMEOUT');
    ws.terminate();
    process.exit(2);
  }, 8000);

  let sawConnected = false;
  ws.on('open', () => ws.send('PING'));
  ws.on('message', data => {
    let msg;
    try { msg = JSON.parse(String(data)); } catch { return; }
    if (msg.type === 'CONNECTED') sawConnected = true;
    if (msg.type === 'PONG' && sawConnected) {
      clearTimeout(timer);
      console.log('WS_OK');
      ws.close();
      process.exit(0);
    }
  });
  ws.on('error', err => {
    clearTimeout(timer);
    console.error(err);
    process.exit(3);
  });
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
