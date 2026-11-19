// Explicit linear marginal coefficients, not a claim about server stat formulas.
const primary=new Set(['strength','agility','stamina','intellect','spirit']);
const secondary=new Set(['attackPower','rangedAP','meleeCritDeltaPct','rangedCritDeltaPct','spellCritDeltaPct','incomingArmourDelta','incomingDodgeDeltaPct','maxHealth','maxMana']);
export function expandPrimaryModifiers(modifiers,policy){
 const out=[];
 for(const m of modifiers){if(!primary.has(m.stat)){out.push(m);continue;}
  if(m.mode!=='flat'||!Number.isFinite(m.value)||!policy||typeof policy.provenance!=='string'||!policy.provenance.trim()||!Object.hasOwn(policy.coefficients??{},m.stat))throw Error('Explicit flat primary attribute conversion required');
  const coefficients=policy.coefficients[m.stat];if(!coefficients||typeof coefficients!=='object'||Array.isArray(coefficients))throw Error('Invalid primary coefficients');
  out.push(m);
  for(const [stat,coefficient] of Object.entries(coefficients)){if(!secondary.has(stat)||!Number.isFinite(coefficient)||coefficient<0)throw Error('Invalid primary conversion target');out.push({stat,mode:'flat',value:m.value*coefficient});}
 }
 return out;
}
export function expandPrimaryEffects(effects,policy){const expand=f=>f.kind==='compound'?{...f,effects:f.effects.map(expand)}:f.kind==='aura'?{...f,modifiers:expandPrimaryModifiers(f.modifiers,policy)}:f;return effects.map(x=>({...x,effect:expand(x.effect)}));}
