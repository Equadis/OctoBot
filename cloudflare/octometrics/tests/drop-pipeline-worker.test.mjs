import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from '../worker.mjs';
import {memoryD1} from './d1-memory.mjs';
import {listenerStatus,SILENCE_MS,HEARTBEAT_FRESH_MS} from '../listener-status.mjs';

const RALLY='Rallying Cry of the Dragonslayer',MIN=60_000,iso=ms=>new Date(ms).toISOString();
const live=JSON.parse(readFileSync(new URL('./fixtures/live-drops-2026-11-16.json',import.meta.url),'utf8')).rows;
const YELL={
  allianceOnyxia:'Behold the might of the Alliance! The dread lady, Onyxia, hangs from the arches! Let the rallying cry of the dragon slayer lift your spirits!',
  allianceNefarian:'Citizens of the Alliance, the Lord of Blackrock is slain! Nefarian has been subdued by the combined might of $n and $g his:her; allies!',
  hordeOnyxia:'People of the Horde, citizens of Orgrimmar, come, gather round and celebrate a hero of the Horde. On this day, $n, under the auspices of our glorious Warchief, laid a mortal blow against the Black Dragonflight. The brood mother, Onyxia, has been slain!',
  hordeNefarian:'NEFARIAN IS SLAIN! People of Orgrimmar, bow down before the might of $n and $g his:her; allies for they have laid a blow against the Black Dragonflight!',
};
const ACCOUNT={sw:'OBPVESW',org:'OBPVEORG',bb:'OBPVEBB'};
const mk=(role,text,at,extra={})=>({type:'world_buff_drop',time:iso(at),realm:"N'Zoth",account:ACCOUNT[role],role,buff:RALLY,faction:role==='sw'?'alliance':'horde',sender:'NPC',text,source:'npc_yell',...extra});
const envWith=(db=memoryD1())=>({DB:db,METRICS_PUSH_TOKEN:'secret',NO_LEARN_CACHE:'1'});
const post=(env,body,token='secret')=>worker.fetch(new Request('https://m.test/api/ingest',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body)}),env);
const realm=async env=>(await (await worker.fetch(new Request("https://m.test/api/summary?realm=N'Zoth"),env)).json()).realms[0];
async function traced(fn){
  const lines=[],original=console.log;console.log=l=>{try{lines.push(JSON.parse(l));}catch{lines.push(l);}};
  try{return {result:await fn(),lines};}finally{console.log=original;}
}

test('Alliance Onyxia drop: accepted, stored, and Stormwind updates with its head',async()=>{
  const env=envWith(),now=Date.now();
  const res=await post(env,mk('sw',YELL.allianceOnyxia,now-2*MIN,{eventId:'a'.repeat(24),head:'onyxia'}));
  assert.equal(res.status,202);
  const body=await res.json();assert.equal(body.ok,true);assert.equal(body.eventId,'a'.repeat(24));assert.ok(body.id>0,'the stored row id is returned');
  const r=await realm(env);
  assert.deepEqual([r.lastDrops.alliance.at,r.lastDrops.alliance.head,r.lastDrops.alliance.confirmed,r.lastDrops.alliance.source],[iso(now-2*MIN),'onyxia',true,'npc_yell']);
  assert.equal(r.lastDrops.horde,null);
  assert.equal(r.buffs[`${RALLY}:alliance`].head,'onyxia');
  assert.equal(r.heads.onyxia.drops.alliance.at,iso(now-2*MIN));
});

test('Alliance Nefarian drop updates the SAME Stormwind last drop, and keeps its head separate',async()=>{
  const env=envWith(),now=Date.now();
  await post(env,mk("sw",YELL.allianceOnyxia,now-25*MIN));
  const nef=await post(env,mk('sw',YELL.allianceNefarian,now-5*MIN));
  assert.equal(nef.status,202);
  const r=await realm(env);
  assert.equal(r.lastDrops.alliance.at,iso(now-5*MIN),'the newer Nefarian drop is the last drop for the faction');
  assert.equal(r.lastDrops.alliance.head,'nefarian');
  assert.equal(r.buffs[`${RALLY}:alliance`].head,'nefarian');
  assert.equal(r.heads.nefarian.drops.alliance.at,iso(now-5*MIN));
  assert.equal(r.heads.onyxia.drops.alliance.at,iso(now-25*MIN),'the Onyxia drop is still on record under its own head');
});

