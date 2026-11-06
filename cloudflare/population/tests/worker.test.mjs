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
