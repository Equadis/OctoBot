import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newBuild} from '../../docs/sim/core/builds.mjs';
import {characterStats} from '../../docs/sim/core/character-stats.mjs';
import {referenceRanks,REFERENCE_RANKS} from '../../docs/sim/core/combat-reference-ranks.mjs';
import {compileReferenceRank} from '../../docs/sim/core/combat-rank-compiler.mjs';
import {createExplicitClassEncounter} from '../../docs/sim/core/combat-class-runtime.mjs';
import {ROTATION_REGISTRY} from '../../docs/sim/core/rotations/registry.mjs';
const data=c=>JSON.parse(readFileSync(new URL('../../docs/sim/data/talents/'+c+'.json',import.meta.url)));
const rankByClass={warrior:25286,rogue:25300,paladin:25292,hunter:25295,mage:25304,warlock:25307,priest:25314,shaman:25357,druid:25299};
const weapon={id:123,name:'Test dagger',classs:2,subclass:15,speed:2,attributes:{},tooltipText:'20 - 40 Damage\nSpeed 2.00'};
const policy={provenance:'Explicit synthetic encounter rules applied to reference rank values',gcdMs:1500,cooldownMs:0,weaponPolicy:'actual-swing',acceptSourceConflict:true,flatThreat:0,physical:{dualWieldPenaltyPct:19,parryPct:0,blockPct:0,blockValue:0,critSuppressionPct:0,criticalMultiplier:2,order:['miss','dodge','parry','block','glance','crit'],position:'behind'},periodicCanCrit:false,healCriticalMultiplier:1.5,spellCriticalMultiplier:1.5,resistance:Object.fromEntries(['fire','frost','shadow','nature','arcane'].map(k=>[k,{policy:'none',bins:[{fraction:0,probability:1}]}])),refresh:'restart',tickAtExpiry:true,snapshot:'snapshot',threat:{damage:1,heal:.5},apPerComboPoint:.03,spendOnMiss:false,componentCoefficients:[.2,.13]};
function scenario(c,spellId=rankByClass[c],extra={}){const b=newBuild(c);b.classOptions={...b.classOptions,form:'Caster'};const gear=['warrior','rogue'].includes(c)?{mainhand:weapon}:{};const sheet=characterStats(b,data(c),gear);return {build:b,sheet,gear,spellId,learnedSpellIds:[spellId],policy:{...policy,...extra}};}
test('all nine classes compile source-backed ranks and execute using unrounded planner statistics',()=>{
 for(const c of Object.keys(rankByClass)){
  const input=scenario(c),{action,stats,rank}=compileReferenceRank(input),name=ROTATION_REGISTRY[c].abilityRegistry[action.abilityId].name,heal=action.targets[0]==='ally';
  const source=action.effects[0].formula;assert.ok(source.min>0||source.comboRanges, c);assert.equal(action.source,rank.source);
  const res=rank.resource==='mana'?{mana:{current:1e6,max:1e6}}:{[rank.resource]:{current:100,max:100}};
  const autos=action.kind==='queued-melee'?[{id:'mainhand',actorId:'player',source:'White',intervalMs:2000,firstAtMs:2000,castPolicy:'continue',minRangeYards:0,maxRangeYards:5,effects:[{kind:'damage',when:'always',formula:{min:1,max:1,terms:[],multiplier:1},outcomes:[{name:'hit',probability:1,multiplier:1,landed:true}],mitigation:0,flatReduction:0,threat:null}]}]:[];
  const e=createExplicitClassEncounter({mode:'research',provenance:'reference rank test',classId:c,level:60,seed:42,durationMs:16000,decisionIntervalMs:50,pools:res,units:[{id:'player',maxHealth:1000},{id:'boss',maxHealth:1e7},{id:'ally',maxHealth:1e7,health:1}],playerId:'player',primaryId:'boss',targetIds:['boss'],allyIds:['ally'],stats:{player:stats},classContext:{},geometry:{player:{boss:{distance:c==='hunter'?20:3,position:'behind'},ally:{distance:20,position:'front'}}},actions:[action],rows:[{ability:name,abilityId:action.abilityId,target:heal?'ally':'primary',conditions:rank.components.some(x=>x.kind.startsWith('periodic'))&&!heal?[{metric:'ownDebuffRemaining',operator:'<=',value:0,aura:name}]:[]}],autos,regeneration:[],...(c==='rogue'?{comboPoints:{cap:5}}:{})});
  // Periodic healing is refreshed unless the priority waits; test application
  // separately, with a single cast through a long cooldown.
  const result=e.run();assert.ok(result.events.some(x=>['action-start','queued-attack'].includes(x.type)),c);
  if(c!=='druid')assert.ok(heal?result.totals.allyHealing>0:result.totals.enemyDamage>0,c);
 }
});
test('rank compiler refuses missing knowledge, conflicting ranks, missing coefficients and daggers',()=>{
 let a=scenario('hunter');a.learnedSpellIds=[];assert.throws(()=>compileReferenceRank(a),/learned rank/);a=scenario('hunter',25295,{acceptSourceConflict:false});assert.throws(()=>compileReferenceRank(a),/conflict/);
 a=scenario('rogue');a.gear.mainhand={...weapon,subclass:7};assert.throws(()=>compileReferenceRank(a),/main-hand/);
 a=scenario('warlock',25309,{componentCoefficients:undefined});assert.throws(()=>compileReferenceRank(a),/component coefficient/);
});
test('school-specific power and mana cost are not read from rounded display strings',()=>{
 const a=scenario('mage');a.sheet.combatSnapshot.schools.frost=123.45;const c=compileReferenceRank(a);
 assert.equal(c.stats.frost,123.45);assert.equal(c.action.effects[0].formula.terms[0].stat,'frost');assert.equal(c.action.costs[0].amount,290);assert.equal(c.liveVerified,false);assert.equal(REFERENCE_RANKS.length,43);assert.equal(referenceRanks('priest').length,7);
});

