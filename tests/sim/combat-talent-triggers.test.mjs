import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newBuild} from '../../docs/sim/core/builds.mjs';
import {TALENT_TRIGGER_SPECS,TRIGGER_EVENTS,talentTriggerPlan,applyTalentTriggers} from '../../docs/sim/core/combat-talent-triggers.mjs';
import {CombatTimeline} from '../../docs/sim/core/combat-timeline.mjs';
import {CombatAuras} from '../../docs/sim/core/combat-auras.mjs';
import {createExplicitClassEncounter} from '../../docs/sim/core/combat-class-runtime.mjs';
import {ROTATION_REGISTRY} from '../../docs/sim/core/rotations/registry.mjs';

const data=c=>JSON.parse(readFileSync(new URL(`../../docs/sim/data/talents/${c}.json`,import.meta.url)));
const rig=(random=()=>0)=>{const timeline=new CombatTimeline(),auras=new CombatAuras(timeline);return {timeline,auras,e:{auras,random}};};

test('every trigger spec matches the published description at every rank: duration, and parameters exist and are positive',()=>{
  for(const spec of TALENT_TRIGGER_SPECS){
    const d=data(spec.classId),t=d.talents.find(x=>x.id===spec.talentId);assert.ok(t,'talent '+spec.talentId);
    assert.ok(TRIGGER_EVENTS[spec.event],'event '+spec.event);
    for(let rank=1;rank<=t.maxRanks;rank++){
      const m=t.descriptions[rank-1].match(spec.description);
      assert.ok(m,`${t.name} rank ${rank}: description no longer matches the spec: ${t.descriptions[rank-1]}`);
      assert.equal(Number(m[1])*1000,spec.aura.durationMs,`${t.name} rank ${rank}: duration differs from the description`);
      for(const mod of spec.aura.modifiers)assert.ok(t.rankParameters[mod.param][rank-1]>0,`${t.name} rank ${rank} parameter ${mod.param}`);
      if(spec.chanceParam!==undefined)assert.ok(t.rankParameters[spec.chanceParam][rank-1]>0);
    }
  }
});

test('plan: magnitudes come from rankParameters at every rank; rank 0 and other classes produce nothing',()=>{
  const d=data('warrior'),t=d.talents.find(x=>x.id===101);
  for(let rank=1;rank<=t.maxRanks;rank++){
    const b=newBuild('warrior');b.talents={101:rank};
    const [entry,...rest]=talentTriggerPlan(b,d);
    assert.equal(rest.length,0);assert.equal(entry.rank,rank);assert.equal(entry.chance,null);
    assert.deepEqual(entry.aura.modifiers,[{stat:'warriorPhysicalDamagePct',mode:'flat',value:t.rankParameters[0][rank-1]}]);
    assert.equal(entry.aura.durationMs,8000);
  }
  assert.deepEqual(talentTriggerPlan(newBuild('warrior'),d),[]);
  const rogue=newBuild('rogue');rogue.talents={101:5};assert.deepEqual(talentTriggerPlan(rogue,data('rogue')),[],'id 101 is not a rogue trigger here');
  const bad=newBuild('warrior');bad.talents={101:6};assert.throws(()=>talentTriggerPlan(bad,d),/exceeds the maximum/);
  assert.throws(()=>talentTriggerPlan({classId:'warrior',talents:{101:1}},{talents:[]}),/not in the supplied talent data/);
});

test('Talent 101 Enrage: only a landed critical hit against the owner applies the published melee damage bonus per rank for exactly 8 seconds, and a second crit refreshes it',()=>{
  const d=data('warrior'),t=d.talents.find(x=>x.id===101);assert.equal(t.name,'Enrage');
  for(let rank=1;rank<=t.maxRanks;rank++){
  const bonus=t.rankParameters[0][rank-1],b=newBuild('warrior');b.talents={101:rank};const plan=talentTriggerPlan(b,d);
  const {timeline,auras,e}=rig();
  const struck={actorId:'boss',targetId:'p',landed:true,critical:true,school:'physical'};
  for(const [label,ev] of [['non-crit',{...struck,critical:false}],['miss',{...struck,landed:false}],['owner hits boss',{actorId:'p',targetId:'boss',landed:true,critical:true,school:'physical'}],['another unit struck',{...struck,targetId:'ally'}],['equipment proc',{...struck,equipmentProc:true}]])
    assert.equal(applyTalentTriggers(e,'p',ev,plan).length,0,label);
  assert.equal(auras.stat('p','warriorPhysicalDamagePct',0),0);
  assert.equal(applyTalentTriggers(e,'p',struck,plan).length,1);
  assert.equal(auras.stat('p','warriorPhysicalDamagePct',0),bonus,'rank '+rank);
  timeline.runUntil(5000);assert.equal(applyTalentTriggers(e,'p',struck,plan).length,1,'a second crit refreshes');
  timeline.runUntil(12999);assert.equal(auras.stat('p','warriorPhysicalDamagePct',0),bonus,'refreshed to 13 s');
  timeline.runUntil(13000);assert.equal(auras.stat('p','warriorPhysicalDamagePct',0),0);
  assert.equal(auras.active('p').length,0);
  }
});

