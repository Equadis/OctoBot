import {expectedOutcome,physicalArmourReduction} from './combat-math.mjs';
import {sampleAttack,physicalAttackTable,spellAttackTable} from './combat-attack-tables.mjs';
const schools=new Set(['fire','frost','shadow','nature','arcane','holy']);
// Explicit reference inputs. An armour model uses the enemy's attack level,
// not the defender's. Spell resistance is a supplied conditional distribution.
export function compileIncomingAttack(attack){
 const m=attack.attackModel;
 if(!m||attack.amount!==undefined||attack.outcome!==undefined||attack.blockModel!==undefined)throw new Error('Calculated incoming attack cannot mix with resolved damage or block model');
 if(typeof m.provenance!=='string'||!m.provenance.trim())throw new Error('Incoming model provenance required');
 let table,mitigation=0;
 if(attack.school==='physical'){
  if(m.kind!=='physical'||!m.table||!m.armourModel)throw new Error('Explicit physical incoming attack table and armour required');
  table=physicalAttackTable({...m.table,provenance:m.provenance});
  mitigation=physicalArmourReduction(m.armourModel);
 }else{
  if(!schools.has(attack.school)||m.kind!=='spell'||!m.table||m.armourModel!==undefined)throw new Error('Explicit spell incoming resistance distribution required');
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
  compiled={...compiled,outcomes:table.outcomes,mitigation:physicalArmourReduction({...model.armourModel,armour:Math.max(0,model.armourModel.armour+delta('armour'))})};
 }
 if(attack.school!=='physical'&&stats){
  const rating=stats.resistance??0,suppression=stats.spellCritSuppression??0;if(!Number.isFinite(rating)||!Number.isFinite(suppression))throw Error('Invalid dynamic spell defence');
  if(rating!==0||suppression!==0){const m=attack.attackModel,base=m.table;if(rating!==0&&!base.resistanceModel)throw Error('Dynamic resistance requires rating-based incoming model');
   const table=spellAttackTable({...base,...(rating!==0?{resistanceModel:{...base.resistanceModel,rating:Math.max(0,base.resistanceModel.rating+rating)}}:{}),criticalPct:Math.max(0,Math.min(100,base.criticalPct-suppression)),provenance:m.provenance});compiled={...compiled,outcomes:table.outcomes};
  }
 }
 const hit=sampleAttack({...compiled,random});
 defence?.afterRoll?.(hit);
 return {attack:{...attack,amount:hit.raw,outcome:hit.outcome},hit};
}
