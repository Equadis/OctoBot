export const THREAT_REVISION='octo-threat-20261117-1';
const key=v=>{if(typeof v!=='string'||!v.trim())throw new TypeError('Nonempty threat identifier required');return v;};
const amount=(v,label)=>{if(!Number.isFinite(v)||v<0)throw new RangeError(label+' must be nonnegative');return v;};
const factor=(v,label)=>amount(v,label);
export function calculateThreat({effective,coefficient,flat,multipliers}){
 amount(effective,'Effective amount');factor(coefficient,'Coefficient');amount(flat,'Flat threat');if(!Array.isArray(multipliers))throw new Error('Explicit multipliers required');
 return (effective*coefficient+flat)*multipliers.reduce((n,x)=>n*factor(x,'Multiplier'),1);
}
// Enemy-specific actor ledger. No implicit healing split, stance, damage
// coefficient, threat cap, aggro threshold or taunt immunity.
export class ThreatLedger{
 #tables=new Map();#generated=new Map();#forced=new Map();#onChange;
 constructor(timeline,{enemyIds,actorIds,onChange=()=>{}}){this.timeline=timeline;this.enemies=new Set(enemyIds.map(key));this.actors=new Set(actorIds.map(key));this.#onChange=onChange;for(const id of this.enemies)this.#tables.set(id,new Map());}
 #table(enemyId,actorId){if(!this.enemies.has(enemyId)||actorId!==undefined&&!this.actors.has(actorId))throw new Error('Unknown threat enemy or actor');return this.#tables.get(enemyId);}
 current(enemyId,actorId){return this.#table(enemyId,actorId).get(actorId)||0;}
 #set(enemyId,actorId,value,kind){const t=this.#table(enemyId,actorId),before=t.get(actorId)||0;amount(value,'Threat');t.set(actorId,value);this.#onChange({kind,enemyId,actorId,before,after:value,delta:value-before});return value;}
 add({enemyId,actorId,value}){amount(value,'Threat gain');this.#table(enemyId,actorId);const current=this.current(enemyId,actorId)+value;amount(current,'Threat total');const generated=(this.#generated.get(actorId)||0)+value;amount(generated,'Generated threat');this.#generated.set(actorId,generated);return this.#set(enemyId,actorId,current,'gain');}
 // A damage or heal formula is explicit; distribution is caller-selected.
 apply({actorId,enemyIds,effective,coefficient,flat,multipliers,distribution}){
  if(!Array.isArray(enemyIds)||!enemyIds.length||new Set(enemyIds).size!==enemyIds.length||!['split','each'].includes(distribution))throw new Error('Explicit distinct threat targets and distribution required');
  for(const id of enemyIds)this.#table(id,actorId);const total=calculateThreat({effective,coefficient,flat,multipliers});amount(total,'Calculated threat');const value=distribution==='split'?total/enemyIds.length:total;
  for(const id of enemyIds)amount(this.current(id,actorId)+value,'Threat total');amount((this.#generated.get(actorId)||0)+value*enemyIds.length,'Generated threat');
  return enemyIds.map(enemyId=>({enemyId,value,after:this.add({enemyId,actorId,value})}));
 }
 reduce({enemyId,actorId,fraction}){if(!Number.isFinite(fraction)||fraction<0||fraction>1)throw new Error('Threat reduction fraction must be in [0,1]');return this.#set(enemyId,actorId,this.current(enemyId,actorId)*(1-fraction),'reduction');}
 transfer({enemyId,from,to,fraction}){if(from===to||!Number.isFinite(fraction)||fraction<0||fraction>1)throw new Error('Invalid threat transfer');const a=this.current(enemyId,from),b=this.current(enemyId,to),v=a*fraction;amount(b+v,'Threat total');this.#set(enemyId,from,a-v,'transfer-out');this.#set(enemyId,to,b+v,'transfer-in');return v;}
 clear(enemyId,actorId){return this.#set(enemyId,actorId,0,'clear');}
 taunt({enemyId,actorId,matchHighest,forcedMs}){const t=this.#table(enemyId,actorId);if(typeof matchHighest!=='boolean'||!Number.isSafeInteger(forcedMs)||forcedMs<0)throw new Error('Explicit taunt policy required');const until=this.timeline.now+forcedMs;if(!Number.isSafeInteger(until))throw new Error('Invalid taunt duration');if(matchHighest)this.#set(enemyId,actorId,Math.max(0,...t.values()),'taunt-match');if(forcedMs)this.#forced.set(enemyId,{actorId,until});else this.#forced.delete(enemyId);}
 selectTarget({enemyId,currentActorId=null,eligibleActorIds,thresholdByActor}){
  const t=this.#table(enemyId);if(!Array.isArray(eligibleActorIds)||new Set(eligibleActorIds).size!==eligibleActorIds.length)throw new Error('Explicit eligible actors required');for(const id of eligibleActorIds)this.#table(enemyId,id);
  const forced=this.#forced.get(enemyId);if(forced&&forced.until>this.timeline.now&&eligibleActorIds.includes(forced.actorId))return forced.actorId;
  const ranked=eligibleActorIds.map((id,i)=>({id,threat:t.get(id)||0,i})).sort((a,b)=>b.threat-a.threat||a.i-b.i);
  if(!eligibleActorIds.includes(currentActorId))return ranked.find(x=>x.threat>0)?.id??null;
  const current=t.get(currentActorId)||0;
  // Explicit pull thresholds (e.g. 1.1/1.3 Classic references) are supplied per challenger.
  for(const a of ranked){if(a.id===currentActorId)continue;const threshold=thresholdByActor?.[a.id];if(!Number.isFinite(threshold)||threshold<1)throw new Error('Explicit aggro threshold required');if(a.threat>current*threshold)return a.id;}
  return currentActorId;
 }
 snapshot(){return {actors:[...this.actors],enemies:Object.fromEntries([...this.#tables].map(([id,t])=>[id,Object.fromEntries(t)])),generated:Object.fromEntries(this.#generated),forced:Object.fromEntries([...this.#forced].filter(([,v])=>v.until>this.timeline.now).map(([k,v])=>[k,{...v}]))};}
}
