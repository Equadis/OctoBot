// Apply only unconditioned exact ability scopes from the existing equipment audit.
export function applyCompiledEquipment(action,abilityName,rows){
 const matched=rows.filter(r=>r.active&&!Object.keys(r.condition??{}).length&&r.scope.toLowerCase()===abilityName.toLowerCase());
 const sum=k=>matched.filter(r=>r.stat===k).reduce((n,r)=>n+r.amount,0);
 const reduce=(n,flat,pct)=>Math.max(0,n-flat)*Math.max(0,1-pct/100);
 const effects=action.effects??[], damage=effects.some(e=>['damage','periodic-damage'].includes(e.kind)&&e.formula);
 const supported=new Set();
 const next={...action};
 next.effects=effects.map(e=>{if(!e.formula)return e;const kind=['damage','periodic-damage'].includes(e.kind)?'damage':['heal','periodic-heal'].includes(e.kind)?'healing':null;if(!kind)return e;const pct=kind+'Pct',flat=kind==='damage'?'flatDamage':'flatHealing';const f=e.formula;const amount=sum(flat);const direct=['damage','heal'].includes(e.kind)&&!f.comboRanges&&!f.weapon;if(sum(pct))supported.add(pct);if(direct&&amount)supported.add(flat);return {...e,formula:{...f,...(direct&&amount?{min:f.min+amount,max:f.max+amount}:{}),multiplier:(f.multiplier??1)*(1+sum(pct)/100)}};});
 if(action.castMs>0&&action.kind==='cast'&&sum('castReductionSeconds')){next.castMs=Math.max(0,Math.round(action.castMs-sum('castReductionSeconds')*1000));if(next.castMs===0)next.kind='instant';supported.add('castReductionSeconds');}
 if(Number.isFinite(action.maxRangeYards)&&(sum('rangeIncreaseYards')||sum('rangeIncreasePct'))){next.maxRangeYards=(action.maxRangeYards+sum('rangeIncreaseYards'))*(1+sum('rangeIncreasePct')/100);supported.add('rangeIncreaseYards');supported.add('rangeIncreasePct');}
 if(action.cooldownMs>0&&!action.sharedCooldown){next.cooldownMs=Math.round(reduce(action.cooldownMs,sum('cooldownReductionSeconds')*1000,sum('cooldownReductionPct')));supported.add('cooldownReductionSeconds');supported.add('cooldownReductionPct');}
 next.costs=(action.costs??[]).map(c=>{if(!['mana','energy','rage'].includes(c.resource)||c.amount<=0)return c;const k=c.resource+'CostReduction';supported.add(k);supported.add(k+'Pct');return {...c,amount:reduce(c.amount,sum(k),sum(k+'Pct'))};});
 return {action:next,applied:matched.filter(r=>supported.has(r.stat)),unapplied:matched.filter(r=>!supported.has(r.stat))};
}
