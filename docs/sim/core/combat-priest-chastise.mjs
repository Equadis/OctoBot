export function validateChastise(p){
 if(!p||!Number.isFinite(p.baseMana)||p.baseMana<=0||!Number.isFinite(p.manaPct)||p.manaPct<0||p.manaPct>100||!Number.isFinite(p.min)||p.min<0||!Number.isFinite(p.max)||p.max<p.min||!Number.isFinite(p.coefficient)||p.coefficient<0||!Number.isSafeInteger(p.allyMinLevel)||p.allyMinLevel<1||p.allyMinLevel>60||!Number.isFinite(p.hastePct)||p.hastePct<0||p.hastePct>100||!Number.isFinite(p.allyDamageFactor)||p.allyDamageFactor<0||!Array.isArray(p.allyOutcomes)||!p.allyOutcomes.length||typeof p.allyTriggersSearingLight!=='boolean'||typeof p.controlEnabled!=='boolean')throw new Error('Explicit Chastise rank damage, mana, ally haste and outcomes required');
 return p;
}
export function chastiseAllyEligible(unit,p){return unit.alive&&unit.healthPercent>=80&&Number.isSafeInteger(unit.level)&&unit.level>=p.allyMinLevel;}
export function applyChastise(e,actor,target,p,hit,isAlly){
 if(!hit.landed||!e.unit(target).alive)return;
 if(isAlly)e.auras.apply({id:'priest:chastise-haste',name:'Chastise',targetId:target,ownerId:actor,kind:'buff',durationMs:hit.critical?12000:8000,maxStacks:1,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh',modifiers:['meleeHasteFactor','rangedHasteFactor','spellHasteFactor'].map(stat=>({stat,mode:'multiplyPct',value:p.hastePct}))});
 else if(p.controlEnabled)e.auras.apply({id:'priest:chastise-disorient',name:'Chastise',targetId:target,ownerId:actor,kind:'debuff',durationMs:2000,maxStacks:1,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh',modifiers:[{stat:'disoriented',mode:'flat',value:1}]});
}
