/**
 * LUCIFER-v8.9.0 MOCK SERVER - VULNERABILITIES REAIS
 * Port: localhost:3456
 */

const http = require('http');

// A01 - Broken Access Control (sem auth)
function createServer() {
  const server = http.createServer((req, res) => {
    
    // Header padrão
    res.writeHead(200);
    
    // A01: Admin painel SEM autenticação
    if (req.url.includes('/admin/dashboard') || req.url.includes('/secret')) {
      res.end(`HTTP/1.1 200 OK\nContent-Type: text/html\n\n` +
        '<h1>LUCIFER ADMIN PANEL</h1>' +
        '<p>Admin Root: <strong>root@lucifer.net</strong></p>' +
        '<p>Dados Sensíveis: SECRET_KEY_9988776655</p>' +
        '</div><hr><p>Tokens Exponíveis: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test</p>');
    }

    // A03: SQL Injection (exposto)
    else if (req.url.includes('/api?query=')) {
      const q = req.url.split('query=')[1] || '';
      res.end(`HTTP/1.1 200 OK\nContent-Type: text/html\n\n` +
        `<div>SQL Query: SELECT * FROM users WHERE id='${q}</div>`);
    }

    // A03: XSS Reflected (exposto)
    else if (req.url.includes('/api?input=')) {
      const inp = req.url.split('input=')[1] || '';
      res.end(`HTTP/1.1 200 OK\nContent-Type: text/html\n\n` +
        `<div>Input: ${inp}</div>`);
    }

    // A04: Login Auth Failure (exposto)
    else if (req.url.includes('/api/auth/login')) {
      res.end(`HTTP/1.1 200 OK\nContent-Type: application/json\n\n` +
        JSON.stringify({ success: req.method === 'POST', message: 'API disponível' }));
    }

    // A05: Headers parciais (intencional)
    else if (req.url === '/') {
      res.setHeader('x-frame-options', 'SAMEORIGIN');
      res.end(`HTTP/1.1 200 OK\nContent-Type: text/html\n\n` +
        '<h1>LUCIFER-v8.9.0 MOCK SERVER</h1>' +
        '<p>Port: localhost:3456</p>' +
        '<p>Vulnerabilidades: A01,A03,A04,A05</p>' +
        '</div><hr><a href="/admin/dashboard">Admin Panel</a> | ' +
        '<a href="/api?query=test">Test SQLi</a>');
    }

    // Acesso direto (violação A01)
    else {
      res.end(`HTTP/1.1 200 OK\nContent-Type: text/html\n\n` +
        '<h1>LUCIFER SECRET DATA</h1><p>API Key: LUCIFER_KEY_2026</p>');
    }
  });

  server.listen(3456, () => {
    console.log('╔══════════════════════════════╗');
    console.log('║  LUCIFER-v8.9.0 MOCK SERVER║');
    console.log('║  RODANDO: localhost:3456   ║');
    console.log('╚══════════════════════════════╝\n');
  });

  return server;
}

// Iniciar servidor
const server = createServer();

// Expor estatísticas para teste (lucro per-request)
server.on('request', (req, res) => {
  const now = Date.now();
  req.duration = now - server.startTime || now;
});
