import test from 'node:test';import assert from 'node:assert/strict';
import {CombatEncounter} from '../../docs/sim/core/combat-execution.mjs';
import {createEquipmentRuntime} from '../../docs/sim/core/combat-equipment-runtime.mjs';
import {CombatTimeline,CombatResources,PeriodicEffects} from '../../docs/sim/core/combat-timeline.mjs';
import {CombatAuras} from '../../docs/sim/core/combat-auras.mjs';
const effect={id:'x',source:'Test item',provenance:'synthetic',trigger:'use',atMs:[0,100,2000],cooldownMs:1000,effect:{kind:'aura',durationMs:500,modifiers:[{stat:'attackPower',mode:'flat',value:50}]}};
function fixture(config,options){const timeline=new CombatTimeline(),events=[],e={timeline,periodic:new PeriodicEffects(timeline),resources:new CombatResources(timeline,{mana:{current:10,max:100}}),auras:new CombatAuras(timeline),unit:()=>({alive:true}),random:()=>0,recordMechanic:(type,d)=>events.push({type,...d})};const rt=createEquipmentRuntime(config,'p',e.resources.snapshot(),5000,options);rt.install(e);return {e,rt,events};}
test('scheduled equipment uses enforce cooldown and aura expiry',()=>{const {e,events}=fixture({effects:[effect]});e.timeline.runUntil(100);assert.equal(e.auras.stat('p','attackPower',100),150);assert.equal(events.length,1);e.timeline.runUntil(600);assert.equal(e.auras.stat('p','attackPower',100),100);e.timeline.runUntil(2000);assert.equal(events.length,2);});
test('critical proc requires owner source and enforces shared cooldown',()=>{const x={...effect,trigger:'critical',sources:['Strike'],chance:1,cooldownMs:0,sharedGroup:'g',sharedCooldownMs:1000,effect:{kind:'resource',resource:'mana',amount:20}};const {e,rt,events}=fixture({effects:[x,{...x,id:'y'}]});rt.attack(e,{actorId:'pet',source:'Strike',landed:true,critical:true});rt.attack(e,{actorId:'p',source:'Strike',landed:true,critical:false});assert.equal(events.length,0);rt.attack(e,{actorId:'p',targetId:'boss',source:'Strike',landed:true,critical:true});assert.equal(e.resources.snapshot().mana.current,30);assert.equal(events.filter(v=>v.type==='proc').length,1);});

test('research swap gates old and new equipment uses and preserves shared cooldown',()=>{const old={...effect,id:'old',loadout:'before',atMs:[0,2000],sharedGroup:'trinket',sharedCooldownMs:1500};const next={...effect,id:'new',loadout:'after',atMs:[500,1000,2000,3000],sharedGroup:'trinket',sharedCooldownMs:1500};const {e,events}=fixture({effects:[old,next],swap:{atMs:1000,mode:'vanish',confirmedCombatDrop:true,equipLockMs:500,auraPolicy:'retain'}});e.timeline.runUntil(3000);assert.deepEqual(events.map(x=>x.procId),['equipment:old','vanish','equipment:new']);});

test('replacement stat aura is applied at swap time',()=>{const {e}=fixture({effects:[],swap:{atMs:1000,mode:'vanish',confirmedCombatDrop:true,equipLockMs:500,auraPolicy:'retain',statModifiers:[{stat:'attackPower',mode:'flat',value:-20}]}});e.timeline.runUntil(999);assert.equal(e.auras.stat('p','attackPower',100),100);e.timeline.runUntil(1000);assert.equal(e.auras.stat('p','attackPower',100),80);});

