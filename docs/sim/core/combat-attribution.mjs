// Explicit event attribution. Unknown actors stay unassigned; source labels never imply ownership.
export const ATTRIBUTION_REVISION='octo-attribution-20261117-1';
export function aggregateCombatAttribution(events,{unitIds,targetIds}){
 const known=new Set(unitIds),enemies=new Set(targetIds);
 const newTotals=()=>({damage:0,enemyDamage:0,overkill:0,healing:0,allyHealing:0,overheal:0,damageEvents:0,enemyDamageEvents:0,healingEvents:0,allyHealingEvents:0});
 const newActor=()=>({totals:newTotals(),sources:new Map()});
 const actors=new Map([...known].map(id=>[id,newActor()])),unattributed=newActor();
 const update=(t,e)=>{
   for(const v of [e.effective,e.type==='damage'?e.overkill:e.overheal])if(!Number.isFinite(v)||v<0)throw new Error('Invalid effective or excess amount');
   if(e.type==='damage'){t.damage+=e.effective;t.overkill+=e.overkill;t.damageEvents++;if(enemies.has(e.targetId)){t.enemyDamage+=e.effective;t.enemyDamageEvents++;}}
   else{t.healing+=e.effective;t.overheal+=e.overheal;t.healingEvents++;if(!enemies.has(e.targetId)){t.allyHealing+=e.effective;t.allyHealingEvents++;}}
 };
 for(const e of events){
  if(e.type!=='damage'&&e.type!=='heal')continue;
  if(!known.has(e.targetId))throw new Error('Unknown attribution target');
  if(typeof e.source!=='string'||!e.source.trim())throw new Error('Explicit attribution source required');
  if(e.actorId!=null&&!known.has(e.actorId))throw new Error('Unknown attribution actor');
  const actor=e.actorId==null?unattributed:actors.get(e.actorId);
  if(!actor.sources.has(e.source))actor.sources.set(e.source,newTotals());
  update(actor.totals,e);update(actor.sources.get(e.source),e);
 }
 const out=a=>({totals:a.totals,bySource:Object.fromEntries(a.sources)});
 return {actors:Object.fromEntries([...actors].map(([id,a])=>[id,out(a)])),unattributed:out(unattributed),complete:{damage:unattributed.totals.enemyDamageEvents===0,healing:unattributed.totals.allyHealingEvents===0}};
}
export function attributedActorRates(result,actorId){
 if(!Number.isFinite(result.durationMs)||result.durationMs<=0)throw new Error('Positive actual encounter duration required');
 const a=result.attribution;if(!a||!Object.hasOwn(a.actors,actorId))throw new Error('Explicit known actor required');
 const t=a.actors[actorId].totals,seconds=result.durationMs/1000;
 return {actorDps:a.complete.damage?t.enemyDamage/seconds:null,actorHps:a.complete.healing?t.allyHealing/seconds:null,attributionComplete:{...a.complete}};
}
