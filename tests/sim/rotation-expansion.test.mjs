import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ROTATION_REGISTRY,abilityKey,RULESET_REVISION} from '../../docs/sim/core/rotations/registry.mjs';
import {LEGACY_PROFILES} from '../../docs/sim/core/rotations/legacy.mjs';
import {validateRows,presetCompatibility} from '../../docs/sim/core/rotations/validator.mjs';
import {CONDITION_DEFINITIONS,evaluateCondition,evaluatePriority,UnsupportedRotationState} from '../../docs/sim/core/rotations/conditions.mjs';
import {recommendPresets} from '../../docs/sim/core/rotations/recommendations.mjs';
import {rotationEngineErrors} from '../../docs/sim/core/rotations/readiness.mjs';
import {newBuild,validateBuild,encodeBuild,decodeBuild} from '../../docs/sim/core/builds.mjs';
const read=name=>JSON.parse(readFileSync(new URL(`../../docs/sim/data/${name}`,import.meta.url)));
const requested=read('rotations/requested-catalogue.json'),legacyIds=read('rotations/legacy-ids.json');
const C=(metric,operator,value,aura='')=>({metric,operator,value,aura});
const action=(kind='instant',ready=true)=>({kind,ready,available:true});
test('all 85 requested variants and all 40 legacy IDs are present with immutable meaningful priorities',()=>{
 let count=0,added=0;
 for(const [classId,profile] of Object.entries(ROTATION_REGISTRY)){
  assert.equal(profile.presets.at(-1).id,'custom');assert.equal(profile.presets.filter(p=>p.id==='custom').length,1);
  assert.equal(new Set(profile.presets.map(p=>p.id)).size,profile.presets.length);
  for(const id of legacyIds[classId])assert.ok(profile.presets.some(p=>p.id===id));
  for(const name of requested[classId]){const actual=name.startsWith('Warden | Shield Tank')?name.replace('Warden | Shield Tank','Enhancement | Tank'):name;assert.ok(profile.presets.some(p=>p.name===actual),actual);added++;}
  const signatures=new Set();
  for(const p of profile.presets.filter(p=>p.id!=='custom')){
   count++;assert.ok(p.description.length>20);assert.ok(p.sources.length>=4);assert.equal(p.classId,classId);assert.equal(p.ruleset,RULESET_REVISION);assert.equal(p.executionStatus,'unsupported');assert.notEqual(p.verificationStatus,'octowow-validated');
   assert.ok(p.rows.length);assert.deepEqual(validateRows(p.rows,classId),p.rows);
   for(const r of p.rows){const meta=profile.abilityRegistry[abilityKey(classId,r.ability)];assert.equal(meta.classId,classId);assert.ok(Array.isArray(meta.spellIds));if(r.abilityId)assert.equal(r.abilityId,meta.id);}
   const signature=JSON.stringify([p.rows,p.requirements.weapon,p.requirements.form,p.requirements.options]);assert.ok(!signatures.has(signature),`${classId} duplicate: ${p.id}`);signatures.add(signature);
   assert.ok(Object.isFrozen(p.rows));
  }
 }
 assert.equal(added,85);assert.equal(count,125);assert.equal(ROTATION_REGISTRY.rogue.presets.filter(p=>p.legacy).length,15);assert.equal(ROTATION_REGISTRY.warrior.presets.filter(p=>p.legacy).length,4);
});
test('all presets persist explicit rows, role and target scopes without replacing saved data',()=>{
 for(const [classId,p] of Object.entries(ROTATION_REGISTRY)){
  const talents=read(`talents/${classId}.json`);
  for(const preset of p.presets){const build=newBuild(classId);Object.assign(build.controls,{rotationPreset:preset.id,rotationRole:preset.role,rotationRows:structuredClone(preset.rows)});assert.deepEqual(decodeBuild(encodeBuild(build),talents),build);}
  for(const preset of LEGACY_PROFILES[classId].presets){const old=newBuild(classId);delete old.controls.rotationRole;old.controls.rotationPreset=preset.id;old.controls.rotationRows=structuredClone(preset.rows);const restored=decodeBuild(encodeBuild(old),talents);assert.deepEqual(restored.controls.rotationRows,preset.rows);}
 }
 const template=ROTATION_REGISTRY.rogue.presets[0],copy=structuredClone(template.rows);copy[0].conditions[0].value=999;assert.notEqual(template.rows[0].conditions[0].value,999);
});
test('conditions evaluate resource thresholds, proc stacks, cooldowns, ownership and swing safety',()=>{
 assert.equal(evaluateCondition(C('energy','>=',40),{resources:{energy:39}}),false);
 assert.equal(evaluateCondition(C('buffStacks','>=',5,'Hot Streak'),{buffs:{'Hot Streak':{stacks:5,remaining:10}}}),true);
 assert.equal(evaluateCondition(C('ownDebuffRemaining','<=',0,'Corruption'),{debuffs:{Corruption:{owner:'other',remaining:20}}}),true);
 assert.throws(()=>evaluateCondition(C('ownDebuffRemaining','>',0,'Corruption'),{debuffs:{Corruption:{remaining:20}}}),UnsupportedRotationState);
 assert.equal(evaluateCondition(C('cooldownReady','=',1,'Execute'),{cooldowns:{Execute:0}}),true);
 const context={meleeSwing:{nextIn:1.3,sinceLast:.1},castTimes:{Slam:1.5},latencySeconds:.1,castWindowPolicies:{Slam:'verified-safe'}};
 assert.equal(evaluateCondition(C('safeSwingWindow','=',1,'Slam'),context),false);context.castTimes.Slam=.8;assert.equal(evaluateCondition(C('safeSwingWindow','=',1,'Slam'),context),true);
 assert.throws(()=>evaluateCondition(C('safeSwingWindow','=',1,'Slam'),{...context,castWindowPolicies:{}}),/swing/);
 assert.equal(evaluateCondition(C('buffLastsThroughCast','=',1,'Starfire'),{castBuffWindows:{Starfire:{remaining:2,castTime:3}},latencySeconds:.1}),false);
});
test('priority selection preserves action kinds and fails rather than silently skipping missing state',()=>{
 const rows=[{ability:'Execute',conditions:[C('targetHealth','<=',20)]},{ability:'Bloodthirst',conditions:[]}];
 const state={targetHealth:19,targetId:'boss',actions:{Execute:action(),Bloodthirst:action()}};
 assert.equal(evaluatePriority(rows,state).row.ability,'Execute');state.targetHealth=21;assert.equal(evaluatePriority(rows,state).row.ability,'Bloodthirst');
 assert.throws(()=>evaluatePriority([...rows,{ability:'Heroic Strike',conditions:[C('safeSwingWindow','=',1,'Slam')]}],{...state,actions:{...state.actions,'Heroic Strike':action('queued-melee')}}),/swing/);
 assert.equal(evaluatePriority([{ability:'Heroic Strike',conditions:[]}],{actions:{'Heroic Strike':action('queued-melee')}}).kind,'queued-melee');
 assert.throws(()=>evaluateCondition(C('invented','=',1),{}),UnsupportedRotationState);
 assert.throws(()=>evaluatePriority([{ability:'Execute',conditions:[]}],{actions:{Execute:{ready:true,available:true,kind:'all-same-gcd'}}}),/action kind/);
});
test('multi-DoT and healing target selection use real target frames',()=>{
 const row={ability:'Corruption',target:'cycle',conditions:[C('ownDebuffRemaining','<=',0,'Corruption'),C('targetTimeToDie','>=',12)]};
 const state={actions:{Corruption:action()},targets:[{id:'a',targetTimeToDie:20,debuffs:{Corruption:{owner:'player',remaining:10}}},{id:'b',targetTimeToDie:20,debuffs:{Corruption:{owner:'other',remaining:10}}}]};
 assert.equal(evaluatePriority([row],state).targetId,'b');
 assert.equal(evaluatePriority([{ability:'Flash Heal',target:'ally',conditions:[C('allyHealth','<=',30)]}],{actions:{'Flash Heal':action('cast')},allies:[{id:'healthy',allyHealth:90},{id:'injured',allyHealth:20}]}).targetId,'injured');
 assert.throws(()=>evaluatePriority([row],{actions:{Corruption:action()}}),/cycle targets/);
});
test('requirements check weapons, talents, roles and unverified sets without mutating builds',()=>{
 const build=newBuild('warrior'),talents=read('talents/warrior.json'),preset=ROTATION_REGISTRY.warrior.presets.find(p=>p.id==='fury-twohand-swing-slam'),before=structuredClone(build);
 const missing=presetCompatibility(preset,build,{talents});assert.ok(missing.missing.some(x=>x.includes('two-hand')));assert.ok(missing.missing.some(x=>x.includes('Bloodthirst')));
 for(const req of preset.requirements.talents){const t=talents.talents.find(t=>t.name===req.name);build.talents[t.id]=req.rank;}
 build.gear.mainhand={id:123,label:'Two handed'};const lookup=id=>id===123?{id,slot:17,classs:2,subclass:8}:null;
 assert.equal(presetCompatibility(preset,build,{talents,lookup}).compatible,true);
 assert.ok(presetCompatibility(preset,build,{talents,lookup,role:'healing'}).missing.some(m=>m.includes('mode')));
 const t35=ROTATION_REGISTRY.priest.presets.find(p=>p.id==='shadow-fade-snapshot-t35');assert.ok(presetCompatibility(t35,newBuild('priest')).missing.some(m=>m.includes('verified equipped')));
 assert.deepEqual(before.gear,{});assert.equal(before.classId,build.classId);
});
test('recommendations are separate from selection and distinguish Fury weapon configurations',()=>{
 const build=newBuild('warrior'),talents=read('talents/warrior.json');const bt=talents.talents.find(t=>t.name==='Bloodthirst'),flurry=talents.talents.find(t=>t.name==='Flurry');build.talents[bt.id]=1;build.talents[flurry.id]=5;build.gear.mainhand={id:1,label:'2H'};
 const original=structuredClone(build),recommendations=recommendPresets(build,{talents,lookup:()=>({slot:17,classs:2,subclass:8})});assert.ok(recommendations.some(p=>p.preset.requirements.weapon==='two-hand'));assert.ok(recommendations.every(p=>p.preset.requirements.weapon!=='dual-wield'));assert.deepEqual(build,original);
});
test('invalid class conditions and unsupported healing execution cannot pass through engine preparation',()=>{
 assert.throws(()=>validateRows([{ability:'Sinister Strike',conditions:[C('mana','>=',1)]}],'rogue'),/condition/);
 assert.throws(()=>validateRows([{ability:'Slam',abilityId:'rogue:slam',conditions:[]}],'warrior'),/ID/);
 assert.throws(()=>validateRows([{ability:'Slam',conditions:[C('procActive','>=',2,'Flurry')]}],'warrior'),/Boolean/);
 const build=newBuild('paladin'),p=ROTATION_REGISTRY.paladin.presets.find(p=>p.id==='holy-light-healing');Object.assign(build.controls,{rotationRole:'healing',rotationPreset:p.id,rotationRows:structuredClone(p.rows)});
 const errors=rotationEngineErrors(build,{supportedRoles:['dps'],supportedOutputTypes:['DPS']});assert.ok(errors.some(e=>e.includes('healing encounters')));assert.ok(errors.some(e=>e.includes('HPS')));assert.ok(errors.some(e=>e.includes('unsupported')));
 for(const [c,p] of Object.entries(ROTATION_REGISTRY))for(const preset of p.presets)assert.equal(preset.executionStatus,'unsupported');
});
