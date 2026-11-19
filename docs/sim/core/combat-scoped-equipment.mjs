// Apply only unconditioned exact ability scopes from the existing equipment audit.
export function applyCompiledEquipment(action,abilityName,rows){
 const matched=rows.filter(r=>r.active&&!Object.keys(r.condition??{}).length&&r.scope.toLowerCase()===abilityName.toLowerCase());
 const sum=k=>matched.filter(r=>r.stat===k).reduce((n,r)=>n+r.amount,0);
 const reduce=(n,flat,pct)=>Math.max(0,n-flat)*Math.max(0,1-pct/100);
 const effects=action.effects??[], damage=effects.some(e=>['damage','periodic-damage'].includes(e.kind)&&e.formula);
 const supported=new Set();
 const next={...action};
 if(damage&&sum('damagePct')){next.effects=effects.map(e=>['damage','periodic-damage'].includes(e.kind)&&e.formula?{...e,formula:{...e.formula,multiplier:(e.formula.multiplier??1)*(1+sum('damagePct')/100)}}:e);supported.add('damagePct');}
 if(action.cooldownMs>0&&!action.sharedCooldown){next.cooldownMs=Math.round(reduce(action.cooldownMs,sum('cooldownReductionSeconds')*1000,sum('cooldownReductionPct')));supported.add('cooldownReductionSeconds');supported.add('cooldownReductionPct');}
 next.costs=(action.costs??[]).map(c=>{if(!['mana','energy','rage'].includes(c.resource)||c.amount<=0)return c;const k=c.resource+'CostReduction';supported.add(k);supported.add(k+'Pct');return {...c,amount:reduce(c.amount,sum(k),sum(k+'Pct'))};});
 return {action:next,applied:matched.filter(r=>supported.has(r.stat)),unapplied:matched.filter(r=>!supported.has(r.stat))};
}