test('Horde Onyxia and Horde Nefarian update Orgrimmar',async()=>{
  const env=envWith(),now=Date.now();
  await post(env,mk("org",YELL.hordeOnyxia,now-25*MIN));
  assert.equal((await realm(env)).lastDrops.horde.head,'onyxia');
  await post(env,mk('org',YELL.hordeNefarian,now-3*MIN));
  const r=await realm(env);
  assert.deepEqual([r.lastDrops.horde.at,r.lastDrops.horde.head],[iso(now-3*MIN),'nefarian']);
  assert.equal(r.lastDrops.alliance,null);
});

test('a Horde drop followed by an Alliance drop: both are recorded and neither overwrites the other',async()=>{
  const env=envWith(),now=Date.now();
  assert.equal((await post(env,mk('org',YELL.hordeOnyxia,now-9*MIN))).status,202);
  assert.equal((await post(env,mk('sw',YELL.allianceOnyxia,now-8*MIN))).status,202);
  const r=await realm(env);
  assert.equal(r.lastDrops.horde.at,iso(now-9*MIN));assert.equal(r.lastDrops.alliance.at,iso(now-8*MIN));
  assert.equal(env.DB.state.inserts,2);
});

test('the same announcement heard twice is stored once; a retry is recognised; a later turn-in is a new drop',async()=>{
  const env=envWith(),now=Date.now();
  const first=await (await post(env,mk('sw',YELL.allianceOnyxia,now-10*MIN,{eventId:'1'.repeat(24)}))).json();
  const retry=await post(env,mk('sw',YELL.allianceOnyxia,now-10*MIN,{eventId:'1'.repeat(24)}));          // the collector never saw the first response
  assert.equal(retry.status,200);const rb=await retry.json();assert.deepEqual([rb.ok,rb.duplicate,rb.id],[true,true,first.id]);
  const copy=await post(env,mk('sw',YELL.allianceOnyxia,now-10*MIN+8_000,{eventId:'2'.repeat(24)}));    // a second copy of one yell, different id
  assert.equal((await copy.json()).duplicate,true);
  assert.equal(env.DB.state.inserts,1,'one announcement, one stored event');
  const later=await post(env,mk('sw',YELL.allianceOnyxia,now-4*MIN,{eventId:'3'.repeat(24)}));
  assert.equal(later.status,202);assert.equal(env.DB.state.inserts,2);
  const otherHead=await post(env,mk('sw',YELL.allianceNefarian,now-4*MIN+5_000));
  assert.equal(otherHead.status,202,'the other head, seconds later, is a different drop');
  assert.equal(env.DB.state.inserts,3);
});

test('events arriving out of order: the newest drop by time is kept, not the last one inserted',async()=>{
  const env=envWith(),now=Date.now();
  await post(env,mk('sw',YELL.allianceNefarian,now-3*MIN));       // the newer one arrives first
  await post(env,mk('sw',YELL.allianceOnyxia,now-20*MIN));        // a late, older one is inserted afterwards
  const r=await realm(env);
  assert.deepEqual([r.lastDrops.alliance.at,r.lastDrops.alliance.head],[iso(now-3*MIN),'nefarian']);
  assert.equal(r.buffs[`${RALLY}:alliance`].at,iso(now-3*MIN));
  assert.equal(env.DB.state.inserts,2,'the late event is still recorded');
});

