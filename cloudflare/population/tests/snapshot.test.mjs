import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import {resetSnapshotMemo,snapshotResponse,buildSnapshot} from '../src/snapshot.js';

const BASE='https://example.workers.dev';
const T0=Date.parse('2026-11-25T10:00:00Z');
function fakeDb({readings=[],status=null}={}){
 const calls=[];
 return {calls,prepare(sql){
  calls.push(sql);
  return {bind(){return this;},
   async all(){return {results:sql.includes('FROM readings')?readings:[]};},
   async first(){return sql.includes('status_readings')?status:{last:null};}};
 }};
}
const ROW=(realm,online,source,ms)=>({realm,timestamp_ms:ms,online,source});
const STATUS={timestamp_ms:T0-30000,website:'available',nzoth:'online',yshaarj:'online',cthun:'online',
 tcp:'reachable',auth:'responsive',latency_ms:812,source_error:null};
const readings=()=>[ROW('all',1234,'official census',T0-60000),ROW('nzoth',700,'in-game .server info',T0-20000),
 ROW('cthun',50,'in-game .server info',T0-20000)];
const get=(db,headers={},path='/api/snapshot')=>worker.fetch(new Request(BASE+path,{headers}),{DB:db});
beforeEach(()=>resetSnapshotMemo());

test('snapshot has the same shapes as /api/latest and /api/status/latest in one object',async()=>{
 const db=fakeDb({readings:readings(),status:STATUS});
 const res=await get(db);
 assert.equal(res.status,200);
 const body=await res.json();
 assert.equal(body.schema,1);
 assert.equal(body.cadence_s,60);
 assert.deepEqual(Object.keys(body.population).sort(),['all','cthun','nzoth']);
 assert.deepEqual(body.population.all,{timestamp:new Date(T0-60000).toISOString(),online:1234,source:'official census'});
 assert.deepEqual(body.status,{timestamp:new Date(T0-30000).toISOString(),website:'available',
  realms:{nzoth:'online',yshaarj:'online',cthun:'online'},tcp:'reachable',auth:'responsive',latency_ms:812,source_error:null});
 // byte-for-byte what the existing endpoints would say
 resetSnapshotMemo();
 const latest=await (await get(db,{},'/api/latest')).json();
 assert.deepEqual(body.population,latest);
 const statusLatest=await (await get(db,{},'/api/status/latest')).json();
 assert.deepEqual(body.status,statusLatest.sample);
});

test('an empty database is still a valid snapshot, never invented data',async()=>{
 const body=await (await get(fakeDb())).json();
 assert.deepEqual(body,{schema:1,source:'cloudflare-minute',cadence_s:60,population:{},status:null});
});

test('it exposes aggregates only: no player identifiers anywhere',async()=>{
 const text=await (await get(fakeDb({readings:readings(),status:STATUS}))).text();
 const keys=new Set();
 JSON.parse(text,(k)=>{keys.add(k);return undefined;});
 const allowed=new Set(['','schema','source','cadence_s','population','status','all','nzoth','yshaarj','cthun','timestamp','online',
  'website','realms','tcp','auth','latency_ms','source_error']);
 for(const k of keys)assert.ok(allowed.has(k),'unexpected key '+k);
});

test('it carries a validator and cache headers a client can honour, and CORS like the other endpoints',async()=>{
 const res=await get(fakeDb({readings:readings(),status:STATUS}));
 assert.match(res.headers.get('etag'),/^W\/"\d+"$/);
 assert.match(res.headers.get('cache-control'),/max-age=30/);
 assert.equal(res.headers.get('access-control-allow-origin'),'*');
 assert.equal(res.headers.get('access-control-expose-headers'),'ETag');
 assert.equal(res.headers.get('content-type'),'application/json; charset=utf-8');
});

