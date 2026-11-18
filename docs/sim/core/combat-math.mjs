// Shared arithmetic only: formula inputs must be provided by a ruleset adapter.
 // Numbers are unrounded until the adapter establishes server rounding.
export const COMBAT_MATH_REVISION='octo-combat-math-20261117-1';
const finite=(x,label)=>{if(!Number.isFinite(x))throw new TypeError(label+' must be finite');return x;};
const nonnegative=(x,label)=>{finite(x,label);if(x<0)throw new RangeError(label+' must be nonnegative');return x;};
const probability=(x,label)=>{nonnegative(x,label);if(x>1)throw new RangeError(label+' must be between 0 and 1');return x;};
const positive=(x,label)=>{nonnegative(x,label);if(x===0)throw new RangeError(label+' must be positive');return x;};
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const bounds=(min,max)=>{nonnegative(min,'minimum');nonnegative(max,'maximum');if(max<min)throw new RangeError('reversed range');};
export const COMBAT_PROVENANCE=Object.freeze({
 meleeMiss:{status:'developer-documented',source:'https://octowow.st/forum/viewtopic.php?p=6148',note:'Signed skill delta. Dual wield penalty, avoidance and hit floors separate reference assumptions.'},
 weaponAP:{status:'classic-reference',source:'https://www.wowhead.com/classic/guide/classic-wow-stats-and-attributes-overview'},
 armour:{status:'classic-reference',source:'https://www.warcrafttavern.com/wow-classic/guides/compendium/'},
 spellCoefficient:{status:'explicit-input-only',note:'Never automatically derive coefficients from cast time; verify rank and effect-specific rules.'},
 resistance:{status:'explicit-input-only',note:'Do not convert resistance rating into a damage probability without a verified level/school ruleset.'}
});
export function meleeMissPct({weaponSkill,targetDefense,hitPct=0,whiteDualWield=false,dualWieldPenaltyPct=19}){
 nonnegative(weaponSkill,'weapon skill');nonnegative(targetDefense,'target defense');finite(hitPct,'hit');nonnegative(dualWieldPenaltyPct,'dual wield penalty');
 return clamp(5+.2*(targetDefense-weaponSkill)+(whiteDualWield?dualWieldPenaltyPct:0)-hitPct,0,100);
}
export function weaponDamageRange({min,max,weaponSpeed,attackPower,flatDamage=0,apSpeed=weaponSpeed,handMultiplier=1}){
 bounds(min,max);positive(weaponSpeed,'weapon speed');positive(apSpeed,'AP speed');finite(attackPower,'AP');finite(flatDamage,'flat damage');nonnegative(handMultiplier,'hand multiplier');
 const offset=attackPower*apSpeed/14+flatDamage;return {min:Math.max(0,min+offset)*handMultiplier,max:Math.max(0,max+offset)*handMultiplier};
}
// Classic reference only: attacker level, not target level. Armour ignores are
// applied upstream; never permit a negative effective armour or >75% reduction.
export function physicalArmourReduction({attackerLevel,armour,armourPenetration=0,cap=.75}){
 if(!Number.isInteger(attackerLevel)||attackerLevel<1||attackerLevel>60)throw new RangeError('Unsupported Classic attacker level');
 nonnegative(armour,'armour');nonnegative(armourPenetration,'armour penetration');probability(cap,'cap');
 const effective=Math.max(0,armour-armourPenetration);return Math.min(cap,effective/(effective+400+85*attackerLevel));
}
export function scaledRange({min,max,coefficient,power,multiplier=1,flat=0}){
 bounds(min,max);nonnegative(coefficient,'coefficient');finite(power,'power');nonnegative(multiplier,'multiplier');finite(flat,'flat modifier');
 const bonus=coefficient*power+flat;return {min:Math.max(0,min+bonus)*multiplier,max:Math.max(0,max+bonus)*multiplier};
}
// Inputs are already-resolved mutually exclusive probabilities. No invented
// miss/dodge/block/glance/crit ordering or partial-resist table.
export function expectedOutcome({min,max,outcomes,mitigation=0,flatReduction=0}){
 bounds(min,max);probability(mitigation,'mitigation');nonnegative(flatReduction,'flat reduction');
 if(!Array.isArray(outcomes)||!outcomes.length)throw new TypeError('Explicit outcomes required');
 const names=new Set();let total=0,mean=0;const rows=[];
 for(const o of outcomes){
  if(!o||typeof o.name!=='string'||!o.name||names.has(o.name))throw new TypeError('Outcome names must be unique');
  names.add(o.name);probability(o.probability,'outcome probability');nonnegative(o.multiplier,'outcome multiplier');
  total+=o.probability;
  // Compute mean after clamping a uniform continuous damage roll at zero.
  const extra=nonnegative(o.flatReduction??0,'outcome reduction')+flatReduction;
  const lo=min*o.multiplier*(1-mitigation)-extra,hi=max*o.multiplier*(1-mitigation)-extra;
  const avg=hi<=0?0:lo>=0?(lo+hi)/2:hi*hi/(2*(hi-lo));
  mean+=o.probability*avg;rows.push({name:o.name,probability:o.probability,conditionalMean:avg});
 }
 if(Math.abs(total-1)>1e-9)throw new RangeError('Outcome probabilities must sum to 1');
 return {mean,outcomes:rows};
}
export function effectiveHealing(raw,missingHealth){
 nonnegative(raw,'raw healing');nonnegative(missingHealth,'missing health');return {raw,effective:Math.min(raw,missingHealth),overheal:Math.max(0,raw-missingHealth)};
}
export function resourceCost({amount,basePool,percentOfBase=false}){
 nonnegative(amount,'resource cost');if(!percentOfBase)return amount;nonnegative(basePool,'base resource pool');return amount*basePool/100;
}
// Atomic expenditure, explicit events only. Caps and starting resources are
// supplied by the adapter; no generic mana/rage/energy generation assumptions.
export function resourceLedger(pools,changes){
 const state={};
 for(const [key,p] of Object.entries(pools)){if(!p||typeof p!=='object')throw new TypeError('Invalid resource pool');nonnegative(p.current,key);nonnegative(p.max,key+' cap');if(p.current>p.max)throw new RangeError('Resource exceeds cap');state[key]={...p};}
 const totals={};for(const c of changes){if(!Object.hasOwn(state,c.resource))throw new Error('Unknown resource '+c.resource);finite(c.delta,'resource delta');const t=totals[c.resource]??={spend:0,gain:0};if(c.delta<0)t.spend-=c.delta;else t.gain+=c.delta;}
 if(Object.entries(totals).some(([key,t])=>state[key].current<t.spend))return {ok:false,pools:state,overflow:{},reason:'Insufficient resources'};
 const overflow={};for(const [key,t] of Object.entries(totals)){const p=state[key],next=p.current-t.spend+t.gain;overflow[key]=Math.max(0,next-p.max);p.current=Math.min(p.max,next);}
 return {ok:true,pools:state,overflow};
}
