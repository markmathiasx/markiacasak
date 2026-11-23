// ==UserScript==
// @name         SKYNET V8 - Universal Game Provider Observer
// @namespace    skynet.v8.observer
// @version      8.9.2
// @description  Observes only sanitized metadata from detected game providers.
// @match        *://*/*
// @exclude      http://127.0.0.1:5173/*
// @exclude      http://localhost:5173/*
// @grant        GM_xmlhttpRequest
// @connect      127.0.0.1
// ==/UserScript==
(() => {
  'use strict';
  const endpoint='http://127.0.0.1:39188/api/observe-site';
  const signatures=[
    ['PGSOFT',/pg\s*soft|pgsoft|ss_pgsoft/i],['HACKSAW',/hacksaw/i],
    ['PRAGMATIC',/pragmatic(?:\s|-)?play|ppgames/i],['EVOPLAY',/evoplay/i],
    ['PLAY_N_GO',/play.?n.?go/i],['NETENT',/netent/i],['RED_TIGER',/red.?tiger/i],
    ['SPRIBE',/spribe|aviator/i],['BETSOFT',/betsoft/i],['MICROGAMING',/microgaming/i],
    ['YGGDRASIL',/yggdrasil/i],['PLAYTECH',/playtech/i],['EZUGI',/ezugi/i],
    ['EVOLUTION',/evolution(?:\s|_)?gaming/i],
  ];
  let lastKey=''; let timer;

  function snapshot() {
    const source=[location.hostname,location.pathname,document.title,
      ...[...document.querySelectorAll('iframe[src]')].map(frame=>frame.src)].join(' ');
    const match=signatures.find(([,pattern])=>pattern.test(source));
    if(!match)return null;
    const game=location.pathname.match(/(?:game|gameplay|slot|casino)[/:_-]([^/?#]+)/i)?.[1]||document.title||'UNKNOWN';
    return {
      provider:match[0],
      game:String(game).slice(0,96),
      host:location.hostname,
      pathname:location.pathname,
      title:document.title,
    };
  }

  function send() {
    const observation=snapshot();
    if(!observation)return;
    const key=JSON.stringify(observation);
    if(key===lastKey)return;
    lastKey=key;
    GM_xmlhttpRequest({
      method:'POST',
      url:endpoint,
      headers:{'Content-Type':'application/json'},
      data:JSON.stringify(observation),
      timeout:4000,
      onload:r=>console.debug('[SKYNET OBSERVER]',r.status,observation.provider),
      onerror:()=>console.debug('[SKYNET OBSERVER] local core offline'),
    });
  }

  send();
  const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(send,500);});
  observer.observe(document.documentElement,{subtree:true,childList:true});
  setInterval(send,15000);
})();

