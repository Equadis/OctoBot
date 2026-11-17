import {attributedActorRates} from './combat-attribution.mjs';
import {encounterRates,runIterations,pairedDifference} from './combat-statistics.mjs';
const finite=(x,n)=>{if(!Number.isFinite(x))throw new Error('Invalid '+n);return x;};
const entry=()=>({damage:0,healing:0,overkill:0,overheal:0,absorbed:0,grossThreat:0,unknownThreatEvents:0,attacks:0,landed:0,crits:0,outcomes:{},procs:0,resourceChanges:{}});
const add=(map,k,n)=>{if(!Object.hasOwn(map,k))map[k]=0;map[k]+=n;};
export function combatReport(result){
 if(!result?.attribution||!Array.isArray(result.events)||!Number.isFinite(result.durationMs)||result.durationMs<=0)throw new Error('Complete positive-duration encounter required');
 const byActor=new Map(),unattributed=entry(),seconds=result.durationMs/1000;
 const row=(actor,source)=>{if(actor==null)return unattributed;if(!Object.hasOwn(result.attribution.actors,actor))throw new Error('Unknown result actor');if(!byActor.has(actor))byActor.set(actor,new Map());const a=byActor.get(actor);if(!a.has(source))a.set(source,entry());return a.get(source);};
 for(const e of result.events){
  if(!['damage','heal','attack-result','proc','resource-change','absorb'].includes(e.type))continue;
  const s=e.source;if(typeof s!=='string'||!s)throw new Error('Missing result source');const r=row(e.actorId,s);
  if(e.type==='damage'||e.type==='heal'){
   if(e.type==='damage'){r.damage+=finite(e.effective,'effective damage');r.overkill+=finite(e.overkill,'overkill');}
   else{r.healing+=finite(e.effective,'effective healing');r.overheal+=finite(e.overheal,'overheal');}
   if(e.generatedThreat==null)r.unknownThreatEvents++;else r.grossThreat+=finite(e.generatedThreat,'generated threat');
  }else if(e.type==='attack-result'){
   r.attacks++;if(e.landed===true)r.landed++;if(e.critical===true&&e.landed===true)r.crits++;add(r.outcomes,e.outcome,1);
  }else if(e.type==='absorb')r.absorbed+=finite(e.amount,'absorbed damage');
  else if(e.type==='proc')r.procs++;
  else if(e.type==='resource-change'){
   if(!Object.hasOwn(r.resourceChanges,e.resource))r.resourceChanges[e.resource]={gain:0,spent:0,overflow:0};
   const q=r.resourceChanges[e.resource],delta=finite(e.delta,'resource delta');if(delta>0)q.gain+=delta;else q.spent-=delta;q.overflow+=finite(e.overflow??0,'overflow');
  }
 }
 const actorReports={};for(const actor of Object.keys(result.attribution.actors)){
  const a=byActor.get(actor)||new Map();const rows=Object.fromEntries(a);
  const generated=Object.values(rows).reduce((n,r)=>n+r.grossThreat,0),ledger=result.threat?.generated?.[actor]??0;
  const threatActor=result.threat?.actors?.includes(actor);
  actorReports[actor]={rates:{...attributedActorRates(result,actor),grossTps:threatActor?encounterRates(result,actor).actorGrossTps:null},bySource:rows,unallocatedThreat:threatActor?ledger-generated:null,threatSourceComplete:threatActor&&Math.abs(ledger-generated)<1e-9&&Object.values(rows).every(r=>r.unknownThreatEvents===0)};
 }
 return {durationSeconds:seconds,engineValidated:false,actors:actorReports,unattributed,auras:result.auras,events:result.events.length};
}
// A scenario factory must build a new encounter for each paired seed.
// Statistical comparisons never use tests to assert server validation.
export function compareScenarios({seed,iterations,baseline,variant,metrics}){
 const a=runIterations({seed,iterations,createEncounter:baseline,metrics}),b=runIterations({seed,iterations,createEncounter:variant,metrics});
 return {seed,iterations,baseline:a.metrics,variant:b.metrics,difference:Object.fromEntries(Object.keys(metrics).map(k=>[k,pairedDifference(a.samples[k],b.samples[k])])),engineValidated:false};
}
export function estimateStatWeights({seed,iterations,baseline,variants,metric}){
 if(typeof metric!=='function'||!Array.isArray(variants)||!variants.length)throw new Error('Explicit metric and perturbations required');
 const a=runIterations({seed,iterations,createEncounter:baseline,metrics:{value:metric}});
 const weights={};
 for(const v of variants){if(typeof v.stat!=='string'||!v.stat||Object.hasOwn(weights,v.stat)||!Number.isFinite(v.delta)||v.delta===0||typeof v.createEncounter!=='function')throw new Error('Invalid stat perturbation');
  const b=runIterations({seed,iterations,createEncounter:v.createEncounter,metrics:{value:metric}});
  const paired=pairedDifference(a.samples.value,b.samples.value);
  weights[v.stat]={delta:v.delta,weight:paired.mean/v.delta,comparison:paired,confidence95:paired.confidence95?{lower:Math.min(paired.confidence95.lower/v.delta,paired.confidence95.upper/v.delta),upper:Math.max(paired.confidence95.lower/v.delta,paired.confidence95.upper/v.delta)}:null};
 }
 return {seed,iterations,baseline:a.metrics.value,weights,engineValidated:false};
}
