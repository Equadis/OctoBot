import {BUFF_CONFLICTS} from './buffs.mjs';
const mapped={flurry:{stat:'meleeHasteFactor',pct:3,durationMs:20000},quickness:{stat:'meleeHasteFactor',pct:5,durationMs:30000}};
export function compileBuffUses(audit,requests=[]){
 if(!Array.isArray(requests))throw Error('Explicit buff schedules required');
 const seen=new Set();
 return requests.map(r=>{
  const entry=audit.entries.find(e=>e.id===r.id),m=mapped[r.id];
  if(!entry?.eventEligible||!m||seen.has(r.id))throw Error('Selected eligible supported event buff required');
  seen.add(r.id);
  if(r.acknowledgeUnverified!==true||!Array.isArray(r.atMs)||!Number.isSafeInteger(r.cooldownMs)||r.cooldownMs<0)throw Error('Explicit event buff timing required');
  if(audit.entries.some(e=>e.active&&BUFF_CONFLICTS.some(pair=>pair.includes(e.id)&&pair.includes(r.id))))throw Error('Timed buff conflicts with static selected buff');
  if(r.id==='quickness'&&r.scope!=='melee-only')throw Error('Explicit Quickness melee-only reference scope required');
  return {id:'buff:'+r.id,source:entry.name,provenance:entry.source,trigger:'use',atMs:r.atMs,cooldownMs:r.cooldownMs,effect:{kind:'aura',durationMs:m.durationMs,modifiers:[{stat:m.stat,mode:'multiplyPct',value:m.pct}]}};
 });
}
