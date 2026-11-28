import {BUFF_CONFLICTS} from './buffs.mjs';
import {REFERENCE_PRIORITIES as P} from './combat-timeline.mjs';
// Explicit reference modifiers for timed external friendly buffs. Static selected
// buffs are rejected to avoid counting their benefit twice.
export function compileFriendlyProviders(requests,audit,allies,player,duration,companion=null){
 if(!Array.isArray(requests))throw Error('Explicit friendly provider schedules required');
 const members=new Set([player,...allies]),seen=new Set(),allowed=new Set(['attackPower','rangedAP','meleeHasteFactor','rangedHasteFactor','spellHasteFactor','meleeCritDeltaPct','rangedCritDeltaPct','spellCritDeltaPct','healingPower','spellPower','fire','frost','nature','shadow','arcane','holy','mp5Delta']);
 return requests.map(r=>{
  if(!r||typeof r.id!=='string'||!r.id||typeof r.provenance!=='string'||!r.provenance.trim()||r.acknowledgeUnverified!==true||!allies.includes(r.providerId))throw Error('Invalid explicit friendly provider policy');
  const scope=r.scope??'party',roster=scope==='party'?r.party:r.raid;
  if(!['party','raid'].includes(scope)||!Array.isArray(roster)||new Set(roster).size!==roster.length||roster.length>(scope==='party'?5:40)||!roster.includes(r.providerId)||roster.some(id=>!members.has(id))||(scope==='raid'?r.party!==undefined:r.raid!==undefined))throw Error('Invalid friendly provider roster');
  if(r.includeCompanion!==undefined&&typeof r.includeCompanion!=='boolean'||r.includeCompanion===true&&(!companion||!roster.includes(player)))throw Error('Explicit companion recipient requires its owner on the roster');
  const eligible=r.includeCompanion===true?[...roster,companion]:roster;
  if(!Array.isArray(r.recipients)||!r.recipients.length||new Set(r.recipients).size!==r.recipients.length||r.recipients.some(id=>!eligible.includes(id))||!Number.isSafeInteger(r.atMs)||r.atMs<0||r.atMs>=duration||!Number.isSafeInteger(r.durationMs)||r.durationMs<1||!Array.isArray(r.modifiers)||!r.modifiers.length||r.modifiers.some(m=>!m||!allowed.has(m.stat)||!['flat','addPct','multiplyPct'].includes(m.mode)||!Number.isFinite(m.value)||m.value<0))throw Error('Invalid explicit friendly provider policy');
  const companionStats=new Set(['attackPower','spellPower','meleeCritDeltaPct','spellCritDeltaPct']);
  const affectsCompanion=r.includeCompanion===true&&r.recipients.includes(companion);
  if((affectsCompanion&&r.modifiers.some(m=>!companionStats.has(m.stat)))||(r.recipients.some(id=>id!==companion)&&r.modifiers.some(m=>m.stat==='spellPower')))throw Error('Unsupported friendly provider stat for selected recipients');
  if(audit.entries.some(e=>e.id===r.id&&e.active))throw Error('Friendly provider duplicates static buff');
  const key=JSON.stringify([r.id,r.providerId,r.atMs]);
  if(seen.has(key))throw Error('Duplicate friendly provider application');
  seen.add(key);
  if(audit.entries.some(e=>e.active&&BUFF_CONFLICTS.some(pair=>pair.includes(e.id)&&pair.includes(r.id))))throw Error('Friendly provider conflicts with static buff');
  if(r.rangeYards!==undefined||r.distances!==undefined||scope==='raid'||r.includeCompanion===true){
   if(!Number.isFinite(r.rangeYards)||r.rangeYards<0||r.recipients.some(id=>!Object.hasOwn(r.distances??{},id)||!Number.isFinite(r.distances[id])||r.distances[id]<0))throw Error('Explicit friendly provider recipient distances required');
  }
  if(r.talentMultiplier!==undefined&&(!Number.isFinite(r.talentMultiplier)||r.talentMultiplier<0))throw Error('Invalid provider talent multiplier');
  return {...r,scope,modifiers:r.modifiers.map(m=>({...m,value:m.value*(r.talentMultiplier??1)}))};
 });
}
export function installFriendlyProviders(e,schedules){for(const r of schedules)e.timeline.schedule(r.atMs,P.resource,()=>{if(!e.unit(r.providerId).alive)return;for(const targetId of r.recipients){if(!e.unit(targetId).alive||r.rangeYards!==undefined&&r.distances[targetId]>r.rangeYards)continue;for(const a of e.auras.active(targetId,'buff'))if(a.id.startsWith('friendly:')&&BUFF_CONFLICTS.some(pair=>pair.includes(r.id)&&pair.includes(a.id.slice(9))))e.auras.remove(a,'exclusive-replacement');e.auras.apply({id:'friendly:'+r.id,name:r.id,ownerId:r.providerId,targetId,kind:'buff',durationMs:r.durationMs,maxStacks:1,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh',exclusiveGroup:'friendly:'+r.id,modifiers:r.modifiers});}});}
