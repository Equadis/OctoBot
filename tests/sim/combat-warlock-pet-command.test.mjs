import test from 'node:test';import assert from 'node:assert/strict';
import {createExplicitClassEncounter} from '../../docs/sim/core/combat-class-runtime.mjs';
const hit=[{name:'hit',probability:1,multiplier:1,landed:true}];
const command={abilityId:'warlock:pet-attack',schedulerCommand:'warlock:pet-attack',actorId:'p',rank:null,spellId:null,learnLevel:1,source:'https://octowow.st/index.php/warlock',evidenceStatus:'synthetic',kind:'instant',castMs:0,gcdMs:0,cooldownMs:0,sharedCooldown:null,costs:[],targets:['enemy'],effects:[],minRangeYards:0,maxRangeYards:100,position:null,comboRequired:null,requiredContext:null};
const make=(extra={})=>({mode:'research',provenance:'Warlock demon command scheduler fixture',classId:'warlock',level:60,seed:1,durationMs:4500,decisionIntervalMs:50,pools:{mana:{current:1000,max:1000}},units:[{id:'p',maxHealth:1000},{id:'pet',maxHealth:500},{id:'boss',maxHealth:10000}],playerId:'p',primaryId:'boss',targetIds:['boss'],allyIds:[],petId:'pet',stats:{p:{},pet:{}},classContext:{},geometry:{p:{boss:{distance:20,position:'front'}},pet:{boss:{distance:3,position:'front'}}},actions:[command],rows:[{ability:'Pet Attack',target:'primary',conditions:[{metric:'combatTime',operator:'>=',value:2.5}]}],autos:[{id:'demon-melee',actorId:'pet',source:'Demon melee',intervalMs:1000,firstAtMs:1000,castPolicy:'continue',minRangeYards:0,maxRangeYards:5,effects:[{kind:'damage',when:'always',school:'physical',formula:{min:50,max:50,terms:[],multiplier:1},outcomes:hit,flatReduction:0,mitigation:0,threat:null}]}],regeneration:[],...extra});
test('Warlock Pet Attack starts existing demon scheduler without duplicate autos, mana costs or a GCD',()=>{
 const r=createExplicitClassEncounter(make()).run();
 assert.deepEqual(r.events.filter(x=>x.type==='damage'&&x.source==='Demon melee').map(x=>x.time),[3000,4000]);
 assert.deepEqual(r.events.filter(x=>x.type==='action-start'&&x.ability==='Pet Attack').map(x=>x.time),[2500]);
 assert.equal(r.resources.mana.current,1000);
 assert.equal(r.events.filter(x=>x.type==='class-state-change'&&x.state==='warlock:pet-attack').length,1);
});
test('Warlock Pet Attack needs a living pet and configured combat scheduler',()=>{
 assert.throws(()=>createExplicitClassEncounter(make({petId:null})),/Pet Attack requires configured companion attacks/);
 assert.throws(()=>createExplicitClassEncounter(make({autos:[]})),/Pet Attack requires configured companion attacks/);
});
