import http from 'http';

async function startMockServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let data = '';
      req.on('data', () => {});
      req.on('end', () => {
        if (req.url.includes('/admin/dashboard')) {
          res.writeHead(200, {'Content-Type': 'text/html'});
          res.end('<h1>LUCIFER ADMIN</h1>');
        } else if (req.url.includes('/api/auth/login')) {
          res.writeHead(200, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({success: true}));
        } else {
          res.writeHead(200);
          res.end('<h1>OK</h1>');
        }
        res.on('finish', () => resolve({status: 200}));
      });
    });
    server.listen(3456, '127.0.0.1', () => {
      console.log('✅ SERVER RUNNING: localhost:3456');
    });
  });
}

startMockServer();
