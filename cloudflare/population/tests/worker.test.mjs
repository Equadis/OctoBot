import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker,{parseOnline} from '../src/index.js';
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

test('population health reports stale when real minute readings stop',async()=>{
 const url='https://example.workers.dev/api/health';
 const makeDB=last=>({prepare(){return {async first(){return {last}}};}});
 const recent=Date.now()-60000;
 const active=await (await worker.fetch(new Request(url),{DB:makeDB(recent)})).json();
 assert.equal(active.status,'ok');
 assert.ok(active.last_observation_age_seconds>=0);
 const old=await (await worker.fetch(new Request(url),{DB:makeDB(Date.now()-600000)})).json();
 assert.equal(old.status,'stale');
 assert.ok(old.last_observation_age_seconds>=600);
});
