import test from 'node:test';import assert from 'node:assert/strict';
import {CombatEncounter} from '../../docs/sim/core/combat-execution.mjs';
import {scheduleResourceRegen,REFERENCE_PRIORITIES as P} from '../../docs/sim/core/combat-timeline.mjs';
const hit=(id,damage,extra={})=>({id,name:id,kind:'instant',castMs:0,costs:[],cooldowns:[{id:'gcd',duration:1000}],targets:['enemy'],resolve:(e,t)=>e.damage({targetId:t,value:damage,source:id}),...extra});
const row=(name,conditions=[],target='primary')=>({ability:name,conditions,target});
const condition=(metric,operator,value,aura='')=>({metric,operator,value,aura});
const fixture=(extra={})=>new CombatEncounter({durationMs:4000,decisionIntervalMs:100,seed:123,pools:{energy:{current:100,max:100}},units:[{id:'player',maxHealth:500},{id:'enemy',maxHealth:1000}],playerId:'player',primaryId:'enemy',targetIds:['enemy'],rows:[row('hit')],actions:[hit('hit',100)],...extra});
test('priority uses target health, GCD, cooldown, and real effective damage; no action at encounter boundary',()=>{
 const e=fixture({units:[{id:'player',maxHealth:500},{id:'enemy',maxHealth:300}],actions:[hit('finish',200),hit('hit',120)],rows:[row('finish',[condition('targetHealth','<=',40)]),row('hit')]});
 const r=e.run();assert.equal(r.durationMs,2000);assert.equal(r.finished,true);assert.equal(r.totals.enemyDamage,300);assert.equal(r.totals.overkill,140);assert.deepEqual(r.events.filter(x=>x.type==='action-start').map(x=>x.ability),['hit','hit','finish']);assert.equal(r.engineValidated,false);
 const timed=fixture().run();assert.equal(timed.totals.enemyDamage,400);assert.equal(timed.events.filter(x=>x.type==='action-start').at(-1).time,3000);
});
test('casts resolve at completion, auto-attacks have explicit casting policy and independent timing',()=>{
 const e=fixture({actions:[hit('spell',150,{kind:'cast',castMs:1500,cooldowns:[{id:'gcd',duration:1500}]})],rows:[row('spell')]});
 e.addAutoAttack({id:'mh',intervalMs:1000,firstAtMs:1000,castPolicy:'continue',resolve:(e,t)=>e.damage({targetId:t,value:20,source:'mh'})});
 e.addAutoAttack({id:'oh',intervalMs:1000,firstAtMs:500,castPolicy:'skip-during-cast',resolve:(e,t)=>e.damage({targetId:t,value:10,source:'oh'})});
 const r=e.run();assert.equal(r.events.filter(x=>x.type==='cast-complete').length,2);assert.equal(r.events.filter(x=>x.type==='auto-attack'&&x.id==='mh').length,4);assert.equal(r.events.filter(x=>x.type==='auto-skipped'&&x.id==='oh').length,3);assert.ok(r.events.some(x=>x.type==='cast-interrupted'&&x.reason==='time limit'));assert.equal(r.totals.enemyDamage,390);
});
test('resource starvation skips the expensive action, and regen enables it later',()=>{
 const e=fixture({pools:{energy:{current:0,max:100}},actions:[hit('costly',100,{costs:[{resource:'energy',delta:-40}]}),hit('filler',10)],rows:[row('costly'),row('filler')]});
 scheduleResourceRegen(e.periodic,e.resources,{id:'r',resource:'energy',amount:40,intervalMs:2000,durationMs:4000,priority:P.resource,tickAtExpiry:true});
 const r=e.run();assert.deepEqual(r.events.filter(x=>x.type==='action-start').map(x=>x.ability),['filler','filler','costly','filler']);assert.equal(r.resources.energy.current,40);
});
test('multi-target priority skips dead and ineligible targets; casts do not redirect on target death',()=>{
 const e=fixture({units:[{id:'player',maxHealth:500},{id:'enemy',maxHealth:100},{id:'add',maxHealth:500}],targetIds:['enemy','add'],actions:[hit('cast',80,{kind:'cast',castMs:1000}),hit('finish',100)],rows:[row('cast',[],'cycle')]});
 e.timeline.schedule(500,P.tick,()=>e.damage({targetId:'enemy',value:100,source:'external'}));const r=e.run();
 assert.ok(r.events.some(x=>x.type==='cast-failed'&&x.targetId==='enemy'));assert.ok(r.events.some(x=>x.type==='cast-complete'&&x.targetId==='add'));assert.equal(r.units.find(x=>x.id==='enemy').health,0);
});
test('heal targets and effective healing are tracked, dead units cannot be resurrected by ordinary heal',()=>{
 const e=fixture({units:[{id:'player',maxHealth:500},{id:'enemy',maxHealth:1000},{id:'ally',maxHealth:100,health:25},{id:'dead',maxHealth:100,health:0}],allyIds:['ally','dead'],actions:[hit('heal',0,{targets:['ally'],resolve:(e,t)=>e.heal({targetId:t,value:100,source:'heal'})}),hit('hit',10)],rows:[row('heal',[condition('allyHealth','<',100)],'ally'),row('hit')]});
 const r=e.run();assert.equal(r.totals.allyHealing,75);assert.equal(r.totals.overheal,25);assert.equal(r.units.find(x=>x.id==='dead').health,0);assert.ok(!r.events.some(x=>x.targetId==='dead'));
});
test('explicit interrupt cancels damage without implicit resource refund; unknown state and unsupported actions reject',()=>{
 const e=fixture({durationMs:1000,actions:[hit('cast',100,{kind:'cast',castMs:800,costs:[{resource:'energy',delta:-40}]})],rows:[row('cast')]});
 e.timeline.schedule(300,P.tick,()=>e.interrupt('fixture'));const r=e.run();assert.equal(r.totals.enemyDamage,0);assert.equal(r.resources.energy.current,60);assert.ok(r.events.some(x=>x.type==='cast-interrupted'));
 assert.throws(()=>fixture({rows:[row('missing')]}),/Unsupported rotation ability/);
 assert.throws(()=>fixture({rows:[row('hit',[condition('targetTimeToDie','>=',2)])]}).run(),/state unavailable/);
 assert.throws(()=>fixture({actions:[hit('hit',100,{kind:'channel'})]}),/Unsupported execution action kind/);
});
test('seeded synthetic encounters replay identically',()=>{
 const make=()=>fixture({actions:[hit('hit',0,{resolve:(e,t)=>e.damage({targetId:t,value:Math.floor(e.random()*100),source:'hit'})})]});
 assert.deepEqual(make().run(),make().run());
});

