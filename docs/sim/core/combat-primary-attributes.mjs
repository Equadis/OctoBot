// Explicit linear marginal coefficients, not a claim about server stat formulas.
const primary=new Set(['strength','agility','stamina','intellect','spirit']);
const secondary=new Set(['attackPower','rangedAP','meleeCritDeltaPct','rangedCritDeltaPct','spellCritDeltaPct','incomingArmourDelta','incomingDodgeDeltaPct','maxHealth','maxMana','spiritManaRegenPerSecondDelta','mp5Delta']);
export function expandPrimaryModifiers(modifiers,policy){
 const out=[];
 for(const m of modifiers){if(!primary.has(m.stat)){out.push(m);continue;}
  if((policy?.mode==='dynamic'?!['flat','addPct','multiplyPct'].includes(m.mode):m.mode!=='flat')||!Number.isFinite(m.value)||!policy||typeof policy.provenance!=='string'||!policy.provenance.trim()||!Object.hasOwn(policy.coefficients??{},m.stat))throw Error('Explicit flat primary attribute conversion required');
  const coefficients=policy.coefficients[m.stat];if(!coefficients||typeof coefficients!=='object'||Array.isArray(coefficients))throw Error('Invalid primary coefficients');
  out.push(m);
  for(const [stat,coefficient] of Object.entries(coefficients)){if(!secondary.has(stat)||!Number.isFinite(coefficient)||coefficient<0)throw Error('Invalid primary conversion target');if(policy.mode!=='dynamic')out.push({stat,mode:'flat',value:m.value*coefficient});}
 }
 return out;
}
export function expandPrimaryEffects(effects,policy){const expand=f=>f.kind==='compound'?{...f,effects:f.effects.map(expand)}:f.kind==='aura'?{...f,modifiers:expandPrimaryModifiers(f.modifiers,policy)}:f;return effects.map(x=>({...x,effect:expand(x.effect)}));}

export function primaryDerivedModifiers(modifiers,policy){
 if(policy?.mode!=='dynamic')return {};
 const out={};if(typeof policy.provenance!=='string'||!policy.provenance.trim())throw Error('Explicit dynamic primary provenance required');
 for(const stat of primary){const m=modifiers[stat];if(!m)continue;const base=policy.base?.[stat],coefficients=policy.coefficients?.[stat];if(!Number.isFinite(base)||base<0||!coefficients||typeof coefficients!=='object'||Array.isArray(coefficients))throw Error('Explicit dynamic primary base and coefficients required');const delta=Math.max(0,(base+m.flat)*(1+m.addPct/100)*m.multiplier)-base;for(const [key,c] of Object.entries(coefficients)){if(!secondary.has(key)||!Number.isFinite(c)||c<0)throw Error('Invalid primary conversion target');out[key]=(out[key]??0)+delta*c;}}
 return out;
}
