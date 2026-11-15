import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.mjs';
import {validateRaidSessions,validateRaidSessionEnded,trainingDurations} from '../raid-sessions.mjs';

import {MIN,iso,rebase,memoryDb,envFor,post,realmOf,replay,near} from './helpers.mjs';

test('two simultaneous Onyxia raids: the website sees the tracker\'s ids, labels and elapsed times',async()=>{
  const env=envFor(memoryDb());
  const r=await replay(env,'onyxia-two-raids');
  const head=(await realmOf(env)).heads.onyxia;
  assert.equal(head.authoritative.fresh,true);
  assert.deepEqual(head.sessions.map(s=>s.id),r.expected.live.map(s=>s.id));
  assert.deepEqual(head.sessions.map(s=>s.id),[702,703]);
  head.sessions.forEach((s,i)=>{
    assert.equal(s.guild.label,r.expected.live[i].label);
    assert.equal(s.confidence,r.expected.live[i].confidence);
    near(s.elapsedMs,r.expected.live[i].elapsedMs);
  });
  assert.equal(head.sessions[0].identity,'inferred'); // /who alone never verifies identity
  assert.equal(head.sessions.every(s=>s.estimate.confirmed===false),true);
});

test('BWL raid #33 reports its tracker elapsed time, not the headcount session\'s',async()=>{
  const env=envFor(memoryDb());
  const r=await replay(env,'bwl-single');
  const head=(await realmOf(env)).heads.nefarian;
  assert.equal(head.sessions[0].id,33);
  near(head.sessions[0].elapsedMs,r.expected.live[0].elapsedMs);
  near(head.sessions[0].elapsedMs,49*MIN,5000);
  assert.equal(head.sessions[0].guild.label,'PUG');
});

test('back-to-back raids stay separate: the finished one is history, the new one has its own clock',async()=>{
  const env=envFor(memoryDb());
  const r=await replay(env,'onyxia-back-to-back');
  const head=(await realmOf(env)).heads.onyxia;
  assert.deepEqual(head.sessions.map(s=>s.id),[702]);
  near(head.sessions[0].elapsedMs,r.expected.live[0].elapsedMs);
  assert.equal(head.authoritative.lastFinished.id,701);
  assert.equal(head.authoritative.lastFinished.killConfirmed,false); // a roster departure is not a kill
  assert.equal(head.authoritative.lastFinished.clearSource,'roster_departure');
});

test('the Worker restarting changes nothing: identity and start come from stored events',async()=>{
  const db=memoryDb();
  await replay(envFor(db),'onyxia-two-raids');
  const before=(await realmOf(envFor(db))).heads.onyxia.sessions.map(s=>[s.id,s.startedAt]);
  const after=(await realmOf(envFor(db))).heads.onyxia.sessions.map(s=>[s.id,s.startedAt]); // a "new isolate", same D1
  assert.deepEqual(after,before);
});

test('duplicate and out-of-order telemetry never create or rewind a raid',async()=>{
  const db=memoryDb(),env=envFor(db);
  const r=rebase('onyxia-two-raids');
  const snaps=r.events.filter(e=>e.type==='raid_sessions');
  const newest=snaps[snaps.length-1],older=snaps[snaps.length-3];
  assert.equal((await post(env,newest)).status,202);
  assert.equal((await post(env,newest)).status,200); // exact duplicate acknowledged, not stored
  assert.equal((await post(env,older)).status,409);  // delayed event superseded by the newer state
  assert.equal(db.state.inserts,1);
  const head=(await realmOf(env)).heads.onyxia;
  assert.deepEqual(head.sessions.map(s=>s.id),[702,703]);
});

test('a duplicate raid_session_ended is stored once',async()=>{
  const db=memoryDb(),env=envFor(db);
  const r=rebase('onyxia-back-to-back');
  const ended=r.events.find(e=>e.type==='raid_session_ended');
  assert.equal((await post(env,ended)).status,202);
  assert.equal((await post(env,ended)).status,200);
  assert.equal(db.state.inserts,1);
});

