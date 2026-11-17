import test from 'node:test';import assert from 'node:assert/strict';import {createExplicitClassEncounter} from '../../docs/sim/core/combat-class-runtime.mjs';import {buildCastProcs} from '../../docs/sim/core/combat-cast-procs.mjs';
const hit=[{name:'hit',probability:1,multiplier:1,landed:true}],crit=[{name:'crit',probability:1,multiplier:2,landed:true,critical:true}];
const effect=outcomes=>({kind:'damage',when:'always',school:'holy',formula:{min:100,max:100,terms:[],multiplier:1},outcomes,mitigation:0,flatReduction:0,threat:null});
function action(abilityId,spellId,effects,other={}){return {abilityId,spellId,rank:1,learnLevel:1,source:'fixture',evidenceStatus:'synthetic',actorId:'p',kind:'cast',castMs:2500,gcdMs:1500,cooldownMs:0,sharedCooldown:null,costs:[{resource:'mana',amount:100}],targets:['enemy'],minRangeYards:0,maxRangeYards:30,position:null,comboRequired:null,requiredContext:null,effects,...other};}
const common={mode:'research',provenance:'synthetic cast proc fixture',classId:'priest',level:60,seed:1,durationMs:6000,decisionIntervalMs:100,pools:{mana:{current:100,max:100}},units:[{id:'p',maxHealth:1000},{id:'boss',maxHealth:100000}],playerId:'p',primaryId:'boss',targetIds:['boss'],allyIds:[],stats:{p:{}},classContext:{},geometry:{p:{boss:{distance:10,position:'behind'}}},autos:[],regeneration:[]};
test('Searing Light is consumed only at a successful action start; discount can make an otherwise unaffordable Smite castable',()=>{
 const trigger=action('priest:holy-fire',15261,[effect(crit)],{kind:'instant',castMs:0,costs:[{resource:'mana',amount:60}],cooldownMs:60000}),consumer=action('priest:smite',10934,[effect(hit)]);
 const castProcs=buildCastProcs({classId:'priest',talents:{177:3}},[trigger,consumer]).procs;
 const r=createExplicitClassEncounter({...common,actions:[consumer,trigger],castProcs,rows:[{ability:'Smite',target:'primary',conditions:[]},{ability:'Holy Fire',target:'primary',conditions:[]}]}).run();
 const starts=r.events.filter(e=>e.type==='action-start');assert.deepEqual(starts.map(e=>[e.ability,e.time,e.castMs]),[['Holy Fire',0,0],['Smite',1500,0]]);assert.equal(r.resources.mana.current,0);assert.ok(r.events.some(e=>e.type==='proc'&&e.procId==='searing-light'));assert.equal(r.events.filter(e=>e.type==='aura-remove'&&e.id==='searing-light').length,1);
});
test('Nightfall triggers from actual periodic damage and consumes Shadow Trance once on an instant guaranteed landed bolt',()=>{
 const dot={...effect(hit),school:'shadow',kind:'periodic-damage',durationMs:6000,intervalMs:2000,refresh:'restart',tickAtExpiry:true,snapshot:'snapshot',applicationOutcomes:hit,auraName:'Corruption'};
 const trigger=action('warlock:corruption',11672,[dot],{kind:'instant',castMs:0,costs:[{resource:'mana',amount:10}],cooldownMs:60000}),consumer=action('warlock:shadow-bolt',11661,[{...effect([{name:'miss',probability:.999,multiplier:0,landed:false},{name:'hit',probability:.001,multiplier:1,landed:true}]),school:'shadow'}],{castMs:3000,costs:[{resource:'mana',amount:10}]});
 const policy=buildCastProcs({classId:'warlock',talents:{347:2}},[trigger,consumer],{nightfall:{durationMs:10000}}).procs;assert.equal(policy[0].chance,.04);policy[0].chance=1;
 const r=createExplicitClassEncounter({...common,classId:'warlock',actions:[trigger,consumer],castProcs:policy,rows:[{ability:'Shadow Bolt',target:'primary',conditions:[{metric:'selfBuffActive',operator:'=',value:1,aura:'Shadow Trance'}]},{ability:'Corruption',target:'primary',conditions:[]}]}).run();
 assert.deepEqual(r.events.filter(e=>e.type==='action-start'&&e.ability==='Shadow Bolt').map(e=>[e.time,e.castMs]),[[2000,0],[4000,0]]);assert.equal(r.events.filter(e=>e.type==='damage'&&e.source==='Shadow Bolt').length,2);
});
test('Hot Streak follows the imported two-rank talent: five-stack cap and one second per stack',()=>{
 const trigger=action('mage:fire-blast',10199,[{...effect(crit),school:'fire'}],{kind:'instant',castMs:0,gcdMs:1000,costs:[{resource:'mana',amount:0}]}),consumer=action('mage:pyroblast',18809,[{...effect(hit),school:'fire'}],{castMs:6000,costs:[{resource:'mana',amount:0}]});
 const policy=buildCastProcs({classId:'mage',talents:{15:2}},[trigger,consumer]).procs;assert.equal(policy[0].maxStacks,5);assert.equal(policy[0].durationMs,180000);
 const r=createExplicitClassEncounter({...common,classId:'mage',durationMs:8500,actions:[trigger,consumer],castProcs:policy,rows:[{ability:'Pyroblast',target:'primary',conditions:[{metric:'buffStacks',operator:'>=',value:5,aura:'Hot Streak'},{metric:'combatTime',operator:'>=',value:6}]},{ability:'Fire Blast',target:'primary',conditions:[]}]}).run();
 assert.equal(r.events.find(e=>e.type==='action-start'&&e.ability==='Pyroblast').castMs,1000);
});
