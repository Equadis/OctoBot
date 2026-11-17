import test from 'node:test';import assert from 'node:assert/strict';
import {createExplicitClassEncounter} from '../../docs/sim/core/combat-class-runtime.mjs';
import {compileUtilityCurse} from '../../docs/sim/core/combat-curse-reference.mjs';
import {rankEvidence} from '../../docs/sim/core/combat-rank-evidence.mjs';
import {runIterations} from '../../docs/sim/core/combat-statistics.mjs';
import {attributedActorRates} from '../../docs/sim/core/combat-attribution.mjs';
import {ROTATION_REGISTRY} from '../../docs/sim/core/rotations/registry.mjs';
const hit=[{name:'hit',probability:1,multiplier:1,landed:true}];
const miss=[{name:'miss',probability:1,multiplier:0,landed:false}];
const spec={warrior:['slam',45961,'rage'],rogue:['backstab',25300,'energy'],paladin:['holy-light',25292,'mana'],hunter:['multi-shot',25294,'mana'],mage:['frostbolt',25304,'mana'],warlock:['shadow-bolt',25307,'mana'],priest:['greater-heal',25314,'mana'],shaman:['healing-wave',25357,'mana'],druid:['rejuvenation',25299,'mana']};
const effect=(kind='damage',extra={})=>({kind,when:'always',formula:{min:10,max:30,terms:[{stat:'power',coefficient:.5}],multiplier:1},outcomes:hit,mitigation:0,flatReduction:0,threat:{coefficient:1,flat:0,multipliers:[],distribution:'each'},...extra});
function fixture(c,seed=123,power=20){
 const [slug,spellId,resource]=spec[c],abilityId=c+':'+slug,meta=rankEvidence(abilityId,spellId),ability=ROTATION_REGISTRY[c].abilityRegistry[abilityId];
 const heal=['paladin','priest','shaman','druid'].includes(c),target=heal?'ally':'enemy';
 return {mode:'research',provenance:'synthetic execution fixture; not actual OctoWoW DPS',classId:c,level:60,seed,durationMs:4000,decisionIntervalMs:100,playerId:'p',primaryId:'enemy',targetIds:['enemy'],allyIds:['ally'],units:[{id:'p',maxHealth:1000},{id:'enemy',maxHealth:1e8},{id:'ally',maxHealth:1e8,health:1}],pools:{[resource]:{current:1000,max:1000}},stats:{p:{power}},classContext:{},geometry:{p:{enemy:{distance:3,position:'behind'},ally:{distance:3,position:'front'}}},actions:[{abilityId,spellId,rank:meta.rank,learnLevel:meta.level,source:meta.source,evidenceStatus:'synthetic',actorId:'p',kind:'instant',castMs:0,gcdMs:1000,cooldownMs:0,sharedCooldown:null,costs:[{resource,amount:1}],targets:[heal?'ally':'enemy'],minRangeYards:0,maxRangeYards:40,position:null,comboRequired:null,requiredContext:null,effects:[effect(heal?'heal':'damage')]}],rows:[{ability:ability.name,abilityId,target:heal?'ally':'primary',conditions:[]}],autos:[],regeneration:[]};
}
test('all nine class fixtures execute reproducible 1000-iteration paired stat comparisons',()=>{
 for(const c of Object.keys(spec)){
  const heal=['paladin','priest','shaman','druid'].includes(c);
  const run=power=>runIterations({seed:42,iterations:1000,createEncounter:seed=>createExplicitClassEncounter(fixture(c,seed,power)),metrics:{rate:r=>attributedActorRates(r,'p')[heal?'actorHps':'actorDps']}});
  const low=run(20),high=run(40);assert.equal(low.metrics.rate.n,1000);assert.ok(Math.abs(high.metrics.rate.mean-low.metrics.rate.mean-10)<1e-8,c);assert.equal(high.engineValidated,false);
 }
});
test('missing coefficients, wrong spell IDs and invented class resources fail closed',()=>{let f=fixture('mage');delete f.actions[0].effects[0].formula.terms[0].coefficient;assert.throws(()=>createExplicitClassEncounter(f),/coefficient/);f=fixture('mage');f.actions[0].spellId=25314;assert.throws(()=>createExplicitClassEncounter(f),/Spell identity/);f=fixture('mage');f.pools.rage={current:1,max:100};assert.throws(()=>createExplicitClassEncounter(f),/Unsupported class resource/);});
test('periodic rank effects use explicit snapshots and expiry timing; misses do not grant threat',()=>{const f=fixture('druid');f.actions[0].gcdMs=4000;f.actions[0].effects=[effect('periodic-heal',{formula:{min:50,max:50,terms:[],multiplier:1},durationMs:4000,intervalMs:1000,refresh:'restart',snapshot:'snapshot',tickAtExpiry:true,applicationOutcomes:hit,auraName:'Rejuvenation'})];const r=createExplicitClassEncounter(f).run();assert.equal(r.totals.allyHealing,200);assert.equal(r.threat.generated.p,200);assert.equal(r.auras.find(x=>x.name==='Rejuvenation').activeMs,4000);f.actions[0].effects[0].applicationOutcomes=miss;const m=createExplicitClassEncounter(f).run();assert.equal(m.totals.allyHealing,0);assert.equal(m.threat.generated.p,undefined);});
test('companion swings attribute separately and geometry blocks out-of-range abilities',()=>{const f=fixture('hunter');f.petId='pet';f.units.push({id:'pet',maxHealth:100});f.stats.pet={power:0};f.geometry.pet={enemy:{distance:1,position:'behind'}};f.geometry.p.enemy.distance=100;f.autos=[{id:'pet-bite',actorId:'pet',source:'Pet Bite',intervalMs:1000,firstAtMs:1000,castPolicy:'continue',minRangeYards:0,maxRangeYards:5,effects:[effect('damage',{formula:{min:10,max:10,terms:[],multiplier:1}})]}];const r=createExplicitClassEncounter(f).run();assert.equal(attributedActorRates(r,'p').actorDps,0);assert.equal(attributedActorRates(r,'pet').actorDps,10);});
test('combo-point generation on landed attacks is scoped; failed attacks do not grant points',()=>{const f=fixture('rogue');f.comboPoints={cap:5};f.actions[0].effects=[effect(),{kind:'combo-gain',when:'landed',points:1}];assert.equal(createExplicitClassEncounter(f).run().comboPoints.points,4);f.actions[0].effects[0].outcomes=miss;assert.equal(createExplicitClassEncounter(f).run().comboPoints.points,0);});

