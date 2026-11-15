'use strict';

const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const config = require('./core/config.cjs');
const { now, sanitizeText, uuid } = require('./core/util.cjs');
const { SessionManager } = require('./core/session-manager.cjs');
const { PacketGenerator } = require('./core/packet-generator.cjs');
const { EventStore } = require('./core/event-store.cjs');
const { OperationEngine } = require('./core/operation-engine.cjs');
const { mountScenarioLab } = require('./core/scenario-lab.cjs');

function parseArgs(argv) {
  const out = { host: config.host, port: config.port };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--host' && argv[i + 1]) out.host = String(argv[++i]);
    else if (argv[i] === '--port' && argv[i + 1]) out.port = Number(argv[++i]);
  }
  if (!Number.isInteger(out.port) || out.port < 1 || out.port > 65535) throw new Error('INVALID_PORT');
  return out;
}

const CLI = parseArgs(process.argv.slice(2));
const HOST = CLI.host;
const PORT = CLI.port;

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: `${Math.ceil(config.maxJsonBytes / 1024)}kb` }));
mountScenarioLab(app);

const server = http.createServer(app);
const wss = new WebSocket.Server({
  server,
  path: config.wsPath,
  maxPayload: 256 * 1024,
  perMessageDeflate: false,
});

const sessions = new SessionManager();
const packetGenerator = new PacketGenerator();
const store = new EventStore(config);

function sendWs(client, event) {
  if (client.readyState !== WebSocket.OPEN) return;
  try {
    client.send(JSON.stringify(event));
    store.metrics.wsMessagesOut += 1;
  } catch {
    store.metrics.errors += 1;
  }
}

function broadcast(event) {
  for (const client of wss.clients) sendWs(client, event);
}

const engine = new OperationEngine({
  packetGenerator,
  sessions,
  store,
  broadcast,
  maxBurst: config.operationBurstMax,
});

app.use((req, _res, next) => {
  const started = process.hrtime.bigint();
  req.on('end', () => {
    store.audit({
      type: 'HTTP',
      method: req.method,
      path: req.path,
      elapsedMs: Number(process.hrtime.bigint() - started) / 1e6,
      timestamp: now(),
    });
  });
  next();
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'skynet-v8-lucifer-core',
    version: config.version,
    host: HOST,
    port: PORT,
    pid: process.pid,
    uptimeSeconds: Math.floor(process.uptime()),
    websocketPath: config.wsPath,
    websocketClients: wss.clients.size,
    queue: engine.status(),
  });
});

app.get('/api/state', (_req, res) => {
  res.json({
    ok: true,
    version: config.version,
    websocketClients: wss.clients.size,
    sessions: sessions.list(),
    queue: engine.status(),
    ...store.snapshot(),
  });
});

app.get('/api/metrics', (_req, res) => {
  res.json({
    ok: true,
    process: {
      pid: process.pid,
      uptimeSeconds: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
    },
    websocketClients: wss.clients.size,
    queue: engine.status(),
    metrics: store.metrics,
  });
});

app.post('/api/session', (req, res) => {
  const session = sessions.create(sanitizeText(req.body?.label || 'dashboard', 80));
  store.pushEvent({ type: 'SESSION_CREATED', sid: session.sid, sessionId: session.id, timestamp: now() });
  broadcast({ type: 'SESSION_CREATED', sid: session.sid, sessionId: session.id, timestamp: now() });
  res.status(201).json({ ok: true, session });
});

app.post('/api/packet', (req, res) => {
  const format = sanitizeText(req.body?.format || 'socketio', 32).toLowerCase();
  const event = sanitizeText(req.body?.event || 'lab.test', 80);
  const data = typeof req.body?.data === 'object' && req.body.data ? req.body.data : {};
  const packet = format === 'binary'
    ? packetGenerator.makeBinary(event, data)
    : packetGenerator.makeSocketIo(event, data);
  store.pushEvent({ type: 'PACKET_GENERATED', format: packet.format, bytes: packet.bytes, sha256: packet.sha256, timestamp: now() });
  res.json({ ok: true, packet });
});

app.post('/api/mutate', (req, res) => {
  const frame = sanitizeText(req.body?.frame || '', 4000);
  const strategy = sanitizeText(req.body?.strategy || 'flip-char', 32);
  const mutated = packetGenerator.mutateText(frame, strategy);
  res.json({ ok: true, strategy, input: frame, mutated });
});

