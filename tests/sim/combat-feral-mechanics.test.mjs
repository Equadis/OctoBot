import test from 'node:test';import assert from 'node:assert/strict';
import {feralWeapon} from '../../docs/sim/core/combat-feral-reference.mjs';
import {createExplicitClassEncounter} from '../../docs/sim/core/combat-class-runtime.mjs';
const hit=[{name:'hit',probability:1,multiplier:1,landed:true}],crit=[{name:'crit',probability:1,multiplier:2,landed:true,critical:true}];
const damage=(n=100,school='physical')=>({kind:'damage',when:'always',formula:{min:n,max:n,terms:[],multiplier:1},outcomes:hit,mitigation:0,flatReduction:0,threat:null,school});
const act=(abilityId,spellId,effects,other={})=>({abilityId,spellId,rank:1,learnLevel:1,source:'synthetic fixture',evidenceStatus:'synthetic',actorId:'p',kind:'instant',castMs:0,gcdMs:1000,cooldownMs:60000,sharedCooldown:null,costs:[{resource:'energy',amount:0}],targets:['enemy'],minRangeYards:0,maxRangeYards:5,position:null,comboRequired:null,requiredContext:null,effects,...other});
const common={mode:'research',provenance:'synthetic arithmetic inputs, not game observations',classId:'druid',level:60,seed:42,durationMs:10000,decisionIntervalMs:100,pools:{mana:{current:1000,max:1000},energy:{current:100,max:100}},units:[{id:'p',maxHealth:1000},{id:'boss',maxHealth:100000}],playerId:'p',primaryId:'boss',targetIds:['boss'],allyIds:[],stats:{p:{}},classContext:{form:'Cat'},geometry:{p:{boss:{distance:3,position:'behind'}}},nearbyTargets:{boss:[]},autos:[],regeneration:[],comboPoints:{cap:5,initialTarget:'boss',initialPoints:0}};
test('feral paw model uses explicitly supplied damage, never the equipped weapon',()=>{
 const snap={melee:{mainhand:{min:10000,max:20000,skill:1,targetArmour:1000}}},m={form:'Cat',provenance:'fixture',min:30,max:50,speedSeconds:1,intervalSeconds:.8,skill:300,critPct:5,hitPct:6,targetDodgePct:5,glanceMultiplier:.7,glanceChancePct:40};
 const w=feralWeapon(snap,'Cat',m);assert.equal(w.min,30);assert.equal(w.max,50);assert.equal(w.skill,300);assert.equal(w.targetArmour,1000);assert.throws(()=>feralWeapon(snap,'Bear',m),/form model/);assert.throws(()=>feralWeapon(snap,'Cat',{...m,min:null}),/minimum/);
});
test('Ferocious Bite consumes capped excess energy and increases the entire base, not only a flat bonus',()=>{
 const a=act('druid:ferocious-bite',22829,[{...damage(),formula:{comboRanges:[[100,100],[200,200],[300,300],[400,400],[500,500]],terms:[],multiplier:1},additionalResource:{resource:'energy',coefficient:.01,cap:30,payment:'landed',mode:'fraction-of-base'}},{kind:'combo-spend',when:'landed',points:'all'}],{costs:[{resource:'energy',amount:35}],comboRequired:1,requiredContext:{form:'Cat'}});
 const r=createExplicitClassEncounter({...common,comboPoints:{cap:5,initialTarget:'boss',initialPoints:5},actions:[a],rows:[{ability:'Ferocious Bite',target:'primary',conditions:[]}]}).run();
 assert.equal(r.events.find(x=>x.type==='damage').raw,650);assert.equal(r.resources.energy.current,35);assert.equal(r.events.find(x=>x.type==='combo-change').spent,5);
});
test('owned bleeds scale Claw, and periodic resource restoration is applied to each landed tick',()=>{
 const rake=act('druid:rake',9904,[{...damage(10),kind:'periodic-damage',durationMs:9000,intervalMs:3000,refresh:'restart',tickAtExpiry:true,snapshot:'snapshot',applicationOutcomes:hit,auraName:'Rake',tickResource:{resource:'energy',amount:3}},{kind:'combo-gain',when:'landed',points:1}],{costs:[{resource:'energy',amount:40}]});
 const claw=act('druid:claw',9850,[{...damage(),ownedBleedBonus:{names:['Rake','Rip','Pounce'],fraction:.3}},{kind:'combo-gain',when:'landed',points:1}],{costs:[{resource:'energy',amount:45}]});
 const r=createExplicitClassEncounter({...common,actions:[rake,claw],rows:[{ability:'Rake',target:'primary',conditions:[]},{ability:'Claw',target:'primary',conditions:[]}]}).run();
 assert.equal(r.events.find(x=>x.type==='damage'&&x.source==='Claw').raw,130);
 assert.equal(r.events.filter(x=>x.type==='resource-change'&&x.source==='Rake (periodic resource)').length,3);assert.equal(r.resources.energy.current,24);
});
test('Stormstrike charges boost exactly two landed Nature hits, not physical damage or healing',()=>{
 const s=act('shaman:stormstrike',17364,[damage(50),{kind:'aura',when:'landed',auraTarget:'actor',aura:{id:'stormstrike-nature',name:'Stormstrike',kind:'buff',durationMs:8000,maxStacks:2,stacks:2,stackPolicy:'replace',refreshPolicy:'refresh',modifiers:[{stat:'chargedNatureBonusPct',mode:'flat',value:20}]}}],{costs:[{resource:'mana',amount:0}]});
 const bolt=act('shaman:lightning-bolt',15208,[damage(100,'nature')],{costs:[{resource:'mana',amount:0}],cooldownMs:0});
 const r=createExplicitClassEncounter({...common,classId:'shaman',durationMs:4000,pools:{mana:{current:1000,max:1000}},comboPoints:null,classContext:{},actions:[s,bolt],rows:[{ability:'Stormstrike',target:'primary',conditions:[]},{ability:'Lightning Bolt',target:'primary',conditions:[]}]}).run();
 assert.deepEqual(r.events.filter(x=>x.type==='damage').map(x=>x.raw),[50,120,120,100]);assert.ok(r.events.some(x=>x.type==='aura-remove'&&x.id==='stormstrike-nature'&&x.reason==='consumed'));
});
