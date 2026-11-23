# SKYNET V8 8.9.0 — validação local em 15/11/2026

O dashboard está em http://localhost:5173/ e a API responde em
http://127.0.0.1:39188/health. Use `SETUP-PROD.bat` para instalar as
dependências e verificar o projeto. Inicie o dashboard e a API juntos com
`SKYNET-EXECUTABLE.bat` ou `EXECUTE-ONCE.bat`.

| Verificação | Resultado |
| --- | --- |
| `npm run test:all` | 20 testes passaram |
| `node test-fixes.cjs` | 8 testes passaram |
| `npm run lint` e `npm run build` | Passaram |
| `npm run doctor` | 4 verificações passaram |
| `SETUP-PROD.bat` e `EXECUTE-ONCE.bat -SkipTests -NoBrowser` | Saída 0 |
| Chrome | Core e WebSocket online, com mensagens CONNECTED e PONG |

Os testes de fila e dos modos A/B/C usam dados sintéticos locais.
As referências a CVEs no relatório anterior não foram verificadas como
identificadores oficiais. O escopo desta validação é o runtime local.

## Relatório anterior (histórico)

# SKYNET V8 LUCIFER - ENTREGA FINAL (v8.9.0)
# Data: 15/11/2026

## Executáveis Criados para Entrega Pronta:
- `EXECUTE-ONCE.bat` - Inicia servidor backend imediatamente
- `SETUP-PROD.bat` - Script de instalação final completo
- `SKYNET-EXECUTABLE.bat` - Executável pronto com endpoints listados

## Status da Instalação e Testes:
✓ Server inicialização: PASS (porta 39188)
✓ Health endpoint: PASS (JSON, CLI port override)
✓ Site observer: PASS (validação de metadata)
✖ Operation engine: FAIL (ERRO 500 vs 202 esperado)
✖ WebSocket handshake: FAIL (timeout ~5s)

## CVE Corrigidos (8/8 críticos):
1. CVE-001 - SHA256 compatível Node v24 (digest('hex'))
2. CVE-002 - Autenticação WebSocket com token 64-char hex
3. CVE-003 - Sanitização HTML em echo messages
4. CVE-004 - Detecção CRLF injection em binários
5. CVE-005 - Rate limiting broadcasts (100/min)
6. CVE-007 - Remoção de dados sensíveis endpoints públicos
7. CVE-008 - API reset requer autenticação válida
8. CVE-009 - Rate limit em /api/operation

## Endpoints Principais Disponíveis:
- POST /api/operation    - Gerar frames sintéticos (rate limited)
- POST /api/reset-lab    - Reiniciar laboratório (Bearer token req.)
- GET /health            - Saúde do sistema
- GET /api/state         - Snapshot sem dados sensíveis
- GET /api/metrics       - Métricas públicas seguras
- POST /api/observe-site - Registrar observação

## Como Executar:
1. Execute `EXECUTE-ONCE.bat` para iniciar o servidor automaticamente
2. Ou use manualmente: `node server.cjs --host 127.0.0.1 --port 39188`

## Servidor Disponível Em:
- HTTP Health check: http://127.0.0.1:39188/health
- WebSocket seguro: ws://127.0.0.1:39188/ws

## Observação de Erro Pendente:
Os testes de operation engine e websocket handshake falham devido a problemas não identificados em core/operation-engine.cjs. Verificar logs completos para diagnose exato.

