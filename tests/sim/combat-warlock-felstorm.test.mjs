import test from 'node:test';import assert from 'node:assert/strict';
import {createExplicitClassEncounter} from '../../docs/sim/core/combat-class-runtime.mjs';
import {validateFelstorm} from '../../docs/sim/core/combat-warlock-felstorm.mjs';
const hit=[{name:'hit',probability:1,multiplier:1,landed:true}];
const model={petType:'Felguard',resource:'petMana',petCost:1200,durationMs:6000,tickMs:1000,cooldownMs:45000,targeting:'ordered-radius',petAutoPolicy:'pause',cap:4,radius:8,weaponMin:50,weaponMax:50,shadowFlat:5,shadowCoefficient:0,shadowPowerBasis:'none',outcomes:hit};
const action={abilityId:'warlock:felstorm',spellId:47353,rank:1,learnLevel:45,source:'fixture',evidenceStatus:'synthetic',actorId:'p',kind:'instant',castMs:0,gcdMs:0,cooldownMs:0,sharedCooldown:null,costs:[{resource:'mana',amount:0}],targets:['enemy'],minRangeYards:0,maxRangeYards:40,position:null,comboRequired:null,requiredContext:null,effects:[{kind:'felstorm',when:'always',model}],felstormModel:model,requiresLivePet:true};
const base={mode:'research',provenance:'Felguard Felstorm fixture',classId:'warlock',level:60,seed:1,durationMs:10000,decisionIntervalMs:50,pools:{mana:{current:2000,max:2000},petMana:{current:1500,max:1500}},units:[{id:'p',maxHealth:1000},{id:'pet',maxHealth:500},{id:'boss',maxHealth:10000},{id:'add',maxHealth:10000},{id:'far',maxHealth:10000}],playerId:'p',primaryId:'boss',targetIds:['boss','add','far'],allyIds:[],petId:'pet',petKind:'Felguard',stats:{p:{shadow:0},pet:{spellPower:0}},classContext:{},geometry:{p:{boss:{distance:20,position:'front'},pet:{distance:4,position:'front'}},pet:{boss:{distance:3,position:'front'},add:{distance:7,position:'front'},far:{distance:20,position:'front'}}},actions:[action],rows:[{ability:'Felstorm',target:'primary',conditions:[]}],autos:[{id:'demon-auto',actorId:'pet',source:'Demon auto',intervalMs:1000,firstAtMs:1000,castPolicy:'continue',minRangeYards:0,maxRangeYards:5,effects:[{kind:'damage',when:'always',school:'physical',formula:{min:10,max:10,terms:[],multiplier:1},outcomes:hit,mitigation:0,flatReduction:0,threat:null}]}],regeneration:[]};
test('Felstorm consumes only pet mana and pulses once per second for six seconds, with two damage schools and a ranged cap',()=>{
 const r=createExplicitClassEncounter(base).run();
 assert.equal(r.resources.mana.current,2000);assert.equal(r.resources.petMana.current,300);
 assert.equal(r.events.filter(x=>x.type==='action-start'&&x.ability==='Felstorm').length,1);
 assert.equal(r.events.filter(x=>x.type==='damage'&&x.source==='Felstorm (physical)').length,12);
 assert.equal(r.events.filter(x=>x.type==='damage'&&x.source==='Felstorm (shadow)').length,12);
 assert.ok(!r.events.some(x=>x.type==='damage'&&x.targetId==='far'));
 assert.deepEqual(r.events.filter(x=>x.type==='damage'&&x.source==='Demon auto').map(x=>x.time),[6000,7000,8000,9000,10000]);
});
test('Felstorm never starts without a Felguard or enough demon mana',()=>{
 assert.throws(()=>createExplicitClassEncounter({...base,petKind:'Felhunter'}),/Felstorm requires selected Warlock demon/);
 const r=createExplicitClassEncounter({...base,pools:{mana:{current:2000,max:2000},petMana:{current:100,max:1500}}}).run();
 assert.equal(r.events.filter(x=>x.type==='action-start'&&x.ability==='Felstorm').length,0);
});
test('Felstorm refuses fabricated scaling or target rules',()=>{
 assert.throws(()=>validateFelstorm({...model,petCost:0}),/Explicit Felstorm/);
 assert.throws(()=>validateFelstorm({...model,radius:-10}),/Explicit Felstorm/);
 assert.throws(()=>validateFelstorm({...model,shadowPowerBasis:'guessed'}),/Explicit Felstorm/);
});

test('Felstorm reads active scoped and pet damage modifiers at pulse time',()=>{
 const effect=(id,stat,recipient)=>({
  id,source:id,provenance:'synthetic',trigger:'use',atMs:[1200],cooldownMs:0,
  effect:{kind:'aura',...(recipient?{recipient}:{}),durationMs:1500,modifiers:[{stat,mode:'multiplyPct',value:100}]},
 });
 const equipmentEffects={effects:[
  effect('pet enhancement','petDamageFactor','companion'),
  effect('command enhancement','abilityDamageFactor:warlock:felstorm'),
 ]};
 const r=createExplicitClassEncounter({...base,equipmentEffects}).run();
 assert.deepEqual(r.events.filter(e=>e.type==='damage'&&e.source==='Felstorm (physical)'&&e.targetId==='boss').map(e=>e.raw),[50,200,50,50,50,50]);
});
