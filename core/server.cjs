// CURAGEM SKYNET-V8 - SERVIDOR BACKEND FINAL V6
// Core v8.10.0 compatibilidade Node v24+ ASCII only

const http = require('http');
const fs = require('fs');
const { WebSocketServer } = require('ws');

const config = {
  host: 'localhost',
  port: 39188,
  wsPath: '/ws',
  version: '8.10.0'
};

class HeartbeatMonitor {
  constructor(wsServer) {
    this.wsServer = wsServer;
    this.pongTimeoutMs = 5000;
    this.lastHeartbeat = Date.now();
    
    this.wsServer.on('pong', () => {
      this.lastHeartbeat = Date.now();
    });
  }

  schedulePing() {
    const timeoutMs = this.pongTimeoutMs;
    setTimeout(() => {
      console.error('[HEARTBEAT] Timeout after ' + timeoutMs + 'ms');
      
      const clients = this.wsServer.clients;
      if (clients.size > 0) {
        Array.from(clients.keys()).forEach(c => c.close({ code: 1001, reason: 'Heartbeat timeout' }));
      }
    }, timeoutMs);
  }

  reportHeartbeat() {
    return {
      uptimeMs: Date.now() - this.lastHeartbeat,
      lastHeartbeat: this.lastHeartbeat,
      clientsConnected: this.wsServer.clients.size
    };
  }
}

// Error Handler  
process.on('uncaughtException', function(err) {
  console.error('[UNCAUGHT EXCEPTION]', err.message);
  process.exit(1);
});

const wsSecurity = { verifyAuthToken: function(authToken) { return !!authToken; } };

function generateUUID() {
  return ('xxxxxxxx-xxxx-4xxx-yxxx-yxxx').replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const HOST = config.host;
const PORT = config.port;
const WS_PATH = config.wsPath;
const VERSION = config.version;
const HEARTBEAT_MS = 5000;

console.log('==========================================');
console.log('[SKYNET V8 LUCIFER] Starting Core v' + VERSION);
console.log('Host: ' + HOST + ', Port: ' + PORT);
console.log('WebSocket Path: ' + WS_PATH);
console.log('==========================================');

const wss = new WebSocketServer({ host: HOST, port: PORT, path: WS_PATH });
const heartbeatMonitor = new HeartbeatMonitor(wss);

wss.on('connection', function(client) {
  console.log('[WS CONNECTION] Client connected via ' + client.request.url);
  
  if (!wsSecurity.verifyAuthToken(client.request.headers.authorization)) {
    client.close({ code: 4014, reason: 'Authentication required' });
    return;
  }

  const clientId = generateUUID();
  client._clientId = clientId;
  
  client.on('close', function() {
    console.log('[WS DISCONNECT] Client ' + client._clientId + ' disconnected');
    heartbeatMonitor.schedulePing(); 
  });

  client.on('error', function(err) {
    console.error('[WS CLIENT ERROR]', err.message);
    heartbeatMonitor.schedulePing();
  });

  heartbeatMonitor.schedulePing();
});

wss.on('close', function() {
  console.log('[WS CLOSE] Server closed gracefully');
});

wss.on('error', function(err) {
  console.error('[SERVER ERROR]', err.message);
  process.exit(1);
});

const server = http.createServer(function(req, res) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized', message: 'Authentication required' }));
    return;
  }

  if (!wsSecurity.verifyAuthToken(authHeader)) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Forbidden', message: 'Invalid token' }));
    return;
  }

  const urlPath = req.url.split('?')[0];
  
  function handleRequest(urlPath, res) {
    if (urlPath === WS_PATH || urlPath.startsWith('/ws/')) {
      res.writeHead(100, { 'Content-Type': 'text/plain' });
      res.end('Switching to WebSocket...');
    } else if (urlPath === '/api/ws-session') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'active', 
        heartbeatStatus: heartbeatMonitor.reportHeartbeat(),
        timestamp: Date.now()
      }));
    } else if (urlPath === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        uptimeMs: Math.floor((Date.now() - process.uptime()) * 1000),
        clientsConnected: wss.clients.size
      }));
    } else {
      const wsUrl = 'ws://' + HOST + ':' + PORT + '/' + WS_PATH;
      res.end(htmlString(wsUrl));
    }
  }

  handleRequest(urlPath, res);
});

function htmlString(wsUrl) {
  return '<!DOCTYPE html>\n<html>\n<head><title>SKYNET Dashboard</title></head>\n<body>\n<h1>OK SKYNET V8 LUCIFER - Server Running</h1>\n<p>Status: HEALTHY</p>\n<p>Heartbeat: ACTIVE</p>\n<script>\n  var ws = new WebSocket(wsUrl);\n  ws.onopen = function() {\n    document.getElementById("status").textContent = "ONLINE";\n  };\n</script>\n</body>\n</html>';
}

server.listen(PORT, HOST, function() {
  console.log('[SERVER] Ready!');
  console.log('   Backend: http://' + HOST + ':' + PORT);
  console.log('   WebSocket: ws://' + HOST + ':' + PORT + WS_PATH);
});

process.on('SIGTERM', function() {
  console.log('\n[SHUTDOWN] SIGTERM received...');
  wss.close();
  server.close();
  process.exit(0);
});

process.on('SIGINT', function() {
  console.log('\n[SHUTDOWN] SIGINT received...');
  wss.close();
  server.close();
  process.exit(0);
});

module.exports = { server, wss, heartbeatMonitor };
