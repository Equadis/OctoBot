import test from 'node:test';import assert from 'node:assert/strict';
import {CONSUMABLE_BY_ID,consumableGroup,consumableConflictReason,sharedConsumableConflict,resolveConsumableSelection,crossConsumableErrors,stackingInventory} from '../../docs/sim/core/consumables.mjs';
import {resolveBuffEffects} from '../../docs/sim/core/buff-effect-audit.mjs';import {newBuild} from '../../docs/sim/core/builds.mjs';
const item=id=>CONSUMABLE_BY_ID.get(id);
test('flask wording rather than drink name determines the combat flask group',()=>{
 assert.equal(item(2593).category,'Food & Utility');assert.equal(consumableGroup(item(2593)),null);
 assert.equal(consumableConflictReason(item(2593),item(13510)),null);
 assert.equal(sharedConsumableConflict('supreme-power',item(13510)).evidence,'verified-tooltip');
 assert.equal(consumableConflictReason(item(20079),item(20080)).evidence,'verified-tooltip');
});
test('strict duplicate source signatures do not turn partial overlap into exclusivity',()=>{
 const a={id:1,verified:true,name:'A',spellIds:[1,2],effects:['Use: A']},b={id:2,verified:true,name:'B',spellIds:[1,3],effects:['Use: B']};
 assert.equal(consumableConflictReason(a,b),null);
 assert.equal(consumableConflictReason(item(13443),item(18841)).kind,'identical-effect');
 assert.equal(consumableConflictReason(item(13444),item(20007)),null);
});
test('shared and catalogue choices respect both selection directions and do not double-count aliases',()=>{
 const c={buffIds:['emerald-mongoose','kings'],consumableIds:[2457]};
 assert.equal(sharedConsumableConflict('emerald-mongoose',item(2457)).evidence,'reference-policy');
 assert.deepEqual(resolveConsumableSelection(c,'consumables'),{buffIds:['kings'],consumableIds:[2457]});
 assert.deepEqual(resolveConsumableSelection(c,'buffs'),{buffIds:['emerald-mongoose','kings'],consumableIds:[]});
 assert.equal(crossConsumableErrors(c).length,1);
 assert.deepEqual(resolveConsumableSelection({buffIds:['rum'],consumableIds:[21151]}),{buffIds:['rum'],consumableIds:[]});
 const build=newBuild('mage');build.controls.buffIds=['supreme-power'];build.controls.consumableIds=[13512];
 const audit=resolveBuffEffects(build);assert.equal(audit.entries.filter(x=>x.id==='supreme-power').length,1);assert.equal(audit.consumables.length,0);
});
test('ineligible additional selections do not displace an otherwise valid shared selection',()=>{
 const b=newBuild('rogue');b.controls.buffIds=['supreme-power'];b.controls.consumableIds=[13511];
 const a=resolveBuffEffects(b);assert.deepEqual(a.ids,['supreme-power']);assert.equal(a.consumables.length,0);
});
test('complete stacking inventory keeps tooltip, duplicate and reference policies distinct',()=>{
 const r=stackingInventory();assert.equal(r.liveVerifiedPairs,0);
 assert.ok(r.explicitPairs.length>0&&r.referencePairs.length>0&&r.sharedPairs.length>0);
 assert.ok(r.explicitPairs.every(x=>x.evidence==='verified-tooltip'));
 assert.ok(r.referencePairs.every(x=>x.evidence==='reference-policy'));
 assert.ok(r.identicalPairs.every(x=>x.evidence==='matching-tooltip-and-source-spells'));
});
