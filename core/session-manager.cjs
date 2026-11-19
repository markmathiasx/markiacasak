'use strict';
const crypto = require('crypto');
const { now, uuid } = require('./util.cjs');

class SessionManager {
  constructor(maxSessions = 256) {
    this.sessions = new Map();
    this.maxSessions = maxSessions;
  }

  create(label = 'local-lab') {
    while (this.sessions.size >= this.maxSessions) {
      const oldest = this.sessions.keys().next().value;
      this.sessions.delete(oldest);
    }
    const sid = crypto.randomBytes(12).toString('hex');
    const session = {
      id: uuid(),
      sid,
      label: String(label).slice(0, 80),
      createdAt: now(),
      sequence: 0,
      synthetic: true,
    };
    this.sessions.set(sid, session);
    return { ...session };
  }

  next(sid) {
    const s = this.sessions.get(sid);
    if (!s) return null;
    s.sequence += 1;
    return { ...s };
  }

  list() {
    return [...this.sessions.values()].map(x => ({ ...x }));
  }

  remove(sid) {
    this.sessions.delete(sid);
  }

  reset() {
    this.sessions.clear();
  }
}

module.exports = { SessionManager };