test('equipment damage resolves separately without recursively triggering itself',()=>{const x={...effect,trigger:'landed',sources:['Strike','Test item'],chance:1,cooldownMs:0,effect:{kind:'damage',school:'fire',min:100,max:100,mitigation:.25,outcomes:[{name:'hit',probability:1,multiplier:1,landed:true}]}};const {e,rt,events}=fixture({effects:[x]});e.damage=d=>events.push({type:'damage',...d});const log=e.recordMechanic;e.recordMechanic=(type,d)=>{log(type,d);if(type==='attack-result')rt.attack(e,d);};rt.attack(e,{actorId:'p',targetId:'boss',source:'Strike',landed:true});e.timeline.runUntil(0);assert.equal(events.filter(v=>v.type==='damage')[0].value,75);assert.equal(events.filter(v=>v.type==='proc').length,1);});

test('periodic equipment damage refreshes rather than duplicating ticks',()=>{const x={...effect,trigger:'landed',sources:['Strike'],chance:1,cooldownMs:0,effect:{kind:'periodic-damage',school:'shadow',min:20,max:20,mitigation:0,outcomes:[{name:'hit',probability:1,multiplier:1,landed:true}],durationMs:3000,intervalMs:1000,refresh:'preserve-next-tick',tickAtExpiry:true}};const {e,rt,events}=fixture({effects:[x]});e.damage=d=>events.push({type:'damage',time:e.timeline.now,...d});const hit={actorId:'p',targetId:'boss',source:'Strike',landed:true};rt.attack(e,hit);e.timeline.runUntil(500);rt.attack(e,hit);e.timeline.runUntil(4000);assert.deepEqual(events.filter(v=>v.type==='damage').map(v=>v.time),[1000,2000,3000]);});
test('extra attacks use explicit hand callback without resetting scheduled swing',()=>{const x={...effect,trigger:'landed',sources:['Strike'],chance:1,cooldownMs:0,effect:{kind:'extra-attack',hand:'mainhand',count:2}};const calls=[];const {e,rt}=fixture({effects:[x]},{extraAttack:(enc,target,hand,source)=>calls.push([target,hand,source])});rt.attack(e,{actorId:'p',targetId:'boss',source:'Strike',landed:true});e.timeline.runUntil(0);assert.deepEqual(calls,[['boss','mainhand','Test item'],['boss','mainhand','Test item']]);});

test('equipment absorption uses explicit school and expiry with sampled capacity',()=>{const x={...effect,atMs:[0],effect:{kind:'absorb',min:50,max:80,durationMs:1000,schools:['physical']}};const {e}=fixture({effects:[x]});let shield;e.applyAbsorb=s=>shield=s;e.timeline.runUntil(0);assert.equal(shield.amount,50);assert.equal(shield.durationMs,1000);assert.deepEqual(shield.schools,['physical']);});
test('equipment life transfer passes leech basis through damage resolution',()=>{const x={...effect,trigger:'landed',sources:['Strike'],chance:1,cooldownMs:0,effect:{kind:'damage',school:'shadow',min:30,max:30,mitigation:0,outcomes:[{name:'hit',probability:1,multiplier:1,landed:true}],leech:{basis:'effective',fraction:1}}};const {e,rt}=fixture({effects:[x]});let damage;e.damage=d=>damage=d;rt.attack(e,{actorId:'p',targetId:'boss',source:'Strike',landed:true});e.timeline.runUntil(0);assert.deepEqual(damage.leech,{basis:'effective',fraction:1});});

test('compound proc executes all components under one cooldown and one proc record',()=>{const x={...effect,atMs:[0,100],effect:{kind:'compound',effects:[{kind:'resource',resource:'mana',amount:20},{kind:'aura',durationMs:500,modifiers:[{stat:'attackPower',mode:'flat',value:50}]}]}};const {e,events}=fixture({effects:[x]});e.timeline.runUntil(100);assert.equal(e.resources.snapshot().mana.current,30);assert.equal(e.auras.stat('p','attackPower',100),150);assert.equal(events.filter(v=>v.type==='proc').length,1);assert.throws(()=>fixture({effects:[{...x,effect:{kind:'compound',effects:[x.effect.effects[0],{kind:'resource',resource:'unknown',amount:1}]}}]}),/Unknown equipment resource/);});

