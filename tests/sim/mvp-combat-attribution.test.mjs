import test from 'node:test';
import assert from 'node:assert/strict';
import {CombatEncounter} from '../../docs/sim/core/combat-execution.mjs';
import {attributedActorRates,aggregateCombatAttribution} from '../../docs/sim/core/combat-attribution.mjs';
import {REFERENCE_PRIORITIES as P} from '../../docs/sim/core/combat-timeline.mjs';
const fixture=()=>new CombatEncounter({durationMs:2000,decisionIntervalMs:100,seed:42,pools:{energy:{current:100,max:100}},units:[{id:'p',maxHealth:100},{id:'pet',maxHealth:100},{id:'enemy',maxHealth:1000},{id:'ally',maxHealth:100,health:50}],playerId:'p',petId:'pet',primaryId:'enemy',targetIds:['enemy'],allyIds:['ally'],rows:[{ability:'Strike',conditions:[]}],actions:[{id:'strike',name:'Strike',kind:'instant',castMs:0,costs:[],cooldowns:[{id:'gcd',duration:1000}],targets:['enemy'],resolve:(e,t)=>e.damage({targetId:t,value:30,source:'Strike',actorId:'p'})}]});
test('player, pet, and incoming damage stay separate and ability totals reconcile',()=>{
 const e=fixture();
 e.timeline.schedule(500,P.tick,()=>e.damage({targetId:'enemy',value:20,source:'Bite',actorId:'pet'}));
 e.timeline.schedule(600,P.tick,()=>e.damage({targetId:'p',value:5,source:'Swing',actorId:'enemy'}));
 e.timeline.schedule(700,P.tick,()=>e.heal({targetId:'ally',value:80,source:'Heal',actorId:'p'}));
 const r=e.run(),a=r.attribution;
 assert.equal(r.totals.enemyDamage,80);
 assert.equal(a.actors.p.totals.enemyDamage,60);
 assert.equal(a.actors.pet.bySource.Bite.enemyDamage,20);
 assert.equal(a.actors.enemy.totals.enemyDamage,0);
 assert.equal(a.actors.enemy.totals.damage,5);
 assert.equal(a.actors.p.bySource.Heal.allyHealing,50);
 assert.equal(a.actors.p.totals.overheal,30);
 assert.equal(attributedActorRates(r,'p').actorDps,30);
 assert.equal(attributedActorRates(r,'p').actorHps,25);
 assert.equal(attributedActorRates(r,'pet').actorDps,10);
 assert.equal(Object.values(a.actors).reduce((n,x)=>n+x.totals.damage,0),r.totals.damage);
});
test('unowned damage cannot become player DPS; incomplete metrics stay null',()=>{
 const e=fixture();e.timeline.schedule(500,P.tick,()=>e.damage({targetId:'enemy',value:5,source:'anonymous'}));
 const r=e.run();assert.equal(r.totals.enemyDamage,65);assert.equal(r.attribution.unattributed.totals.enemyDamage,5);
 const p=attributedActorRates(r,'p');assert.equal(p.actorDps,null);assert.equal(p.actorHps,0);
 assert.throws(()=>attributedActorRates(r,'unknown'),/known actor/);
});
test('invalid actor identity is rejected before health changes',()=>{
 const e=fixture();assert.throws(()=>e.damage({targetId:'enemy',value:5,source:'bad',actorId:'unknown'}),/Unknown damage actor/);assert.equal(e.unit('enemy').health,1000);
});
test('source names do not imply ownership even if they match an actor id',()=>{
 const a=aggregateCombatAttribution([{type:'damage',source:'p',targetId:'e',effective:3,overkill:0}],{unitIds:['p','e'],targetIds:['e']});assert.equal(a.actors.p.totals.enemyDamage,0);assert.equal(a.unattributed.totals.enemyDamage,3);
});
