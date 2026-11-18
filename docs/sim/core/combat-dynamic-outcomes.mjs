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

// Reweight conditional resistance bins after changing the independent spell
// miss roll; then redistribute hit/crit within each nonbinary bin.
export function adjustSpellOutcomes(outcomes,hitPct,critPct){
 if(!Number.isFinite(hitPct)||!Number.isFinite(critPct))throw Error('Finite dynamic spell hit and crit required');
 if(hitPct===0&&critPct===0)return outcomes;
 const r=outcomes.map(x=>({...x})),miss=r.find(x=>x.name==='miss');
 if(!miss||r.filter(x=>x.name==='miss').length!==1||r.some(x=>x!==miss&&!Number.isFinite(x.resistedFraction)))throw Error('Dynamic spell modifiers require explicit spell outcome bins');
 const old=1-miss.probability;if(old<=0)throw Error('Cannot recover conditional spell outcomes from guaranteed miss');
 miss.probability=Math.max(0,Math.min(1,miss.probability-hitPct/100));
 const scale=(1-miss.probability)/old;
 const bins=new Map();
 for(const x of r){if(x===miss)continue;x.probability*=scale;if(x.resistedFraction===1){if(x.landed)throw Error('Invalid full resistance');continue;}if(!x.landed)throw Error('Invalid landed spell bin');const bin=bins.get(x.resistedFraction)??{};const k=x.critical?'crit':'hit';if(bin[k])throw Error('Duplicate spell outcome bin');bin[k]=x;bins.set(x.resistedFraction,bin);}
 for(const {hit,crit} of bins.values()){if(!hit||!crit)throw Error('Incomplete spell crit bin');const total=hit.probability+crit.probability;const delta=Math.max(-crit.probability,Math.min(hit.probability,total*critPct/100));crit.probability+=delta;hit.probability-=delta;}
 return r;
}