test('only validated evidence is accepted, and every refusal says why (and is logged without credentials)',async()=>{
  const env=envWith(),now=Date.now();
  const cases=[
    [{...mk('sw',YELL.allianceOnyxia,now),source:'player_claim'},'source_not_npc_yell'],
    [{...mk('sw',YELL.allianceOnyxia,now),faction:'horde'},'faction_does_not_match_listener'],
    [{...mk('org',YELL.hordeOnyxia,now),faction:'alliance'},'faction_does_not_match_listener'],
    [{...mk('sw',YELL.allianceOnyxia,now),buff:'Made Up Buff'},'unknown_buff'],
    [{...mk('sw',YELL.allianceOnyxia,now),faction:'both'},'unknown_faction'],
    [{...mk('sw',YELL.allianceOnyxia,now),text:'  '},'invalid_text'],
    [{...mk('sw',YELL.allianceOnyxia,now),text:'x'.repeat(2000)},'invalid_text'],
    [{...mk('sw',YELL.allianceOnyxia,now),head:'rend'},'invalid_head'],
    [{...mk('sw',YELL.allianceOnyxia,now),eventId:'../../x'},'invalid_event_id'],
    [{...mk('sw',YELL.allianceOnyxia,now),account:'OBPVEORG'},'account_role_mismatch'],
    [{...mk('sw',YELL.allianceOnyxia,now-45*MIN)},'event_too_old'],
    [{...mk('sw',YELL.allianceOnyxia,now+45*MIN)},'event_in_future'],
    [{...mk('sw',YELL.allianceOnyxia,now),time:'not a date'},'invalid_time'],
    [{...mk('sw',YELL.allianceOnyxia,now),realm:'Elsewhere'},'unknown_realm'],
    [{...mk('sw',YELL.allianceOnyxia,now),type:'made_up'},'unknown_type'],
  ];
  const {result,lines}=await traced(async()=>{
    const out=[];
    for(const [body,reason] of cases){const res=await post(env,body);out.push([res.status,(await res.json()).reason,reason]);}
    return out;
  });
  for(const [status,got,want] of result){assert.equal(status,400);assert.equal(got,want);}
  assert.equal(env.DB.state.inserts,0,'nothing was stored');
  const logged=lines.filter(l=>l.stage==='ingest_rejected');
  assert.ok(logged.length>=10&&logged.every(l=>l.reason&&l.scope==='octometrics'));
  assert.ok(!JSON.stringify(lines).includes('secret'),'the bearer token never appears in logs');
  assert.equal((await post(env,mk('sw',YELL.allianceOnyxia,now),'wrong')).status,401);
});

test('an unrecognised announcement text is stored as evidence but never given an invented head',async()=>{
  const env=envWith(),now=Date.now();
  assert.equal((await post(env,mk('sw','A message nobody has seen before.',now-MIN))).status,202);
  const r=await realm(env);
  assert.equal(r.lastDrops.alliance.head,null);
  assert.equal(r.heads.onyxia.drops.alliance,null);assert.equal(r.heads.nefarian.drops.alliance,null);
  assert.equal(r.unattributedDrops.alliance.at,iso(now-MIN));
});

test('stored events are logged through the pipeline (stored, duplicate) with identifiers and no credentials',async()=>{
  const env=envWith(),now=Date.now();
  const {lines}=await traced(async()=>{
    await post(env,mk('sw',YELL.allianceOnyxia,now-MIN,{eventId:'9'.repeat(24)}));
    await post(env,mk('sw',YELL.allianceOnyxia,now-MIN,{eventId:'9'.repeat(24)}));
  });
  assert.deepEqual(lines.map(l=>l.stage),['ingest_stored','ingest_duplicate']);
  assert.deepEqual([lines[0].faction,lines[0].role,lines[0].head,lines[0].eventId],['alliance','sw','onyxia','9'.repeat(24)]);
  assert.ok(lines[0].id>0&&lines[1].storedId===lines[0].id);
});

test('one confirmation contract: stored events that are not npc_yell evidence, or have impossible times, are reported as unconfirmed and never shown as drops',async()=>{
  const now=Date.now();
  const db=memoryD1([
    {type:'world_buff_drop',account:'OBPVESW',role:'sw',observed_at:iso(now-50*MIN),payload:{buff:RALLY,faction:'alliance',source:'npc_yell',text:YELL.allianceOnyxia}},
    {type:'world_buff_drop',account:'OBPVESW',role:'sw',observed_at:iso(now-20*MIN),payload:{buff:RALLY,faction:'alliance',source:'addon_report',text:YELL.allianceOnyxia}},
    {type:'world_buff_drop',account:'OBPVESW',role:'sw',observed_at:iso(now+3*3600_000),payload:{buff:RALLY,faction:'alliance',source:'npc_yell',text:YELL.allianceOnyxia}},
    {type:'world_buff_drop',account:'OBPVESW',role:'sw',observed_at:'garbage',payload:{buff:RALLY,faction:'alliance',source:'npc_yell'}},
  ]);
  const r=await realm(envWith(db));
  assert.equal(r.lastDrops.alliance.at,iso(now-50*MIN),'only the confirmed event counts');
  assert.deepEqual(r.dropDiagnostics.unconfirmed.map(u=>u.reason).sort(),['invalid_time','source_not_npc_yell','time_in_future']);
  assert.equal(r.dropDiagnostics.stored,4);assert.equal(r.dropDiagnostics.confirmed,1);
});

