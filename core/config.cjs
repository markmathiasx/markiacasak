'use strict';
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = process.env.SKYNET_DATA_DIR ? path.resolve(process.env.SKYNET_DATA_DIR) : ROOT;

function portFromEnvironment() {
  const value = Number(process.env.SKYNET_PORT || process.env.PORT);
  return Number.isInteger(value) && value >= 1 && value <= 65535 ? value : 3000;
}

module.exports = Object.freeze({
  version: '8.9.0',
  host: process.env.SKYNET_HOST || process.env.HOST || '127.0.0.1',
  port: portFromEnvironment(),
  wsPath: '/ws',
  maxJsonBytes: 256 * 1024,
  maxEvents: 1200,
  maxOperations: 400,
  heartbeatMs: 12000,
  operationBurstMax: 120,
  operationQueueMax: 100,
  sessionMax: 256,
  eventPersistEvery: 20,
  logMaxBytes: 5 * 1024 * 1024,
  paths: {
    root: ROOT,
    runtime: path.join(DATA, '.runtime'),
    logs: path.join(DATA, 'logs'),
    state: path.join(DATA, '.runtime', 'state.json'),
    events: path.join(DATA, 'logs', 'events.ndjson'),
    audit: path.join(DATA, 'logs', 'audit.ndjson'),
  },
});
