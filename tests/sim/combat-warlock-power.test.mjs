import test from 'node:test';import assert from 'node:assert/strict';
import {createExplicitClassEncounter} from '../../docs/sim/core/combat-class-runtime.mjs';
import {combatReport} from '../../docs/sim/core/combat-report.mjs';
import {attributedActorRates} from '../../docs/sim/core/combat-attribution.mjs';
import {validatePowerOverwhelming} from '../../docs/sim/core/combat-warlock-power.mjs';
const hit=[{name:'hit',probability:1,multiplier:1,landed:true}],model={healthBasis:'base-health',activation:'instant',refresh:'replace',damagePct:20,drainFraction:.4,durationMs:10000,tickMs:1000,basePetHealth:500,ownerRangeYards:30,crowdControlNames:['Root'],tickAtExpiry:true};
const action={abilityId:'warlock:power-overwhelming',spellId:51714,rank:1,learnLevel:30,source:'fixture',evidenceStatus:'synthetic',actorId:'p',kind:'instant',castMs:0,gcdMs:1500,cooldownMs:14000,sharedCooldown:null,costs:[{resource:'mana',amount:80}],targets:['pet'],minRangeYards:0,maxRangeYards:30,position:null,comboRequired:null,requiredContext:null,effects:[{kind:'power-overwhelming',when:'always',model}],powerOverwhelmingModel:model,requiresLivePet:true};
const base={mode:'research',provenance:'Warlock Power Overwhelming fixture',classId:'warlock',level:60,seed:1,durationMs:13000,decisionIntervalMs:50,pools:{mana:{current:1000,max:1000}},units:[{id:'p',maxHealth:1000},{id:'pet',maxHealth:500,health:500},{id:'boss',maxHealth:10000}],playerId:'p',primaryId:'boss',targetIds:['boss'],allyIds:[],petId:'pet',stats:{p:{},pet:{}},classContext:{},geometry:{p:{boss:{distance:20,position:'front'},pet:{distance:5,position:'front'}},pet:{boss:{distance:3,position:'front'}}},actions:[action],rows:[{ability:'Power Overwhelming',target:'pet',conditions:[]}],autos:[{id:'demon-melee',actorId:'pet',source:'Demon melee',intervalMs:2000,firstAtMs:2000,castPolicy:'continue',minRangeYards:0,maxRangeYards:5,effects:[{kind:'damage',when:'always',school:'physical',formula:{min:100,max:100,terms:[],multiplier:1},outcomes:hit,flatReduction:0,mitigation:0,threat:null}]}],regeneration:[]};
test('Power Overwhelming dispels configured CC, buffs only the demon for 10 seconds and drains base pet health over ten ticks',()=>{
 const e=createExplicitClassEncounter(base);
 e.auras.apply({id:'root',name:'Root',ownerId:'boss',targetId:'pet',kind:'debuff',durationMs:20000,maxStacks:1,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh',modifiers:[{stat:'rooted',mode:'flat',value:1}]});
 const r=e.run();
 assert.equal(r.resources.mana.current,920);
 assert.deepEqual(r.events.filter(x=>x.type==='damage'&&x.source==='Demon melee').map(x=>x.effective),[120,120,120,120,100,100]);
 assert.equal(r.events.filter(x=>x.type==='damage'&&x.source==='Power Overwhelming (health drain)').length,10);
 assert.equal(r.units.find(x=>x.id==='pet').health,300);
 assert.ok(r.events.some(x=>x.type==='aura-remove'&&x.id==='root'&&x.reason==='cleansed'));
});
test('Power Overwhelming health drain stops when demon dies',()=>{
 const r=createExplicitClassEncounter({...base,units:base.units.map(x=>x.id==='pet'?{...x,health:80}:x)}).run();
 assert.equal(r.units.find(x=>x.id==='pet').alive,false);
 assert.equal(r.events.filter(x=>x.type==='damage'&&x.source==='Power Overwhelming (health drain)').length,4);
 assert.ok(!r.events.some(x=>x.type==='damage'&&x.source==='Demon melee'&&x.time>4000));
});
test('Power Overwhelming never guesses base health or control policies',()=>{
 assert.throws(()=>validatePowerOverwhelming({...model,basePetHealth:undefined}),/base-health/);
 assert.throws(()=>validatePowerOverwhelming({...model,tickMs:3000}),/complete tick schedule/);
 assert.throws(()=>validatePowerOverwhelming({...model,crowdControlNames:['Root','Root']}),/crowd control/);
});

test('Power Overwhelming health drain never inflates pet DPS or creates unknown threat',()=>{const r=createExplicitClassEncounter(base).run();const drained=r.events.filter(x=>x.type==='damage'&&x.source==='Power Overwhelming (health drain)').reduce((sum,x)=>sum+x.effective,0),p=r.attribution.actors.pet.totals,report=combatReport(r),self=report.actors.pet.bySource['Power Overwhelming (health drain)'];assert.equal(drained,200);assert.equal(p.damage,p.enemyDamage+drained);assert.equal(self.enemyDamage,0);assert.equal(self.nonEnemyDamage,drained);assert.equal(self.unknownThreatEvents,0);assert.equal(attributedActorRates(r,'pet').actorDps,p.enemyDamage/(r.durationMs/1000));});