test('a quiet faction\'s last drop is not pushed out of the summary by many newer drops of the other faction',async()=>{
  const now=Date.now(),seed=[{type:'world_buff_drop',account:'OBPVESW',role:'sw',observed_at:iso(now-5*3600_000),payload:{buff:RALLY,faction:'alliance',source:'npc_yell',text:YELL.allianceOnyxia}}];
  for(let i=0;i<120;i++)seed.push({type:'world_buff_drop',account:'OBPVEORG',role:'org',observed_at:iso(now-(300-i)*MIN),payload:{buff:RALLY,faction:'horde',source:'npc_yell',text:YELL.hordeOnyxia}});
  const r=await realm(envWith(memoryD1(seed)));
  assert.equal(r.lastDrops.alliance.at,iso(now-5*3600_000),'the old summary query kept only the newest 30 events and would have lost it');
  assert.equal(r.lastDrops.horde.at,iso(now-181*MIN));
});

test('production history replayed through the real summary: matches what the live API reported, and shows why the 05:07 Alliance drop is absent',async()=>{
  const db=memoryD1(live.map(r=>({type:"world_buff_drop",...r})));
  const now=Date.parse('2026-11-16T05:29:24Z');
  const realDate=Date.now;Date.now=()=>now;
  let r;try{r=await realm(envWith(db));}finally{Date.now=realDate;}
  assert.deepEqual([r.lastDrops.alliance.at,r.lastDrops.alliance.head],['2026-11-16T02:37:08.054Z','onyxia'],'exactly the 2h52m-old drop the website showed');
  assert.deepEqual([r.lastDrops.horde.at,r.lastDrops.horde.head],['2026-11-16T05:06:21.051Z','onyxia']);
  assert.equal(r.heads.nefarian.drops.alliance.at,'2026-11-16T00:44:44.037Z');
  assert.equal(r.heads.nefarian.drops.horde.at,'2026-11-16T01:49:15.250Z');
  assert.equal(r.buffs["Warchief's Blessing:horde"].at,'2026-11-16T05:03:37.069Z');
  assert.equal(r.buffs["Warchief's Blessing:horde"].head,null,"Rend's announcement is not an Onyxia or Nefarian head");
  assert.equal(r.dropDiagnostics.unconfirmed.length,0);
  assert.equal(r.listeners.sw.status,'unverified','the running collector does not report listener health yet');
  assert.ok(!live.some(row=>row.payload.faction==='alliance'&&row.observed_at>'2026-11-16T02:37:08.054Z'));
});

test('the last recorded drop survives a Worker restart (it lives in D1, nothing is held in memory)',async()=>{
  const db=memoryD1(),now=Date.now();
  await post(envWith(db),mk('sw',YELL.allianceOnyxia,now-12*MIN));
  const restarted=envWith(db);               // a fresh environment over the same database
  assert.equal((await realm(restarted)).lastDrops.alliance.at,iso(now-12*MIN));
});

test('a new drop after long inactivity replaces the old one and resets the timer',async()=>{
  const now=Date.now(),db=memoryD1([{type:'world_buff_drop',account:'OBPVESW',role:'sw',observed_at:iso(now-26*3600_000),payload:{buff:RALLY,faction:'alliance',source:'npc_yell',text:YELL.allianceOnyxia}}]);
  const env=envWith(db);
  assert.equal((await realm(env)).lastDrops.alliance.at,iso(now-26*3600_000));
  await post(env,mk('sw',YELL.allianceNefarian,now-60_000));
  assert.equal((await realm(env)).lastDrops.alliance.at,iso(now-60_000));
});

// ---- Listener health --------------------------------------------------------------------------------------------------------------
const health=(role,at,payload)=>({type:'listener_health',account:ACCOUNT[role],role,observed_at:iso(at),payload});
const NOW=Date.parse('2026-11-16T06:00:00Z');
const ok={connected:true,connectedSince:iso(NOW-5*3600_000),lastYellAt:iso(NOW-10*MIN),yellsHeard:80,lastIngestOkAt:iso(NOW-MIN),ingestQueued:0,ingestRejected:0};
const status=(role,row,extra={})=>listenerStatus({role,account:ACCOUNT[role],health:row?{observed_at:row.observed_at,payload:row.payload}:null,now:NOW,...extra}).status;