test('a current validator is answered 304 with no body, a different one gets the data',async()=>{
 const db=fakeDb({readings:readings(),status:STATUS});
 const first=await get(db);
 const tag=first.headers.get('etag');
 const same=await get(db,{'If-None-Match':tag});
 assert.equal(same.status,304);
 assert.equal(await same.text(),'');
 assert.equal((await get(db,{'If-None-Match':'W/"1"'})).status,200);
 assert.equal((await get(db,{'If-None-Match':'"x", '+tag})).status,304);
 assert.equal((await get(db,{'If-None-Match':tag.replace('W/','')})).status,304);     // weak comparison
 assert.equal((await get(db,{'If-None-Match':'*'})).status,304);
});

test('the tag changes only when there is a newer reading',async()=>{
 let rows=readings();
 const db={prepare(sql){return {bind(){return this;},async all(){return {results:sql.includes('FROM readings')?rows:[]};},
  async first(){return sql.includes('status_readings')?STATUS:null;}};}};
 const a=(await snapshotResponse(new Request(BASE+'/api/snapshot'),{DB:db},T0)).headers.get('etag');
 const b=(await snapshotResponse(new Request(BASE+'/api/snapshot'),{DB:db},T0+20000)).headers.get('etag');
 assert.equal(a,b);                                                             // nothing new: the client keeps getting 304
 rows=[ROW('all',1300,'official census',T0+30000)];
 const c=(await snapshotResponse(new Request(BASE+'/api/snapshot'),{DB:db},T0+40000)).headers.get('etag');
 assert.notEqual(a,c);
});

test('D1 is read at most once per memo window, however many requests arrive',async()=>{
 const db=fakeDb({readings:readings(),status:STATUS});
 const ask=(now,h={})=>snapshotResponse(new Request(BASE+'/api/snapshot',{headers:h}),{DB:db},now);
 await ask(T0);
 const afterFirst=db.calls.length;
 assert.equal(afterFirst,2);                                                    // one population read, one status read
 for(let i=1;i<=50;i++)await ask(T0+i*200);                                     // 10 s of requests
 assert.equal(db.calls.length,afterFirst);
 await ask(T0+15000);
 assert.equal(db.calls.length,afterFirst+2);
 const tag=(await ask(T0+15100)).headers.get('etag');
 const before=db.calls.length;
 assert.equal((await ask(T0+15200,{'If-None-Match':tag})).status,304);          // a 304 costs no read
 assert.equal(db.calls.length,before);
});

test('a database failure is a 503 with no data, and does not poison the memo',async()=>{
 const bad={prepare(){throw Error('d1 down');}};
 const origError=console.error;console.error=()=>{};
 try{
  const res=await worker.fetch(new Request(BASE+'/api/snapshot'),{DB:bad});
  assert.equal(res.status,503);
  assert.equal((await res.json()).error,'backend_unavailable');
 }finally{console.error=origError;}
 const ok=await get(fakeDb({readings:readings(),status:STATUS}));
 assert.equal(ok.status,200);
});

test('only GET is allowed, and the existing endpoints are untouched',async()=>{
 const db=fakeDb({readings:readings(),status:STATUS});
 assert.equal((await worker.fetch(new Request(BASE+'/api/snapshot',{method:'POST'}),{DB:db})).status,405);
 const latest=await get(db,{},'/api/latest');
 assert.equal(latest.headers.get('cache-control'),'no-store');                  // unchanged
 assert.equal((await get(db,{},'/api/health')).status,200);
 assert.equal((await get(db,{},'/api/nope')).status,404);
 const pre=await worker.fetch(new Request(BASE+'/api/snapshot',{method:'OPTIONS'}),{DB:db});
 assert.equal(pre.status,204);
});

test('buildSnapshot reads exactly the two tables the existing endpoints read',async()=>{
 const db=fakeDb({readings:readings(),status:STATUS});
 await buildSnapshot({DB:db});
 assert.equal(db.calls.length,2);
 assert.ok(db.calls.some(s=>s.includes('FROM readings')));
 assert.ok(db.calls.some(s=>s.includes('status_readings')));
 assert.ok(db.calls.every(s=>/^SELECT/i.test(s.trim())));                       // read-only
});
