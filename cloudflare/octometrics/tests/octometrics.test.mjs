import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.mjs';
import {RAIDS,MIN_SAMPLES,headFromYell,pairSessions,learnDurations,confidenceFor,estimateClear,summariseDrops} from '../raid-intel.mjs';

const MIN=60_000,iso=ms=>new Date(ms).toISOString();

test('capital yells identify the head and faction they belong to',()=>{
  assert.equal(headFromYell('...Onyxia, hangs from the arches...'),'onyxia');
  assert.equal(headFromYell('The brood mother, Onyxia, has been slain!'),'onyxia');
  assert.equal(headFromYell('the Lord of Blackrock is slain! Nefarian has been subdued'),'nefarian');
  assert.equal(headFromYell('NEFARIAN IS SLAIN! People of Orgrimmar'),'nefarian');
  assert.equal(headFromYell('some other yell'),null);
  assert.equal(headFromYell(undefined),null);
});

test('start/end transitions pair into sessions; orphaned ends are ignored, not guessed',()=>{
  const t0=Date.UTC(2026,10,14,12);
  const events=[
    {observed_at:iso(t0-5*MIN),payload:{activityChange:'activity_ended',activityEnd:iso(t0-5*MIN)}},
    {observed_at:iso(t0),payload:{activityChange:'activity_started',activityStart:iso(t0)}},
    {observed_at:iso(t0+30*MIN),payload:{activityChange:'activity_ended',activityEnd:iso(t0+30*MIN)}},
    {observed_at:iso(t0+60*MIN),payload:{activityChange:'activity_started',activityStart:iso(t0+60*MIN)}},
  ];
  const sessions=pairSessions(events);
  assert.equal(sessions.length,1);
  assert.equal(sessions[0].durationMs,30*MIN);
});

test('learned durations use the median, drop implausible sessions and grade confidence by sample count',()=>{
  const ony=RAIDS.onyxia;
  const make=minutes=>minutes.map(m=>({durationMs:m*MIN}));
  const few=learnDurations(make([20,22,25,24]),ony);
  assert.equal(few.samples,4);assert.equal(few.confidence,'none');
  const some=learnDurations(make([20,22,25,24,23,2,900]),ony); // 2 min and 15 h are not real clears
  assert.equal(some.samples,5);assert.equal(some.rejected,2);assert.equal(some.medianMs,23*MIN);assert.equal(some.confidence,'low');
  const many=learnDurations(make(Array.from({length:16},(_,i)=>20+i%3)),ony);
  assert.equal(many.confidence,'high');
  assert.equal(confidenceFor(16,20*MIN,5*MIN,35*MIN),'medium'); // wide spread lowers the grade one step
  assert.equal(confidenceFor(5,20*MIN,5*MIN,35*MIN),'low');    // but never below low once estimating
  assert.equal(learnDurations(make([8,9]),ony).samples,0);       // below the Onyxia floor
  assert.equal(learnDurations(make([20,25]),RAIDS.nefarian).samples,0); // below the Blackwing Lair floor
});

test('estimated clears are never confirmed and degrade honestly',()=>{
  const now=Date.UTC(2026,10,14,15);
  const learned=learnDurations(Array.from({length:6},(_,i)=>({durationMs:(20+i)*MIN})),RAIDS.onyxia); // median 22.5 min
  const idle=estimateClear({active:false,startedAt:now-10*MIN,now,learned});
  assert.equal(idle.status,'idle');
  const learning=estimateClear({active:true,startedAt:now-10*MIN,now,learned:learnDurations([],RAIDS.onyxia)});
  assert.equal(learning.status,'learning');assert.equal(learning.estimatedAt,undefined);
  const live=estimateClear({active:true,startedAt:now-10*MIN,now,learned});
  assert.equal(live.status,'estimated');assert.equal(live.confirmed,false);
  assert.equal(Date.parse(live.estimatedAt),now-10*MIN+learned.medianMs);
  assert.ok(Date.parse(live.earliestAt)<Date.parse(live.estimatedAt)&&Date.parse(live.estimatedAt)<Date.parse(live.latestAt));
  assert.equal(estimateClear({active:true,startedAt:now-22.6*MIN,now,learned}).status,'due');
  assert.equal(estimateClear({active:true,startedAt:now-3*60*MIN,now,learned}).status,'overdue');
  for(const result of [idle,learning,live])assert.ok(!/cooldown|duration|remaining/i.test(Object.keys(result).join(' ').replace('medianMs','')));
});