test('listener status separates logged in from able to hear: unverified, healthy, offline, degraded and silent',()=>{
  assert.equal(status('sw',null),'unverified');
  assert.equal(status('sw',null,{session:{status:'online'}}),'unverified','a session alone proves nothing about hearing');
  assert.equal(status('sw',health('sw',NOW-30_000,ok)),'healthy');
  assert.equal(status('sw',health('sw',NOW-30_000,{...ok,connected:false})),'offline','reported disconnected');
  assert.equal(status('sw',health('sw',NOW-HEARTBEAT_FRESH_MS-1000,ok)),'offline','heartbeat stopped');
  assert.equal(status('sw',health('sw',NOW-30_000,{...ok,lastYellAt:iso(NOW-SILENCE_MS.sw-MIN)})),'silent','connected, heartbeating, but deaf');
  assert.equal(status('sw',health('sw',NOW-30_000,{...ok,lastYellAt:null,connectedSince:iso(NOW-SILENCE_MS.sw-MIN)})),'silent','never heard anything since connecting');
  assert.equal(status('sw',health('sw',NOW-30_000,{...ok,lastYellAt:null,connectedSince:iso(NOW-10*MIN)})),'healthy','a fresh login is not instantly suspect');
  assert.equal(status('org',health('org',NOW-30_000,{...ok,lastYellAt:iso(NOW-4*3600_000)})),'healthy','Orgrimmar is allowed a longer silence than Stormwind');
  assert.equal(status('sw',health('sw',NOW-30_000,{...ok,ingestQueued:4,lastIngestError:'HTTP 503',lastIngestErrorAt:iso(NOW-2*MIN),lastIngestOkAt:iso(NOW-30*MIN)})),'degraded','events waiting after errors');
  assert.equal(status('sw',health('sw',NOW-30_000,{...ok,ingestQueued:0,lastIngestError:'HTTP 503',lastIngestErrorAt:iso(NOW-2*MIN)})),'healthy','an old error with nothing waiting is not a current problem');
});

test('the summary exposes listener health per capital, the last stored drop, and whether the collector is reporting at all',async()=>{
  const now=Date.now(),db=memoryD1();
  const env=envWith(db);
  db.add(health('sw',now-20_000,{...ok,connectedSince:iso(now-3600_000),lastYellAt:iso(now-60_000),lastIngestOkAt:iso(now-30_000)}));
  db.add(health('org',now-5*MIN,{...ok,connectedSince:iso(now-3600_000),lastYellAt:iso(now-60_000),lastIngestOkAt:iso(now-30_000)}));
  db.add({type:'raid_who',account:'OBPVESW',role:'sw',observed_at:iso(now-30_000),payload:{zoneName:"Onyxia's Lair",playersListed:0}});
  await post(env,mk('sw',YELL.allianceOnyxia,now-2*MIN));
  const r=await realm(env);
  assert.equal(r.listeners.sw.status,'healthy');assert.equal(r.listeners.sw.lastStoredDropAt,iso(now-2*MIN));
  assert.equal(r.listeners.org.status,'offline','its heartbeat is five minutes old');
  assert.equal(r.monitoring.collectorFresh,true);
  const quiet=await realm(envWith(memoryD1()));
  assert.equal(quiet.monitoring.collectorFresh,false);assert.equal(quiet.monitoring.lastEventAt,null);
});

test('listener health events are validated and bounded: only the right account and role, and a connection flag',async()=>{
  const env=envWith(),now=Date.now();
  const hb=(role,extra={})=>({type:'listener_health',time:iso(now),realm:"N'Zoth",account:ACCOUNT[role],role,connected:true,connectedSince:iso(now-MIN),yellsHeard:3,...extra});
  assert.equal((await post(env,hb('sw'))).status,202);
  assert.equal((await post(env,hb('sw',{account:'OBPVEORG'}))).status,400);
  assert.equal((await post(env,hb('sw',{connected:'yes'}))).status,400);
  const stored=JSON.parse(env.DB.state.rows.at(-1).payload_json);
  assert.deepEqual([stored.connected,stored.yellsHeard],[true,3]);
  assert.ok(!('password' in stored)&&!('token' in stored));
});

test('the Worker still accepts what the existing collector sends (no eventId, no head), so Worker and collector can be deployed in either order',async()=>{
  const env=envWith(),now=Date.now();
  const old={type:'world_buff_drop',time:iso(now-MIN),realm:"N'Zoth",account:'OBPVEORG',role:'org',buff:RALLY,faction:'horde',sender:'Overlord Runthak',text:YELL.hordeOnyxia,source:'npc_yell'};
  assert.equal((await post(env,old)).status,202);
  const r=await realm(env);assert.deepEqual([r.lastDrops.horde.head,r.lastDrops.horde.confirmed],['onyxia',true]);
});
