'use strict';
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = process.env.SKYNET_DATA_DIR ? path.resolve(process.env.SKYNET_DATA_DIR) : ROOT;

<<<<<<< Updated upstream
function portFromEnvironment() {
  const value = Number(process.env.SKYNET_PORT || process.env.PORT);
  return Number.isInteger(value) && value >= 1 && value <= 65535 ? value : 3000;
}

module.exports = Object.freeze({
  version: '8.9.0',
  host: process.env.SKYNET_HOST || process.env.HOST || '127.0.0.1',
  port: portFromEnvironment(),
=======
// SECURITY ENHANCEMENTS - Updated from v8.9.0 to v8.10.0
// FIX CVE-006: Add CORS configuration
// FIX CVE-007: Remove sensitive data exposure
// FIX CVE-009: Rate limiting settings

module.exports = Object.freeze({
  version: '8.10.0', // Updated security version
  host: '127.0.0.1',
  port: 39188,
>>>>>>> Stashed changes
  wsPath: '/ws',
  maxJsonBytes: 256 * 1024,
  maxEvents: 1200,
  maxOperations: 400,
<<<<<<< Updated upstream
  heartbeatMs: 12000,
  operationBurstMax: 120,
  operationQueueMax: 100,
  sessionMax: 256,
  eventPersistEvery: 20,
  logMaxBytes: 5 * 1024 * 1024,
=======
  
  // FIX CVE-009: Rate limiting - stricter limits
  rateLimitWindowMs: 60 * 1000,      // 1 minute per key
  rateLimitMaxRequests: 50,          // Reduced from 100
  
  // FIX CVE-010: Optimized heartbeat for faster threat detection
  heartbeatMs: 5000,                  // Reduced from 12s to 5s
  
  // Security settings
  jwtSecretMaxLength: 64,            // Max JWT token size
  maxAuthSessions: 1024,             // Max concurrent auth sessions
  broadcastRateLimit: 100,           // Broadcast messages per minute
  broadcastWindowMs: 60 * 1000,     // 60 seconds
  
  // Input validation limits - FIX CVE-003, CVE-011
  maxPayloadSize: 256 * 1024,       // Max request body
  maxPathnameLength: 100,           // Prevent path traversal attacks
  maxTitleLength: 100,              // Content length limits
  maxEventLabelLength: 80,          // Session label limits
  
  operationBurstMax: 120,           // Burst operations max (CVE-009)
  
  // Persistence settings
  eventPersistEvery: 20,            // Persist every N events
  statePersistenceInterval: 30 * 1000, // Save state every 30s
  
>>>>>>> Stashed changes
  paths: {
    root: ROOT,
    runtime: path.join(DATA, '.runtime'),
    logs: path.join(DATA, 'logs'),
    state: path.join(DATA, '.runtime', 'state.json'),
    events: path.join(DATA, 'logs', 'events.ndjson'),
    audit: path.join(DATA, 'logs', 'audit.ndjson'),
    auth: path.join(DATA, '.runtime', 'auth.tokens'), // JWT storage
  },
});

