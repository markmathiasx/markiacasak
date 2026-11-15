'use strict';
const crypto = require('crypto');
const { now, uuid } = require('./util.cjs');

class SessionManager {
  constructor() {
    this.sessions = new Map();
  }

  create(label = 'local-lab') {
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

  reset() {
    this.sessions.clear();
  }
}

module.exports = { SessionManager };
