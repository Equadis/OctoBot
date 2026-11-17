import test from 'node:test';import assert from 'node:assert/strict';
import {CombatTimeline,CombatResources,Cooldowns,PeriodicEffects,attemptProc,seededRandom,scheduleResourceRegen,REFERENCE_PRIORITIES as P} from '../../docs/sim/core/combat-timeline.mjs';
test('priority and insertion order are stable; cancellation, end boundary and monotonic time',()=>{
 const t=new CombatTimeline(),log=[];t.schedule(100,P.decision,()=>log.push('decide'));t.schedule(100,P.tick,()=>log.push('tick1'));t.schedule(100,P.tick,()=>log.push('tick2'));const ticket=t.schedule(100,P.cast,()=>log.push('cancelled'));t.cancel(ticket);t.schedule(101,0,()=>log.push('later'));
 assert.deepEqual(t.runUntil(100),{time:100,processed:3,pending:1});assert.deepEqual(log,['tick1','tick2','decide']);assert.throws(()=>t.schedule(99,0,()=>{}));assert.throws(()=>t.runUntil(99));t.runUntil(101);assert.equal(log.at(-1),'later');
});
test('same-time callback can enqueue same or later priority but not earlier; limits stop loops',()=>{
 const t=new CombatTimeline(),log=[];t.schedule(0,10,()=>{assert.throws(()=>t.schedule(0,9,()=>{}));assert.throws(()=>t.runUntil(0));t.schedule(0,10,()=>log.push(2));log.push(1);});t.runUntil(0);assert.deepEqual(log,[1,2]);
 const repeat=()=>t.after(0,10,repeat);t.after(0,10,repeat);assert.throws(()=>t.runUntil(0,{maxEvents:5}),/Event limit/);assert.equal(t.pending,1);assert.equal(t.now,0);
});
test('cooldown and resource costs commit atomically, including shared cooldown and exact readiness',()=>{
 const t=new CombatTimeline(),r=new CombatResources(t,{mana:{current:70,max:100},energy:{current:30,max:100}});
 const costs=[{resource:'energy',delta:-40}],cd=[{id:'spell',duration:2000},{id:'gcd',duration:1500}];
 assert.equal(r.startAction({changes:costs,cooldowns:cd}).ok,false);assert.equal(r.cooldowns.ready('spell'),true);
 r.change([{resource:'energy',delta:20}]);assert.equal(r.startAction({changes:costs,cooldowns:cd}).ok,true);assert.equal(r.snapshot().energy.current,10);
 const fail=r.startAction({changes:[{resource:'mana',delta:-20}],cooldowns:[{id:'other',duration:1000},{id:'gcd',duration:1500}]});assert.equal(fail.ok,false);assert.equal(r.snapshot().mana.current,70);assert.equal(r.cooldowns.ready('other'),true);
 t.runUntil(1499);assert.equal(r.cooldowns.remaining('gcd'),1);t.runUntil(1500);assert.equal(r.cooldowns.ready('gcd'),true);assert.equal(r.cooldowns.ready('spell'),false);t.runUntil(2000);assert.equal(r.cooldowns.ready('spell'),true);
});
const aura=(id,log,other={})=>({id,durationMs:6000,intervalMs:2000,refresh:'restart',tickAtExpiry:true,tickPriority:P.tick,expirePriority:P.expire,snapshot:{damage:20},onTick:e=>log.push(['tick',e.time,e.snapshot.damage]),onExpire:e=>log.push(['expire',e.time]),...other});
test('periodic ticks include or exclude expiry explicitly; independent target identities',()=>{
 const t=new CombatTimeline(),p=new PeriodicEffects(t),log=[];p.apply(aura('a:target1',log));p.apply(aura('a:target2',log,{tickAtExpiry:false,snapshot:{damage:10}}));t.runUntil(6000);
 assert.deepEqual(log,[['tick',2000,20],['tick',2000,10],['tick',4000,20],['tick',4000,10],['tick',6000,20],['expire',6000],['expire',6000]]);assert.equal(p.has('a:target1'),false);assert.equal(t.pending,0);
});
test('refresh policies clip or preserve phase; snapshot and old callbacks never leak',()=>{
 const t=new CombatTimeline(),p=new PeriodicEffects(t),log=[],snapshot={damage:30};
 p.apply(aura('a',log));t.runUntil(1000);p.apply(aura('a',log,{refresh:'preserve-next-tick',snapshot}));snapshot.damage=999;t.runUntil(3000);
 assert.deepEqual(log,[['tick',2000,30]]);
 p.apply(aura('a',log,{refresh:'restart',snapshot:{damage:40}}));t.runUntil(5000);assert.deepEqual(log,[['tick',2000,30],['tick',5000,40]]);
 assert.equal(p.remove('a'),true);t.runUntil(10000);assert.equal(log.length,2);assert.equal(t.pending,0);
});
test('refresh inside tick does not duplicate ticks and same-time final tick precedes expiry',()=>{
 const t=new CombatTimeline(),p=new PeriodicEffects(t),log=[];
 p.apply(aura('a',log,{onTick:e=>{log.push(['first',e.time]);p.apply(aura('a',log,{refresh:'preserve-next-tick',durationMs:4000}));}}));
 t.runUntil(6000);assert.deepEqual(log,[['first',2000],['tick',4000,20],['tick',6000,20],['expire',6000]]);
});
test('explicit regen respects resource cap, overflow and no hidden extra ticks',()=>{
 const t=new CombatTimeline(),r=new CombatResources(t,{energy:{current:70,max:100}}),p=new PeriodicEffects(t),log=[];
 scheduleResourceRegen(p,r,{id:'energy',resource:'energy',amount:20,durationMs:6000,intervalMs:2000,priority:P.resource,tickAtExpiry:true,onTick:e=>log.push([e.time,e.result.overflow.energy])});t.runUntil(6000);
 assert.deepEqual(log,[[2000,0],[4000,10],[6000,20]]);assert.equal(r.snapshot().energy.current,100);assert.equal(t.pending,0);
});
test('seeded proc rolls replay, failed rolls do not start ICD and blocked rolls consume no RNG',()=>{
 const a=seededRandom(42),b=seededRandom(42);assert.deepEqual(Array.from({length:20},a),Array.from({length:20},b));
 const t=new CombatTimeline(),cd=new Cooldowns(t),spec={id:'proc',chance:.2,internalCooldownMs:1500};let rolls=0;const rng=()=>{rolls++;return .1;};
 assert.equal(attemptProc(cd,spec,()=>.9).triggered,false);assert.equal(cd.ready('proc'),true);assert.equal(attemptProc(cd,spec,rng).triggered,true);assert.equal(attemptProc(cd,spec,rng).reason,'Cooldown');assert.equal(rolls,1);
 t.runUntil(1500);assert.equal(attemptProc(cd,spec,rng).triggered,true);assert.equal(rolls,2);
});
test('invalid timing, probability, duplicate cooldowns and unknown resources fail closed',()=>{
 const t=new CombatTimeline(),p=new PeriodicEffects(t),cd=new Cooldowns(t),r=new CombatResources(t,{mana:{current:50,max:100}});
 assert.throws(()=>t.schedule(.5,0,()=>{}));assert.throws(()=>p.apply(aura('a',[],{intervalMs:0})));assert.throws(()=>p.apply(aura('a',[],{refresh:undefined})));assert.throws(()=>p.apply(aura('a',[],{expirePriority:10})));
 assert.throws(()=>cd.start([{id:'a',duration:1},{id:'a',duration:2}]));assert.throws(()=>attemptProc(cd,{id:'a',chance:1.1,internalCooldownMs:1},()=>0));assert.throws(()=>scheduleResourceRegen(p,r,{id:'x',resource:'rage',amount:1,durationMs:1,intervalMs:1,priority:0,tickAtExpiry:true}));assert.equal(t.pending,0);
});
