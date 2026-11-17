import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from '../worker.mjs';

export const MIN=60_000,iso=ms=>new Date(ms).toISOString();
export const fixtures=JSON.parse(readFileSync(new URL('./fixtures/tracker-wire.json',import.meta.url),'utf8'));
const ISO=/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g;

/** Shift every timestamp in a tracker fixture so its `at` instant becomes `now - ageMs` (the tracker "just reported"). */
export function rebase(name,ageMs=0){
  const f=fixtures[name],shift=Date.now()-ageMs-Date.parse(f.at);
  const move=text=>text.replace(ISO,m=>iso(Date.parse(m)+shift));
  return {zone:f.zone,expected:f.expected,events:JSON.parse(move(JSON.stringify(f.events))),shift};
}

/** A small stateful stand-in for D1: INSERT stores rows; SELECT filters by realm, type, newest first, LIMIT. */
export function memoryDb(seed=[]){
  const rows=[...seed];let id=rows.length;
  const state={inserts:0,rows};
  return {state,batch:async statements=>Promise.all(statements.map(s=>s.run())),prepare:sql=>({bind:(...args)=>({
    all:async()=>{
      const m=/type='([a-z_]+)'/.exec(sql);
      const type=m?m[1]:/type=\?/.test(sql)?args[1]:null;
      if(!type||!['raid_sessions','raid_session_ended','raid_session_revision'].includes(type))return {results:[]};
      const limit=Number(/LIMIT (\d+)/.exec(sql)?.[1]||50);
      return {results:rows.filter(r=>r.realm===args[0]&&r.type===type).sort((a,b)=>b.id-a.id).slice(0,limit).map(r=>({observed_at:r.observed_at,payload_json:r.payload_json}))};
    },
    run:async()=>{
      if(/^INSERT/.test(sql)){if(args[0]==='raid_session_revision'&&rows.some(r=>r.realm===args[6]&&r.type===args[0]&&JSON.parse(r.payload_json).eventId===args[7]))return {};rows.push({id:++id,type:args[0],realm:args[1],account:args[2],role:args[3],observed_at:args[4],payload_json:args[5]});state.inserts+=1;}
      return {};
    },
  })})};
}
export const envFor=db=>({DB:db,METRICS_PUSH_TOKEN:'secret',NO_LEARN_CACHE:'1'});
export const post=(env,body,token='secret')=>worker.fetch(new Request('https://m.test/api/ingest',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body)}),env);
export const summaryJson=async env=>(await worker.fetch(new Request("https://m.test/api/summary?realm=N'Zoth"),env)).json();
export const realmOf=async env=>(await summaryJson(env)).realms[0];

/** Send a fixture's events through the real ingest path (events the Worker would reject as too old are skipped, as live). */
export async function replay(env,name,ageMs=0){
  const r=rebase(name,ageMs);
  for(const e of r.events){
    if(Math.abs(Date.now()-Date.parse(e.time))>=29*MIN)continue;
    const res=await post(env,e);
    assert.ok([200,202,409].includes(res.status),`${e.type} ${res.status}`);
  }
  return r;
}
export const near=(actual,expected,tol=3000)=>assert.ok(Math.abs(actual-expected)<=tol,`${actual} vs ${expected}`);
