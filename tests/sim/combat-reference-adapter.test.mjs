import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newBuild} from '../../docs/sim/core/builds.mjs';import {prepareReferenceScenario,runReferenceScenario} from '../../docs/sim/core/combat-reference-adapter.mjs';
const talents=c=>JSON.parse(readFileSync(new URL('../../docs/sim/data/talents/'+c+'.json',import.meta.url)));
const policy={provenance:'Explicit test assumptions; physical tables and coefficients reference-only',phase:2,gcdMs:1500,cooldownMs:0,weaponPolicy:'actual-swing',acceptSourceConflict:true,physical:{dualWieldPenaltyPct:19,parryPct:0,blockPct:0,blockValue:0,critSuppressionPct:0,criticalMultiplier:2,position:'behind',order:['miss','dodge','parry','block','glance','crit']},periodicCanCrit:false,healCriticalMultiplier:1.5,spellCriticalMultiplier:1.5,resistance:Object.fromEntries(['fire','frost','shadow','nature','arcane'].map(k=>[k,{policy:'none',bins:[{fraction:0,probability:1}]}])),threat:null,refresh:'restart',tickAtExpiry:true,snapshot:'snapshot'};
const encounter={mode:'reference-research',acknowledgeIncompleteEffects:true,position:'behind',distanceYards:20,allyDistanceYards:20,recastPeriodic:'after-expiry',includeMelee:false,durationMs:16000,decisionIntervalMs:50,enemyHealth:1e7,allyMaxHealth:1e7,allyHealth:1,regeneration:[]};
function params(c='warlock',spellId=11661,name='Shadow Bolt'){const b=newBuild(c);b.controls.rotationPreset='custom';const aid=c+':'+name.toLowerCase().replaceAll(' ','-'),target=['priest','druid','paladin','shaman'].includes(c)?'ally':'primary';return {build:b,talents:talents(c),gearById:{},learnedSpellIds:[spellId],rankByAbility:{[aid]:spellId},policies:{[aid]:{...policy}},encounter:{...encounter},rows:[{ability:name,target,conditions:[]}]};}
test('real planner build runs 1000 seeded source-backed iterations, not synthetic ability damage',()=>{const prepared=prepareReferenceScenario(params());assert.equal(prepared.rankRows[0].spellId,11661);const r=runReferenceScenario(prepared,{seed:7,iterations:1000});assert.equal(r.kind,'reference-only');assert.equal(r.statistics.n,1000);assert.ok(r.statistics.mean>0);assert.ok(r.exampleEvents.some(x=>x.type==='damage'&&x.raw>=455));});
test('book-derived reference ranks require explicit future acknowledgement under BWL phase',()=>{let p=params('warlock',25307);assert.throws(()=>prepareReferenceScenario(p),/book rank/);p.policies['warlock:shadow-bolt'].allowFutureRank=true;assert.doesNotThrow(()=>prepareReferenceScenario(p));});
test('a full rotation never silently drops unknown actions',()=>{let p=params();p.rows.push({ability:'Life Tap',target:'primary',conditions:[]});assert.throws(()=>prepareReferenceScenario(p),/Life Tap/);p=params();p.rows[0].conditions.push({metric:'snapshotUpgrade',operator:'=',value:1,aura:'Shadow Bolt'});assert.throws(()=>prepareReferenceScenario(p),/Unsupported reference rotation condition/);});
test('rank-level simulated healing does not reapply a HoT before expiry',()=>{const p=params('druid',25299,'Rejuvenation');p.policies['druid:rejuvenation'].allowFutureRank=true;p.encounter.durationMs=12000;const r=runReferenceScenario(prepareReferenceScenario(p),{seed:1,iterations:2});assert.equal(r.exampleEvents.filter(x=>x.type==='heal').length,4);assert.equal(r.exampleEvents.filter(x=>x.type==='action-start').length,1);});

test('Trueshot build adapter requires historical opt-in and exact research rank',()=>{const p=params('hunter',19506,'Trueshot Aura'),aid='hunter:trueshot-aura';p.rows[0].target='self';p.policies[aid]={...policy,cooldownMs:60000,trueshotPolicy:{acceptSourceConflict:true,sourceModel:'legacy-flat',rank:1,radiusYards:45,durationMs:1800000,recipients:['player'],recipientStats:{player:{meleeAP:100,rangedAP:200}},statBasis:'snapshot',costPolicy:'explicit-research',manaCost:0}};assert.throws(()=>prepareReferenceScenario(p),/historical research opt-in/);p.policies[aid].allowHistoricalAbility=true;const prepared=prepareReferenceScenario(p);assert.equal(prepared.rankRows[0].kind,'historical-conflict-research');assert.equal(prepared.scenario.actions[0].trueshotPolicy.rank,1);p.rankByAbility[aid]=20905;assert.throws(()=>prepareReferenceScenario(p),/historical Trueshot rank/);});

test('Drain Mana configures mana pools for additional encounter targets',()=>{
 const p=params('warlock',5138,'Drain Mana');
 p.policies['warlock:drain-mana']={...policy,costOverride:115,acceptExternalReference:true,channelTickAtEnd:true,drainManaModel:{tickAmount:25,coefficient:0,outcomes:[{name:'hit',landed:true,probability:1,multiplier:1}],stopWhenEmpty:true}};
 p.encounter.additionalEnemies=[{id:'add',maxHealth:100}];
 p.encounter.enemyManaPools={add:{current:20,max:40}};
 p.encounter.additionalGeometry={add:{distance:20,position:'behind'}};
 p.rows[0].target='cycle';
 const prepared=prepareReferenceScenario(p);
 assert.deepEqual(prepared.scenario.pools['enemyMana:add'],{current:20,max:40});
 const r=runReferenceScenario(prepared,{seed:7,iterations:1});
 assert.equal(r.exampleEvents.find(e=>e.source==='Drain Mana (drained)')?.delta,-20);
});