test('delayed telemetry: the last known raid stays, flagged stale, with the same id and start',async()=>{
  const env=envFor(memoryDb());
  const r=await replay(env,'onyxia-two-raids',10*MIN); // last report 10 minutes ago
  const head=(await realmOf(env)).heads.onyxia;
  assert.equal(head.authoritative.stale,true);
  assert.equal(head.authoritative.fresh,false);
  assert.deepEqual(head.sessions.map(s=>s.id),[702,703]);
  assert.equal(head.sessions[0].estimate.status,'stale'); // no misleading overdue/soon from stale data
  assert.equal(head.clear.status,'stale');
  assert.equal(head.authoritative.lastFinished,null);   // silence never means "cleared"
  assert.ok(Math.abs(Date.parse(head.sessions[0].startedAt)-(Date.parse(rebase('onyxia-two-raids',10*MIN).events[0].time)))<=24*MIN);
  assert.ok(r.events.length>0);
});

test('long silence expires the live view without inventing a clear',async()=>{
  const snap=rebase('onyxia-two-raids').events.filter(e=>e.type==='raid_sessions').pop();
  const old=iso(Date.now()-7*3_600_000);
  const db=memoryDb([{id:1,type:'raid_sessions',realm:"N'Zoth",account:'bufftracker',role:'rt',observed_at:old,payload_json:JSON.stringify(validateRaidSessions(snap))}]);
  const head=(await realmOf(envFor(db))).heads.onyxia;
  assert.equal(head.authoritative.expired,true);
  assert.deepEqual(head.sessions,[]);
  assert.equal(head.authoritative.lastFinished,null);
  assert.equal(head.clear.status,'stale');
});

test('estimates learn only from trusted tracker sessions; too few means LEARNING',async()=>{
  const base=rebase('onyxia-back-to-back').events.find(e=>e.type==='raid_session_ended');
  const make=(i,minutes,over={})=>{
    const end=Date.now()-(i+1)*3_600_000,start=end-minutes*MIN;
    const e=JSON.parse(JSON.stringify(base));
    Object.assign(e.session,{key:`n${900+i}`,id:900+i,formedAt:iso(start),endedAt:iso(end),lastConfirmedAt:iso(end),...over});
    e.durationMs=end-start;e.eventId=`seed${i}`;
    return {id:i+1,type:'raid_session_ended',realm:"N'Zoth",account:'bufftracker',role:'rt',observed_at:iso(end),payload_json:JSON.stringify(validateRaidSessionEnded(e))};
  };
  const snap=rebase('onyxia-two-raids').events.filter(e=>e.type==='raid_sessions').pop();
  const live={id:99,type:'raid_sessions',realm:"N'Zoth",account:'bufftracker',role:'rt',observed_at:iso(Date.now()-30_000),payload_json:JSON.stringify(validateRaidSessions(snap))};
  const four=[0,1,2,3].map(i=>make(i,20+i));
  let head=(await realmOf(envFor(memoryDb([...four,live])))).heads.onyxia;
  assert.equal(head.clear.status,'learning');assert.equal(head.clear.samples,4);
  const trusted=[0,1,2,3,4,5].map(i=>make(i,20+i));
  head=(await realmOf(envFor(memoryDb([...trusted,live])))).heads.onyxia;
  assert.equal(head.clear.source,'authoritative');
  assert.equal(head.clear.samples,6);assert.equal(head.clear.confirmed,false);
  assert.ok(['estimated','due','overdue'].includes(head.clear.status));
  assert.equal(head.learned.source,'authoritative');
  // disbanded / interrupted / untrusted / implausible sessions are excluded from training
  const polluted=[...trusted.slice(0,4),make(7,25,{endReason:'disbanded',trusted:false}),make(8,25,{endReason:'interrupted',trusted:false}),make(9,3),make(10,25,{trusted:false})];
  head=(await realmOf(envFor(memoryDb([...polluted,live])))).heads.onyxia;
  assert.equal(head.clear.status,'learning');assert.equal(head.clear.samples,4);
});

test('trainingDurations excludes ambiguous and tentative-identity sessions',()=>{
  const e=trusted=>({durationMs:30*MIN,session:{trusted,endReason:'departed'}});
  assert.deepEqual(trainingDurations([e(true),e(false)]),[{durationMs:30*MIN}]);
});

