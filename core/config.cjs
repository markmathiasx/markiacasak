'use strict';
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = process.env.SKYNET_DATA_DIR ? path.resolve(process.env.SKYNET_DATA_DIR) : ROOT;

module.exports = Object.freeze({
  version: '8.9.0',
  host: '127.0.0.1',
  port: 3000,
  wsPath: '/ws',
  maxJsonBytes: 256 * 1024,
  maxEvents: 1200,
  maxOperations: 400,
  heartbeatMs: 12000,
  operationBurstMax: 120,
  eventPersistEvery: 20,
  paths: {
    root: ROOT,
    runtime: path.join(DATA, '.runtime'),
    logs: path.join(DATA, 'logs'),
    state: path.join(DATA, '.runtime', 'state.json'),
    events: path.join(DATA, 'logs', 'events.ndjson'),
    audit: path.join(DATA, 'logs', 'audit.ndjson'),
  },
});
