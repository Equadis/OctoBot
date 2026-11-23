import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newBuild} from '../../docs/sim/core/builds.mjs';
import {characterStats} from '../../docs/sim/core/character-stats.mjs';
import {prepareReferenceScenario,runReferenceScenario} from '../../docs/sim/core/combat-reference-adapter.mjs';
import {ABILITY_STAT_ALIASES,abilityProfiles,matchedAbilityEffects} from '../../docs/sim/core/talent-calculations.mjs';
import {compile,compiledAbilities,checkAction,verifyTalentInCombat} from '../../tools/sim/combat-verification.mjs';
import {STAT_DISPOSITIONS,TALENT_DISPOSITIONS,INTEGRATION_FIXES,classifyFinding} from '../../tools/sim/talent-findings.mjs';
import {getTalentAudit} from '../../docs/sim/core/talent-audits.mjs';
import {resourceThroughput} from '../../docs/sim/core/combat-statistics.mjs';
import {legalAllocation} from './helpers/talent-allocation.mjs';
import {shadowBoltRun,warlockTalents} from './helpers/warlock-shadow-bolt.mjs';

const load=c=>JSON.parse(readFileSync(new URL(`../../docs/sim/data/talents/${c}.json`,import.meta.url),'utf8'));
const report=JSON.parse(readFileSync(new URL('../../docs/sim/data/talents/audit-report.json',import.meta.url),'utf8'));
const talent=(c,name)=>load(c).talents.find(t=>t.name===name);
const ability=(c,name)=>compiledAbilities(c).find(a=>a.name===name);
const crit=action=>action.effects[0].outcomes.find(o=>o.name==='crit');

const lifeTapPolicy={provenance:'synthetic reference',phase:2,gcdMs:1500,cooldownMs:0,acceptExternalReference:true,acceptSourceConflict:true,periodicCanCrit:false,healCriticalMultiplier:1.5,spellCriticalMultiplier:1.5,lifeTapFactor:1,resistance:Object.fromEntries(['fire','frost','shadow','nature','arcane','holy'].map(k=>[k,{policy:'none',bins:[{fraction:0,probability:1}]}])),threat:null,refresh:'restart',tickAtExpiry:true,snapshot:'snapshot'};
function lifeTapRun(talents){
 const build=newBuild('warlock');build.level=60;build.talents=talents;
 const scenario=prepareReferenceScenario({build,talents:warlockTalents,gearById:{},learnedSpellIds:[11689],rankByAbility:{'warlock:life-tap':11689},policies:{'warlock:life-tap':lifeTapPolicy},
  encounter:{mode:'reference-research',acknowledgeIncompleteEffects:true,position:'behind',distanceYards:20,allyDistanceYards:20,recastPeriodic:'rotation-only',includeMelee:false,durationMs:2000,decisionIntervalMs:50,enemyHealth:1e7,allyMaxHealth:1e7,allyHealth:1,regeneration:[]},
  rows:[{ability:'Life Tap',target:'self',conditions:[]}]});
 return runReferenceScenario(scenario,{seed:7,iterations:1});
}

test('defect fix: Improved Life Tap now raises the mana a simulated Life Tap awards (+10% and +20%)',()=>{
 const tap=talent('warlock','Improved Life Tap');
 assert.equal(tap.maxRanks,2);
 const mana=run=>run.exampleEvents.find(e=>e.type==='resource-change'&&e.source==='Life Tap'&&e.resource==='mana').delta;
 const health=run=>run.exampleEvents.find(e=>e.type==='health-spend'&&e.source==='Life Tap').amount;
 const base=lifeTapRun({});
 assert.equal(mana(base),424);
 for(const rank of [1,2]){
  const run=lifeTapRun(legalAllocation(warlockTalents,tap,rank));
  assert.ok(Math.abs(mana(run)-424*(1+0.1*rank))<1e-9,`rank ${rank}: ${mana(run)}`);
  assert.equal(health(run),health(base),'the talent raises the mana awarded, not the health spent');
 }
});

