import test from 'node:test';import assert from 'node:assert/strict';
import {createExplicitClassEncounter} from '../../docs/sim/core/combat-class-runtime.mjs';
import {spellAttackTable} from '../../docs/sim/core/combat-attack-tables.mjs';
const model={durationMs:60000,eligibleAbilityIds:['priest:smite'],overlap:'consume-both',criticalScope:'direct-only'};
const action=(abilityId,spellId,effects,extra={})=>({abilityId,spellId,rank:1,learnLevel:1,source:'fixture',evidenceStatus:'synthetic',actorId:'p',kind:'instant',castMs:0,gcdMs:1500,cooldownMs:0,sharedCooldown:null,costs:[],targets:['enemy'],minRangeYards:0,maxRangeYards:30,position:null,comboRequired:null,requiredContext:null,effects,...extra});
const outcomes=spellAttackTable({missPct:0,resistance:[{fraction:0,probability:1}],criticalPct:0,criticalMultiplier:2,resistancePolicy:'none',provenance:'fixture'}).outcomes;
const focus=action('priest:inner-focus',14751,[{kind:'priest-inner-focus',when:'always',model}],{targets:['self'],gcdMs:0,cooldownMs:180000});
const smite=action('priest:smite',10934,[{kind:'damage',when:'always',school:'holy',formula:{min:100,max:100,terms:[],multiplier:1},outcomes,mitigation:0,flatReduction:0,threat:null}],{costs:[{resource:'mana',amount:100}],kind:'cast',castMs:2500});
test('Inner Focus grants one affordable cast at zero mana and consumes at start, with a 25-point critical roll',()=>{
 const r=createExplicitClassEncounter({mode:'research',provenance:'focus fixture',classId:'priest',level:60,seed:1,durationMs:8000,decisionIntervalMs:50,pools:{mana:{current:0,max:100}},units:[{id:'p',maxHealth:1000},{id:'boss',maxHealth:10000}],playerId:'p',primaryId:'boss',targetIds:['boss'],allyIds:[],stats:{p:{}},classContext:{},geometry:{p:{p:{distance:0,position:'self'},boss:{distance:10,position:'front'}}},actions:[focus,smite],autos:[],regeneration:[],rows:[{ability:'Inner Focus',target:'self',conditions:[]},{ability:'Smite',target:'primary',conditions:[]}]}).run();
 assert.equal(r.events.filter(e=>e.type==='action-start'&&e.ability==='Smite').length,1);assert.equal(r.resources.mana.current,0);
 assert.ok(r.events.some(e=>e.type==='aura-remove'&&e.id==='priest:inner-focus'&&e.reason==='consumed'&&e.time<2500));
 const hit=r.events.find(e=>e.type==='attack-result'&&e.source==='Smite');assert.equal(hit.probability,hit.critical?.25:.75);
});
