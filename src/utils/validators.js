export function validateHex(value, limit = 8) {
  if (!value) return { valid: false, kind: 'empty', message: 'Por favor, insira um valor.' };
  if (!/^[0-9A-F]+$/i.test(value)) {
    return { valid: false, kind: 'format', message: 'Caracteres fora do intervalo permitido (0-9, A-F).' };
  }
  if (value.length > limit) {
    return { valid: false, kind: 'overflow', message: `O valor excede o limite permitido (${limit} caracteres).` };
  }
  return { valid: true, kind: null, message: '' };
}
