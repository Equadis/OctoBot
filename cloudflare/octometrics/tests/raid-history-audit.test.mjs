import {test} from 'node:test';
import assert from 'node:assert/strict';
import {auditRaidHistory} from '../audit-raid-history.mjs';
import {rebase,iso,MIN} from './helpers.mjs';
test('retained history audit excludes a resumed finish and detects duplicated telemetry',()=>{
  const r=rebase('onyxia-back-to-back'),e=r.events.find(x=>x.type==='raid_session_ended');
  const now=Date.now(),resume=iso(Date.parse(e.time)+MIN);
  const s={...e.session,status:'in_progress',resumed:true,resumedAt:resume,lastConfirmedAt:resume};
  delete s.endedAt;delete s.confirmedAt;delete s.endReason;delete s.clearSource;
  const snap={...r.events.filter(x=>x.type==='raid_sessions').pop(),sessions:[s],eventId:'audit-resume',seq:99999999999999};
  const row=(p,id,at)=>({id,type:p.type,realm:p.realm,observed_at:at,payload_json:JSON.stringify(p)});
  const report=auditRaidHistory([row(e,1,e.time),row(e,2,e.time),row(snap,3,resume)],now)[0];
  assert.equal(report.duplicateEventIds,1);
  assert.equal(report.retainedFinishes,0);
  assert.equal(report.prediction.samples,0);
  assert.deepEqual(report.standaloneKeysExcluded,[e.session.key]);
});

test('legacy snapshot history compacts repeated endings and independent wipe returns',async()=>{
  const {snapshotHistoryRevisions,endedEvents}=await import('../raid-sessions.mjs');
  const {buildHistoryBackfillSql}=await import('../audit-raid-history.mjs');
  const r=rebase('onyxia-back-to-back',25*MIN),e=r.events.find(x=>x.type==='raid_session_ended');
  const base=Date.parse(e.time),s={...e.session};delete s.confirmedAt;
  const active=()=>{const a={...s,status:'in_progress',resumed:true};delete a.endedAt;delete a.endReason;delete a.clearSource;return a;};
  const finalEnd=iso(base+6*MIN),s2={...s,endedAt:finalEnd};
  const s3={...s,endedAt:iso(base+12*MIN)};
  const row=(session,i,minute)=>({id:i,type:'raid_sessions',realm:e.realm,observed_at:iso(base+minute*MIN),payload_json:JSON.stringify({schema:1,zone:e.zone,seq:i,eventId:'s'+i,sessions:[session]})});
  const rows=[row(s,1,0),row(s,2,1),row(active(),3,2),row(active(),4,3),row(s2,5,7),row(active(),6,8),row(active(),7,9),row(s3,8,13),row(s3,9,14)];
  const compact=snapshotHistoryRevisions(rows,e.zone);
  assert.equal(compact.length,5);
  assert.deepEqual(compact.map(x=>x.observed_at),[0,2,7,8,13].map(m=>iso(base+m*MIN)));
  const history=endedEvents([],e.zone,null,compact);
  assert.equal(history.length,1);
  assert.equal(history[0].confirmedAt,iso(base+13*MIN));
  const sql=buildHistoryBackfillSql(rows);
  assert.equal(sql.split('\n').filter(x=>x.startsWith('INSERT')).length,5);
  assert.ok(sql.includes("N''Zoth"));
  assert.ok(!/DELETE|UPDATE/.test(sql));
});
test('historical snapshot retraction survives even after current snapshot forgets raid',async()=>{
  const {snapshotHistoryRevisions,endedEvents}=await import('../raid-sessions.mjs');
  const r=rebase('onyxia-back-to-back',10*MIN),e=r.events.find(x=>x.type==='raid_session_ended');
  const base=Date.parse(e.time),s={...e.session};delete s.confirmedAt;
  const active={...s,status:'in_progress',resumed:false};delete active.endedAt;delete active.endReason;delete active.clearSource;
  const row=(session,i,minute)=>({type:'raid_sessions',realm:e.realm,observed_at:iso(base+minute*MIN),payload_json:JSON.stringify({schema:1,zone:e.zone,seq:i,sessions:[session]})});
  const revisions=snapshotHistoryRevisions([row(s,1,0),row(active,2,1)],e.zone);
  assert.equal(revisions.length,2);
  assert.deepEqual(endedEvents([],e.zone,{payload:{sessions:[]},observedAt:iso(base+5*MIN)},revisions),[]);
});

test('generated SQL can be applied twice without changing raw records',async()=>{
  const {DatabaseSync}=await import('node:sqlite');
  const {buildHistoryBackfillSql}=await import('../audit-raid-history.mjs');
  const r=rebase('onyxia-back-to-back',MIN),e=r.events.find(x=>x.type==='raid_session_ended');
  const s={...e.session};delete s.confirmedAt;
  const row={type:'raid_sessions',realm:e.realm,observed_at:e.time,payload_json:JSON.stringify({schema:1,zone:e.zone,seq:1,sessions:[s]})};
  const db=new DatabaseSync(':memory:');
  try{
    db.exec("CREATE TABLE metric_events(id INTEGER PRIMARY KEY,type TEXT,realm TEXT,account TEXT,role TEXT,observed_at TEXT,payload_json TEXT)");
    db.prepare("INSERT INTO metric_events(type,realm,observed_at,payload_json) VALUES (?,?,?,?)").run(row.type,row.realm,row.observed_at,row.payload_json);
    const sql=buildHistoryBackfillSql([row]);
    db.exec(sql);db.exec(sql);
    const stored=db.prepare("SELECT type,realm,observed_at,payload_json FROM metric_events ORDER BY id").all();
    assert.equal(stored.length,2);
    assert.equal(stored[0].payload_json,row.payload_json);
    assert.equal(stored[1].type,'raid_session_revision');
  }finally{db.close();}
});