test('a chance is rolled once per matching event with the encounter seeded random; no roll for non-matching events',()=>{
  const plan=[{talentId:0,rank:1,event:'owner-struck-crit',chance:.25,aura:{id:'t:chance',name:'Chance',kind:'buff',durationMs:1000,maxStacks:1,modifiers:[{stat:'x',mode:'flat',value:1}]}}];
  const hit={targetId:'p',landed:true,critical:true};let rolls=0;
  const make=value=>rig(()=>{rolls++;return value;});
  let r=make(.24);assert.equal(applyTalentTriggers(r.e,'p',hit,plan).length,1);
  r=make(.25);assert.equal(applyTalentTriggers(r.e,'p',hit,plan).length,0,'a roll equal to the chance does not trigger');
  rolls=0;r=make(0);applyTalentTriggers(r.e,'p',{...hit,critical:false},plan);assert.equal(rolls,0,'a non-matching event does not consume a roll');
});

test('Elemental Devastation through the generic path matches the existing behaviour: owner melee crit, spell hit by rank, 10 seconds',()=>{
  const d=data('shaman'),t=d.talents.find(x=>x.id===222);
  for(let rank=1;rank<=t.maxRanks;rank++){
    const b=newBuild('shaman');b.talents={222:rank};const plan=talentTriggerPlan(b,d);
    const {timeline,auras,e}=rig();
    const crit={actorId:'p',targetId:'boss',landed:true,critical:true,school:'physical',hand:'mainhand'};
    assert.equal(applyTalentTriggers(e,'p',{...crit,hand:'ranged'},plan).length,0);
    assert.equal(applyTalentTriggers(e,'p',crit,plan).length,1);
    assert.equal(auras.stat('p','spellHitDeltaPct',0),t.rankParameters[1][rank-1]);
    timeline.runUntil(10000);assert.equal(auras.stat('p','spellHitDeltaPct',0),0);
  }
});

// Wiring: the class runtime calls the triggers for every attack-result, including calculated incoming attacks.
// Fixture shape copied from tests/sim/combat-incoming.test.mjs (priest shield action, synthetic).
function scenario(){
  const abilityId='priest:greater-heal',name=ROTATION_REGISTRY.priest.abilityRegistry[abilityId].name;
  return {mode:'research',provenance:'synthetic wiring fixture',classId:'priest',level:60,seed:2,durationMs:4000,decisionIntervalMs:100,playerId:'p',primaryId:'boss',targetIds:['boss'],allyIds:['ally'],
    units:[{id:'p',maxHealth:1000},{id:'boss',maxHealth:10000},{id:'ally',maxHealth:1000}],pools:{mana:{current:100,max:100}},stats:{p:{}},classContext:{},
    geometry:{p:{boss:{distance:3,position:'behind'},ally:{distance:3,position:'front'}}},
    actions:[{abilityId,spellId:25314,rank:5,learnLevel:60,source:'fixture',evidenceStatus:'synthetic',actorId:'p',kind:'instant',castMs:0,gcdMs:4000,cooldownMs:0,sharedCooldown:null,costs:[{resource:'mana',amount:10}],targets:['ally'],minRangeYards:0,maxRangeYards:40,position:null,comboRequired:null,requiredContext:null,
      effects:[{kind:'absorb',id:'test-shield',when:'always',formula:{min:120,max:120,terms:[],multiplier:1},durationMs:3000,schools:['physical'],refresh:'replace'}]}],
    rows:[{ability:name,abilityId,target:'ally',conditions:[]}],autos:[],regeneration:[],
    incomingDamage:[{atMs:1000,actorId:'boss',targetId:'p',source:'Crit',school:'fire',attackModel:{kind:'spell',provenance:'synthetic',min:10,max:10,table:{missPct:0,resistance:[{fraction:0,probability:1}],criticalPct:100,criticalMultiplier:1.5,resistancePolicy:'nonbinary'}}}]};
}
test('class runtime applies a trigger plan on a calculated incoming critical hit (wiring check with a synthetic scenario)',()=>{
  const plan=[{talentId:0,rank:1,event:'owner-struck-crit',chance:null,aura:{id:'t:wiring',name:'Wiring',kind:'buff',durationMs:2000,maxStacks:1,modifiers:[{stat:'warriorPhysicalDamagePct',mode:'flat',value:7}]}}];
  const applied=result=>(result.events??[]).filter(x=>x.type==='aura-apply'&&x.id==='t:wiring');
  const without=createExplicitClassEncounter(scenario()).run();
  const hit=without.events.find(x=>x.type==='attack-result'&&x.source==='Crit');
  assert.ok(hit&&hit.critical===true&&hit.landed===true&&hit.targetId==='p','the fixture really produces an incoming critical hit on the owner');
  assert.equal(applied(without).length,0);
  const withTrigger=createExplicitClassEncounter({...scenario(),talentTriggers:plan}).run();
  assert.equal(applied(withTrigger).length,1,'the trigger fired once on the incoming critical hit');
});

test('the old elementalDevastationRank scenario field is rejected instead of silently ignored',()=>{
  assert.throws(()=>createExplicitClassEncounter({...scenario(),elementalDevastationRank:3}),/replaced by talentTriggers/);
});