test('defect fix: the stat alias that carried Improved Life Tap is part of the shared alias table',()=>{
 assert.equal(ABILITY_STAT_ALIASES.manaGainedPct,'manaGainPct');
 assert.equal(ABILITY_STAT_ALIASES.criticalDamage,'criticalDamagePct');
 const profile=abilityProfiles('warlock').find(p=>p.name==='Life Tap');
 const build=newBuild('warlock');build.level=60;build.talents=legalAllocation(warlockTalents,talent('warlock','Improved Life Tap'),2);
 const effects=matchedAbilityEffects(characterStats(build,warlockTalents,{}).talentAudit,profile);
 assert.deepEqual(effects.map(e=>[e.stat,e.value]),[['manaGainPct',20]]);
 assert.ok(INTEGRATION_FIXES.some(f=>f.name==='Improved Life Tap'&&f.test==='tests/sim/talent-integration.test.mjs'));
});

test('Impale raises the critical-hit multiplier of Heroic Strike by 10% then 20% of the bonus, in both stances it names',()=>{
 const impale=talent('warrior','Impale'),a=ability('warrior','Heroic Strike');
 assert.deepEqual(impale.rankParameters[0],[10,20]);
 assert.equal(crit(compile('warrior',a.rank,{})).multiplier,2);
 [[1,2.1],[2,2.2]].forEach(([rank,expected])=>assert.ok(Math.abs(crit(compile('warrior',a.rank,{[impale.id]:rank})).multiplier-expected)<1e-9,`rank ${rank}`));
});

test('Lethality raises the critical-hit multiplier of a combo-point generator by 6% per rank of the bonus',()=>{
 const lethality=talent('rogue','Lethality'),a=ability('rogue','Sinister Strike');
 assert.deepEqual(lethality.rankParameters[0],[6,12,18,24,30]);
 for(let rank=1;rank<=5;rank++)assert.ok(Math.abs(crit(compile('rogue',a.rank,{[lethality.id]:rank})).multiplier-(1+0.06*rank)-1)<1e-9,`rank ${rank}`);
});

test('simulated combat: Ruin lifts a Shadow Bolt critical hit from 1.5x to 2x (same seed, same crit roll)',()=>{
 const ruin=talent('warlock','Ruin');
 const hit=run=>run.exampleEvents.find(e=>e.type==='damage'&&e.source==='Shadow Bolt');
 const base=hit(shadowBoltRun({})),withRuin=hit(shadowBoltRun(legalAllocation(warlockTalents,ruin)));
 assert.ok(base&&withRuin);
 assert.ok(Math.abs(withRuin.raw/base.raw-2/1.5)<1e-9,`ratio ${withRuin.raw/base.raw}`);
});

test('resource overflow validation tolerates floating-point rounding but still rejects a real excess',()=>{
 const result=events=>({durationMs:1000,attribution:{actors:{player:{}}},events:events.map(([delta,overflow])=>({type:'resource-change',actorId:'player',resource:'mana',delta,overflow}))});
 const ok=resourceThroughput(result([[424*1.1,424*1.1+4e-14]]),'player','mana');
 assert.ok(Math.abs(ok.grossGain-424*1.1)<1e-9);
 assert.ok(ok.effectiveGain>=0);
 assert.throws(()=>resourceThroughput(result([[10,11]]),'player','mana'),/Invalid resource overflow/);
 assert.throws(()=>resourceThroughput(result([[10,-1]]),'player','mana'),/Invalid resource overflow/);
});

