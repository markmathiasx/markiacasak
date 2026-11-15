'use strict';
const { randomUUID } = require('node:crypto');
const SCOPE = 'LOCAL_SYNTHETIC_ONLY';
const COUNT = 512;
const profiles = {
  frequent: { probability: .65, value: u => 1 + u },
  dispersed: { probability: .35, value: u => 4 * u },
  asymmetric: { probability: .35, value: u => u > .95 ? 10 : u },
};

function sample(seed, name) {
  const profile = profiles[name];
  let state = seed;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const values = [];
  const gaps = {};
  let previous = -1;
  let hits = 0;
  for (let i = 0; i < COUNT; i++) {
    const occurs = next() < profile.probability;
    const magnitude = next();
    values.push(occurs ? profile.value(magnitude) : 0);
    if (!occurs) continue;
    hits++;
    if (previous >= 0) gaps[i - previous] = (gaps[i - previous] || 0) + 1;
    previous = i;
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / COUNT;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / COUNT;
  values.sort((a, b) => a - b);
  return {
    profile: name, samples: COUNT, hits, misses: COUNT - hits, gaps, mean, variance,
    p50: values[Math.ceil(.50 * COUNT) - 1], p95: values[Math.ceil(.95 * COUNT) - 1],
  };
}

function mountScenarioLab(app) {
  const sessions = new Map();
  const lifetime = 60 * 60 * 1000;
  const base = '/api/scenario-lab';
  const reply = (res, status, body) => res.status(status).json({ scope: SCOPE, ...body });
  const stateOf = session => ({ status: session.round ? 'completed' : 'waiting', round: session.round });

  app.use(base, (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) {
      return reply(res, 403, { error: 'LAB_LOCAL_ONLY' });
    }
    const origin = req.get('origin');
    if (origin && !/^https?:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(origin)) {
      return reply(res, 403, { error: 'LAB_LOCAL_ONLY' });
    }
    next();
  });
  app.post(base + '/session', (_req, res) => {
    const now = Date.now();
    for (const [id, session] of sessions) if (session.expires <= now) sessions.delete(id);
    if (sessions.size >= 128) return reply(res, 429, { error: 'LAB_SESSION_LIMIT' });
    const id = randomUUID();
    sessions.set(id, { expires: now + lifetime, round: null });
    return reply(res, 201, { session: id });
  });
  app.use(base, (req, res, next) => {
    const id = req.get('x-lab-session');
    const session = sessions.get(id);
    if (!session || session.expires <= Date.now()) return reply(res, 404, { error: 'LAB_SESSION_EXPIRED' });
    session.expires = Date.now() + lifetime;
    res.locals.scenarioSession = session;
    next();
  });
  app.get(base + '/state', (_req, res) => reply(res, 200, stateOf(res.locals.scenarioSession)));
  app.post(base + '/action', (req, res) => {
    const session = res.locals.scenarioSession;
    const { mode, seed, profile, comparison, roundId } = req.body || {};
    if (mode === 'C') {
      const round = session.round;
      if (!round || round.id !== roundId) return reply(res, 409, { error: 'ROUND_NOT_CURRENT' });
      const repeated = Boolean(round.bonus);
      round.bonus ??= { type: 'SYNTHETIC_BONUS_ACTIVATED', roundId, at: new Date().toISOString() };
      return reply(res, 200, { ...stateOf(session), repeated });
    }
    if (!['A', 'B'].includes(mode) || !Number.isInteger(seed) || seed < 0 || seed > 4294967295 ||
        !Object.hasOwn(profiles, profile) ||
        (mode === 'B' && (!Object.hasOwn(profiles, comparison) || profile === comparison))) {
      return reply(res, 400, { error: 'INVALID_SCENARIO' });
    }
    const results = [sample(seed, profile)];
    if (mode === 'B') results.push(sample(seed, comparison));
    session.round = { id: randomUUID(), mode, seed, results, bonus: null };
    return reply(res, 201, stateOf(session));
  });
}

module.exports = { mountScenarioLab };
