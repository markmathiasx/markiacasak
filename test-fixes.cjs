const assert = require('assert');

// Teste de segurança SKYNET V8 LUCIFER v8.9.0
console.log('\n=== TEST SUITE: Regressões locais de segurança ===\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ ${name}: ${err.message}`);
    failed++;
  }
}

// Teste 1: Carregar middleware corretamente
test('WSSecurityMiddleware carregado', () => {
  const wssAuth = require('./core/security.cjs');
  assert(wssAuth.WSSecurityMiddleware, 'Deve exportar WSSecurityMiddleware');
});

// Teste 2: Autenticação vazia rejeitada (CVE-002)
test('Rejeita autenticação vazia', () => {
  const wssAuth = require('./core/security.cjs').WSSecurityMiddleware;
  const instance = new wssAuth();
  assert.strictEqual(instance.verifyAuthToken(null), false, 'Deve rejeitar null');
  assert.strictEqual(instance.verifyAuthToken(''), false, 'Deve rejeitar string vazia');
});

// Teste 3: Token inválido rejeitado (64 chars)
test('Rejeita token curto e token desconhecido', () => {
  const wssAuth = require('./core/security.cjs').WSSecurityMiddleware;
  const instance = new wssAuth();
  assert.strictEqual(instance.verifyAuthToken('0123456789abcdef0123456789abcdef'), false, 'Token inválido rejeitado');
});

// Teste 4: Token formatado correto (64 chars)
test('Aceita token formatado válido', () => {
  const wssAuth = require('./core/security.cjs').WSSecurityMiddleware;
  const instance = new wssAuth();
  
  // Token não registrado deve ser rejeitado
  assert.strictEqual(instance.verifyAuthToken('0123456789abcdef0123456789abcdef'), false);
  
  // Token registrado deve ser aceito
  const token = instance.generateAuthSession();
  const unknownToken = '0'.repeat(64);
  assert.strictEqual(instance.verifyAuthToken(unknownToken), false);
  assert.notEqual(instance.generateAuthSession(), token);
  assert(token.length === 64, 'Token deve ter 64 chars hex');
  assert.strictEqual(instance.verifyAuthToken(token), true, 'Token registrado aceito');
});

// Teste 5: Sanitização HTML (CVE-003)
test('Sanitização de HTML/XSS', () => {
  const wssAuth = require('./core/security.cjs').WSSecurityMiddleware;
  const instance = new wssAuth();
  
  const input = '<script>alert("xss")</script>test';
  const output = instance.sanitizeEchoMessage(input);
  
  assert(output.includes('&lt;'), 'Deve santizar < como &lt;');
  assert(!output.includes('<script'), 'Não deve conter script tag original');
});

// Teste 6: Detecção CRLF injection (CVE-004)
test('Detecção de CRLF injection', () => {
  const wssAuth = require('./core/security.cjs').WSSecurityMiddleware;
  const instance = new wssAuth();
  
  assert.strictEqual(instance.detectCRLFInjection('normal text'), false, 'Texto normal não detectado');
  assert.strictEqual(instance.detectCRLFInjection('line1\r\nline2'), true, 'CRLF detectado');
  assert.strictEqual(instance.detectCRLFInjection('line1\r\tline2'), true, 'CRLF com tab detectado');
});

// Teste 7: Rate limiting broadcast (CVE-005)
test('Rate limiting de broadcasts', () => {
  const wssAuth = require('./core/security.cjs').WSSecurityMiddleware;
  const instance = new wssAuth();
  
  // Status inicial
  const status = instance.getRateLimitStatus();
  assert.strictEqual(status.limit, 100, 'Limite deve ser 100');
  
  // Registrar alguns broadcasts
  for (let i = 0; i < 50; i++) {
    instance.recordBroadcast();
  }
  
  const afterStatus = instance.getRateLimitStatus();
  assert(afterStatus.remaining > 0, 'Deve ter broadcasts restantes');
});

// Teste 8: Compatibilidade Node v24 (CVE-007 + util.cjs)
test('Compatibilidade SHA256 Node v24', () => {
  const util = require('./core/util.cjs');
  
  assert(util.sanitizeText, 'Deve exportar sanitizeText');
  
  // Teste de sanização básica (Node v24 - remove control chars)
  const output = util.sanitizeText('<div>test</div>', 50);
  assert(typeof output === 'string', 'Deve retornar string');
  assert(output.length <= 50, 'Texto deve estar truncado em max chars');
  
  // Verifica que SHA256 funciona com Node v24
  const hash = util.sha256('test');
  assert(hash.length === 64, 'SHA256 deve retornar 64 chars hex');
  assert(/^[a-f0-9]{64}$/.test(hash), 'SHA256 deve retornar texto hexadecimal válido');
});

// Resumo final
console.log('\n=== RESUMO ===');
console.log(`Passados: ${passed}`);
console.log(`Falhas: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 TODOS OS TESTES CONCLUÍDOS COM SUCESSO!');
}