test('drops are attributed per head and faction; unrecognised yells stay unattributed',()=>{
  const drops=summariseDrops([
    {observed_at:'2026-11-14T20:25:18Z',payload:{faction:'horde',text:'NEFARIAN IS SLAIN! People of Orgrimmar',source:'npc_yell',buff:'Rallying Cry of the Dragonslayer'}},
    {observed_at:'2026-11-14T17:28:50Z',payload:{faction:'alliance',text:'Onyxia, hangs from the arches',source:'npc_yell',buff:'Rallying Cry of the Dragonslayer'}},
    {observed_at:'2026-11-14T10:00:00Z',payload:{faction:'horde',text:'The brood mother, Onyxia, has been slain',source:'npc_yell',buff:'Rallying Cry of the Dragonslayer'}},
    {observed_at:'2026-11-14T09:00:00Z',payload:{faction:'alliance',source:'npc_yell',buff:'Rallying Cry of the Dragonslayer'}},
  ]);
  assert.equal(drops.nefarian.horde.at,'2026-11-14T20:25:18Z');
  assert.equal(drops.onyxia.alliance.at,'2026-11-14T17:28:50Z');
  assert.equal(drops.onyxia.horde.at,'2026-11-14T10:00:00Z');
  assert.equal(drops.unknown.alliance.at,'2026-11-14T09:00:00Z');
  assert.equal(drops.nefarian.alliance,null);
  assert.equal(drops.onyxia.horde.confirmed,true);
});

// ---- Worker behaviour against an in-memory D1 stand-in
function fakeDb(rows){
  const state={inserts:[]};
  return {state,prepare:sql=>({bind:(...args)=>({
    all:async()=>{
      if(sql.includes("type='dmf_status'"))return {results:rows.dmfStatus||[]};
      if(sql.includes("type='dmf_sighting'"))return {results:rows.dmfSightings||[]};
      if(sql.includes("json_extract"))return {results:rows.sessions.filter(r=>r.role===args[1]).map(r=>({observed_at:r.observed_at,payload_json:JSON.stringify(r.payload)})).reverse()};
      if(sql.includes("type='world_buff_drop'"))return {results:rows.drops.map(r=>({type:'world_buff_drop',account:r.account,role:r.role,observed_at:r.observed_at,payload_json:JSON.stringify(r.payload)}))};
      if(sql.includes("session_online"))return {results:[]};
      if(sql.includes("type='raid_who'")&&!sql.includes("server_info"))return {results:rows.who.map(r=>({type:'raid_who',account:r.account,role:r.role,observed_at:r.observed_at,payload_json:JSON.stringify(r.payload)}))};
      return {results:rows.who.map(r=>({type:'raid_who',account:r.account,role:r.role,observed_at:r.observed_at,payload_json:JSON.stringify(r.payload)}))};
    },
    run:async()=>{state.inserts.push(args);return {};},
  })})};
}

test('/api/summary keeps existing fields and adds per-head raid intelligence',async()=>{
  const now=Date.now();
  const sessions=[];
  for(let i=0;i<6;i++){ // six past Onyxia raids of ~25 minutes
    const start=now-(10+i)*3_600_000;
    sessions.push({role:'sw',observed_at:iso(start),payload:{activityChange:'activity_started',activityStart:iso(start)}});
    sessions.push({role:'sw',observed_at:iso(start+(24+i)*MIN),payload:{activityChange:'activity_ended',activityEnd:iso(start+(24+i)*MIN)}});
  }
  const rows={
    sessions,
    who:[
      {account:'OBPVESW',role:'sw',observed_at:iso(now-30_000),payload:{zoneName:"Onyxia's Lair",playersListed:30,activity:true,activityStart:iso(now-10*MIN),listCapped:false}},
      {account:'OBPVEORG',role:'org',observed_at:iso(now-30_000),payload:{zoneName:'Blackwing Lair',playersListed:40,activity:true,activityStart:iso(now-60*MIN)}},
    ],
    drops:[{account:'OBPVEORG',role:'org',observed_at:iso(now-5*MIN),payload:{buff:'Rallying Cry of the Dragonslayer',faction:'horde',source:'npc_yell',text:'NEFARIAN IS SLAIN! People of Orgrimmar'}}],
  };
  const response=await worker.fetch(new Request("https://m.test/api/summary?realm=N'Zoth"),{DB:fakeDb(rows)});
  assert.equal(response.status,200);
  const realm=(await response.json()).realms[0];
  // existing contract preserved
  assert.equal(realm.raids.sw.zone,"Onyxia's Lair");assert.equal(realm.raids.sw.clearConfirmed,false);
  assert.equal(realm.buffs['Rallying Cry of the Dragonslayer:horde'].source,'npc_yell');
  // new: head attribution on the existing buffs entry, and a separate block per head
  assert.equal(realm.buffs['Rallying Cry of the Dragonslayer:horde'].head,'nefarian');
  assert.equal(realm.heads.nefarian.drops.horde.confirmed,true);
  assert.equal(realm.heads.onyxia.drops.horde,null);
  assert.equal(realm.heads.onyxia.clear.status,'estimated');
  assert.equal(realm.heads.onyxia.clear.confirmed,false);
  assert.equal(realm.heads.onyxia.clear.confidence,'low');
  assert.equal(realm.heads.onyxia.learned.samples,6);
  assert.equal(realm.heads.nefarian.clear.status,'learning'); // no past Blackwing Lair sessions yet
  assert.equal(realm.heads.nefarian.raid.players,40);
  // no cooldown and no buff-duration timer anywhere in the payload
  assert.ok(!/cooldown|buffDuration|expiresAt|remaining/i.test(JSON.stringify(realm)));
});

