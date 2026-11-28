import {REFERENCE_PRIORITIES as P} from './combat-timeline.mjs';
export function validatePowerOverwhelming(p){
 if(!p||p.healthBasis!=='base-health'||p.activation!=='instant'||p.refresh!=='replace'||p.damagePct!==20||p.drainFraction!==.4||p.durationMs!==10000||!Number.isSafeInteger(p.tickMs)||p.tickMs<=0||p.durationMs%p.tickMs!==0||!Number.isFinite(p.basePetHealth)||p.basePetHealth<=0||!Number.isFinite(p.ownerRangeYards)||p.ownerRangeYards<=0||!Array.isArray(p.crowdControlNames)||new Set(p.crowdControlNames).size!==p.crowdControlNames.length||p.crowdControlNames.some(x=>typeof x!=='string'||!x.trim())||p.tickAtExpiry!==true)throw Error('Explicit Power Overwhelming base-health, crowd control and complete tick schedule required');
 return p;
}
export function createPowerOverwhelmingRuntime(owner,pet){
 let current=null;
 return {activate(e,p){
  validatePowerOverwhelming(p);
  if(!pet||!e.unit(owner).alive||!e.unit(pet).alive||p.basePetHealth>e.unit(pet).maxHealth)throw Error('Power Overwhelming requires a living demon and valid base health');
  const token={};current=token;
  for(const a of e.auras.active(pet,'debuff'))if(p.crowdControlNames.includes(a.name))e.auras.remove(a,'cleansed');
  e.auras.apply({id:'warlock:power-overwhelming',name:'Power Overwhelming',targetId:pet,ownerId:owner,kind:'buff',durationMs:10000,maxStacks:1,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh',modifiers:[{stat:'petDamageFactor',mode:'multiplyPct',value:20}]});
  const tick=p.basePetHealth*p.drainFraction/(p.durationMs/p.tickMs);
  for(let t=p.tickMs;t<=p.durationMs;t+=p.tickMs)e.timeline.schedule(e.timeline.now+t,P.tick,()=>{if(current!==token||!e.unit(pet).alive)return;e.damage({targetId:pet,actorId:pet,source:'Power Overwhelming (health drain)',value:tick,school:'shadow'});});
  e.recordMechanic('proc',{actorId:owner,targetId:pet,source:'Power Overwhelming',procId:'warlock:power-overwhelming:activated'});
 }};
}
