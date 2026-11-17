import {seededRandom} from './combat-timeline.mjs';
export const STATISTICS_REVISION='octo-statistics-20261117-1';
const finite=(n,label)=>{if(!Number.isFinite(n))throw new Error(label+' must be finite');return n;};
const quantile=(sorted,p)=>{const i=(sorted.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return sorted[lo]+(sorted[hi]-sorted[lo])*(i-lo);};
// Welford sample variance; percentile uses linear interpolation. Normal CI
// applies to mean only and is suppressed at n<30 (not a prediction interval).
export function summarizeSamples(samples){
 if(!Array.isArray(samples)||!samples.length)throw new Error('Samples required');let mean=0,m2=0,n=0;
 for(const x of samples){finite(x,'Sample');n++;const delta=x-mean;mean+=delta/n;m2+=delta*(x-mean);}
 const sorted=[...samples].sort((a,b)=>a-b),variance=n>1?Math.max(0,m2/(n-1)):null,sd=variance===null?null:Math.sqrt(variance),se=sd===null?null:sd/Math.sqrt(n);
 return {n,mean,min:sorted[0],max:sorted.at(-1),median:quantile(sorted,.5),p05:quantile(sorted,.05),p95:quantile(sorted,.95),sampleVariance:variance,standardDeviation:sd,standardError:se,confidence95:n>=30?{lower:mean-1.96*se,upper:mean+1.96*se,method:'normal approximation for mean'}:null};
}
export function iterationSeeds(seed,iterations){if(!Number.isSafeInteger(iterations)||iterations<1||iterations>100000)throw new Error('Iterations must be 1–100000');const rng=seededRandom(seed),used=new Set(),out=[];while(out.length<iterations){const v=Math.floor(rng()*4294967296);if(!used.has(v)){out.push(v);used.add(v);}}return out;}
// The factory constructs a fresh encounter per seed. Failed iterations throw;
// no dropping results or treating missing metrics as zero.
export function runIterations({seed,iterations,createEncounter,metrics}){
 if(typeof createEncounter!=='function'||!metrics||typeof metrics!=='object'||!Object.keys(metrics).length||Object.values(metrics).some(x=>typeof x!=='function'))throw new Error('Explicit factory and metric selectors required');
 const seeds=iterationSeeds(seed,iterations),samples=Object.fromEntries(Object.keys(metrics).map(k=>[k,[]])),seen=new WeakSet();
 for(let i=0;i<seeds.length;i++){const encounter=createEncounter(seeds[i],i);if(!encounter||typeof encounter.run!=='function'||seen.has(encounter))throw new Error('Fresh encounter required per iteration');seen.add(encounter);const result=encounter.run();for(const [k,selector] of Object.entries(metrics))samples[k].push(finite(selector(result),'Metric '+k));}
 return {revision:STATISTICS_REVISION,seed,iterations,metrics:Object.fromEntries(Object.entries(samples).map(([k,v])=>[k,summarizeSamples(v)])),samples,engineValidated:false};
}
export function encounterRates(result,actorId){
 if(!Number.isFinite(result.durationMs)||result.durationMs<=0)throw new Error('Positive actual encounter duration required');const seconds=result.durationMs/1000;const d=finite(result.totals.enemyDamage,'Enemy damage'),h=finite(result.totals.allyHealing,'Ally healing');
 // Damage/healing are encounter-wide, not necessarily player-only. TPS is
 // gross generated threat for this explicit actor across all enemies.
 if(typeof actorId!=='string'||!actorId||!result.threat?.generated)throw new Error('Explicit threat actor and ledger required');
 return {encounterDps:d/seconds,encounterHps:h/seconds,actorGrossTps:(result.threat.generated[actorId]??0)/seconds};
}
export function pairedDifference(a,b){if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length||!a.length)throw new Error('Equal paired sample counts required');return summarizeSamples(a.map((x,i)=>finite(b[i],'B')-finite(x,'A')));}