test('without tracker telemetry the legacy estimate is kept but labelled, and no sessions are invented',async()=>{
  const env=envFor(memoryDb());
  const head=(await realmOf(env)).heads.onyxia;
  assert.equal(head.authoritative,null);
  assert.deepEqual(head.sessions,[]);
  assert.equal(head.clear.source,'legacy_headcount');
});

test('ambiguous activity is passed through as ambiguity, never as separate sessions',async()=>{
  const snap=rebase('onyxia-two-raids').events.filter(e=>e.type==='raid_sessions').pop();
  const amb={...snap,sessions:snap.sessions.slice(0,1),lair:{...snap.lair,ambiguity:{kind:'overlapping_assembly',players:19,reason:'cannot separate'}}};
  const env=envFor(memoryDb());
  assert.equal((await post(env,amb)).status,202);
  const head=(await realmOf(env)).heads.onyxia;
  assert.equal(head.sessions.length,1);
  assert.equal(head.authoritative.lair.ambiguity.kind,'overlapping_assembly');
});

test('ingest authentication and validation for raid telemetry',async()=>{
  const db=memoryDb(),env=envFor(db);
  const r=rebase('onyxia-two-raids');
  const snap=r.events.filter(e=>e.type==='raid_sessions').pop();
  assert.equal((await post(env,snap,'wrong')).status,401);
  assert.equal((await post(env,{...snap,account:'OBPVESW'})).status,400);
  assert.equal((await post(env,{...snap,role:'sw'})).status,400);
  assert.equal((await post(env,{...snap,zone:'molten_core'})).status,400);
  assert.equal((await post(env,{...snap,schema:2})).status,400);
  assert.equal((await post(env,{...snap,time:iso(Date.now()-3*3_600_000)})).status,400);
  const bad=JSON.parse(JSON.stringify(snap));bad.sessions[0].formedAt='not a date';
  assert.equal((await post(env,bad)).status,400);
  const future=JSON.parse(JSON.stringify(snap));future.sessions[0].formedAt=iso(Date.now()+3_600_000);
  assert.equal((await post(env,future)).status,400);
  assert.equal(db.state.inserts,0);
  const ended=rebase('onyxia-back-to-back').events.find(e=>e.type==='raid_session_ended');
  const killNoProof=JSON.parse(JSON.stringify(ended));killNoProof.session.endReason='kill_confirmed';
  assert.equal((await post(env,killNoProof)).status,400); // only a Chronicle kill may claim a kill
  const backwards=JSON.parse(JSON.stringify(ended));backwards.session.endedAt=iso(Date.parse(ended.session.formedAt)-MIN);
  assert.equal((await post(env,backwards)).status,400); // negative duration
  const lying=JSON.parse(JSON.stringify(ended));lying.durationMs+=MIN;
  assert.equal((await post(env,lying)).status,400);
});

test('character names are never stored or published',async()=>{
  const db=memoryDb(),env=envFor(db);
  const snap=rebase('onyxia-two-raids').events.filter(e=>e.type==='raid_sessions').pop();
  const sneaky=JSON.parse(JSON.stringify(snap));
  sneaky.sessions[0].roster=['Secretname'];sneaky.sessions[0].guild.members=['Secretname'];
  assert.equal((await post(env,sneaky)).status,202);
  assert.ok(!db.state.rows.some(r=>r.payload_json.includes('Secretname')));
  assert.ok(!JSON.stringify(await realmOf(env)).includes('Secretname'));
});

test('existing summary fields and ingest types keep working alongside raid telemetry',async()=>{
  const env=envFor(memoryDb());
  await replay(env,'bwl-single');
  const realm=await realmOf(env);
  for(const k of ['population','raids','buffs','sessions','heads','unattributedDrops','darkmoon'])assert.ok(k in realm,k);
  assert.ok(realm.heads.onyxia&&realm.heads.nefarian);
  assert.equal(realm.heads.onyxia.sessions.length,0); // Onyxia never reported: nothing invented
});