test('external-only ranks require acknowledgement and unknown live sting cost requires explicit input',()=>{
 let a=scenario('mage',10181);a.learnedSpellIds=[10181];assert.throws(()=>compileReferenceRank(a),/external reference acknowledgement/);a.policy.acceptExternalReference=true;assert.equal(compileReferenceRank(a).action.costs[0].amount,260);
 a=scenario('hunter',13555);a.learnedSpellIds=[13555];a.policy.acceptExternalReference=true;assert.throws(()=>compileReferenceRank(a),/rank cost override/);a.policy.costOverride=190;assert.equal(compileReferenceRank(a).action.costs[0].amount,190);
});

test('every executable reference rank has correct identity and compilable mechanics',()=>{
 for(const rank of REFERENCE_RANKS){const a=scenario(rank.classId,rank.spellId,{phase:3,acceptExternalReference:true,costOverride:230,cooldownMs:rank.referenceCooldownMs??0,componentCoefficients:[.2,.13],executeModel:{baseDamage:600,extraRageCoefficient:15,extraRageCap:100,payment:'always'},physicalAPModel:{flatDamage:0,coefficient:.45},swingHastePolicy:'preserve-progress',channelTickAtEnd:true});const c=compileReferenceRank(a);assert.equal(c.action.spellId,rank.spellId);assert.equal(c.action.abilityId,rank.abilityId);assert.equal(c.liveVerified,false);if(rank.sharedCooldownGroup)assert.equal(c.action.sharedCooldown.id,rank.sharedCooldownGroup);}
});

test('every reference rank executes in the class runtime with explicit inputs',()=>{
 for(const rank of REFERENCE_RANKS){const {action,stats}=compileReferenceRank(scenario(rank.classId,rank.spellId,{phase:3,acceptExternalReference:true,costOverride:230,cooldownMs:rank.referenceCooldownMs??0,componentCoefficients:[.2,.13],executeModel:{baseDamage:600,extraRageCoefficient:15,extraRageCap:100,payment:'always'},physicalAPModel:{flatDamage:0,coefficient:.45},swingHastePolicy:'preserve-progress',channelTickAtEnd:true})),c=rank.classId,name=ROTATION_REGISTRY[c].abilityRegistry[action.abilityId].name,heal=action.targets[0]==='ally';
 const pools={[rank.resource]:{current:rank.resource==='mana'?1e5:100,max:rank.resource==='mana'?1e5:100}};
 const autos=action.kind==='queued-melee'?[{id:'mainhand',actorId:'player',source:'White',intervalMs:2000,firstAtMs:2000,castPolicy:'continue',minRangeYards:0,maxRangeYards:5,effects:[{kind:'damage',when:'always',formula:{min:1,max:1,terms:[],multiplier:1},outcomes:[{name:'hit',probability:1,multiplier:1,landed:true}],mitigation:0,flatReduction:0,threat:null}]}]:[];
 if(action.effects.some(x=>x.kind.startsWith('periodic'))&&rank.refreshStrategy!=='do-not-gate')action.refreshGate={kind:heal?'buff':'debuff',name,remainingMs:0};
 const e=createExplicitClassEncounter({mode:'research',provenance:'reference rank regression fixture',classId:c,level:60,seed:42,durationMs:22000,decisionIntervalMs:50,pools,units:[{id:'player',maxHealth:1000},{id:'boss',maxHealth:1e7,...(rank.targetHealthMaxPct!==undefined?{health:1e7*rank.targetHealthMaxPct/100}:{})},{id:'ally',maxHealth:1e7,health:1}],playerId:'player',primaryId:'boss',targetIds:['boss'],allyIds:['ally'],stats:{player:stats},classContext:{},geometry:{player:{boss:{distance:rank.resource==='mana'?20:3,position:'behind'},ally:{distance:20,position:'front'}}},actions:[action],rows:[{ability:name,abilityId:action.abilityId,target:heal?'ally':'primary',conditions:[]}],autos,regeneration:[],...(c==='rogue'?{comboPoints:{cap:5,initialTarget:'boss',initialPoints:5}}:{})});const result=e.run();assert.ok(result.events.some(x=>['action-start','queued-attack'].includes(x.type)),rank.abilityId+' '+rank.rank);if(rank.refreshStrategy==='actor-buff')assert.ok(result.auras.some(x=>x.name===name&&x.activeMs>0));else assert.ok(heal?result.totals.allyHealing>0:result.totals.enemyDamage>0,rank.abilityId+' '+rank.rank);
 }
});
