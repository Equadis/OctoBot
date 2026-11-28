import {meleeMissPct,expectedOutcome} from './combat-math.mjs';
import {resistanceReference} from './combat-resistance-reference.mjs';
export const ATTACK_TABLE_REVISION='octo-attack-tables-20261117-1';
const finite=(x,name,min=0,max=Infinity)=>{if(!Number.isFinite(x)||x<min||x>max)throw new RangeError(name+' must be in ['+min+','+max+']');return x;};
const pct=(x,n)=>finite(x,n,0,100)/100;
const prob=(x,n)=>finite(x,n,0,1);
const nonnegative=(x,n)=>finite(x,n);
const eps=1e-9;
const validId=x=>typeof x==='string'&&x.length>0;
const oneRollNames=['miss','dodge','parry','block','glance','crit'];
// The caller selects table order, avoidance eligibility, suppression and all
// multipliers. Neither Classic/Turtle order nor values are asserted as OctoWoW.
export function physicalAttackTable({type,weaponSkill,targetDefense,hitPct,dualWieldWhite,dualWieldPenaltyPct,missPct,avoidance,glancePct,glanceMultiplier,critPct,critSuppressionPct,critMultiplier,blockValue,order,position,provenance}){
 if(!['melee-white','melee-special','ranged'].includes(type))throw new Error('Explicit physical attack type required');
 if(!['front','behind','side','ranged'].includes(position)||(type==='ranged')!==(position==='ranged'))throw new Error('Explicit compatible attack position required');
 if(!validId(provenance))throw new Error('Explicit attack table provenance required');
 if(!Array.isArray(order)||order.length!==oneRollNames.length||new Set(order).size!==order.length||order.some(n=>!oneRollNames.includes(n)))throw new Error('Explicit complete one-roll outcome order required');
 if(!avoidance)throw new Error('Explicit target avoidance required');
 const miss=type==='ranged'?pct(missPct,'ranged miss'):pct(meleeMissPct({weaponSkill,targetDefense,hitPct:finite(hitPct,'hit',-100,100),whiteDualWield:type==='melee-white'&&dualWieldWhite===true,dualWieldPenaltyPct:nonnegative(dualWieldPenaltyPct,'dual wield penalty')}),'miss');
 if(type==='melee-white'&&typeof dualWieldWhite!=='boolean')throw new Error('Explicit dual-wield policy required');
 if(type!=='melee-white'&&glancePct!==0)throw new Error('Only white melee may glance in this policy');
 const requested={miss,dodge:pct(avoidance.dodgePct,'dodge'),parry:pct(avoidance.parryPct,'parry'),block:pct(avoidance.blockPct,'block'),glance:pct(glancePct,'glance'),crit:Math.max(0,pct(critPct,'crit')-pct(critSuppressionPct,'crit suppression'))};
 const multipliers={miss:0,dodge:0,parry:0,block:1,glance:prob(glanceMultiplier,'glance damage factor'),crit:nonnegative(critMultiplier,'critical damage factor')};
 const block=nonnegative(blockValue,'block amount');let remaining=1;const outcomes=[];
 for(const name of order){const probability=Math.min(remaining,requested[name]);remaining=Math.max(0,remaining-probability);outcomes.push({name,probability,multiplier:multipliers[name],flatReduction:name==='block'?block:0,landed:!['miss','dodge','parry'].includes(name)});}
 outcomes.push({name:'hit',probability:remaining,multiplier:1,flatReduction:0,landed:true});
 return {type,policy:'one-roll',position,provenance,requested:{...requested},outcomes,critCapped:outcomes.find(x=>x.name==='crit').probability+eps<requested.crit,engineValidated:false};
}
// Supplied conditional resistance distribution is independent of spell miss.
// Crit is conditional on a landed, not fully resisted spell. Binary spells
// accept only zero and full resistance; nonbinary spells require explicit bins.
export function spellAttackTable({missPct,resistance,resistanceModel,criticalPct,criticalMultiplier,resistancePolicy,provenance}){
 if(!['binary','nonbinary','none'].includes(resistancePolicy)||!validId(provenance))throw new Error('Explicit spell resistance policy and provenance required');
 const miss=pct(missPct,'spell miss'),crit=pct(criticalPct,'conditional crit'),mult=nonnegative(criticalMultiplier,'critical multiplier');
 if(resistanceModel!==undefined){if(resistance!==undefined)throw new Error('Choose explicit resistance bins or rating model, not both');resistance=resistanceReference({...resistanceModel,policy:resistancePolicy,provenance}).resistance;}
 if(!Array.isArray(resistance)||!resistance.length)throw new Error('Explicit resistance distribution required');
 const seen=new Set();let sum=0;
 for(const r of resistance){prob(r.fraction,'resistance fraction');prob(r.probability,'conditional resistance probability');if(seen.has(r.fraction))throw new Error('Duplicate resistance fraction');seen.add(r.fraction);sum+=r.probability;
 if(resistancePolicy==='binary'&&![0,1].includes(r.fraction)||resistancePolicy==='none'&&r.fraction!==0)throw new Error('Invalid resistance fraction for policy');}
 if(Math.abs(sum-1)>eps)throw new Error('Resistance probabilities must sum to 1');
 const outcomes=[{name:'miss',probability:miss,multiplier:0,flatReduction:0,landed:false}];
 for(const r of resistance){const p=(1-miss)*r.probability;if(r.fraction===1){outcomes.push({name:'resist',probability:p,multiplier:0,flatReduction:0,landed:false,resistedFraction:1});continue;}
 for(const [name,chance,factor] of [['hit',1-crit,1],['crit',crit,mult]])outcomes.push({name:r.fraction===0?name:name+'-resist-'+r.fraction,probability:p*chance,multiplier:factor*(1-r.fraction),flatReduction:0,landed:true,critical:name==='crit',resistedFraction:r.fraction});}
 return {type:'spell',policy:resistancePolicy,provenance,outcomes,engineValidated:false};
}
export function sampleAttack({min,max,outcomes,mitigation=0,flatReduction=0,random}){
 // Validate the complete distribution before consuming RNG or mutating state.
 expectedOutcome({min,max,outcomes,mitigation,flatReduction});
 if(outcomes.some(o=>typeof o.landed!=='boolean'))throw new Error('Explicit landed flags required');
 if(typeof random!=='function')throw new Error('Explicit seeded random function required');
 const roll=random();if(!Number.isFinite(roll)||roll<0||roll>=1)throw new RangeError('Random must return [0,1)');
 let p=0,selected=outcomes.filter(o=>o.probability>0).at(-1);
 for(const o of outcomes){p+=o.probability;if(roll<p){selected=o;break;}}
 if(!selected)throw new Error('No selectable outcome');
 const rangeRoll=random();if(!Number.isFinite(rangeRoll)||rangeRoll<0||rangeRoll>=1)throw new RangeError('Random must return [0,1)');
 const base=min+(max-min)*rangeRoll;
 const raw=Math.max(0,base*selected.multiplier*(1-mitigation)-flatReduction-(selected.flatReduction||0));
 return {outcome:selected.name,landed:selected.landed,critical:selected.critical===true||selected.name==='crit',raw,base,probability:selected.probability,resistedFraction:selected.resistedFraction??0};
}
