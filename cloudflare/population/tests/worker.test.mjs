import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker,{parseOnline,parseMetricsPopulation,collect} from '../src/index.js';
test('parse exact census counter and reject unsafe responses',()=>{
 assert.equal(parseOnline('Players online now: <b>2,351</b>'),2351);
 assert.equal(parseOnline('Players online now: <b>0</b>'),0);
 assert.throws(()=>parseOnline('Server offline'),/not found/);
 assert.throws(()=>parseOnline('Players online now: <b>-1</b>'),/not found/);
});
test('GET endpoints return typed response without invented data',async()=>{
 const db={prepare(sql){
  return {bind(){return this;},async all(){return {results:[]};},async first(){return {last:null}}};
 }};
 const env={DB:db};
 const base='https://example.workers.dev';
 const latest=await (await worker.fetch(new Request(base+'/api/latest'),env)).json();
 assert.deepEqual(latest,{});
 const history=await (await worker.fetch(new Request(base+'/api/history?realm=nzoth'),env)).json();
 assert.deepEqual(history.readings,[]);
 assert.equal(history.has_more,false);
 const invalid=await worker.fetch(new Request(base+'/api/history?realm=bogus'),env);
 assert.equal(invalid.status,400);
 const preflight=await worker.fetch(new Request(base+'/api/latest',{method:'OPTIONS'}),env);
 assert.equal(preflight.status,204);
 const health=await (await worker.fetch(new Request(base+'/api/health'),env)).json();
 assert.equal(health.status,'no_observations');
});

test('anonymous viewer heartbeat deduplicates a browser tab and rejects bad IDs',async()=>{
 const sessions=new Map();
 const DB={prepare(sql){return {args:[],bind(...args){this.args=args;return this;},
  async run(){if(sql.includes('INSERT INTO viewer_presence'))sessions.set(this.args[0],this.args[1]);return {success:true};},
  async first(){if(sql.includes('COUNT(*)'))return {viewers:[...sessions.values()].filter(t=>t>=this.args[0]).length};return {last:null};}
 };}};
 const env={DB};
 const url='https://example.workers.dev/api/presence/heartbeat';
 const send=(id)=>worker.fetch(new Request(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:id})}),env);
 const id='00000000-0000-4000-8000-000000000001';
 assert.equal((await (await send(id)).json()).viewers,1);
 assert.equal((await (await send(id)).json()).viewers,1);
 assert.equal((await send('invalid')).status,400);
 const preflight=await worker.fetch(new Request(url,{method:'OPTIONS'}),env);
 assert.equal(preflight.status,204);
 assert.equal(preflight.headers.get('access-control-allow-headers'),'Content-Type');
});


test('website-wide census writes All Realms only and preserves original count',async()=>{
 const originalFetch=globalThis.fetch;
 const inserted=[];
 const DB={prepare(sql){return {bind(...args){this.args=args;return this;},
  async run(){if(sql.includes('INSERT OR IGNORE INTO readings'))inserted.push(this.args);return {success:true};}
 };}};
 try{
  globalThis.fetch=async()=>new Response('Players online now: <b>1,406</b>',{status:200});
  const observations=await collect({DB});
  assert.equal(observations.length,1);
  assert.equal(observations[0].realm,'all');
  assert.equal(observations[0].online,1406);
  assert.equal(inserted.length,1);
  assert.equal(inserted[0][0],'all');
  assert.equal(inserted[0][2],1406);
  assert.equal(inserted[0][3],'official census');
 }finally{globalThis.fetch=originalFetch;}
});

test('validates realm populations from OctoMetrics summary and ignores stale readings',()=>{
 const now=Date.parse('2026-11-12T22:00:00Z');
 const at=new Date(now-20000).toISOString();
 const readings=parseMetricsPopulation({realms:[
  {realm:"N'Zoth",population:{online:800,at}},
  {realm:"C'Thun",population:{online:100,at}},
  {realm:"Y’Shaarj",population:{online:100,at}},
  {realm:"all",population:{online:1000,at}},
  {realm:"C'Thun",population:{online:400,at:new Date(now-700000).toISOString()}}
 ]},now);
 assert.deepEqual(readings.map(r=>[r.realm,r.online]),[
  ['nzoth',800],['cthun',100],['yshaarj',100]
 ]);
 assert.equal(readings[0].timestamp_ms,now-20000);
});
test('collector stores original observed realm readings without altering the census total',async()=>{
 const originalFetch=globalThis.fetch,inserted=[];
 const DB={prepare(sql){return {bind(...args){this.args=args;return this;},
  async run(){if(sql.includes('INSERT OR IGNORE INTO readings'))inserted.push(this.args);return {success:true};}
 };}};
 const at=new Date().toISOString();
 try{
  globalThis.fetch=async url=>String(url).includes('/api/summary')
   ?new Response(JSON.stringify({realms:[
    {realm:'nzoth',population:{online:800,at}},
    {realm:'cthun',population:{online:100,at}},
    {realm:'yshaarj',population:{online:100,at}}
   ]}),{status:200})
   :new Response('Players online now: <b>1,000</b>',{status:200});
  const readings=await collect({DB});
  assert.deepEqual([...new Set(readings.map(x=>x.realm))],['all','nzoth','cthun','yshaarj']);
  assert.equal(inserted.length,4);
  assert.deepEqual(inserted.map(x=>[x[0],x[2]]),[
   ['all',1000],['nzoth',800],['cthun',100],['yshaarj',100]
  ]);
  assert.equal(inserted[0][3],'official census');
  assert.ok(inserted.slice(1).every(x=>x[3]==='in-game .server info'));
 }finally{globalThis.fetch=originalFetch;}
});
