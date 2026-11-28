import test from 'node:test';import assert from 'node:assert/strict';import {compileRaidProviders,installRaidProviders} from '../../docs/sim/core/combat-raid-providers.mjs';import {CombatTimeline} from '../../docs/sim/core/combat-timeline.mjs';import {CombatAuras} from '../../docs/sim/core/combat-auras.mjs';
import {compileFriendlyProviders,installFriendlyProviders} from "../../docs/sim/core/combat-friendly-providers.mjs";
test('provider applies target-specific debuff on schedule and expires independently',()=>{const armour=[{id:'sunder',name:'Sunder',stat:'majorArmourReduction',amount:2250}],r={id:'sunder',providerId:'ally',targetId:'add',atMs:100,durationMs:200};const schedules=compileRaidProviders(armour,[],[r],['ally'],['boss','add'],1000);const timeline=new CombatTimeline(),auras=new CombatAuras(timeline);installRaidProviders({timeline,auras,unit:()=>({alive:true})},schedules);timeline.runUntil(100);assert.equal(auras.active('boss').length,0);assert.equal(auras.active('add')[0].ownerId,'ally');timeline.runUntil(300);assert.equal(auras.active('add').length,0);assert.throws(()=>compileRaidProviders(armour,[],[r,r],['ally'],['boss','add'],1000),/Duplicate/);assert.throws(()=>compileRaidProviders(armour,[],[],['ally'],['boss','add'],1000),/Every/);});

test('raid curses replace only landed curses from the same provider on the same target',()=>{
 const spells=[
  {id:'curse-shadow',name:'Shadow',modifiers:[{stat:'curse:shadow:damagePct',value:10,mode:'flat'}]},
  {id:'curse-elements',name:'Elements',modifiers:[{stat:'curse:fire:damagePct',value:10,mode:'flat'}]},
 ];
 const base={durationMs:500,rangeYards:30,distanceYards:30};
 const request=(id,providerId,targetId,atMs,more={})=>({...base,id,providerId,targetId,atMs,...more});
 const requests=[
  request('curse-shadow','a','boss',0),
  request('curse-shadow','b','boss',0),
  request('curse-shadow','a','add',0),
  request('curse-elements','a','boss',100,{distanceYards:31}),
  request('curse-elements','a','boss',200,{outcomes:[{name:'resist',landed:false,probability:1,multiplier:0}]}),
  request('curse-elements','a','boss',300),
 ];
 const timeline=new CombatTimeline(),auras=new CombatAuras(timeline);
 const compile=r=>compileRaidProviders([],spells,r,['a','b'],['boss','add'],1000,{cursePolicy:'replace-same-provider'});
 installRaidProviders({timeline,auras,random:()=>0,recordMechanic:()=>{},unit:()=>({alive:true})},compile(requests));
 const ids=target=>auras.active(target).map(a=>[a.ownerId,a.name]).sort();
 timeline.runUntil(299);
 assert.deepEqual(ids('boss'),[['a','Raid: Shadow'],['b','Raid: Shadow']]);
 timeline.runUntil(300);
 assert.deepEqual(ids('boss'),[['a','Raid: Elements'],['b','Raid: Shadow']]);
 assert.deepEqual(ids('add'),[['a','Raid: Shadow']]);
 assert.throws(()=>compile([{...requests[0],distanceYards:undefined},requests.at(-1)]),/distance and range/);
});

test('friendly raid buffs respect explicit membership, range, and companion owner eligibility',()=>{
 const request={scope:'raid',raid:['provider','owner','a','b','c','d'],id:'example-buff',providerId:'provider',includeCompanion:true,recipients:['owner','pet','d'],rangeYards:30,distances:{owner:30,pet:25,d:31},atMs:0,durationMs:500,modifiers:[{stat:'attackPower',mode:'flat',value:50}],provenance:'synthetic',acknowledgeUnverified:true};
 const compile=r=>compileFriendlyProviders([r],{entries:[]},['provider','a','b','c','d'],'owner',1000,'pet');
 const timeline=new CombatTimeline(),auras=new CombatAuras(timeline);
 installFriendlyProviders({timeline,auras,unit:()=>({alive:true})},compile(request));
 timeline.runUntil(0);
 assert.equal(auras.stat('pet','attackPower',100),150);
 assert.equal(auras.stat('owner','attackPower',100),150);
 assert.equal(auras.stat('d','attackPower',100),100);
 assert.throws(()=>compile({...request,includeCompanion:false}),/friendly provider policy/);
 assert.throws(()=>compile({...request,raid:['provider','d']}),/owner on the roster/);
});
