import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileBaseReferences} from '../../docs/sim/core/base-reference-reconciliation.mjs';
import {baseStatInventory,baseStatProfile} from '../../docs/sim/core/base-stat-audit.mjs';
test('partial reference data covers missing combinations without promoting rows',()=>{
 const r=reconcileBaseReferences(), b=baseStatInventory();
 assert.equal(r.totals.partialRows,b.totals.missingRows);
 assert.equal(r.totals.referenceFields,2280);
 assert.equal(r.totals.resourceConflicts,0);
 assert.equal(r.anomalyCandidates.length,3);
 for(const p of r.resourceCandidates){
  assert.ok(p.supportingRaces.length>=2);
  assert.equal(p.liveVerified,false);
  assert.equal(baseStatProfile(p.race,p.classId,p.level).row,null);
 }
 assert.equal(r.publicReady,false);
});
test('disagreements and lone reference races do not produce partial candidates',()=>{
 const row=(hp)=>[1,2,3,4,5,hp,0];
 const t={'Human:warrior':[row(20)],'Dwarf:warrior':[row(21)]};
 const races={warrior:['Human','Dwarf','Goblin']};
 const inv={combinations:[]};
 assert.equal(reconcileBaseReferences(t,races,inv).totals.resourceConflicts,1);
 assert.equal(reconcileBaseReferences(t,races,inv).resourceCandidates.length,0);
 assert.equal(reconcileBaseReferences({'Human:warrior':[row(20)]},races,inv).resourceCandidates.length,0);
});
