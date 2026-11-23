# SKYNET V8 LUCIFER 8.9.0 — pacote corrigido

Esta compilacao preserva a arquitetura local da V8.9.0 e corrige as
incompatibilidades entre os testes legados e a API enfileirada.
**Nao manipula apostas ou servidores de jogos.** O motor gera frames sinteticos locais.

## Restauracao em Windows (PowerShell 7)

Baixe `CURA-DEFINITIVA-SKYNET.ps1` e
`SKYNET-V8-LUCIFER-v8.9.0-CORRIGIDO.zip` para a mesma pasta.

Abra o PowerShell 7 e execute:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\CURA-DEFINITIVA-SKYNET.ps1
```

Alvo padrao: `C:\Users\markkk\Documents\aaa\skynet-dashboard\SKYNET-V8-LUCIFER-v8.9.0`.
Para usar outra raiz: `-Target 'C:\caminho\do\projeto'`.

O reparador confere os SHA-256 do manifesto, cria backup dos arquivos
substituidos, para somente processos identificados como pertencentes ao projeto,
<<<<<<< Updated upstream
instala dependencias quando necessario, roda 26 testes, faz o build, inicia
Node/Vite nas portas 3000/5173 e valida saude, proxy, API, fila sintetica
=======
instala dependencias quando necessario, roda 13 testes, faz o build, inicia
Node/Vite nas portas 39188/5173 e valida saude, proxy, API, fila sintetica
>>>>>>> Stashed changes
e WebSocket. Se houver falha, restaura os arquivos anteriores.
`node_modules` e os dados em `logs/`, `.runtime/`, `backups/` nao sao apagados
pelo reparador; um `npm ci` necessario pode recriar `node_modules`.

Alternativa: extraia este ZIP e execute `V8-ONECLICK.cmd`.
Para reiniciar apos corrigir: `REPAIR-SKYNET-V8.cmd` ou `START-SKYNET-V8.cmd`.
Para retornar aos arquivos anteriores: `ROLLBACK-SKYNET-V8.cmd`.

## Mudancas da correcao

- Teste `/health`: confere o identificador oficial `skynet-v8-lucifer-core`.
- Teste de operacao: confere `202 QUEUED` e espera a conclusao no `/api/state`.
- Testes do nucleo: SHA-256 de frames, isolamento de sessoes e persistencia.
- Inicializador: executa toda a suite, gerencia os PIDs diretamente e
  executa smoke checks reais de endpoints e WebSocket.
- Correcao de atualizacao de status no React (evita fechamento com estado antigo).

**Validacao no seu PC e obrigatoria**: a disponibilidade das dependencias npm e
das portas locais varia de maquina para maquina.

<<<<<<< Updated upstream
## Execucao em Linux ou ambiente na nuvem

Use Node.js 22.12 ou mais recente. O modo de producao serve o frontend compilado,
a API e o WebSocket pelo mesmo processo e pela mesma porta:

```bash
npm ci --no-audit --no-fund
npm test
npm start
```

Por padrao, `npm start` escuta em `0.0.0.0:5173`. Use `npm run start:local`
quando o acesso deve permanecer somente no computador atual. Para acesso remoto,
publique a porta 5173 apenas por uma previa autenticada ou por uma hospedagem com
controle de acesso. Digitar `127.0.0.1:5173` em outro computador sempre aponta
para esse outro computador, nao para a maquina que executa o SKYNET.

O desenvolvimento com recarga automatica continua disponivel com `npm run backend`
e `npm run dev`. `npm run dev:remote` aceita conexoes de rede, e os hostnames
permitidos devem ser informados em `SKYNET_ALLOWED_HOSTS`, separados por virgula.
=======
>>>>>>> Stashed changes
