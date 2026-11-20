import {REFERENCE_PRIORITIES as P} from './combat-timeline.mjs';
import {installRaidArmour} from './combat-raid-armour.mjs';
import {installRaidSpells} from './combat-raid-spells.mjs';
import {sampleAttack} from './combat-attack-tables.mjs';
import {expectedOutcome} from './combat-math.mjs';

const curseAuraIds=new Set(['raid-armour:recklessness','raid-spell:curse-shadow','raid-spell:curse-elements']);
// Provider schedules use existing encounter allies, not extra autonomous combatants.
export function compileRaidProviders(armour,spells,requests,allies,targets,duration,{cursePolicy='independent'}={}){
 if(!['independent','replace-same-provider'].includes(cursePolicy))throw Error('Invalid raid provider curse policy');
 if(!Array.isArray(requests))throw Error('Explicit raid provider schedules required');
 const entries=new Map([...armour.map(x=>[x.id,{...x,type:'armour'}]),...spells.map(x=>[x.id,{...x,type:'spell'}])]),seen=new Set();
 const result=requests.map(r=>{
  const x=entries.get(r?.id);
  if(!x||!allies.includes(r.providerId)||!targets.includes(r.targetId)||!Number.isSafeInteger(r.atMs)||r.atMs<0||r.atMs>=duration||!Number.isSafeInteger(r.durationMs)||r.durationMs<=0)throw Error('Invalid selected raid provider schedule');
  if(r.rangeYards!==undefined||r.distanceYards!==undefined){
   if(!Number.isFinite(r.rangeYards)||r.rangeYards<0||!Number.isFinite(r.distanceYards)||r.distanceYards<0)throw Error('Explicit raid provider target distance and range required');
  }
  if(r.outcomes!==undefined){
   expectedOutcome({min:0,max:0,outcomes:r.outcomes});
   if(r.outcomes.some(o=>typeof o.landed!=='boolean'))throw Error('Explicit raid provider landed outcomes required');
  }
  const key=JSON.stringify([r.id,r.providerId,r.targetId,r.atMs]);
  if(seen.has(key))throw Error('Duplicate raid provider application');
  seen.add(key);
  return {...x,providerId:r.providerId,targetId:r.targetId,atMs:r.atMs,durationMs:r.durationMs,rangeYards:r.rangeYards,distanceYards:r.distanceYards,outcomes:r.outcomes,cursePolicy};
 });
 if([...entries.keys()].some(id=>!result.some(r=>r.id===id)))throw Error('Every migrated raid debuff requires a provider schedule');
 return result;
}
export function installRaidProviders(e,schedules){
 for(const r of schedules)e.timeline.schedule(r.atMs,P.resource,()=>{
  if(!e.unit(r.providerId).alive||!e.unit(r.targetId).alive||r.distanceYards>r.rangeYards)return;
  if(r.outcomes){
   const result=sampleAttack({min:0,max:0,outcomes:r.outcomes,random:e.random});
   e.recordMechanic('raid-provider-result',{actorId:r.providerId,targetId:r.targetId,source:r.name,...result});
   if(!result.landed)return;
  }
  if(r.cursePolicy==='replace-same-provider'&&['recklessness','curse-shadow','curse-elements'].includes(r.id)){
   const currentId=(r.type==='armour'?'raid-armour:':'raid-spell:')+r.id;
   for(const aura of e.auras.active(r.targetId,'debuff')){
    if(aura.ownerId===r.providerId&&aura.id!==currentId&&curseAuraIds.has(aura.id))e.auras.remove(aura,'raid-curse-replaced');
   }
  }
  const install=r.type==='armour'?installRaidArmour:installRaidSpells;
  install(e,[r],r.providerId,r.targetId,r.durationMs-1);
 });
}
