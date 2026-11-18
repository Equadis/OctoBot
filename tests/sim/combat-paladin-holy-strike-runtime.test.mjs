import test from 'node:test';import assert from 'node:assert/strict';
import {createExplicitClassEncounter} from '../../docs/sim/core/combat-class-runtime.mjs';
const hit=[{name:'hit',probability:1,multiplier:1,landed:true}],miss=[{name:'miss',probability:1,multiplier:0,landed:false}];
const model={acceptSourceConflict:true,weaponMin:100,weaponMax:100,weaponCoefficient:.4,baseMin:100,baseMax:100,spellPower:0,spellCoefficient:0,damageMultiplier:1,threatMultiplier:1,baseHeal:50,healingPower:0,healingCoefficient:0,healingMultiplier:1,selfHealingMultiplier:.5,manaRestore:20};
function run(outcomes,overrides={}){const a={abilityId:'paladin:holy-strike',spellId:13953,rank:1,learnLevel:4,source:'synthetic legacy identity; not proof of Octo rank',evidenceStatus:'synthetic',actorId:'p',kind:'instant',castMs:0,gcdMs:1500,cooldownMs:60000,sharedCooldown:null,costs:[{resource:'mana',amount:10}],targets:['enemy'],minRangeYards:0,maxRangeYards:5,position:null,comboRequired:null,requiredContext:null,effects:[{kind:'holy-strike',when:'always'}],holyStrikePolicy:{recipients:['p','ally'],manaPools:{p:'mana',ally:'partyMana:ally'},model,outcomes,healThreat:0}};return createExplicitClassEncounter({mode:'research',provenance:'synthetic Holy Strike interactions, unknown actual cast ID',classId:'paladin',level:60,seed:1,durationMs:3000,decisionIntervalMs:50,pools:{mana:{current:500,max:1000},'partyMana:ally':{current:490,max:500}},units:[{id:'p',maxHealth:1000,health:500},{id:'boss',maxHealth:10000},{id:'ally',maxHealth:1000,health:500}],playerId:'p',primaryId:'boss',targetIds:['boss'],allyIds:['ally'],stats:{p:{}},classContext:{},geometry:{p:{p:{distance:0,position:'self'},boss:{distance:4,position:'front'},ally:{distance:7,position:'front'}}},actions:[a],rows:[{ability:'Holy Strike',target:'primary',conditions:[]}],autos:[],regeneration:[],...overrides}).run();}
test('Holy Strike heals party and restores independent capped mana even when missed',()=>{
 const r=run(miss);
 assert.equal(r.totals.enemyDamage,0);assert.equal(r.resources.mana.current,510);assert.equal(r.resources['partyMana:ally'].current,500);
 assert.deepEqual(r.events.filter(x=>x.type==='heal'&&x.source==='Holy Strike (party)').map(x=>[x.targetId,x.effective]),[['p',25],['ally',50]]);
 assert.deepEqual(r.events.filter(x=>x.type==='resource-change'&&x.source==='Holy Strike (mana)').map(x=>[x.targetId,x.delta,x.overflow]),[['p',20,0],['ally',10,10]]);
});
test('Holy Strike deals damage on landed hit and preserves the independent party restore',()=>{
 const r=run(hit);assert.equal(r.totals.enemyDamage,140);assert.equal(r.totals.allyHealing,75);assert.equal(r.resources.mana.current,510);
});
test('Holy Strike refuses missing geometry and unsupported mana recipients',()=>{
 assert.throws(()=>run(hit,{geometry:{p:{p:{distance:0,position:'self'},boss:{distance:4,position:'front'}}}}),/recipient geometry/);
});
