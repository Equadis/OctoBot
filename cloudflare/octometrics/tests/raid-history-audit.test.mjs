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