const channel=(id,extra={})=>hit(id,0,{kind:'channel',castMs:3000,tickMs:1000,tickAtEnd:true,cooldowns:[{id:'gcd',duration:3000}],onTick:(e,target)=>e.damage({targetId:target,value:30,source:id}),resolve:undefined,...extra});
const queue=(id,extra={})=>hit(id,70,{kind:'queued-melee',swingId:'mh',costs:[{resource:'energy',delta:-30}],cooldowns:[],...extra});
const auto=(e,extra={})=>e.addAutoAttack({id:'mh',intervalMs:1000,firstAtMs:1000,castPolicy:'continue',resolve:(e,t)=>e.damage({targetId:t,value:20,source:'white'}),...extra});
test('channels resolve ticks exactly once; final tick is optional and precedes completion',()=>{
 for(const [tickAtEnd,total] of [[true,90],[false,60]]){const e=fixture({durationMs:3000,actions:[channel('beam',{tickAtEnd})],rows:[row('beam')]});const r=e.run();assert.equal(r.totals.enemyDamage,total);assert.deepEqual(r.events.filter(x=>x.type==='channel-tick').map(x=>x.time),tickAtEnd?[1000,2000,3000]:[1000,2000]);assert.equal(r.events.at(-1).type,'channel-complete');}
});
test('channel interruption cancels future ticks including final tick; costs are not refunded',()=>{
 const e=fixture({durationMs:2500,actions:[channel('beam',{costs:[{resource:'energy',delta:-30}]})],rows:[row('beam')]});e.timeline.schedule(1500,P.resource,()=>e.interrupt('movement'));const r=e.run();assert.equal(r.totals.enemyDamage,30);assert.equal(r.resources.energy.current,70);assert.equal(r.events.filter(x=>x.type==='channel-interrupted').length,1);assert.ok(!r.events.some(x=>x.type==='channel-complete'));
});
test('queued strike replaces only its designated swing and spends at impact, not queue time',()=>{
 const e=fixture({durationMs:2000,actions:[queue('special')],rows:[row('special')]});auto(e);auto(e,{id:'oh',firstAtMs:500});let before;e.timeline.schedule(500,P.resource,()=>{before=e.resources.snapshot().energy.current});const r=e.run();assert.equal(before,100);assert.equal(r.resources.energy.current,40);assert.equal(r.totals.enemyDamage,180);assert.equal(r.events.filter(x=>x.type==='queued-attack').length,2);assert.equal(r.events.filter(x=>x.type==='auto-attack'&&x.id==='mh').length,0);
});
test('starved or cancelled queued attacks revert to white swings without duplicate costs',()=>{
 const e=fixture({durationMs:1000,actions:[queue('special')],rows:[row('special')]});auto(e);e.timeline.schedule(500,P.resource,()=>e.resources.change([{resource:'energy',delta:-100}]));const r=e.run();assert.equal(r.totals.enemyDamage,20);assert.equal(r.events.filter(x=>x.type==='queued-attack-failed').length,1);
 const c=fixture({durationMs:1000,actions:[queue('special')],rows:[row('special')]});auto(c);c.timeline.schedule(950,P.resource,()=>c.cancelQueuedAttack('mh'));const cr=c.run();assert.equal(cr.totals.enemyDamage,20);assert.equal(cr.resources.energy.current,100);
});
test('dynamic swing timings preserve fractional progress, reset, or affect only later swings',()=>{
 for(const [policy,expected] of [['preserve-progress',[750,1250,1750]],['reset',[1000,1500,2000]],['next-swing',[1000,1500,2000]]]){
  const e=fixture({durationMs:2000,actions:[hit('idle',0,{available:()=>false})],rows:[row('idle')]});auto(e);e.timeline.schedule(500,P.resource,()=>e.setSwingInterval('mh',500,policy));assert.deepEqual(e.run().events.filter(x=>x.type==='auto-attack').map(x=>x.time),expected);
 }
});
test('swing changes triggered inside a strike do not create duplicate attacks; due swing stays due',()=>{
 const e=fixture({durationMs:2000,actions:[hit('idle',0,{available:()=>false})],rows:[row('idle')]});auto(e,{resolve:(enc)=>enc.setSwingInterval('mh',500,'preserve-progress')});e.timeline.schedule(1000,P.resource,()=>e.setSwingInterval('mh',800,'reset'));assert.deepEqual(e.run().events.filter(x=>x.type==='auto-attack').map(x=>x.time),[1000,1500,2000]);
});
test('queued actions require matching configured swing and invalid timing policy is rejected',()=>{
 const e=fixture({actions:[queue('special')],rows:[row('special')]});assert.throws(()=>e.run(),/configured swing/);assert.throws(()=>fixture({actions:[channel('beam',{tickMs:0})],rows:[row('beam')]}),/channel requires/);const a=fixture();auto(a);assert.throws(()=>a.setSwingInterval('mh',500,'guess'),/Explicit swing/);
});
