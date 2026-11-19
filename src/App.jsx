import { useCallback, useEffect, useRef, useState } from 'react';
import ScenarioLab from './ScenarioLab.jsx';

async function api(path, options) {
  const response = await fetch(path, { cache: 'no-store', ...options });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { throw new Error(`Resposta inválida (HTTP ${response.status})`); }
  if (!response.ok) throw new Error(body?.error || `HTTP ${response.status}`);
  return body;
}

const providers = ['PGSOFT', 'HACKSAW', 'PRAGMATIC'];
const vectors = [
  ['RACE_CONDITION', 'RACE CONDITION'],
  ['STATE_FORCING', 'STATE FORCING'],
  ['PACKET_FLOOD', 'PACKET FLOOD'],
];

export default function App() {
  const [provider, setProvider] = useState('PGSOFT');
  const [status, setStatus] = useState('BOOTING');
  const [health, setHealth] = useState(null);
  const [state, setState] = useState({ events: [], observations: [], operations: [], metrics: {}, queue: {} });
  const [wsStatus, setWsStatus] = useState('OFFLINE');
  const [intensity, setIntensity] = useState(50);
  const [activeTab, setActiveTab] = useState('CONTROL');
  const [packetEvent, setPacketEvent] = useState('lab.spin');
  const [packetJson, setPacketJson] = useState('{"amount":10,"mode":"synthetic"}');
  const [packetResult, setPacketResult] = useState('');
  const [mutateInput, setMutateInput] = useState('42["lab.spin",{"amount":10}]');
  const [mutateResult, setMutateResult] = useState('');
  const pending = useRef(null);
  const wsRef = useRef(null);
  const activeJob = useRef(null);
  const refresh = useCallback(async () => {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    try {
      const options = { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]) };
      const [h, s] = await Promise.all([api('/health', options), api('/api/state', options)]);
      if (controller.signal.aborted) return;
      setHealth(h);
      setState(s);
      const completed = activeJob.current && s.operations?.find(operation => operation.id === activeJob.current);
      if (completed) {
        setStatus(`${completed.id.slice(0, 8)} ${completed.status}`);
        activeJob.current = null;
      } else {
        setStatus(current => (current === 'BOOTING' || current.startsWith('API ERROR')) ? 'READY' : current);
      }
    } catch (e) {
      if (controller.signal.aborted) return;
      setStatus(`API ERROR: ${e.message}`);
      setHealth(null);
    } finally {
      controller.abort();
      if (pending.current === controller) pending.current = null;
    }
  }, []);

  useEffect(() => {
    let socket;
    let updateTimer;
    function scheduleRefresh() {
      if (updateTimer !== undefined) return;
      updateTimer = setTimeout(() => {
        updateTimer = undefined;
        void refresh();
      }, 250);
    }
    function connect() {
      if (socket && socket.readyState !== WebSocket.CLOSED) return;
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(`${protocol}//${location.host}/ws`);
      wsRef.current = socket;
      setWsStatus('CONNECTING');
      socket.onopen = () => { setWsStatus('ONLINE'); scheduleRefresh(); };
      socket.onmessage = event => {
        try {
          const message = JSON.parse(String(event.data));
          if (message.type === 'OPERATION_COMPLETED') {
            setStatus(`${message.id.slice(0, 8)} DONE`);
            activeJob.current = null;
          } else if (message.type === 'OPERATION_FAILED') {
            setStatus(`${message.id.slice(0, 8)} FAILED`);
            activeJob.current = null;
          } else if (message.type === 'PONG') {
            setStatus('PONG');
          }
        } catch {
          // Refresh still reconciles state when a non-JSON frame is received.
        }
        scheduleRefresh();
      };
      socket.onerror = () => setWsStatus('ERROR');
      socket.onclose = () => setWsStatus('OFFLINE');
    }
    const initial = setTimeout(() => { void refresh(); connect(); }, 0);
    const poll = setInterval(scheduleRefresh, 2500);
    const reconnect = setInterval(connect, 1800);
    return () => {
      clearTimeout(initial);
      clearTimeout(updateTimer);
      clearInterval(poll);
      clearInterval(reconnect);
      if (socket) {
        socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
        socket.close();
      }
      wsRef.current = null;
      pending.current?.abort();
      pending.current = null;
    };
  }, [refresh]);

  async function execute(vector) {
    setStatus(`QUEUE ${vector}`);
    try {
      const data = await api('/api/operation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider, vector, intensity }),
      });
      activeJob.current = data.job.id;
      setStatus(`${data.job.id.slice(0,8)} QUEUED`);
      void refresh();
    } catch (e) {
      setStatus(`ERROR: ${e.message}`);
    }
  }

  async function generatePacket(format='socketio') {
    let data;
    try { data = JSON.parse(packetJson); } catch { setPacketResult('INVALID JSON'); return; }
    try {
      const r = await api('/api/packet', {
        method:'POST', headers:{'content-type':'application/json'},
        body:JSON.stringify({format,event:packetEvent,data})
      });
      setPacketResult(JSON.stringify(r.packet, null, 2));
    } catch (error) {
      setPacketResult(`ERROR: ${error.message}`);
    }
  }

  async function mutate(strategy) {
    try {
      const r = await api('/api/mutate', {
        method:'POST', headers:{'content-type':'application/json'},
        body:JSON.stringify({frame:mutateInput,strategy})
      });
      setMutateResult(r.mutated);
    } catch (error) {
      setMutateResult(`ERROR: ${error.message}`);
    }
  }

  const events = state.events || [];
  const ops = state.operations || [];
  const obs = state.observations || [];
  const metrics = state.metrics || {};
  const queue = state.queue || health?.queue || {};

  return (
    <main className="app">
      <div className="scanline" />
      <header className="masthead">
        <div>
          <div className="kicker">SKYNET // ADVANCED PROTOCOL RESEARCH CONSOLE</div>
          <h1>ULTRON EXTREME <span>V8.9 LUCIFER</span></h1>
          <div className="subtitle">PERSISTENT CONTROL PLANE • 5173 / WS / EVENT STORE</div>
        </div>
        <div className={`core-pill ${health?.ok ? 'online' : 'offline'}`}><i/> CORE {health?.ok?'ONLINE':'OFFLINE'}</div>
      </header>

      <section className="status-grid six">
        <Stat label="SYSTEM" value={status}/>
        <Stat label="WEBSOCKET" value={wsStatus}/>
        <Stat label="CLIENTS" value={String(health?.websocketClients ?? 0)}/>
        <Stat label="QUEUE" value={`${queue.queued ?? 0} / ${queue.running ? 'RUN':'IDLE'}`}/>
        <Stat label="FRAMES" value={String(metrics.framesGenerated ?? 0)}/>
        <Stat label="EVENTS" value={String(metrics.eventsTotal ?? 0)}/>
      </section>

      <nav className="tabs">
        {['CONTROL','LAB A/B/C','PROTOCOL LAB','TELEMETRY','SITE OBSERVER','OPERATIONS'].map(t =>
          <button className={activeTab===t?'active':''} key={t} onClick={()=>setActiveTab(t)}>{t}</button>
        )}
      </nav>
      <div hidden={activeTab !== 'LAB A/B/C'}><ScenarioLab /></div>

      {activeTab==='CONTROL' && <section className="workspace">
        <div className="panel command-panel">
          <PanelTitle title="COMMAND ENGINE" code="01"/>
          <div className="selector">
            <label>PROVIDER PROFILE</label>
            <div className="button-row">
              {providers.map(p=><button key={p} className={provider===p?'selected':''} onClick={()=>setProvider(p)}>{p==='PGSOFT'?'PG SOFT':p==='PRAGMATIC'?'PRAGMATIC PLAY':p}</button>)}
            </div>
          </div>
          <div className="intensity"><div><label>INTENSITY</label><strong>{intensity}</strong></div><input type="range" min="1" max="120" value={intensity} onChange={e=>setIntensity(Number(e.target.value))}/></div>
          <div className="vector-grid">
            {vectors.map(([id,label])=><button className="vector" key={id} onClick={()=>execute(id)}><span>{label}</span><small>QUEUE</small></button>)}
          </div>
          <div className="footer-actions">
            <button onClick={refresh}>REFRESH</button>
            <button disabled={wsStatus !== 'ONLINE'} onClick={() => {
              const socket = wsRef.current;
              if (socket?.readyState === WebSocket.OPEN) socket.send('PING');
            }}>PING SOCKET</button>
          </div>
        </div>

        <div className="panel">
          <PanelTitle title="LIVE CORE" code="02"/>
          <div className="telemetry compact">
            {events.slice(0,30).map((e,i)=><EventRow e={e} key={`${e.timestamp}-${i}`}/>)}
            {!events.length && <div className="empty">AWAITING EVENTS</div>}
          </div>
        </div>
      </section>}

      {activeTab==='PROTOCOL LAB' && <section className="protocol-grid">
        <div className="panel lab">
          <PanelTitle title="PACKET GENERATOR" code="03"/>
          <label>EVENT<input value={packetEvent} onChange={e=>setPacketEvent(e.target.value)}/></label>
          <label>DATA JSON<textarea value={packetJson} onChange={e=>setPacketJson(e.target.value)}/></label>
          <div className="button-row">
            <button onClick={()=>generatePacket('socketio')}>SOCKET.IO TEXT</button>
            <button onClick={()=>generatePacket('binary')}>BINARY FRAME</button>
          </div>
          <pre>{packetResult || 'NO PACKET GENERATED'}</pre>
        </div>
        <div className="panel lab">
          <PanelTitle title="MUTATION LAB" code="04"/>
          <label>INPUT<textarea value={mutateInput} onChange={e=>setMutateInput(e.target.value)}/></label>
          <div className="button-row wrap">
            <button onClick={()=>mutate('flip-char')}>FLIP CHAR</button>
            <button onClick={()=>mutate('truncate')}>TRUNCATE</button>
            <button onClick={()=>mutate('duplicate-tail')}>DUP TAIL</button>
          </div>
          <pre>{mutateResult || 'NO MUTATION'}</pre>
        </div>
      </section>}

      {activeTab==='TELEMETRY' && <section className="panel">
        <PanelTitle title="EVENT STREAM" code={String(events.length).padStart(2,'0')}/>
        <div className="telemetry tall">
          {events.map((e,i)=><EventRow e={e} key={`${e.timestamp}-${i}`}/>)}
          {!events.length && <div className="empty">NO EVENTS</div>}
        </div>
      </section>}

      {activeTab==='SITE OBSERVER' && <section className="panel">
        <PanelTitle title="SITE OBSERVER" code={String(obs.length).padStart(2,'0')}/>
        <div className="site-grid">
          {obs.slice(0,24).map(o=><article key={o.id}><b>{o.provider}</b><strong>{o.game}</strong><span>{o.host}{o.pathname}</span><small>{new Date(o.timestamp).toLocaleTimeString('pt-BR')}</small></article>)}
          {!obs.length && <div className="empty">Install tampermonkey/SKYNET-PGSOFT-OBSERVER.user.js</div>}
        </div>
      </section>}

      {activeTab==='OPERATIONS' && <section className="panel">
        <PanelTitle title="OPERATION HISTORY" code={String(ops.length).padStart(2,'0')}/>
        <div className="ops">
          {ops.map(o=><article key={o.id}><span>{o.completedAt||o.createdAt}</span><b>{o.provider}</b><strong>{o.vector}</strong><em>{o.framesGenerated||0} frames</em><code>{o.elapsedMs||0} ms</code></article>)}
          {!ops.length && <div className="empty">NO COMPLETED OPERATIONS</div>}
        </div>
      </section>}

      <footer>
        <span>CORE {health?.version||'—'} • PID {health?.pid||'—'} • UPTIME {health?.uptimeSeconds||0}s</span>
        <span>{location.origin}</span>
      </footer>
    </main>
  );
}

function PanelTitle({title,code}){return <div className="panel-title"><span>{title}</span><b>{code}</b></div>}
function Stat({label,value}){return <div className="stat"><small>{label}</small><strong title={String(value)}>{value}</strong></div>}
function EventRow({e}){const c={...e};delete c.timestamp;if(c.frame?.length>110)c.frame=c.frame.slice(0,110)+'…';return <div className="event"><time>{e.timestamp?new Date(e.timestamp).toLocaleTimeString('pt-BR'):'--:--:--'}</time><strong>{e.type||'EVENT'}</strong><code>{JSON.stringify(c)}</code></div>}
