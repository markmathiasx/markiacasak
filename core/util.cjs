'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function now() { return new Date().toISOString(); }
function uuid() { return crypto.randomUUID(); }

function sanitizeText(value, max = 160) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

function atomicJsonWrite(file, value) {
  ensureDir(path.dirname(file));
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

function appendNdjson(file, value) {
  ensureDir(path.dirname(file));
  fs.appendFileSync(file, JSON.stringify(value) + '\n', 'utf8');
}

function sha256(value) {
  const raw = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  return crypto.createHash('sha256').update(raw).digest('hex');
}

module.exports = { now, uuid, sanitizeText, ensureDir, atomicJsonWrite, appendNdjson, sha256 };
