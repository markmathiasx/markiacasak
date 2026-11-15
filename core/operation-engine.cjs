'use strict';
const { now, uuid } = require('./util.cjs');

class OperationEngine {
  constructor({ packetGenerator, sessions, store, broadcast, maxBurst = 120 }) {
    this.packetGenerator = packetGenerator;
    this.sessions = sessions;
    this.store = store;
    this.broadcast = broadcast;
    this.maxBurst = maxBurst;
    this.queue = [];
    this.running = false;
  }

  enqueue(request) {
    const job = {
      id: uuid(),
      status: 'QUEUED',
      provider: request.provider,
      vector: request.vector,
      intensity: request.intensity,
      createdAt: now(),
    };
    this.queue.push({ job, request });
    this.broadcast({ type: 'QUEUE_UPDATE', queued: this.queue.length, running: this.running, timestamp: now() });
    this.runNext().catch(() => {});
    return { ...job };
  }

  async runNext() {
    if (this.running || this.queue.length === 0) return;
    this.running = true;
    const { job, request } = this.queue.shift();
    const started = process.hrtime.bigint();
    job.status = 'RUNNING';
    job.startedAt = now();
    this.broadcast({ type: 'OPERATION_STARTED', ...job });

    const session = this.sessions.create(`${job.provider}-${job.vector}`);
    const burst = Math.min(this.maxBurst, Math.max(1, request.intensity));
    const sample = [];

    for (let i = 0; i < burst; i++) {
      const seq = this.sessions.next(session.sid);
      const packet = this.packetGenerator.makeSocketIo('lab_event', {
        operationId: job.id,
        provider: job.provider,
        vector: job.vector,
        sequence: seq?.sequence ?? i + 1,
      });
      this.store.metrics.framesGenerated += 1;

      const event = {
        type: 'FRAME',
        operationId: job.id,
        provider: job.provider,
        vector: job.vector,
        sequence: i + 1,
        bytes: packet.bytes,
        sha256: packet.sha256,
        frame: packet.frame,
        timestamp: now(),
      };
      if (sample.length < 8) sample.push(event);
      this.store.pushEvent(event);
      this.broadcast(event);

      if (i > 0 && i % 20 === 0) await new Promise(r => setTimeout(r, 1));
    }

    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
    Object.assign(job, {
      status: 'DONE',
      completedAt: now(),
      framesGenerated: burst,
      elapsedMs: Math.round(elapsedMs * 1000) / 1000,
      sessionId: session.id,
      sampleHashes: sample.map(x => x.sha256),
    });
    this.store.pushOperation(job);
    this.broadcast({ type: 'OPERATION_COMPLETED', ...job });
    this.running = false;
    this.broadcast({ type: 'QUEUE_UPDATE', queued: this.queue.length, running: false, timestamp: now() });
    if (this.queue.length) await this.runNext();
  }

  status() {
    return {
      running: this.running,
      queued: this.queue.length,
      queue: this.queue.slice(0, 30).map(x => ({ ...x.job })),
    };
  }
}

module.exports = { OperationEngine };
