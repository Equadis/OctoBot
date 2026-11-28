import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newBuild} from '../../docs/sim/core/builds.mjs';
import {TALENT_TRIGGER_SPECS,TRIGGER_EVENTS,talentTriggerPlan,applyTalentTriggers} from '../../docs/sim/core/combat-talent-triggers.mjs';
import {CombatTimeline} from '../../docs/sim/core/combat-timeline.mjs';
import {CombatAuras} from '../../docs/sim/core/combat-auras.mjs';
import {CombatResources,PeriodicEffects} from '../../docs/sim/core/combat-timeline.mjs';
import {compile,compiledAbilities} from '../../tools/sim/combat-verification.mjs';
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
      if(spec.aura){
        assert.equal(Number(m[1])*1000,spec.aura.durationMs,`${t.name} rank ${rank}: duration differs from the description`);
        for(const mod of spec.aura.modifiers)assert.ok(t.rankParameters[mod.param][rank-1]>0,`${t.name} rank ${rank} parameter ${mod.param}`);
      }else if(spec.resource){
        assert.equal(Number(m[1]),t.rankParameters[spec.chanceParam][rank-1],`${t.name} rank ${rank}: description chance differs from rankParameters`);
      }else if(spec.periodicResource){
        assert.equal(Number(m[1]),t.rankParameters[spec.periodicResource.perTick.param][rank-1],`${t.name} rank ${rank}: description rate differs from rankParameters`);
      }
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

const druid=data('druid');
const pawModel=form=>({form,provenance:'synthetic verification input',min:30,max:50,speedSeconds:1,intervalSeconds:1,skill:300,critPct:20,hitPct:100,targetDodgePct:5,glanceMultiplier:.9,glanceChancePct:20});
const feralRig=(rolls=[])=>{
  const timeline=new CombatTimeline(),resources=new CombatResources(timeline,{rage:{current:0,max:100}}),periodic=new PeriodicEffects(timeline),queue=[...rolls],log=[];
  const e={timeline,resources,periodic,random:()=>queue.length?queue.shift():.999999,recordMechanic:(type,details)=>log.push({type,...details})};
  return {timeline,resources,periodic,e,log,rage:()=>resources.snapshot().rage.current};
};
const bearBuild=(id,rank,form='Bear')=>{const b=newBuild('druid');b.classOptions={...b.classOptions,form};b.talents={[id]:rank};return b;};

test('Talent 276 Primal Fury: Bear Form melee crits give the published chance of 5 Rage and Cat Form builder crits the same chance of an extra combo point, at every rank',()=>{
  const t=druid.talents.find(x=>x.id===276);assert.equal(t.name,'Primal Fury');
  const crit={actorId:'p',targetId:'boss',landed:true,critical:true,school:'physical',hand:'mainhand'};
  const feral=name=>compiledAbilities('druid').find(x=>x.name===name).rank;
  for(let rank=1;rank<=t.maxRanks;rank++){
    const chance=t.rankParameters[0][rank-1]/100;
    const [entry]=talentTriggerPlan(bearBuild(276,rank),druid);
    assert.equal(entry.chance,chance);assert.deepEqual(entry.resource,{resource:'rage',amount:5,source:'Primal Fury'});
    assert.deepEqual(talentTriggerPlan(bearBuild(276,rank,'Cat'),druid),[],'no Bear trigger in Cat Form');
    assert.deepEqual(talentTriggerPlan(bearBuild(276,rank,'Humanoid'),druid),[],'no Bear trigger in caster form');
    const hit=feralRig([chance-1e-6]);assert.equal(applyTalentTriggers(hit.e,'p',crit,[entry]).length,1);assert.equal(hit.rage(),5,'rank '+rank);
    const miss=feralRig([chance+1e-6]);assert.equal(applyTalentTriggers(miss.e,'p',crit,[entry]).length,0);assert.equal(miss.rage(),0);
    const noCrit=feralRig([0]);applyTalentTriggers(noCrit.e,'p',{...crit,critical:false},[entry]);assert.equal(noCrit.rage(),0,'only crits');
    const spell=feralRig([0]);applyTalentTriggers(spell.e,'p',{...crit,school:'fire',hand:undefined},[entry]);assert.equal(spell.rage(),0,'only melee crits');
    for(const name of ['Claw','Rake']){
      const proc=compile('druid',feral(name),{276:rank},{form:'Cat'},{feralModel:pawModel('Cat')}).effects.find(x=>x.kind==='proc'&&x.id==='primal-fury');
      assert.ok(proc,name+' has the proc');assert.equal(proc.when,'critical');assert.ok(Math.abs(proc.chance-chance)<1e-9,`${name} chance rank ${rank}`);
      assert.deepEqual(proc.effects,[{kind:'combo-gain',when:'always',points:1}]);
    }
  }
  const full=feralRig();full.resources.change([{resource:'rage',delta:98}]);applyTalentTriggers(full.e,'p',crit,talentTriggerPlan(bearBuild(276,2),druid));
  assert.equal(full.rage(),100,'rage is capped');assert.equal(full.log.at(-1).overflow,3,'the overflow is reported');
});

