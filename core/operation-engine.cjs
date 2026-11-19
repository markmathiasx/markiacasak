'use strict';
const { now, uuid } = require('./util.cjs');

class OperationEngine {
  constructor({ packetGenerator, sessions, store, broadcast, maxBurst = 120, maxQueue = 100 }) {
    this.packetGenerator = packetGenerator;
    this.sessions = sessions;
    this.store = store;
    this.broadcast = broadcast;
    this.maxBurst = maxBurst;
    this.maxQueue = maxQueue;
    this.queue = [];
    this.running = false;
  }

  enqueue(request) {
    if (this.queue.length >= this.maxQueue) {
      const error = new Error('QUEUE_FULL');
      error.code = 'QUEUE_FULL';
      throw error;
    }
    const job = {
      id: uuid(),
      status: 'QUEUED',
      provider: request.provider,
      vector: request.vector,
      intensity: request.intensity,
      createdAt: now(),
    };
    this.queue.push({ job, request });
    try {
      this.broadcast({ type: 'QUEUE_UPDATE', queued: this.queue.length, running: this.running, timestamp: now() });
    } catch {
      this.store.metrics.errors += 1;
    }
    queueMicrotask(() => { void this.runNext(); });
    return { ...job };
  }

  async runNext() {
    if (this.running || this.queue.length === 0) return;
    this.running = true;
    const { job, request } = this.queue.shift();
    const started = process.hrtime.bigint();
    job.status = 'RUNNING';
    job.startedAt = now();
    let session;
    try {
      this.broadcast({ type: 'OPERATION_STARTED', ...job });
      session = this.sessions.create(`${job.provider}-${job.vector}`);
      const burst = Math.min(this.maxBurst, Math.max(1, Math.trunc(request.intensity)));
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

        if (i > 0 && i % 20 === 0) await new Promise(resolve => setTimeout(resolve, 1));
      }

      const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
      Object.assign(job, {
        status: 'DONE',
        completedAt: now(),
        framesGenerated: burst,
        elapsedMs: Math.round(elapsedMs * 1000) / 1000,
        sessionId: session.id,
        sampleHashes: sample.map(event => event.sha256),
      });
      this.store.pushOperation(job);
      this.broadcast({ type: 'OPERATION_COMPLETED', ...job });
    } catch (error) {
      this.store.metrics.errors += 1;
      Object.assign(job, {
        status: 'FAILED',
        completedAt: now(),
        error: error instanceof Error ? error.message : 'OPERATION_FAILED',
      });
      try { this.store.pushOperation(job); } catch {}
      try { this.broadcast({ type: 'OPERATION_FAILED', ...job }); } catch {}
    } finally {
      if (session) this.sessions.remove(session.sid);
      this.running = false;
      try {
        this.broadcast({ type: 'QUEUE_UPDATE', queued: this.queue.length, running: false, timestamp: now() });
      } catch {}
      if (this.queue.length) queueMicrotask(() => { void this.runNext(); });
    }
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
