'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { PacketGenerator } = require('../core/packet-generator.cjs');
const { SessionManager } = require('../core/session-manager.cjs');
const { OperationEngine } = require('../core/operation-engine.cjs');
const { once } = require('node:events');
const { EventEmitter } = require('node:events');

test('synthetic Socket.IO hashes match emitted UTF-8 frames', () => {
  const p = new PacketGenerator().makeSocketIo('lab.test', { count: 1 });
  assert.equal(p.format, 'socket.io-text');
  assert.equal(p.bytes, Buffer.byteLength(p.frame));
  assert.equal(p.sha256, crypto.createHash('sha256').update(p.frame).digest('hex'));
  assert.equal(JSON.parse(p.frame.slice(2))[1].synthetic, true);
});

test('a synthetic write failure is reported and the following job completes', async () => {
  const operations = [];
  const emitter = new EventEmitter();
  let fail = true;
  const store = {
    operations,
    metrics: { framesGenerated: 0, errors: 0 },
    pushEvent: () => { if (fail) { fail = false; throw new Error('fixture'); } },
    pushOperation: job => operations.push(job),
  };
  const engine = new OperationEngine({
    packetGenerator: new PacketGenerator(), sessions: new SessionManager(), store,
    broadcast: event => emitter.emit(event.type, event),
  });
  const complete = once(emitter, 'OPERATION_COMPLETED', { signal: AbortSignal.timeout(1000) });
  const first = engine.enqueue({ provider: 'PGSOFT', vector: 'FIXTURE', intensity: 1 });
  const next = engine.enqueue({ provider: 'PGSOFT', vector: 'FIXTURE', intensity: 2 });
  assert.equal(first.status, 'QUEUED');
  assert.equal((await complete)[0].id, next.id);
  assert.deepEqual(operations.map(job => job.status), ['FAILED', 'DONE']);
  assert.equal(store.metrics.errors, 1);
});

test('local sessions advance sequence without sharing session ids', () => {
  const mgr = new SessionManager();
  const a = mgr.create('test');
  const b = mgr.create('test');
  assert.notEqual(a.sid, b.sid);
  assert.equal(mgr.next(a.sid).sequence, 1);
  assert.equal(mgr.next(a.sid).sequence, 2);
  assert.equal(mgr.next(b.sid).sequence, 1);
});

test('local sessions remain bounded', () => {
  const manager = new SessionManager(2);
  const first = manager.create('first');
  manager.create('second');
  manager.create('third');
  assert.equal(manager.list().length, 2);
  assert.equal(manager.next(first.sid), null);
});

test('operation engine persists exactly requested synthetic frames', async () => {
  const events = [];
  const operations = [];
  const broadcasts = [];
  const store = {
    metrics: {framesGenerated:0, errors:0},
    pushEvent: e => events.push(e),
    pushOperation: o => operations.push({...o}),
  };
  const engine = new OperationEngine({
    packetGenerator: new PacketGenerator(),
    sessions: new SessionManager(),
    store,
    broadcast: e => broadcasts.push(e),
    maxBurst: 120,
  });
  const requested = engine.enqueue({provider:'PGSOFT',vector:'RACE_CONDITION',intensity:12});
  for (let n = 0; n < 100 && !operations.length; n++) await new Promise(r => setTimeout(r, 2));
  assert.ok(operations.length, 'operation must persist');
  const finished = operations[0];
  assert.equal(finished.id, requested.id);
  assert.equal(finished.status, 'DONE');
  assert.equal(finished.framesGenerated, 12);
  assert.equal(events.length, 12);
  assert.equal(store.metrics.framesGenerated, 12);
  assert.deepEqual(events.map(x => x.sequence), Array.from({length:12},(_,i)=>i+1));
  assert.equal(broadcasts.some(x => x.type === 'OPERATION_COMPLETED' && x.id === requested.id), true);
});

test('operation engine recovers after a failed job', async () => {
  const operations = [];
  let fail = true;
  const store = {
    metrics: { framesGenerated: 0, errors: 0 },
    pushEvent() {
      if (fail) {
        fail = false;
        throw new Error('simulated storage failure');
      }
    },
    pushOperation: operation => operations.push({ ...operation }),
  };
  const engine = new OperationEngine({
    packetGenerator: new PacketGenerator(),
    sessions: new SessionManager(),
    store,
    broadcast() {},
  });
  const failed = engine.enqueue({ provider: 'PGSOFT', vector: 'FAILURE_TEST', intensity: 1 });
  const completed = engine.enqueue({ provider: 'PGSOFT', vector: 'RECOVERY_TEST', intensity: 1 });
  for (let attempt = 0; attempt < 100 && operations.length < 2; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 2));
  }
  assert.equal(operations.find(item => item.id === failed.id).status, 'FAILED');
  assert.equal(operations.find(item => item.id === completed.id).status, 'DONE');
  assert.equal(engine.status().running, false);
});
