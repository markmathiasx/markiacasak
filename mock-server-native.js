/**
 * MOCK SERVER V8.9.0 - NATIVE JS (NÃO EXPRESS)
 * Port: localhost:3456
 */

const http = require('http');

async function startMockServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let data = '';
      
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => {
        // A01 - Broken Access Control (sem auth)
        if (req.url.includes('/admin/dashboard') || req.url.includes('/secret')) {
          res.writeHead(200, {'Content-Type': 'text/html'});
          res.end(`<h1>LUCIFER ADMIN PANEL</h1><p>Acesso: root@lucifer.net</p>`);
        } 
        // A03 - SQL Injection
        else if (req.url.includes('/api?query=')) {
          const q = req.url.split('query=')[1] || '';
          res.writeHead(200, {'Content-Type': 'text/html'});
          res.end(`<div>SQLi: ${q}</div>`);
        } 
        // A04 - Auth Failure (exposto)
        else if (req.url.includes('/api/auth/login')) {
          res.writeHead(200, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({success: true, message: 'API disponível'}));
        } 
        // Acesso direto
        else {
          res.writeHead(200, {'Content-Type': 'text/html'});
          res.end(`<h1>LUCIFER MOCK SERVER</h1>`);
        }
        
        res.on('finish', () => resolve({status: 200}));
      });
    });

    server.listen(3456, () => {
    console.log('✅ LUCIFER MOCK SERVER');
    resolve({status: 200});
  });
  });
}
