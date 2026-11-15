import test from 'node:test';
import assert from 'node:assert/strict';
import { validateHex } from '../src/utils/validators.js';

test('hex vazio falha por presença', () => {
  assert.deepEqual(validateHex(''), { valid: false, kind: 'empty', message: 'Por favor, insira um valor.' });
});

test('hex inválido falha por formato', () => {
  assert.equal(validateHex('Z1').message, 'Caracteres fora do intervalo permitido (0-9, A-F).');
});

test('hex acima do limite falha por volume', () => {
  assert.equal(validateHex('A1B2C3D4E5').message, 'O valor excede o limite permitido (8 caracteres).');
});

test('hex válido passa', () => {
  assert.deepEqual(validateHex('A1B2C3D4'), { valid: true, kind: null, message: '' });
});
