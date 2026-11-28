import test from 'node:test';import assert from 'node:assert/strict';
import {CombatTimeline,REFERENCE_PRIORITIES as P} from '../../docs/sim/core/combat-timeline.mjs';
import {CombatAuras} from '../../docs/sim/core/combat-auras.mjs';
import {compileFireTotem,validateFireTotem,createFireTotemRuntime,fireTotemPulseRange} from '../../docs/sim/core/combat-shaman-fire-totems.mjs';
const hit=[{name:'hit',probability:1,multiplier:1,landed:true}];
const policy=(kind,overrides={})=>({kind,slot:'fire',targeting:'ordered-living-in-radius',threatRouting:'owner-reference',durationMs:kind==='fire-nova'?3000:8000,firstPulseMs:kind==='fire-nova'?3000:2000,intervalMs:2000,rangeYards:10,baseMin:40,baseMax:40,coefficient:0,damageFactor:1,threatFactor:1,outcomes:hit,cap:kind==='searing'?1:3,threat:null,...overrides});
test('Fire Totem talent combinations adjust Nova delay, Searing speed/range, Magma threat and critical damage',()=>{
 const b={talents:{227:2,229:3,232:2,253:1,236:5}};
 assert.equal(compileFireTotem(b,'shaman:fire-nova-totem',policy('fire-nova')).firstPulseMs,1000);
 const s=compileFireTotem(b,'shaman:searing-totem',policy('searing'));
 assert.equal(s.rangeYards,20);assert.equal(s.intervalMs,1667);assert.equal(s.damageFactor,1.25);
 const m=compileFireTotem(b,'shaman:magma-totem',policy('magma',{threatFactor:1,threat:{coefficient:1,flat:0,multipliers:[],distribution:'each'},outcomes:[{name:'crit',probability:1,multiplier:1.5,landed:true,critical:true}]}));
 assert.equal(m.threatFactor,.5);assert.deepEqual(m.threat.multipliers,[.5]);assert.equal(m.outcomes[0].multiplier,2);
 assert.throws(()=>compileFireTotem(b,'shaman:fire-nova-totem',policy('fire-nova',{firstPulseMs:1000,durationMs:1000})),/Invalid fire totem/);
 assert.throws(()=>validateFireTotem(policy('searing',{outcomes:[{name:'miss',probability:.5,multiplier:0,landed:false}]})),/Invalid totem pulse/);
});
test('One active fire totem: replacement cancels previously queued pulses, Magma hits nearby and Searing focuses owned Flame Shock',()=>{
 const timeline=new CombatTimeline(),auras=new CombatAuras(timeline),events=[];
 const e={timeline,auras,unit:id=>({alive:id!=='dead'}),recordMechanic:(kind,data)=>events.push({kind,...data,time:timeline.now})};
 const geometry={p:{boss:{distance:5},add:{distance:9},far:{distance:12},dead:{distance:2}}};
 const fire=createFireTotemRuntime({owner:'p',targetIds:['boss','add','far','dead'],geometry,priority:P.tick,resolve:(enc,id,action)=>events.push({kind:'pulse',target:id,source:action.abilityId,time:timeline.now})});
 fire.cast(e,{name:'Magma Totem',abilityId:'shaman:magma-totem',fireTotem:policy('magma')});
 timeline.runUntil(2000);assert.deepEqual(events.filter(x=>x.kind==='pulse').map(x=>x.target),['boss','add']);
 auras.apply({id:'flame-shock',name:'Flame Shock',ownerId:'p',targetId:'add',kind:'debuff',durationMs:15000,maxStacks:1,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh',modifiers:[]});
 timeline.runUntil(2500);
 fire.cast(e,{name:'Searing Totem',abilityId:'shaman:searing-totem',fireTotem:policy('searing')});
 timeline.runUntil(5000);assert.deepEqual(events.filter(x=>x.kind==='pulse').map(x=>[x.source,x.target]),[['shaman:magma-totem','boss'],['shaman:magma-totem','add'],['shaman:searing-totem','add']]);
 assert.deepEqual(auras.active('p','buff').map(x=>x.name),['Searing Totem']);
});
test('Fire Nova fires only after activation delay and vacates fire slot',()=>{
 const timeline=new CombatTimeline(),auras=new CombatAuras(timeline),hits=[];const e={timeline,auras,unit:()=>({alive:true}),recordMechanic:()=>{}},fire=createFireTotemRuntime({owner:'p',targetIds:['boss','add'],geometry:{p:{boss:{distance:5},add:{distance:15}}},priority:P.tick,resolve:(_,id)=>hits.push([id,timeline.now])});
 fire.cast(e,{name:'Fire Nova Totem',abilityId:'shaman:fire-nova-totem',fireTotem:policy('fire-nova')});timeline.runUntil(2999);assert.deepEqual(hits,[]);timeline.runUntil(3000);assert.deepEqual(hits,[['boss',3000]]);assert.equal(auras.active('p','buff').length,0);
});

test('fire totem pulse opts into active spell power and applies the exact ability aura',()=>{
 const timeline=new CombatTimeline(),auras=new CombatAuras(timeline);
 const action={abilityId:'shaman:searing-totem',fireTotem:policy('searing',{coefficient:.5})};
 auras.apply({id:'buff',targetId:'p',ownerId:'p',kind:'buff',durationMs:1000,maxStacks:1,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh',modifiers:[
  {stat:'fire',mode:'flat',value:20},{stat:'abilityDamageFactor:shaman:searing-totem',mode:'multiplyPct',value:50},
 ]});
 assert.equal(fireTotemPulseRange(auras,'p',action,100).min,135);
 action.fireTotem.spellPowerTiming='pulse';
 assert.equal(fireTotemPulseRange(auras,'p',action,100).min,150);
 timeline.runUntil(1000);
 assert.equal(fireTotemPulseRange(auras,'p',action,100).min,90);
});
