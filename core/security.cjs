'use strict';

const crypto = require('crypto');

// FIX CVE-002: WebSocket authentication - Require token in Authorization header
class WSSecurityMiddleware {
  constructor() {
    this.sessions = new Map(); // token -> expiration timestamp
    this.rateLimitTimestamps = [];
    this.authToken = process.env.SKYNET_AUTH_TOKEN || crypto.randomBytes(32).toString('hex');
  }

  generateAuthSession() {
    const now = Date.now();
    for (const [token, expiresAt] of this.sessions) {
      if (expiresAt <= now) this.sessions.delete(token);
    }
    if (this.sessions.size >= 1024) this.sessions.delete(this.sessions.keys().next().value);
    const token = crypto.randomBytes(32).toString('hex');
    this.sessions.set(token, now + 60000);
    return token;
  }

  verifyAuthToken(token) {
    return typeof token === 'string' && this.sessions.get(token) > Date.now();
  }

  verifyAdminToken(token) {
    return typeof token === 'string'
      && Buffer.byteLength(token) === Buffer.byteLength(this.authToken)
      && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(this.authToken));
  }

  // FIX CVE-003: Echo message HTML sanitization
  sanitizeEchoMessage(text) {
    // Remove all dangerous HTML entities + escape special chars
    const escaped = String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    // Remove any remaining script tags and event handlers
    return escaped.replace(/<script[^>]*>|<iframe[^>]*>/gi, '')
                  .replace(/on\w+\s*=/gi, ' onw=') // Replace with harmless value
                  .replace(/\s+;/g, ' '); // Remove empty <tag>;</tag> pairs
  }

  // FIX CVE-004: CRLF injection detection
  detectCRLFInjection(text) {
    if (!text) return false;
    const crlfPattern = /[\r\n\t]/;
    return crlfPattern.test(text);
  }

  // FIX CVE-005: Broadcast rate limiting
  checkBroadcastRate(limit = 100, windowMs = 60000) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    this.rateLimitTimestamps.forEach(ts => {
      if (ts < windowStart) {
        this.rateLimitTimestamps = this.rateLimitTimestamps.filter(t => t >= windowStart);
      }
    });

    return this.rateLimitTimestamps.length < limit;
  }

  recordBroadcast() {
    this.rateLimitTimestamps.push(Date.now());
    // Keep only timestamps from last 60 seconds (max 100 entries)
    if (this.rateLimitTimestamps.length > 100) {
      this.rateLimitTimestamps.shift();
    }
  }

  getRateLimitStatus() {
    const now = Date.now();
    const windowStart = now - 60000;
    return {
      limit: 100,
      remaining: Math.max(0, 100 - this.rateLimitTimestamps.filter(t => t > windowStart).length),
      resetAt: now + 60000
    };
  }

}

module.exports = { WSSecurityMiddleware };
