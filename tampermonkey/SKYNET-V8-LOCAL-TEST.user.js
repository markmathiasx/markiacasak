// ==UserScript==
// @name         SKYNET V8 Revival - Local Test
// @namespace    skynet.v8.revival
// @version      8.8.0
// @match        http://127.0.0.1:5173/*
// @match        http://localhost:5173/*
// @grant        none
// ==/UserScript==
(() => {
  'use strict';
  const tag=(...x)=>console.log('%c[SKYNET V8]','color:#62ff8d;font-weight:bold',...x);
  async function health(){const r=await fetch('/health');const d=await r.json();tag('HEALTH',d);return d}
  async function operation(vector='RACE_CONDITION',provider='PGSOFT',intensity=20){
    const r=await fetch('/api/operation',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({vector,provider,intensity})});
    const d=await r.json();tag('OPERATION',d);return d
  }
  function websocket(){const ws=new WebSocket(`ws://${location.host}/ws`);ws.onopen=()=>{tag('WS ONLINE');ws.send('PING')};ws.onmessage=e=>tag('WS',e.data);return ws}
  window.SKYNET_V8={health,operation,websocket};
  health().catch(console.error);
  window.__skynetV8=websocket();
  tag('Commands: SKYNET_V8.health(); SKYNET_V8.operation(); SKYNET_V8.websocket();');
})();
