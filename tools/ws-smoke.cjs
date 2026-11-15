'use strict';
const WebSocket = require('ws');

const url = process.argv[2] || 'ws://127.0.0.1:5173/ws';
const ws = new WebSocket(url);
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