test('combat verification harness: it can fail (a wrong amount is reported, not absorbed)',()=>{
 const a=ability('mage','Fireball'),profile=abilityProfiles('mage').find(p=>p.name==='Fireball');
 const improved=talent('mage','Improved Fireball');
 const base=compile('mage',a.rank,{}),withTalent=compile('mage',a.rank,{[improved.id]:5});
 const build=newBuild('mage');build.level=60;build.talents={[improved.id]:5};
 const effects=matchedAbilityEffects(characterStats(build,load('mage'),{}).talentAudit,profile).filter(e=>e.talentId===improved.id);
 assert.ok(checkAction(profile,base,withTalent,effects).every(c=>c.ok));
 const tampered={...withTalent,castMs:withTalent.castMs+250};
 const bad=checkAction(profile,base,tampered,effects);
 assert.equal(bad.length,1);
 assert.equal(bad[0].ok,false);
 assert.equal(bad[0].stat,'cast time ms');
});

test('combat verification: no talent changes a compiled action by anything other than its published amount',()=>{
 const mismatches=report.rows.filter(r=>r.combatVerification.status==='mismatch');
 assert.deepEqual(mismatches.map(r=>r.name),[]);
 for(const [c,name] of [['mage','Improved Fireball'],['mage','Fire Power'],['warlock','Bane'],['warlock','Cataclysm'],['priest','Divine Fury'],['shaman','Lightning Mastery'],['rogue','Aggression'],['warrior','Improved Heroic Strike']]){
  const live=verifyTalentInCombat(c,talent(c,name),getTalentAudit(c));
  assert.equal(live.status,'confirmed',`${c} ${name}: ${live.reason}`);
  assert.ok(live.abilities.some(a=>a.checks&&a.checks.every(x=>x.ok)));
 }
});

test('every unapplied rule has a recorded decision, and none is silently approximated',()=>{
 const all=report.rows.flatMap(r=>r.findings.map(f=>({r,f})));
 assert.equal(all.length,report.findingSummary.total);
 assert.deepEqual(all.filter(x=>x.f.disposition==='unclassified').map(x=>`${x.r.classId}:${x.r.name}:${x.f.stat}`),[]);
 for(const {r,f} of all){
  assert.ok(f.why.length>20,`${r.name} ${f.stat} needs a reason`);
  assert.ok(['recorded-not-computed','unattached-scope'].includes(f.state));
 }
 // Every stat and talent override is used: a stale entry would hide a renamed stat.
 const stats=new Set(all.map(x=>x.f.stat)),talents=new Set(all.map(x=>`${x.r.classId}:${x.r.id}`));
 for(const s of Object.keys(STAT_DISPOSITIONS))if(!stats.has(s))assert.fail('stat disposition never used: '+s);
 for(const t of Object.keys(TALENT_DISPOSITIONS))assert.ok(talents.has(t),'talent disposition never used: '+t);
 assert.equal(classifyFinding('mage',999,{stat:'notAStat'}).disposition,'unclassified');
});

test('disputed Holy Strike identity is preserved, not resolved, by the audit',()=>{
 const blessed=report.rows.find(r=>r.classId==='paladin'&&r.name==='Blessed Strikes');
 assert.equal(blessed.findings.find(f=>f.stat==='coefficientBonusPct').disposition,'disputed-identity');
 const paladin=load('paladin');
 assert.ok(!JSON.stringify(paladin).includes('"10333"'));
});

test('the fixed and newly verified talents are classified from observed combat, with a named tested field',()=>{
 const must=[['warlock','Improved Life Tap','mana gained factor'],['warrior','Impale','crit multiplier'],['rogue','Lethality','crit multiplier'],['warlock','Bane','cast time ms'],['warlock','Shadow Mastery','damage multiplier'],['mage','Improved Fireball','cast time ms']];
 for(const [c,name,field] of must){
  const row=report.rows.find(r=>r.classId===c&&r.name===name);
  assert.equal(row.classification,'verified-functioning',`${c} ${name}`);
  assert.equal(row.combatVerification.status,'confirmed');
  assert.ok(row.combatVerification.fieldsChecked.includes(field),`${name}: ${row.combatVerification.fieldsChecked}`);
 }
});
