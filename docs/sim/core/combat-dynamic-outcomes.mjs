// Explicit reference redistribution: miss/hit and crit/hit only.
// Preserve avoidance, glances, blocks and conditional resistance bins.
export function adjustPhysicalOutcomes(outcomes,hitPct,critPct){
 if(!Number.isFinite(hitPct)||!Number.isFinite(critPct))throw Error('Finite dynamic hit and crit required');
 if(hitPct===0&&critPct===0)return outcomes;
 const r=outcomes.map(x=>({...x})),miss=r.find(x=>x.name==='miss'),hit=r.find(x=>x.name==='hit'),crit=r.find(x=>x.name==='crit');
 if(!miss||!hit||!crit||r.some(x=>x.resistedFraction!==undefined))throw Error('Dynamic physical modifiers require simple physical outcome table');
 const h=Math.max(-hit.probability,Math.min(miss.probability,hitPct/100));miss.probability-=h;hit.probability+=h;
 const k=Math.max(-crit.probability,Math.min(hit.probability,critPct/100));crit.probability+=k;hit.probability-=k;
 return r;
}
