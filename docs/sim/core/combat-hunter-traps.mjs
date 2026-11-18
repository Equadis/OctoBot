import {expectedOutcome} from './combat-math.mjs';
const n=(v,k,min=0,max=Infinity)=>{if(!Number.isFinite(v)||v<min||v>max)throw new Error('Explicit trap '+k+' required');return v;};
const i=(v,k,min=0,max=Infinity)=>{if(!Number.isSafeInteger(v)||v<min||v>max)throw new Error('Explicit trap '+k+' required');return v;};
const talent=(b,id,max)=>i(Number(b.talents?.[String(id)]??0),'talent '+id,0,max);
const outcomes=(o,k)=>{if(!Array.isArray(o)||!o.length||o.some(x=>typeof x.landed!=='boolean'))throw new Error('Explicit trap '+k+' outcomes required');expectedOutcome({min:0,max:0,outcomes:o});return o;};
export function compileFireTrap(build,rank,policy){
 const p=policy.fireTrapModel,explosive=rank.abilityId==='hunter:explosive-trap';
 if(build.classId!=='hunter'||!p||!['hunter:immolation-trap','hunter:explosive-trap'].includes(rank.abilityId))throw new Error('Explicit Hunter fire trap model required');
 const untamed=talent(build,411,1),resourcefulnessRank=talent(build,393,5),masteryRank=talent(build,407,3),planningRank=talent(build,399,2);
 if(talent(build,403,2)&&p.acknowledgeMissingNettle!==true)throw new Error('Stinging Nettle requires explicit incomplete-effect acknowledgement');
 const durationMs=i(p.durationMs,'periodic duration',1),intervalMs=i(p.tickMs,'tick interval',1,durationMs),lifetimeMs=i(p.lifetimeMs,'lifetime',1);
 if(durationMs%intervalMs||policy.tickAtExpiry!==true||!['restart','preserve-next-tick'].includes(policy.refresh)||!['snapshot','dynamic'].includes(policy.snapshot)||!['block','replace'].includes(p.pendingPolicy)||typeof p.prepullAtZero!=='boolean'||p.resistancePolicy!=='explicit-post-talent'||!['independent','initial-landed'].includes(p.applicationPolicy)||(!explosive&&p.applicationPolicy!=='independent'))throw new Error('Explicit fire trap tick, application, placement and resistance policy required');
 if(p.triggerDelayMs!==null)i(p.triggerDelayMs,'trigger delay');
 if(p.targeting!==(explosive?'static-anchor-nearby':'single-anchor'))throw new Error('Explicit fire trap target membership required');
 const cap=i(p.cap,'target cap',1,explosive?40:1),placementRange=n(p.placementRange,'placement range',.01),sharedCooldownMs=i(p.sharedCooldownMs,'shared cooldown',1);
 if(!Number.isFinite(policy.cooldownMs)||policy.cooldownMs<=0)throw new Error('Explicit positive fire trap cooldown required');
 const tick=n(p.totalPeriodic,'total periodic damage')/(durationMs/intervalMs),ap=n(p.periodicAPPerTick,'AP per tick'),applicationOutcomes=outcomes(p.applicationOutcomes,'application'),tickOutcomes=outcomes(p.tickOutcomes,'tick');
 const effect=(kind,min,max,coef,o)=>({kind,when:'always',school:'fire',formula:{min,max,terms:[{stat:'attackPower',coefficient:untamed?coef:0}],multiplier:1},outcomes:o,mitigation:0,flatReduction:0,threat:null});
 const effects=[];
 if(explosive)effects.push(effect('damage',n(p.initialMin,'initial min'),n(p.initialMax,'initial max',p.initialMin),n(p.initialAPCoefficient,'initial AP coefficient'),outcomes(p.initialOutcomes,'initial')));
 effects.push({...effect('periodic-damage',tick,tick,ap,tickOutcomes),when:p.applicationPolicy==='initial-landed'?'landed':'always',reusePreviousHit:p.applicationPolicy==='initial-landed',applicationOutcomes,durationMs,intervalMs,refresh:policy.refresh,snapshot:policy.snapshot,tickAtExpiry:true,auraName:explosive?'Explosive Trap':'Immolation Trap'});
 return {untamed,resourcefulnessRank,masteryRank,placementRange,sharedCooldownMs,effects,runtime:{lifetimeMs,triggerDelayMs:p.triggerDelayMs,cap,targeting:p.targeting,pendingPolicy:p.pendingPolicy,inCombat:!!untamed,prepullAtZero:p.prepullAtZero,planningBonus:[0,.13,.25][planningRank]}};
}
