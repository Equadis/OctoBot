// Deterministic combat checks for talents that are read by numeric ID inside a combat module.
// Convention: every test title starts with `Talent <id> <name>:`. tools/sim/audit-talents.mjs VERIFIED_COMBAT_HOOKS may
// name this file only for ids that have such a test (guarded at the bottom). The expected values are read from the
// published rankParameters in docs/sim/data/talents/*.json, never typed in, so a change in the data or the code fails here.
// Passing proves the combat module applies the published per-rank number. It does not prove OctoWoW behaviour.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newBuild} from '../../docs/sim/core/builds.mjs';
import {buildCompanionConfig} from '../../docs/sim/core/combat-companion-reference.mjs';
import {elementalDevastationRank,applyElementalDevastation} from '../../docs/sim/core/combat-conditional-talents.mjs';
import {CombatTimeline} from '../../docs/sim/core/combat-timeline.mjs';
import {CombatAuras} from '../../docs/sim/core/combat-auras.mjs';
import {VERIFIED_COMBAT_HOOKS} from '../../tools/sim/audit-talents.mjs';
import {compile,compiledAbilities} from '../../tools/sim/combat-verification.mjs';

const talentData=c=>JSON.parse(readFileSync(new URL(`../../docs/sim/data/talents/${c}.json`,import.meta.url)));
const hunter=talentData('hunter');
const byId=id=>{const t=hunter.talents.find(x=>x.id===id);assert.ok(t,'talent '+id);return t;};
const landed=[{name:'hit',probability:1,multiplier:1,landed:true}];
const damage={school:'physical',min:20,max:20,apCoefficient:0,spCoefficient:.5,multiplier:1,outcomes:landed,mitigation:0,flatReduction:0,threat:null,ferocityEligible:true,ferocityCriticalMultiplier:2};
const OWNER_RANGED_AP=400,BASE_AP=100,BASE_SP=20,BASE_REGEN=10,BASE_COOLDOWN=5000;
function pet(){return {name:'Cat',level:60,provenance:'synthetic explicit fixture',acceptReferenceRankUncertainty:true,health:100,initialHealth:100,attackPower:BASE_AP,spellPower:BASE_SP,damageMultiplier:1,
  resource:{max:40,current:20,regenAmount:BASE_REGEN,regenIntervalMs:1000},distanceYards:3,position:'behind',decisionIntervalMs:100,gcdMs:1000,auto:null,
  talentPolicy:{staticMode:'apply',ownerRangedAP:OWNER_RANGED_AP,ferocityMode:'normal-hit-only',frenzySwingPolicy:null},
  abilities:[{name:'Claw',rank:1,learnedConfirmed:true,cost:20,castMs:500,cooldownMs:BASE_COOLDOWN,disciplineEligible:true,minRangeYards:0,maxRangeYards:30,refreshOnlyAfterExpiry:false,damage}]};}
function config(talents){const b=newBuild('hunter');b.classOptions.pet='Cat';b.classOptions.petLevel=60;b.talents=talents;return buildCompanionConfig(b,pet(),10000);}
const base=config({});
const near=(a,b,msg)=>assert.ok(Math.abs(a-b)<1e-9,`${msg}: got ${a}, expected ${b}`);

test('Talent 381 Unleashed Fury: pet damage multiplier is 1 + rankParameters[0][rank-1] / 100 at every rank',()=>{
  const t=byId(381);near(base.priority.abilities[0].effects[0].formula.multiplier,1,'no talent');
  for(let r=1;r<=t.maxRanks;r++)near(config({381:r}).priority.abilities[0].effects[0].formula.multiplier,1+t.rankParameters[0][r-1]/100,'rank '+r);
});
test('Talent 382 Bestial Discipline: focus per tick adds rankParameters[0] and eligible special cooldown drops by rankParameters[1] percent',()=>{
  const t=byId(382);assert.equal(base.regen.amount,BASE_REGEN);assert.equal(base.priority.abilities[0].cooldownMs,BASE_COOLDOWN);
  for(let r=1;r<=t.maxRanks;r++){const c=config({382:r});
    near(c.regen.amount,BASE_REGEN+t.rankParameters[0][r-1],'focus rank '+r);
    near(c.priority.abilities[0].cooldownMs,BASE_COOLDOWN*(1-t.rankParameters[1][r-1]/100),'cooldown rank '+r);}
});
test('Talent 384 Ferocity: critical chance on eligible normal hits equals rankParameters[0][rank-1] percent',()=>{
  const t=byId(384);
  const crit=c=>c.priority.abilities[0].effects[0].outcomes.find(x=>x.critical)?.probability??0;
  near(crit(base),0,'no talent');
  for(let r=1;r<=t.maxRanks;r++)near(crit(config({384:r})),t.rankParameters[0][r-1]/100,'rank '+r);
});
test('Talent 389 Spirit Bond: pet attack power and spell power are the published percentages of owner ranged attack power',()=>{
  const t=byId(389);assert.deepEqual(base.stats,{attackPower:BASE_AP,spellPower:BASE_SP});
  for(let r=1;r<=t.maxRanks;r++){const c=config({389:r});
    near(c.stats.attackPower,BASE_AP+OWNER_RANGED_AP*t.rankParameters[0][r-1]/100,'AP rank '+r);
    near(c.stats.spellPower,BASE_SP+OWNER_RANGED_AP*t.rankParameters[1][r-1]/100,'SP rank '+r);}
});

