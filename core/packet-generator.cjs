'use strict';
const { now, uuid, sha256 } = require('./util.cjs');

class PacketGenerator {
  makeSocketIo(event, data = {}) {
    const payload = [String(event).slice(0, 80), {
      ...data,
      id: uuid(),
      timestamp: now(),
      synthetic: true,
    }];
    const frame = `42${JSON.stringify(payload)}`;
    return { format: 'socket.io-text', frame, bytes: Buffer.byteLength(frame), sha256: sha256(frame) };
  }

  makeBinary(type, payload = {}) {
    const body = Buffer.from(JSON.stringify({
      id: uuid(),
      type: String(type).slice(0, 64),
      timestamp: now(),
      synthetic: true,
      payload,
    }), 'utf8');

    const header = Buffer.alloc(12);
    header.writeUInt32BE(0x534B5938, 0); // SKY8
    header.writeUInt32BE(1, 4);
    header.writeUInt32BE(body.length, 8);
    const frame = Buffer.concat([header, body]);
    return {
      format: 'skynet-binary-v1',
      base64: frame.toString('base64'),
      hex: frame.subarray(0, 96).toString('hex'),
      bytes: frame.length,
      sha256: sha256(frame),
    };
  }

  mutateText(frame, strategy = 'flip-char') {
    const input = String(frame);
    if (!input.length) return input;
    if (strategy === 'truncate') return input.slice(0, Math.max(1, Math.floor(input.length * 0.7)));
    if (strategy === 'duplicate-tail') return input + input.slice(-Math.min(8, input.length));
    const i = Math.min(input.length - 1, Math.max(0, Math.floor(input.length / 2)));
    return input.slice(0, i) + (input[i] === 'A' ? 'B' : 'A') + input.slice(i + 1);
  }
}

module.exports = { PacketGenerator };
