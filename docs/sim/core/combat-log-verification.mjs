// Normalized, explicitly attributed observations. Unknown events must remain
// in the capture's rejected list rather than being converted to zero damage.
// No assertion that every OctoWoW 1.12 combat text line matches this schema.
import {summarizeSamples} from './combat-statistics.mjs';
const validTypes=new Set(['damage','heal','attack-result','proc','resource-change']);
const requiredString=(x,k)=>{if(typeof x!=='string'||!x.trim())throw new Error('Invalid '+k);return x;};
const amount=(x,k)=>{if(!Number.isFinite(x)||x<0)throw new Error('Invalid '+k);return x;};
export function importNormalizedCombatLog(input){
 if(!input||input.schema!=='octosim-combat-log-v1'||!Array.isArray(input.events)||!Array.isArray(input.rejected))throw new Error('Explicit normalized log schema required');
 const durationMs=amount(input.durationMs,'duration');if(!durationMs)throw new Error('Positive log duration required');
 requiredString(input.source,'source');
 const actorIds=new Set(input.actorIds||[]),targetIds=new Set(input.targetIds||[]);
 if(!actorIds.size||!targetIds.size)throw new Error('Explicit actor and target identities required');
 const out=[];let previous=-1;
 for(const e of input.events){
  if(!validTypes.has(e.type))throw new Error('Unrecognized normalized event type');
  if(!Number.isSafeInteger(e.time)||e.time<0||e.time>durationMs||e.time<previous)throw new Error('Invalid event timing/order');
  previous=e.time;if(!actorIds.has(e.actorId))throw new Error('Unknown event actor');requiredString(e.source,'ability source');
  if(['damage','heal','attack-result','proc'].includes(e.type)&&!targetIds.has(e.targetId))throw new Error('Unknown event target');
  if(e.type==='damage'||e.type==='heal'){amount(e.raw,'raw');amount(e.effective,'effective');const excess=amount(e.type==='damage'?e.overkill:e.overheal,'excess');if(Math.abs(e.raw-e.effective-excess)>1e-8)throw new Error('Raw does not reconcile with effective and excess');}
  if(e.type==='attack-result'){requiredString(e.outcome,'outcome');if(typeof e.landed!=='boolean'||typeof e.critical!=='boolean')throw new Error('Explicit outcome flags required');}
  if(e.type==='proc')requiredString(e.procId,'proc identity');
  if(e.type==='resource-change'){requiredString(e.resource,'resource');if(!Number.isFinite(e.delta))throw new Error('Invalid resource change');amount(e.overflow??0,'overflow');}
  out.push(structuredClone(e));
 }
 return {schema:input.schema,source:input.source,durationMs,actorIds:[...actorIds],targetIds:[...targetIds],events:out,rejected:structuredClone(input.rejected),complete:input.rejected.length===0};
}
export function summarizeObservedLog(log,actorId,source){
 if(!log.actorIds.includes(actorId))throw new Error('Unknown comparison actor');
 const rows=log.events.filter(e=>e.actorId===actorId&&(source==null||e.source===source));
 const damage=rows.filter(e=>e.type==='damage'),heal=rows.filter(e=>e.type==='heal'),hits=rows.filter(e=>e.type==='attack-result'),procs=rows.filter(e=>e.type==='proc');
 const seconds=log.durationMs/1000,outcomes={};for(const h of hits)outcomes[h.outcome]=(outcomes[h.outcome]||0)+1;
 return {actorId,source:source??null,complete:log.complete,seconds,damage:damage.length?summarizeSamples(damage.map(e=>e.raw)):null,healing:heal.length?summarizeSamples(heal.map(e=>e.raw)):null,observedDps:log.complete?damage.reduce((n,e)=>n+e.effective,0)/seconds:null,observedHps:log.complete?heal.reduce((n,e)=>n+e.effective,0)/seconds:null,outcomes,attempts:hits.length,critFraction:hits.length?hits.filter(e=>e.critical&&e.landed).length/hits.length:null,landedFraction:hits.length?hits.filter(e=>e.landed).length/hits.length:null,procCount:procs.length,intervalsMs:damage.slice(1).map((e,i)=>e.time-damage[i].time)};
}
export function compareObservedMetric({observed,simulated,absoluteTolerance,relativeTolerance,minimumSamples,complete}){
 if(!complete)return {status:'incomplete-observation',withinTolerance:null};
 amount(absoluteTolerance,'absolute tolerance');amount(relativeTolerance,'relative tolerance');if(!Number.isSafeInteger(minimumSamples)||minimumSamples<1)throw new Error('Explicit minimum sample count required');
 if(!observed||!simulated||!Number.isFinite(observed.mean)||!Number.isFinite(simulated.mean)||observed.n<minimumSamples||simulated.n<minimumSamples)return {status:'insufficient-samples',withinTolerance:null};
 const difference=simulated.mean-observed.mean,tolerance=Math.max(absoluteTolerance,Math.abs(observed.mean)*relativeTolerance);
 return {status:Math.abs(difference)<=tolerance?'within-tolerance':'discrepancy',withinTolerance:Math.abs(difference)<=tolerance,difference,tolerance,relativeDifference:observed.mean?difference/observed.mean:null,liveVerified:false};
}
