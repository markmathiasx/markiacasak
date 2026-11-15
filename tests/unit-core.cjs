'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { PacketGenerator } = require('../core/packet-generator.cjs');
const { SessionManager } = require('../core/session-manager.cjs');
const { OperationEngine } = require('../core/operation-engine.cjs');

test('synthetic Socket.IO hashes match emitted UTF-8 frames', () => {
  const p = new PacketGenerator().makeSocketIo('lab.test', { count: 1 });
  assert.equal(p.format, 'socket.io-text');
  assert.equal(p.bytes, Buffer.byteLength(p.frame));
  assert.equal(p.sha256, crypto.createHash('sha256').update(p.frame).digest('hex'));
  assert.equal(JSON.parse(p.frame.slice(2))[1].synthetic, true);
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
