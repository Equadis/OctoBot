import {REFERENCE_PRIORITIES as P} from './combat-timeline.mjs';
import {installRaidArmour} from './combat-raid-armour.mjs';
import {installRaidSpells} from './combat-raid-spells.mjs';
// Provider schedules use existing encounter allies, not extra autonomous combatants.
export function compileRaidProviders(armour,spells,requests,allies,targets,duration){
 if(!Array.isArray(requests))throw Error('Explicit raid provider schedules required');
 const entries=new Map([...armour.map(x=>[x.id,{...x,type:'armour'}]),...spells.map(x=>[x.id,{...x,type:'spell'}])]),seen=new Set();
 const result=requests.map(r=>{const x=entries.get(r.id);if(!x||!allies.includes(r.providerId)||!targets.includes(r.targetId)||!Number.isSafeInteger(r.atMs)||r.atMs<0||r.atMs>=duration||!Number.isSafeInteger(r.durationMs)||r.durationMs<=0)throw Error('Invalid selected raid provider schedule');const key=JSON.stringify([r.id,r.providerId,r.targetId,r.atMs]);if(seen.has(key))throw Error('Duplicate raid provider application');seen.add(key);return {...x,providerId:r.providerId,targetId:r.targetId,atMs:r.atMs,durationMs:r.durationMs};});
 if([...entries.keys()].some(id=>!result.some(r=>r.id===id)))throw Error('Every migrated raid debuff requires a provider schedule');
 return result;
}
export function installRaidProviders(e,schedules){for(const r of schedules)e.timeline.schedule(r.atMs,P.resource,()=>{if(!e.unit(r.providerId).alive||!e.unit(r.targetId).alive)return;const install=r.type==='armour'?installRaidArmour:installRaidSpells;install(e,[r],r.providerId,r.targetId,r.durationMs-1);});}