test('utility curse applies before damage, does not deal direct damage, and Malediction adds owner Agony',()=>{
 const f=fixture('warlock');f.durationMs=5000;
 const bolt=f.actions[0];bolt.effects=[effect('damage',{school:'shadow',formula:{min:100,max:100,terms:[],multiplier:1}})];
 const curse={...bolt,abilityId:'warlock:curse-of-shadow',spellId:17937,rank:2,learnLevel:56,evidenceStatus:'synthetic',cooldownMs:60000,effects:[compileUtilityCurse('warlock:curse-of-shadow','Curse of Shadow',{durationMs:30000,outcomes:hit,schools:['shadow','arcane'],damageBonusPct:10,resistanceReduction:75})]};
 const agony={...bolt,abilityId:'warlock:curse-of-agony',spellId:11713,rank:6,learnLevel:58,effects:[effect('periodic-damage',{school:'shadow',formula:{min:10,max:10,terms:[],multiplier:1},durationMs:24000,intervalMs:2000,refresh:'restart',snapshot:'snapshot',tickAtExpiry:true,applicationOutcomes:hit,auraName:'Curse of Agony'})]};
 f.actions=[curse,bolt];f.rows=[{ability:'Curse of Shadow',abilityId:curse.abilityId,target:'primary',conditions:[]},...f.rows];let r=createExplicitClassEncounter(f).run();assert.ok(Math.abs(r.totals.enemyDamage-440)<1e-8);assert.ok(r.auras.some(a=>a.name==='Curse of Shadow'));
 f.malediction=true;assert.throws(()=>createExplicitClassEncounter(f),/highest learned/);f.actions.push(agony);f.highestLearnedAgonyConfirmed=true;r=createExplicitClassEncounter(f).run();assert.ok(Math.abs(r.totals.enemyDamage-462)<1e-8);assert.ok(r.auras.some(a=>a.name==='Curse of Agony'));assert.equal(r.events.filter(e=>e.type==='action-start'&&e.abilityId===agony.abilityId).length,0);
});