test('ingest validation, authentication and CORS are unchanged',async()=>{
  const env={DB:fakeDb({sessions:[],who:[],drops:[]}),METRICS_PUSH_TOKEN:'secret'};
  const event={type:'world_buff_drop',time:new Date().toISOString(),realm:"N'Zoth",account:'OBPVESW',role:'sw',buff:'Rallying Cry of the Dragonslayer',faction:'alliance',source:'npc_yell',text:'Onyxia, hangs from the arches'};
  const post=(body,token='secret')=>worker.fetch(new Request('https://m.test/api/ingest',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body)}),env);
  assert.equal((await post(event,'wrong')).status,401);
  assert.equal((await post({...event,account:'SOMEONE'})).status,400);
  assert.equal((await post({...event,type:'made_up'})).status,400);
  const ok=await post(event);assert.equal(ok.status,202);
  assert.equal(env.DB.state.inserts.length,1);
  assert.equal(JSON.parse(env.DB.state.inserts[0][5]).text,'Onyxia, hangs from the arches'); // the yell text is what attributes the head
  const cors=await worker.fetch(new Request('https://m.test/api/summary',{method:'OPTIONS'}),env);
  assert.equal(cors.headers.get('access-control-allow-origin'),'https://equadis.github.io');
});

test('MIN_SAMPLES gate is the documented five',()=>assert.equal(MIN_SAMPLES,5));

test('DMF ingress validates role, account, realm, site and direct sightings',async()=>{
  const env={DB:fakeDb({sessions:[],who:[],drops:[]}),METRICS_PUSH_TOKEN:'secret'};
  const base={type:'dmf_sighting',time:new Date().toISOString(),realm:"N'Zoth",
    account:'OBPVEDMFA',role:'dmfa',site:'elwynn',npc:'Sayge',source:'onsite',confirmed:true};
  const post=async body=>worker.fetch(new Request('https://m.test/api/ingest',{
    method:'POST',headers:{authorization:'Bearer secret','content-type':'application/json'},
    body:JSON.stringify(body),
  }),env);
  assert.equal((await post(base)).status,202);
  assert.equal((await post({...base,account:'OBPVESW'})).status,400);
  assert.equal((await post({...base,role:'dmfh'})).status,400);
  assert.equal((await post({...base,site:'mulgore'})).status,400);
  assert.equal((await post({...base,realm:"Y'Shaarj"})).status,400);
  assert.equal((await post({...base,source:'player_claim'})).status,400);
  assert.equal((await post({...base,confirmed:false})).status,400);
  assert.equal((await post({...base,type:'dmf_status',connected:true})).status,202);
  assert.equal((await post({...base,type:'dmf_status',connected:'yes'})).status,400);
  assert.equal(env.DB.state.inserts.length,2);
  assert.equal(JSON.parse(env.DB.state.inserts[0][5]).npc,'Sayge');
});

test('DMF summary distinguishes sightings, silent accounts and stale connections',async()=>{
  const now=Date.now();
  const row=(account,role,when,payload)=>({
    account,role,observed_at:iso(when),payload_json:JSON.stringify(payload),
  });
  const rows={
    sessions:[],who:[],drops:[],
    dmfStatus:[
      row('OBPVEDMFA','dmfa',now-30_000,{site:'elwynn',connected:true,queries:10}),
      row('OBPVEDMFH','dmfh',now-30_000,{site:'mulgore',connected:true,queries:12}),
    ],
    dmfSightings:[
      row('OBPVEDMFA','dmfa',now-120_000,{site:'elwynn',confirmed:true,npc:'Sayge',source:'onsite'}),
    ],
  };
  const res=await worker.fetch(new Request("https://m.test/api/summary?realm=N'Zoth"),{DB:fakeDb(rows)});
  assert.equal(res.status,200);
  const realm=(await res.json()).realms[0];
  assert.equal(realm.darkmoon.sites.elwynn.collectorStatus,'online');
  assert.equal(realm.darkmoon.sites.elwynn.npc,'Sayge');
  assert.equal(realm.darkmoon.sites.elwynn.fresh,true);
  assert.equal(realm.darkmoon.sites.mulgore.collectorStatus,'online');
  assert.equal(realm.darkmoon.sites.mulgore.lastConfirmedAt,null);
  assert.equal(realm.darkmoon.latestConfirmed.site,'elwynn');
  assert.equal(JSON.stringify(realm.darkmoon).includes('"absent"'),false);
  rows.dmfStatus=[row('OBPVEDMFA','dmfa',now-10*MIN,{site:'elwynn',connected:false})];
  rows.dmfSightings=[row('OBPVEDMFA','dmfa',now-7*60*MIN,{site:'elwynn',confirmed:true,npc:'Sayge'})];
  const stale=await worker.fetch(new Request("https://m.test/api/summary?realm=N'Zoth"),{DB:fakeDb(rows)});
  const older=(await stale.json()).realms[0].darkmoon.sites.elwynn;
  assert.equal(older.collectorStatus,'stale');
  assert.equal(older.fresh,false);
  assert.ok(older.lastConfirmedAt);
});