app.post('/api/operation', (req, res) => {
  const provider = sanitizeText(req.body?.provider || 'PGSOFT', 32).toUpperCase();
  const vector = sanitizeText(req.body?.vector || 'RACE_CONDITION', 64).toUpperCase();
  const intensity = Math.max(1, Math.min(Number(req.body?.intensity) || 25, config.operationBurstMax));

  const job = engine.enqueue({ provider, vector, intensity });
  res.status(202).json({
    ok: true,
    status: 'QUEUED',
    job,
  });
});

app.post('/api/observe-site', (req, res) => {
  const observation = {
    type: 'SITE_OBSERVATION',
    id: uuid(),
    provider: sanitizeText(req.body?.provider || 'UNKNOWN', 32),
    game: sanitizeText(req.body?.game || 'UNKNOWN', 96),
    host: sanitizeText(req.body?.host || '', 96),
    pathname: sanitizeText(req.body?.pathname || '', 240),
    title: sanitizeText(req.body?.title || '', 160),
    timestamp: now(),
  };
  store.pushObservation(observation);
  store.pushEvent(observation);
  broadcast(observation);
  res.json({ ok: true, observation });
});

app.post('/api/reset-lab', (_req, res) => {
  sessions.reset();
  store.events.length = 0;
  store.operations.length = 0;
  store.persist();
  broadcast({ type: 'LAB_RESET', timestamp: now() });
  res.json({ ok: true });
});

wss.on('connection', (socket) => {
  socket.isAlive = true;
  socket.on('pong', () => { socket.isAlive = true; });

  sendWs(socket, {
    type: 'CONNECTED',
    service: 'skynet-v8-lucifer-core',
    version: config.version,
    timestamp: now(),
  });

  socket.on('message', (data, isBinary) => {
    store.metrics.wsMessagesIn += 1;

    if (isBinary) {
      sendWs(socket, { type: 'BINARY_ACK', bytes: data.length, timestamp: now() });
      return;
    }

    const text = String(data);
    if (text === 'PING') {
      sendWs(socket, { type: 'PONG', timestamp: now() });
      return;
    }

    if (text.startsWith('42')) {
      let parsed = null;
      try { parsed = JSON.parse(text.slice(2)); } catch {}
      sendWs(socket, {
        type: parsed ? 'SOCKETIO_FRAME_PARSED' : 'SOCKETIO_FRAME_INVALID',
        parsed,
        timestamp: now(),
      });
      return;
    }

    sendWs(socket, { type: 'ECHO', text: sanitizeText(text, 500), timestamp: now() });
  });
});

wss.on('error', (err) => {
  store.metrics.errors += 1;
  console.error('[WS ERROR]', err);
});

const heartbeat = setInterval(() => {
  for (const socket of wss.clients) {
    if (socket.isAlive === false) {
      try { socket.terminate(); } catch {}
      continue;
    }
    socket.isAlive = false;
    try { socket.ping(); } catch {}
  }
}, config.heartbeatMs);
heartbeat.unref();

app.use((err, _req, res, _next) => {
  store.metrics.errors += 1;
  console.error('[HTTP ERROR]', err);
  res.status(500).json({ ok: false, error: 'INTERNAL_ERROR' });
});

server.on('error', (err) => {
  store.metrics.errors += 1;
  if (err && err.code === 'EADDRINUSE') {
    console.error(`[SKYNET V8 LUCIFER] Porta ${PORT} já está em uso.`);
    process.exitCode = 98;
    return;
  }
  console.error('[SERVER ERROR]', err);
  process.exitCode = 1;
});

function shutdown(signal) {
  console.log(`[SKYNET V8 LUCIFER] ${signal}: encerrando.`);
  clearInterval(heartbeat);
  try { store.persist(); } catch {}
  for (const client of wss.clients) {
    try { client.close(1001, 'shutdown'); } catch {}
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 4000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

server.listen(PORT, HOST, () => {
  console.log(`[SKYNET V8 LUCIFER] Core ${config.version} online em http://${HOST}:${PORT}`);
  console.log(`[SKYNET V8 LUCIFER] WebSocket ws://${HOST}:${PORT}${config.wsPath}`);
});