test('Talent 222 Elemental Devastation: a landed owner melee crit grants the published spell hit for 10 seconds at every rank, and only for that event',()=>{
  const shaman=talentData('shaman'),t=shaman.talents.find(x=>x.id===222);assert.equal(t.name,'Elemental Devastation');
  for(let r=1;r<=t.maxRanks;r++){
    const timeline=new CombatTimeline(),auras=new CombatAuras(timeline),e={auras};
    const rank=elementalDevastationRank({classId:'shaman',talents:{222:r}});assert.equal(rank,r);
    const crit={actorId:'p',landed:true,critical:true,school:'physical',hand:'mainhand'};
    assert.equal(applyElementalDevastation(e,'p',{...crit,critical:false},rank),false,'non-crit');
    assert.equal(applyElementalDevastation(e,'p',{...crit,landed:false},rank),false,'miss');
    assert.equal(applyElementalDevastation(e,'p',{...crit,school:'fire'},rank),false,'spell');
    assert.equal(applyElementalDevastation(e,'p',{...crit,actorId:'other'},rank),false,'other actor');
    assert.equal(auras.stat('p','spellHitDeltaPct',0),0,'nothing before the trigger');
    assert.equal(applyElementalDevastation(e,'p',crit,rank),true);
    near(auras.stat('p','spellHitDeltaPct',0),t.rankParameters[1][r-1],'spell hit rank '+r);
    timeline.runUntil(9999);near(auras.stat('p','spellHitDeltaPct',0),t.rankParameters[1][r-1],'still active at 9.999 s');
    timeline.runUntil(10000);near(auras.stat('p','spellHitDeltaPct',0),0,'expired at 10 s');
  }
});

// Compiled-rank checks: the real rank compiler runs with the talent at every rank and the compiled action is compared with the published value.
const compiledRank=(classId,abilityName)=>{const a=compiledAbilities(classId).find(x=>x.name===abilityName);assert.ok(a,`${classId} ${abilityName} has no compiled reference rank`);return a.rank;};
test('Talent 454 Illumination: a critical Flash of Light, Holy Light or Holy Shock heal refunds the published percentage of the spell mana cost at every rank',()=>{
  const t=talentData('paladin').talents.find(x=>x.id===454);assert.equal(t.name,'Illumination');
  let checked=0;
  for(const name of ['Flash of Light','Holy Light','Holy Shock']){
    let rank;try{rank=compiledRank('paladin',name);}catch{continue;}
    let base;try{base=compile('paladin',rank,{});}catch{continue;}
    const cost=base.costs.find(c=>c.resource==='mana')?.amount;if(!(cost>0))continue;
    const refund=a=>a.effects.find(e=>e.kind==='resource'&&e.when==='critical'&&e.resource==='mana')?.delta??0;
    near(refund(base),0,name+' without talent');
    for(let r=1;r<=t.maxRanks;r++){near(refund(compile('paladin',rank,{454:r})),cost*t.rankParameters[0][r-1]/100,`${name} rank ${r}`);checked++;}
  }
  assert.ok(checked>=t.maxRanks,'at least one healing spell must compile so the talent is actually exercised');
});
test('Talent 30 Shatter: non-physical damage against frozen targets gains the published critical chance at every rank',()=>{
  const t=talentData('mage').talents.find(x=>x.id===30);assert.equal(t.name,'Shatter');
  let checked=0;
  for(const {rank,name} of compiledAbilities('mage')){
    let base;try{base=compile('mage',rank,{});}catch{continue;}
    const dmg=a=>a.effects.filter(e=>e.kind==='damage'&&e.school!=='physical');
    if(!dmg(base).length)continue;
    assert.ok(dmg(base).every(e=>e.frozenCritBonusPct===undefined),name+' without talent');
    for(let r=1;r<=t.maxRanks;r++){const a=compile('mage',rank,{30:r});assert.ok(dmg(a).every(e=>e.frozenCritBonusPct===t.rankParameters[0][r-1]),`${name} rank ${r}`);checked++;}
    break;
  }
  assert.ok(checked===t.maxRanks,'a non-physical mage damage ability must compile');
});

test('every VERIFIED_COMBAT_HOOKS entry names an existing test file that contains a test titled "Talent <id> <name>:"',()=>{
  const classTalents=['warrior','paladin','hunter','rogue','priest','shaman','mage','warlock','druid'].flatMap(c=>talentData(c).talents.map(t=>({id:t.id,name:t.name})));
  for(const [id,why] of Object.entries(VERIFIED_COMBAT_HOOKS)){
    const file=why.match(/^(tests\/[^\s]+\.test\.mjs)/)?.[1];assert.ok(file,`talent ${id} must start its entry with a test path`);
    const source=readFileSync(new URL('../../'+file,import.meta.url),'utf8');
    const talent=classTalents.find(t=>String(t.id)===id);assert.ok(talent,'unknown talent '+id);
    assert.ok(source.includes(`Talent ${id} ${talent.name}:`),`${file} has no test titled "Talent ${id} ${talent.name}:"`);
  }
});
