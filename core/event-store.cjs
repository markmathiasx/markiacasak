'use strict';
const fs = require('fs');
const { ensureDir, appendNdjson, atomicJsonWrite, now } = require('./util.cjs');

class EventStore {
  constructor(config) {
    this.config = config;
    this.events = [];
    this.operations = [];
    this.observations = [];
    this.metrics = {
      eventsTotal: 0,
      operationsTotal: 0,
      wsMessagesIn: 0,
      wsMessagesOut: 0,
      framesGenerated: 0,
      errors: 0,
      startedAt: now(),
    };
    ensureDir(config.paths.runtime);
    ensureDir(config.paths.logs);
    this.restore();
  }

  restore() {
    try {
      if (fs.existsSync(this.config.paths.state)) {
        const raw = JSON.parse(fs.readFileSync(this.config.paths.state, 'utf8'));
        this.operations = Array.isArray(raw.operations) ? raw.operations.slice(0, this.config.maxOperations) : [];
        this.observations = Array.isArray(raw.observations) ? raw.observations.slice(0, 300) : [];
        if (raw.metrics) this.metrics = { ...this.metrics, ...raw.metrics };
      }
    } catch {
      this.metrics.errors += 1;
    }
    try {
      if (!fs.existsSync(this.config.paths.events)) return;
      const lines = fs.readFileSync(this.config.paths.events, 'utf8').trim().split('\n').filter(Boolean);
      this.events = lines.slice(-this.config.maxEvents).map(line => JSON.parse(line)).reverse();
    } catch {
      this.events = [];
      this.metrics.errors += 1;
    }
  }

  persist() {
    atomicJsonWrite(this.config.paths.state, {
      version: this.config.version,
      persistedAt: now(),
      operations: this.operations.slice(0, this.config.maxOperations),
      observations: this.observations.slice(0, 300),
      metrics: this.metrics,
    });
  }

  pushEvent(event) {
    this.events.unshift(event);
    if (this.events.length > this.config.maxEvents) this.events.length = this.config.maxEvents;
    this.metrics.eventsTotal += 1;
    appendNdjson(this.config.paths.events, event, this.config.logMaxBytes);
    if (this.metrics.eventsTotal % this.config.eventPersistEvery === 0) this.persist();
  }

  pushOperation(op) {
    this.operations.unshift(op);
    if (this.operations.length > this.config.maxOperations) this.operations.length = this.config.maxOperations;
    this.metrics.operationsTotal += 1;
    this.persist();
  }

  pushObservation(obs) {
    this.observations.unshift(obs);
    if (this.observations.length > 300) this.observations.length = 300;
    this.persist();
  }

  audit(entry) {
    appendNdjson(this.config.paths.audit, entry, this.config.logMaxBytes);
  }

  snapshot() {
    return {
      events: this.events.slice(0, 200),
      operations: this.operations.slice(0, 100),
      observations: this.observations.slice(0, 100),
      metrics: { ...this.metrics },
    };
  }
}

module.exports = { EventStore };