test('incoming landed attack triggers recovery only inside explicit health gate',()=>{const x={...effect,trigger:'struck',sources:['Boss swing'],chance:1,cooldownMs:0,conditions:[{unit:'owner',kind:'health-at-most',percent:30}],effect:{kind:'resource',resource:'mana',amount:20}};const {e,rt}=fixture({effects:[x]});let hp=60;e.unit=()=>({alive:true,healthPercent:hp});const hit={actorId:'boss',targetId:'p',source:'Boss swing',landed:true};rt.struck(e,hit);assert.equal(e.resources.snapshot().mana.current,10);hp=25;rt.struck(e,{...hit,landed:false});assert.equal(e.resources.snapshot().mana.current,10);rt.struck(e,hit);assert.equal(e.resources.snapshot().mana.current,30);});

test('equipment stacking caps, preserves expiry and consumes charges on matching hits only',()=>{const x={...effect,trigger:'landed',sources:['Build'],chance:1,cooldownMs:0,effect:{kind:'aura',durationMs:1000,modifiers:[{stat:'attackPower',mode:'flat',value:10}],stacking:{maxStacks:3,stacks:1,stackPolicy:'add',refreshPolicy:'preserve'},consume:{trigger:'critical',sources:['Spend'],count:1}}};const {e,rt}=fixture({effects:[x]});const hit={actorId:'p',targetId:'boss',source:'Build',landed:true};rt.attack(e,hit);e.timeline.runUntil(200);for(let i=0;i<4;i++)rt.attack(e,hit);assert.equal(e.auras.stat('p','attackPower',100),130);rt.attack(e,{...hit,source:'Spend',critical:false});assert.equal(e.auras.stat('p','attackPower',100),130);rt.attack(e,{...hit,source:'Spend',critical:true});assert.equal(e.auras.stat('p','attackPower',100),120);e.timeline.runUntil(1000);assert.equal(e.auras.stat('p','attackPower',100),100);});

test('next eligible critical consumes only its own charge',()=>{const x={...effect,atMs:[0],effect:{kind:'aura',durationMs:1000,modifiers:[],guaranteedCrit:{sources:['Strike'],consume:'landed'}}};const {e,rt}=fixture({effects:[x]});e.timeline.runUntil(0);const base=[{name:'hit',probability:1,landed:true},{name:'crit',probability:0,landed:true}];const ev={actorId:'p',targetId:'boss',source:'Strike'};assert.equal(rt.critical(e,{...ev,source:'Other'},base),base);assert.equal(rt.critical(e,ev,base)[1].probability,1);rt.attack(e,{...ev,landed:false});assert.equal(rt.critical(e,ev,base)[1].probability,1);rt.attack(e,{...ev,landed:true,critical:true});assert.equal(rt.critical(e,ev,base),base);});

test('finisher proc scales with target combo points before spend and ignores absent point data',()=>{const x={...effect,trigger:'landed',sources:['Eviscerate'],chance:0,chancePerComboPoint:.05,cooldownMs:0,effect:{kind:'resource',resource:'mana',amount:10}};const {e,rt}=fixture({effects:[x]});e.random=()=>.2;const v={actorId:'p',targetId:'boss',source:'Eviscerate',landed:true};rt.attack(e,v);rt.attack(e,{...v,comboPointsBefore:4});assert.equal(e.resources.snapshot().mana.current,10);rt.attack(e,{...v,comboPointsBefore:5});assert.equal(e.resources.snapshot().mana.current,20);});

test('hand-specific equipment proc ignores other hand',()=>{const x={...effect,trigger:'landed',sources:['Swing'],hand:'mainhand',chance:1,cooldownMs:0,effect:{kind:'resource',resource:'mana',amount:20}};const {e,rt}=fixture({effects:[x]});const v={actorId:'p',targetId:'boss',source:'Swing',landed:true};rt.attack(e,{...v,hand:'offhand'});assert.equal(e.resources.snapshot().mana.current,10);rt.attack(e,{...v,hand:'mainhand'});assert.equal(e.resources.snapshot().mana.current,30);});

