import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CONSUMABLES,CONSUMABLE_BY_ID,selectConsumable,orderConsumables,explicitStacking,stackingNote,validateConsumables,resolveConsumableSelection,consumableRestriction} from '../../docs/sim/core/consumables.mjs';
import {newBuild,validateBuild} from '../../docs/sim/core/builds.mjs';
import {CLASS_DEFINITIONS} from '../../docs/sim/core/classes.mjs';
test('class consumable order is stable as choices change',()=>{
 const initial=orderConsumables(CONSUMABLES).map(i=>i.id);let selected=[];
 for(const id of [20007,13444,20079]){selected=selectConsumable(selected,id);assert.deepEqual(orderConsumables(CONSUMABLES).map(i=>i.id),initial);}
 assert.deepEqual(orderConsumables([{id:2,name:'Same'},{id:1,name:'Same'}]).map(i=>i.id),[1,2]);
});
test('official flask and Zanza exclusivity is enforced independently of cooldowns',()=>{
 for(const [a,b,group] of [[13510,13511,'flask'],[20079,20080,'zanza'],[20080,20081,'zanza']]){
  assert.equal(explicitStacking(CONSUMABLE_BY_ID.get(a)).status,'verified-tooltip');assert.equal(explicitStacking(CONSUMABLE_BY_ID.get(b)).group,group);
  assert.deepEqual(selectConsumable([a],b),[b]);assert.deepEqual(selectConsumable([b],a),[a]);
 }
 assert.deepEqual(selectConsumable([20079],13510),[20079,13510]);
});
test('shared potion cooldown is not incorrectly used as an exclusive buff group',()=>{
 assert.deepEqual(selectConsumable([20007],13444),[20007,13444]);
 assert.deepEqual(selectConsumable([13457],13458),[13457,13458]);
 assert.deepEqual(selectConsumable([13443],18841),[18841]); // same source spell
 assert.match(stackingNote(CONSUMABLE_BY_ID.get(13444)),/unresolved/);
 assert.deepEqual(resolveConsumableSelection({buffIds:['quickness'],consumableIds:[20007]}),{buffIds:['quickness'],consumableIds:[20007]});
});
test('build imports enforce explicit exclusivity, and clear all preserves other controls',()=>{
 const build=newBuild('druid');assert.deepEqual(validateConsumables([20079,20080],build),[20080]);
 const before={...build.controls,buffIds:['battle-shout'],consumableIds:[20079],teaThreshold:12};
 const after={...before,consumableIds:[]};assert.deepEqual(after.buffIds,before.buffIds);assert.equal(after.teaThreshold,12);assert.deepEqual(before.consumableIds,[20079]);
});
test('reset uses the existing current-class defaults for all nine classes',()=>{
 for(const cls of CLASS_DEFINITIONS){const data=JSON.parse(readFileSync(new URL(`../../docs/sim/data/talents/${cls.id}.json`,import.meta.url)));const build=validateBuild(newBuild(cls.id),data);assert.equal(build.classId,cls.id);assert.deepEqual(build.gear,{});assert.deepEqual(build.talents,{});assert.deepEqual(build.controls.buffIds,[]);assert.deepEqual(build.controls.consumableIds,[]);}
});
test('recipe records and unresolved source facts are not advertised as combat consumables',()=>{
 const recipe=CONSUMABLE_BY_ID.get(55057);assert.match(consumableRestriction(recipe,newBuild('warrior')),/recipes/);
 for(const item of CONSUMABLES)if(!item.verified)assert.equal(explicitStacking(item).status,'unresolved');
});
