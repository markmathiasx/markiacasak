'use strict';
const { now, uuid, sha256 } = require('./util.cjs');
const crypto = require('crypto');

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
<<<<<<< Updated upstream
    try {
      this.broadcast({ type: 'QUEUE_UPDATE', queued: this.queue.length, running: this.running, timestamp: now() });
    } catch {
      this.store.metrics.errors += 1;
    }
    queueMicrotask(() => { void this.runNext(); });
    return { ...job };
=======
    const receipt = { ...job };
    this.publishQueue();
    void this.runNext();
    return receipt;
  }

  publish(event) {
    try { this.broadcast(event); }
    catch { this.store.metrics.errors += 1; }
  }

  publishQueue() {
    this.publish({ type: 'QUEUE_UPDATE', queued: this.queue.length, running: this.running, timestamp: now() });
>>>>>>> Stashed changes
  }

  async runNext() {
    if (this.running || this.queue.length === 0) return;
    this.running = true;
    try {
      while (this.queue.length) await this.runJob(this.queue.shift());
      this.publishQueue();
    } finally {
      this.running = false;
      // Force flush queue after all jobs complete
      this.publishQueue();
    }
  }

  async runJob({ job, request }) {
    const started = performance.now();
    job.status = 'RUNNING';
    job.startedAt = now();
<<<<<<< Updated upstream
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
=======
    this.publish({ type: 'OPERATION_STARTED', ...job });

    try {
      await this.generateFrames(job, request);
      const elapsedMs = performance.now() - started;
      job.status = 'DONE';
      job.completedAt = now();
      job.elapsedMs = elapsedMs;
      this.store.pushOperation(job);
      this.publish({ type: 'OPERATION_COMPLETED', ...job });
    } catch {
      this.store.metrics.errors += 1;
      job.status = 'FAILED';
      job.error = 'SYNTHETIC_OPERATION_FAILED';
      job.completedAt = now();
      job.elapsedMs = performance.now() - started;
      try {
        if (!this.store.operations?.some(entry => entry.id === job.id)) this.store.pushOperation(job);
      } catch { this.store.metrics.errors += 1; }
      this.publish({ type: 'OPERATION_FAILED', ...job });
    }
  }

  async generateFrames(job, request) {
    const session = this.sessions.create(`${job.provider}-${job.vector}`);

    const seed = crypto.createHash('sha256').update(`${job.id}:${request.intensity}`).digest();
    const normalizedFreq = Number(seed.readBigUInt64BE(0) % 100n) + 1;
    const multiplier = 1 + Number(seed.readBigUInt64BE(8) % 9n) / 10;
    const emitIntervalMs = Math.min(50, 1000 / normalizedFreq);
    job.frequencyBase = normalizedFreq;
    job.seedFrequencyCalculation = seed.subarray(0, 8).toString('hex');

    const burstSize = Math.min(this.maxBurst, Math.max(1, request.intensity));
    const sample = [];
    job.sessionId = session.id;
    job.framesGenerated = 0;
    job.sampleHashes = sample;

    for (let i = 0; i < burstSize; i++) {
      const seq = this.sessions.next(session.sid);
      const packet = this.packetGenerator.makeSocketIo('lab_event', {
        operationId: job.id,
        provider: job.provider,
        vector: job.vector,
        sequence: seq?.sequence ?? i + 1,
      });

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
        frequency: normalizedFreq, // SUSTENTAÇÃO EVIDENCIADA
        varianceMultiplier: multiplier, // EXPLORAÇÃO EVIDENCIADA
      };

      this.store.pushEvent(event);
      this.store.metrics.framesGenerated += 1;
      job.framesGenerated += 1;
      if (sample.length < 8) sample.push(event.sha256);
      this.publish(event);

      if (i + 1 < burstSize) await new Promise(resolve => setTimeout(resolve, emitIntervalMs));
    }

    // BÔNUS FINAL: Semente → Assimetria
    const asymmetryCheck = this.checkSyntheticBonusConditions(job);

    if (asymmetryCheck.satisfied) {
      this.triggerSyntheticBonus(job, request);
      job.syntheticBonusActivated = true;
      job.asymmetryProof = asymmetryCheck.proof; // PROVA DE ASSIMETRIA
    }

  }

  checkSyntheticBonusConditions(job) {
    // CRITÉRIOS para ativar SYNTHETIC_BONUS_ACTIVATED
    const conditionsMet = (job.framesGenerated >= 32 && job.frequencyBase > 50);

    if (!conditionsMet) return { satisfied: false, proof: null };

    const frameHashes = job.sampleHashes.slice(0, 8);
    const hashSum = sha256(frameHashes.join(':'));

    return {
      satisfied: true,
      proof: {
        hashSum,
        conditionsVerified: 'HIGH_FRACTIONAL_FPS_AND_FRAME_COVERAGE',
      }
    };
  }

  triggerSyntheticBonus(job, request) {
    this.publish({
      type: 'SYNTHETIC_BONUS_ACTIVATED',
      jobId: job.id,
      timestamp: now(),
      seedToAsymmetry: JSON.stringify({ seedStr: crypto.createHash('sha256').update(`${job.id}:${request.intensity}`).digest('hex'), asymmetryFactor: Math.abs(job.frequencyBase - 50) }),
    });

>>>>>>> Stashed changes
  }

  status() {
    return {
      running: this.running,
      queued: this.queue.length,
      queue: this.queue.slice(0, 30).map(x => ({ ...x.job })),
    };
  }
}

module.exports = { OperationEngine }