test('periodic restoration ticks, shared activation cooldown and expiry',()=>{const x={...effect,atMs:[0],effect:{kind:'periodic-restore',resource:'mana',amount:15,durationMs:3000,intervalMs:1000}};const {e}=fixture({effects:[x]});e.timeline.runUntil(999);assert.equal(e.resources.snapshot().mana.current,10);e.timeline.runUntil(3000);assert.equal(e.resources.snapshot().mana.current,55);e.timeline.runUntil(4000);assert.equal(e.resources.snapshot().mana.current,55);});

test('bandage stream is interrupted by effective incoming damage',()=>{const x={...effect,atMs:[0],effect:{kind:'periodic-restore',resource:'health',amount:10,durationMs:4000,intervalMs:1000,channel:true}};const {e,rt}=fixture({effects:[x]});let healed=0;e.heal=v=>healed+=v.value;e.timeline.runUntil(1000);assert.equal(healed,10);assert.equal(e.auras.stat('p','restorationChannel',0),1);rt.onDamage(e,{targetId:'p',effective:1});e.timeline.runUntil(4000);assert.equal(healed,10);assert.equal(e.auras.stat('p','restorationChannel',0),0);});

test('moving a trinket preserves its own cooldown across an equip lock',()=>{
 const cooldownKey='same equipped trinket effect';
 const old={...effect,id:'old',atMs:[0],loadout:'before',cooldownKey};
 const next={...effect,id:'new',atMs:[700,1000],loadout:'after',cooldownKey};
 const swap={atMs:500,mode:'vanish',confirmedCombatDrop:true,equipLockMs:100,auraPolicy:'remove'};
 const {e,events}=fixture({effects:[old,next],swap});
 e.timeline.runUntil(999);
 assert.deepEqual(events.map(x=>x.procId),['equipment:old','vanish']);
 e.timeline.runUntil(1000);
 assert.equal(events.at(-1).procId,'equipment:new');
 assert.throws(()=>fixture({effects:[old,{...next,cooldownMs:900}],swap}),/consistent individual cooldown/);
});

test('a companion critical charge preserves misses and is isolated to eligible pet damage',()=>{
 const x={...effect,atMs:[0],effect:{kind:'aura',recipient:'companion',durationMs:1000,modifiers:[],guaranteedCrit:{sources:['Bite'],consume:'landed'}}};
 const outcomes=[{name:'miss',probability:.25,multiplier:0,landed:false},{name:'hit',probability:.75,multiplier:1,landed:true},{name:'crit',probability:0,multiplier:2,landed:true}];
 const options={companion:{id:'pet',attackModels:[{source:'Bite',outcomes}]},enemyIds:['boss']};
 const {e,rt}=fixture({effects:[x]},options);
 e.timeline.runUntil(0);
 const ev={actorId:'pet',targetId:'boss',source:'Bite'};
 assert.equal(rt.critical(e,{...ev,actorId:'p'},outcomes),outcomes);
 assert.equal(rt.critical(e,{...ev,source:'Claw'},outcomes),outcomes);
 assert.deepEqual(rt.critical(e,ev,outcomes).map(o=>o.probability),[.25,0,.75]);
 rt.attack(e,{...ev,landed:false});
 assert.equal(rt.critical(e,ev,outcomes)[2].probability,.75);
 rt.attack(e,{...ev,landed:true});
 assert.equal(rt.critical(e,ev,outcomes),outcomes);
 assert.throws(()=>fixture({effects:[x]},{companion:{id:'pet',attackModels:[{source:'Claw',outcomes}]}}),/requires configured direct attack sources/);
});
