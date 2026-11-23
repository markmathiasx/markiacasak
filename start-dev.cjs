const { spawn } = require('child_process');

console.log('\x1b[36m[SKYNET]\x1b[0m Iniciando Servidor Node.js (39188) e Vite (5173) juntos...');

const backend = spawn(process.execPath, ['server.cjs', '--host', '127.0.0.1', '--port', '39188'], { stdio: 'inherit' });
const frontend = spawn(process.execPath, ['./node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173'], { stdio: 'inherit' });

function cleanup() {
  backend.kill();
  frontend.kill();
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
