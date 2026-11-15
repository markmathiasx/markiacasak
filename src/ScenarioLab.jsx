import { useRef, useState } from 'react';
import { validateHex } from './utils/validators.js';

const profiles = { frequent: 'Frequência', dispersed: 'Dispersão', asymmetric: 'Assimetria' };
const modes = {
  A: 'Sustentação: mede frequência e continuidade em cenário sintético.',
  B: 'Exploração: compara perfis sintéticos com a mesma semente.',
  C: 'Bônus Final: registra um único evento sintético após A ou B.',
};
const errors = {
  ROUND_NOT_CURRENT: 'Conclua uma rodada nesta sessão antes de ativar o bônus.',
  LAB_SESSION_EXPIRED: 'Sessão encerrada. Inicie uma nova rodada com A ou B.',
  INVALID_SCENARIO: 'Use uma semente inteira válida e dois perfis diferentes em B.',
  LAB_SESSION_LIMIT: 'Limite de sessões locais atingido.',
};
const base = '/api/scenario-lab';
const options = Object.entries(profiles).map(([key, label]) => <option key={key} value={key}>{label}</option>);

export default function ScenarioLab() {
  const session = useRef(null);
  const inFlight = useRef(false);
  const [seed, setSeed] = useState('42');
  const [profile, setProfile] = useState('frequent');
  const [comparison, setComparison] = useState('asymmetric');
  const [round, setRound] = useState(null);
  const [hasSession, setHasSession] = useState(false);
  const [phase, setPhase] = useState('Aguardando');
  const [message, setMessage] = useState('');
  const [hex, setHex] = useState('');
  const busy = phase === 'Em execução';
  const hexValidation = validateHex(hex);

  async function request(path, input) {
    const mutation = input !== undefined;
    const response = await fetch(base + path, {
      ...(mutation && { method: 'POST', body: JSON.stringify(input) }),
      headers: {
        ...(mutation && { 'content-type': 'application/json' }),
        ...(session.current && { 'x-lab-session': session.current }),
      },
      signal: AbortSignal.timeout(5000),
    });
    const body = await response.json();
    if (body.error === 'LAB_SESSION_EXPIRED') {
      session.current = null;
      setHasSession(false);
      setRound(null);
    }
    if (!response.ok) throw new Error(errors[body.error] || `HTTP ${response.status}`);
    return body;
  }

  async function recover() {
    if (inFlight.current || !session.current) return;
    inFlight.current = true;
    setPhase('Em execução');
    setMessage('');
    try {
      const state = await request('/state');
      setRound(state.round);
      setPhase(state.round ? 'Concluído' : 'Aguardando');
      setMessage('Estado da sessão recuperado.');
    } catch (error) {
      setPhase('Erro');
      setMessage(error.message);
    } finally {
      inFlight.current = false;
    }
  }

  async function run(mode) {
    if (inFlight.current || (mode === 'C' && !round)) return;
    inFlight.current = true;
    setPhase('Em execução');
    setMessage('');
    try {
      if (!session.current) {
        session.current = (await request('/session', {})).session;
        setHasSession(true);
      }
      const { round: next, repeated } = await request('/action', mode === 'C'
        ? { mode, roundId: round.id }
        : { mode, seed: seed.trim() ? Number(seed) : null, profile, comparison });
      setRound(next);
      setPhase('Concluído');
      if (mode === 'C') setMessage(repeated ? 'Bônus sintético já registrado nesta rodada.' : 'Bônus sintético registrado.');
    } catch (error) {
      setPhase('Erro');
      setMessage(error.message);
    } finally {
      inFlight.current = false;
    }
  }

  return <section className="panel lab">
    <h2>Laboratório A/B/C</h2>
      <p><code>LOCAL_SYNTHETIC_ONLY</code> · Parâmetros hipotéticos, sem unidade monetária e sem previsão de resultados externos.</p>
    <div className="button-row wrap">
      <label>Semente <input type="number" min="0" max="4294967295" step="1" value={seed} onChange={e => setSeed(e.target.value)}/></label>
      <label className={`hex-field ${hexValidation.valid ? 'hex-valid' : `hex-${hexValidation.kind}`}`}>Hexadecimal de diagnóstico
        <input value={hex} maxLength={32} onChange={e => setHex(e.target.value)} aria-invalid={!hexValidation.valid}/>
        {!hexValidation.valid && <small className="field-error">{hexValidation.message}</small>}
      </label>
      <label>Perfil <select value={profile} onChange={e => setProfile(e.target.value)}>{options}</select></label>
      <label>Comparação B <select value={comparison} onChange={e => setComparison(e.target.value)}>{options}</select></label>
    </div>
    <div className="button-row wrap">
      <button title={modes.A} disabled={busy} onClick={() => run('A')}>A — Sustentação</button>
      <button title={modes.B} disabled={busy} onClick={() => run('B')}>B — Exploração</button>
      <button title={modes.C} disabled={busy || !round} onClick={() => run('C')}>C — Bônus Final</button>
      <button disabled={busy || !hasSession} onClick={recover}>Reconectar sessão</button>
    </div>
    <p role="status">{phase}{message && ` · ${message}`}</p>
    {round && <div>
      <p>Modo {round.mode} · semente {round.seed}</p>
      {round.results.map(result => <article key={result.profile}>
        <h3>{profiles[result.profile]}</h3>
        <p>Ocorrências {result.hits}/{result.samples} · Ausências {result.misses} · Média {result.mean.toFixed(3)} · Variância {result.variance.toFixed(3)} · P50 {result.p50.toFixed(3)} · P95 {result.p95.toFixed(3)}</p>
        {round.mode === 'A' && <details><summary>Distribuição dos intervalos</summary>
          <ul>{Object.entries(result.gaps).map(([gap, count]) => <li key={gap}>{gap} passo(s): {count}</li>)}</ul>
        </details>}
      </article>)}
      {round.bonus && <p><code>{round.bonus.type}</code></p>}
    </div>}
  </section>;
}
