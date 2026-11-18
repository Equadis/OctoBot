import test from 'node:test';
import assert from 'node:assert/strict';
import {buildIntegrityQueue} from '../../docs/sim/core/data-integrity.mjs';
import {baseStatInventory} from '../../docs/sim/core/base-stat-audit.mjs';
import {releaseReadiness} from '../../docs/sim/core/combat-release-readiness.mjs';

test('integrity queue preserves every missing and anomalous base coordinate',()=>{
 const b=baseStatInventory(), q=buildIntegrityQueue(b);
 assert.equal(q.baseRows.length,b.totals.missingRows+b.totals.anomalies);
 assert.equal(new Set(q.baseRows.map(r=>[r.race,r.classId,r.level].join(':'))).size,q.baseRows.length);
 assert.equal(q.totals.referenceBaseRowsNotLiveVerified,b.totals.referenceRows-b.totals.liveVerifiedRows);
 assert.equal(q.byClass.reduce((n,c)=>n+c.baseCaptureRows,0),q.baseRows.length);
 assert.equal(q.publicReady,false);
});
test('spell queue retains rank-specific conflicts, unknowns and identity gates',()=>{
 const c=releaseReadiness(),q=buildIntegrityQueue(baseStatInventory(),c);
 assert.equal(q.totals.conflictingAbilities,c.totals.conflictingAbilities);
 for(const a of c.classes.flatMap(c=>c.abilities)){
  for(const r of [...a.ranks,...a.externalReferenceRanks].filter(r=>r.conflicts.length||r.unknown.length)){
   assert.ok(q.spellRows.some(s=>s.abilityId===a.id&&s.spellId===r.spellId&&s.source===r.source&&JSON.stringify(s.conflicts)===JSON.stringify(r.conflicts)&&JSON.stringify(s.unknown)===JSON.stringify(r.unknown)));
  }
 }
 assert.ok(q.identityRows.some(r=>r.abilityId==='paladin:holy-strike'));
 assert.ok(q.identityRows.some(r=>r.abilityId==='hunter:trueshot-aura'));
 assert.equal(q.byClass.reduce((n,c)=>n+c.spellCaptureRows,0),q.spellRows.length);
});
