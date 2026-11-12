import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CLASS_DEFINITIONS} from '../../docs/sim/core/classes.mjs';
import {newBuild,validateBuild} from '../../docs/sim/core/builds.mjs';
import {resetPlannerSection} from '../../docs/sim/core/panel-resets.mjs';
test('every class panel resets only its own persisted fields',()=>{
 for(const cls of CLASS_DEFINITIONS){
  const data=JSON.parse(readFileSync(new URL(`../../docs/sim/data/talents/${cls.id}.json`,import.meta.url))),initial=newBuild(cls.id);
  const first=data.talents.find(t=>t.row===0&&t.requires===null);
  initial.name='Keep my build';initial.gear.ring1={id:1,label:'Fixture'};initial.talents[first.id]=1;
  initial.controls.buffIds=['battle-shout'];initial.controls.keyInterval=222;initial.controls.teaThreshold=12;
  Object.assign(initial.planning,{duration:90,targetArmour:7000,buffs:'Buff note',debuffs:'Debuff note',rotation:'Rotation note'});
  const original=structuredClone(initial);
  for(const section of ['equipment','talents','buffs','rotation','build-settings']){
   const next=validateBuild(resetPlannerSection(initial,section),data);
   assert.equal(next.classId,cls.id);assert.equal(next.name,initial.name);assert.equal(next.race,initial.race);
   assert.deepEqual(next.gear,section==='equipment'?{}:initial.gear);
   assert.deepEqual(next.talents,section==='talents'?{}:initial.talents);
   assert.deepEqual(next.controls.buffIds,section==='buffs'?[]:initial.controls.buffIds);
   assert.equal(next.controls.keyInterval,section==='rotation'?100:222);
   assert.equal(next.controls.teaThreshold,section==='buffs'?20:12);
   assert.equal(next.planning.duration,section==='build-settings'?60:90);
   assert.equal(next.planning.buffs,section==='buffs'?'':'Buff note');
   assert.equal(next.planning.rotation,section==='rotation'?'':'Rotation note');
  }
  assert.deepEqual(initial,original);
 }
});
test('unknown reset sections cannot silently clear a build',()=>assert.throws(()=>resetPlannerSection(newBuild(),'unknown'),/Unknown planner section/));