test('Talent 280 Ancient Brutality: a dodge in Bear Form gives the published Rage per second for 5 seconds, once per 9 seconds; Cat bleed ticks restore the published Energy, at every rank',()=>{
  const t=druid.talents.find(x=>x.id===280);assert.equal(t.name,'Ancient Brutality');
  const dodge={actorId:'boss',targetId:'p',outcome:'dodge',landed:false,critical:false,school:'physical'};
  const feral=name=>compiledAbilities('druid').find(x=>x.name===name).rank;
  for(let rank=1;rank<=t.maxRanks;rank++){
    const perSecond=t.rankParameters[0][rank-1];
    const [entry]=talentTriggerPlan(bearBuild(280,rank),druid);
    assert.deepEqual([entry.periodicResource.perTick,entry.periodicResource.intervalMs,entry.periodicResource.durationMs,entry.periodicResource.cooldownMs],[perSecond,1000,5000,9000]);
    assert.deepEqual(talentTriggerPlan(bearBuild(280,rank,'Cat'),druid),[],'Bear half only in Bear Form');
    const rig=feralRig();
    for(const other of [{...dodge,outcome:'hit'},{...dodge,outcome:'miss'},{...dodge,targetId:'ally'}])assert.equal(applyTalentTriggers(rig.e,'p',other,[entry]).length,0);
    assert.equal(applyTalentTriggers(rig.e,'p',dodge,[entry]).length,1);
    rig.timeline.runUntil(999);assert.equal(rig.rage(),0,'first tick after one second');
    rig.timeline.runUntil(1000);assert.equal(rig.rage(),perSecond);
    rig.timeline.runUntil(5000);assert.equal(rig.rage(),5*perSecond,'five ticks over 5 seconds');
    rig.timeline.runUntil(8000);assert.equal(rig.rage(),5*perSecond,'nothing after the effect ends');
    rig.timeline.runUntil(8999);assert.equal(applyTalentTriggers(rig.e,'p',dodge,[entry]).length,0,'internal cooldown holds until 9 s');
    rig.timeline.runUntil(9000);assert.equal(applyTalentTriggers(rig.e,'p',dodge,[entry]).length,1,'available again at 9 s');
    rig.timeline.runUntil(14000);assert.equal(rig.rage(),10*perSecond,'second window');
    const energy=t.rankParameters[1][rank-1];
    for(const name of ['Rake','Rip']){
      const tick=compile('druid',feral(name),{280:rank},{form:'Cat'},{feralModel:pawModel('Cat')}).effects.find(x=>x.tickResource);
      assert.deepEqual(tick.tickResource,{resource:'energy',amount:energy},`${name} rank ${rank}`);
    }
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

const physicalAttack=(dodgePct,critPct)=>({atMs:1000,actorId:'boss',targetId:'p',source:'Swing',school:'physical',attackModel:{kind:'physical',provenance:'synthetic',min:10,max:10,armourModel:{attackerLevel:63,armour:0},table:{type:'melee-white',position:'front',weaponSkill:300,targetDefense:300,hitPct:100,critPct,critSuppressionPct:0,critMultiplier:2,dualWieldWhite:false,dualWieldPenaltyPct:0,glancePct:0,glanceMultiplier:1,order:['miss','dodge','parry','block','glance','crit'],avoidance:{dodgePct,parryPct:0,blockPct:0},blockValue:0}}});
test('class runtime: a plan entry that gives a resource fires on an incoming critical hit and is logged (synthetic scenario)',()=>{
  const plan=[{talentId:0,rank:1,event:'owner-struck-crit',chance:null,resource:{resource:'mana',amount:5,source:'Wiring resource'}}];
  const run=extra=>createExplicitClassEncounter({...scenario(),incomingDamage:[physicalAttack(0,100)],...extra}).run();
  const before=run({}),after=run({talentTriggers:plan});
  assert.equal(after.resources.mana.current-before.resources.mana.current,5);
  const logged=after.events.find(x=>x.type==='resource-change'&&x.source==='Wiring resource');
  assert.ok(logged&&logged.delta===5&&logged.actorId==='p');
});
test('class runtime: a periodic resource entry fires on an incoming dodge once per internal cooldown and ticks each second (synthetic scenario)',()=>{
  const plan=[{talentId:7,rank:1,event:'owner-dodged',chance:null,periodicResource:{id:'wiring:periodic',resource:'mana',perTick:2,intervalMs:1000,durationMs:2000,cooldownMs:9000,source:'Wiring periodic'}}];
  const attacks=[1000,1500].map((atMs,i)=>({...physicalAttack(100,0),atMs,source:'Swing '+i}));
  const r=createExplicitClassEncounter({...scenario(),durationMs:6000,incomingDamage:attacks,talentTriggers:plan}).run();
  const ticks=r.events.filter(x=>x.type==='resource-change'&&x.source==='Wiring periodic');
  assert.deepEqual(ticks.map(x=>[x.time,x.delta]),[[2000,2],[3000,2]],'one window from the first dodge; the second dodge is inside the internal cooldown');
});

test('the old elementalDevastationRank scenario field is rejected instead of silently ignored',()=>{
  assert.throws(()=>createExplicitClassEncounter({...scenario(),elementalDevastationRank:3}),/replaced by talentTriggers/);
});
