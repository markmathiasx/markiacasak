import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import process from 'node:process'

<<<<<<< Updated upstream
const backendTarget = 'http://127.0.0.1:3000'
const allowedHosts = (process.env.SKYNET_ALLOWED_HOSTS || '')
  .split(',')
  .map(host => host.trim())
  .filter(Boolean)
=======
const backendPort = Number(process.env.SKYNET_LOCAL_CORE_PORT || 39188)
if (!Number.isInteger(backendPort) || backendPort < 1 || backendPort > 65535) {
  throw new Error('SKYNET_LOCAL_CORE_PORT inválida')
}
const backendTarget = `http://127.0.0.1:${backendPort}`
>>>>>>> Stashed changes
const proxy = {
  '/health': { target: backendTarget, changeOrigin: false },
  '/api': { target: backendTarget, changeOrigin: false },
}

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_SKYNET_CORE_PORT': JSON.stringify(String(backendPort)),
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    allowedHosts,
    proxy,
  },
  preview: { allowedHosts, proxy },
  build: {
    sourcemap: process.env.SKYNET_SOURCEMAP === '1',
  },
})

