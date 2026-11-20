import {expectedOutcome,physicalArmourReduction} from './combat-math.mjs';
import {sampleAttack,physicalAttackTable,spellAttackTable} from './combat-attack-tables.mjs';
const schools=new Set(['fire','frost','shadow','nature','arcane','holy']);
// Explicit reference inputs. An armour model uses the enemy's attack level,
// not the defender's. Spell resistance is a supplied conditional distribution.
export function enemyAttackPowerReduction(auras,overlap){const values=auras.flatMap(a=>(a.modifiers??[]).filter(m=>m.stat==='enemyAttackPowerReduction'&&m.mode==='flat').map(m=>m.value*(a.stacks??1)));if(values.some(x=>!Number.isFinite(x)||x<0))throw Error('Invalid enemy AP reduction');if(overlap==='strongest')return Math.max(0,...values);if(overlap==='additive')return values.reduce((a,b)=>a+b,0);throw Error('Explicit enemy AP overlap required');}
export function compileIncomingAttack(attack){
 const m=attack.attackModel;
 if(!m||attack.amount!==undefined||attack.outcome!==undefined||attack.blockModel!==undefined)throw new Error('Calculated incoming attack cannot mix with resolved damage or block model');
 if(typeof m.provenance!=='string'||!m.provenance.trim())throw new Error('Incoming model provenance required');
 let table,mitigation=0;
 if(attack.school==='physical'){
  if(m.kind!=='physical'||!m.table||!m.armourModel)throw new Error('Explicit physical incoming attack table and armour required');
  if(m.enemyAPPolicy!==undefined){const p=m.enemyAPPolicy;if(!p||!Number.isFinite(p.baseAP)||p.baseAP<0||!Number.isFinite(p.damagePerAP)||p.damagePerAP<0||!['strongest','additive'].includes(p.overlap))throw Error('Explicit enemy AP policy required');}table=physicalAttackTable({...m.table,provenance:m.provenance});
  mitigation=physicalArmourReduction(m.armourModel);
 }else{
  if(m.enemyAPPolicy!==undefined)throw Error('Enemy AP policy requires physical damage');if(!schools.has(attack.school)||m.kind!=='spell'||!m.table||m.armourModel!==undefined)throw new Error('Explicit spell incoming resistance distribution required');
  table=spellAttackTable({...m.table,provenance:m.provenance});
 }
 const input={min:m.min,max:m.max,outcomes:table.outcomes,mitigation,flatReduction:m.flatReduction??0};
 expectedOutcome(input);
 return input;
}
export function resolveIncomingAttack(attack,compiled,random,defence=null,stats=null){
 if((defence||stats)&&attack.school==='physical'){
  const model=attack.attackModel,base=model.table;
  const clamp=v=>Math.max(0,Math.min(100,v));const delta=k=>{const v=stats?.[k]??0;if(!Number.isFinite(v))throw Error('Invalid dynamic defence: '+k);return v;};
  const table=physicalAttackTable({...base,...(base.type==='ranged'?{}:{targetDefense:Math.max(0,base.targetDefense+delta('defense'))}),avoidance:{...base.avoidance,dodgePct:clamp(base.avoidance.dodgePct+delta('dodge')),parryPct:clamp(base.avoidance.parryPct+delta('parry')),blockPct:clamp(base.avoidance.blockPct+(defence?.blockBonusPct??0)+delta('block'))},critSuppressionPct:clamp(base.critSuppressionPct+delta('critSuppression')),blockValue:Math.max(0,base.blockValue+delta('blockValue'))*(defence?.blockValueFactor??1),provenance:model.provenance});
  const armourFactor=stats?.armourFactor??1;
  if(!Number.isFinite(armourFactor)||armourFactor<0)throw Error('Invalid dynamic armour multiplier');
  compiled={...compiled,outcomes:table.outcomes,mitigation:physicalArmourReduction({...model.armourModel,armour:Math.max(0,model.armourModel.armour+delta('armour'))*armourFactor})};
 }
 if(attack.school!=='physical'&&stats){
  const rating=stats.resistance??0,suppression=stats.spellCritSuppression??0;if(!Number.isFinite(rating)||!Number.isFinite(suppression))throw Error('Invalid dynamic spell defence');
  if(rating!==0||suppression!==0){const m=attack.attackModel,base=m.table;if(rating!==0&&!base.resistanceModel)throw Error('Dynamic resistance requires rating-based incoming model');
   const table=spellAttackTable({...base,...(rating!==0?{resistanceModel:{...base.resistanceModel,rating:Math.max(0,base.resistanceModel.rating+rating)}}:{}),criticalPct:Math.max(0,Math.min(100,base.criticalPct-suppression)),provenance:m.provenance});compiled={...compiled,outcomes:table.outcomes};
  }
 }
 const ap=attack.attackModel.enemyAPPolicy;if(ap){const reduction=stats?.enemyAPReduction??0;if(!Number.isFinite(reduction)||reduction<0)throw Error('Invalid enemy AP reduction');const loss=Math.min(ap.baseAP,reduction)*ap.damagePerAP;compiled={...compiled,min:Math.max(0,compiled.min-loss),max:Math.max(0,compiled.max-loss)};}const hit=sampleAttack({...compiled,random});
 defence?.afterRoll?.(hit);
 return {attack:{...attack,amount:hit.raw,outcome:hit.outcome},hit};
}
