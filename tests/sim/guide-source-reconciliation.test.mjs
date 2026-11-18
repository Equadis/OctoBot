import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileGuideSources} from '../../docs/sim/core/guide-source-reconciliation.mjs';
test('guide proposals retain conflicting rank evidence and cannot override runtime',()=>{
 const queue={spellRows:[{abilityId:'mage:fireball',spellId:10151,rank:11,source:'db',conflicts:[{field:'manaCost',database:395}]}]};
 const rows=reconcileGuideSources(queue);
 const f=rows.find(r=>r.abilityId==='mage:fireball'&&r.rank===11);
 assert.equal(f.value,275);
 assert.equal(f.linkedRanks[0].conflicts[0].database,395);
 assert.equal(rows.find(r=>r.abilityId==='mage:fireball'&&r.rank===12).linkedRanks.length,0);
 assert.ok(rows.every(r=>!r.liveVerified&&!r.canAutoApply));
 assert.equal(rows.find(r=>r.abilityId==='priest:holy-nova').scope,'shadowform-guide-rank-unspecified');
});
