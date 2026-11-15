# Laboratório A/B/C

Contrato dos controles: A = Sustentação (medição sintética de frequência), B = Exploração (comparação sintética de perfis) e C = Bônus Final (registro idempotente de evento sintético). C só é habilitado depois de A ou B e nunca envia uma ação financeira ou externa.

Abra a aba **LAB A/B/C** no painel local. A semente é um inteiro de 32 bits sem sinal.
Os perfis Frequência, Dispersão e Assimetria são distribuições hipotéticas,
sem valores monetários ou relação com provedores externos.

- A executa 512 amostras e mostra ocorrências, ausências e intervalos entre ocorrências.
- B compara dois perfis diferentes com a mesma semente. Mostra média, variância populacional, P50 e P95. As estatísticas incluem zeros nas amostras sem ocorrência.
- C grava um evento `SYNTHETIC_BONUS_ACTIVATED` na rodada corrente em memória. Repetir a ação devolve o mesmo evento.

A API em `/api/scenario-lab` usa `POST /session`, `POST /action` e `GET /state`.
As últimas duas rotas exigem o cabeçalho `x-lab-session`. O estado é separado por
sessão, permanece durante a navegação entre abas e expira após uma hora sem
uso. Recarregar a página inicia uma sessão nova. Reiniciar o Core limpa as sessões.
O laboratório só aceita tráfego loopback e rejeita origens web externas.
As suítes de integração criam diretórios temporários com `SKYNET_DATA_DIR`.

Após uma queda de rede, use **Reconectar sessão** na mesma aba. O painel
consulta o estado no Core e recupera a rodada e o bônus sem reenviar uma
ação. Se o Core reiniciar ou a sessão expirar, inicie outra rodada com A ou B.

Validação: `npm run test:all`, `npm run lint`, `npm run build`.
Com o Core e o frontend ativos, use `npm run doctor`.

Resultado desta implementação: 14/14 testes aprovados, lint e build com
código de saída 0 e quatro verificações aprovadas no doctor. No Chrome,
foram confirmados A e B, C desabilitado antes da primeira rodada, duas
ativações de C com um único evento no backend e uma nova aba sem acesso
à rodada anterior.

Validação da reconexão: no Chrome, simulei queda de rede, observei o estado
de erro e restabeleci a conexão. O painel recuperou o mesmo evento de bônus.
Testes 14/14, lint, build e doctor 4/4 passaram após a mudança.
