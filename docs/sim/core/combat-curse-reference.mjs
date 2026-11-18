import {physicalArmourReduction} from './combat-math.mjs';
const ids=new Set(['warlock:curse-of-the-elements','warlock:curse-of-shadow','warlock:curse-of-recklessness']);
const schools=new Set(['fire','frost','shadow','nature','arcane','holy']);
const finite=(v,k,min=0)=>{if(!Number.isFinite(v)||v<min)throw new Error('Explicit curse '+k+' required');return v;};
export function compileUtilityCurse(id,name,p){
 if(!ids.has(id)||!p||!Number.isSafeInteger(p.durationMs)||p.durationMs<=0||!Array.isArray(p.outcomes)||!p.outcomes.length)throw new Error('Explicit utility curse duration and application outcomes required');
 const modifiers=[];
 if(id==='warlock:curse-of-recklessness'){
  modifiers.push({stat:'curseArmourReduction',mode:'flat',value:finite(p.armourReduction,'armour reduction')},{stat:'curseEnemyAttackPowerBonus',mode:'flat',value:finite(p.enemyAttackPowerBonus,'enemy attack power bonus')});
 }else{
  if(!Array.isArray(p.schools)||!p.schools.length||new Set(p.schools).size!==p.schools.length||p.schools.some(s=>!schools.has(s)))throw new Error('Explicit curse schools required');
  for(const s of p.schools)modifiers.push({stat:'curse:'+s+':damagePct',mode:'flat',value:finite(p.damageBonusPct,'damage bonus')},{stat:'curse:'+s+':resistanceReduction',mode:'flat',value:finite(p.resistanceReduction,'resistance reduction')});
 }
 return {kind:'utility-curse',when:'always',name,id,durationMs:p.durationMs,outcomes:p.outcomes,modifiers};
}
export function strongestCurseModifier(auras,stat){return Math.max(0,...auras.flatMap(a=>a.modifiers.filter(m=>m.stat===stat).map(m=>m.value*(a.stacks??1))));}
export function curseDamageFactor(auras,school){return 1+strongestCurseModifier(auras,'curse:'+school+':damagePct')/100;}
export function curseMitigation(auras,model,baseline){return model?physicalArmourReduction({attackerLevel:model.attackerLevel,armour:Math.max(0,model.armour-strongestCurseModifier(auras,'curseArmourReduction')-strongestCurseModifier(auras,'majorArmourReduction'))}):baseline;}
const curseNames=new Set(['Curse of Agony','Curse of Doom','Curse of the Elements','Curse of Shadow','Curse of Recklessness','Curse of Elements','Curse of Weakness','Curse of Tongues','Curse of Exhaustion']);
export function removeConflictingCurses(e,actor,target,name,malediction=false){
 if(!curseNames.has(name))return;
 for(const a of e.auras.active(target,'debuff')){
  if(a.ownerId!==actor||a.name===name||!curseNames.has(a.name))continue;
  if(malediction&&a.name!=='Curse of Doom'&&name!=='Curse of Doom'&&(a.name==='Curse of Agony'||name==='Curse of Agony'))continue;
  e.periodic.remove(a.id);e.auras.remove(a,'replaced');
 }
}
