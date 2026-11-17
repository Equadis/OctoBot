import {referenceRank} from './combat-reference-ranks.mjs';
import {abilityProfiles,calculateAbilityTalentEffects} from './talent-calculations.mjs';
import {physicalAttackTable,spellAttackTable} from './combat-attack-tables.mjs';
import {physicalArmourReduction} from './combat-math.mjs';
import {ROTATION_REGISTRY} from './rotations/registry.mjs';
const finite=(x,n,min=0)=>{if(!Number.isFinite(x)||x<min)throw new Error('Explicit valid '+n+' required');return x;};
const explicitBool=(x,n)=>{if(typeof x!=='boolean')throw new Error('Explicit '+n+' required');return x;};
const string=(x,n)=>{if(typeof x!=='string'||!x.trim())throw new Error('Explicit '+n+' required');return x;};
const one=[{name:'hit',probability:1,multiplier:1,landed:true}];
const clamp=n=>Math.min(100,Math.max(0,n));
const roundMs=s=>Math.round(1000*s);
const models=(classId,name,audit,baseline={})=>{
 const profiles=abilityProfiles(classId),profile=profiles.find(p=>p.name===name);
 if(!profile)throw new Error('Unmapped talent ability profile: '+name);
 return calculateAbilityTalentEffects(audit,profile,baseline);
};
function healingTable(crit,mult,provenance){return spellAttackTable({missPct:0,resistance:[{fraction:0,probability:1}],criticalPct:crit,criticalMultiplier:mult,resistancePolicy:'none',provenance}).outcomes;}
export function compileReferenceRank({build,sheet,gear,spellId,learnedSpellIds,policy,actorId='player'}){
 if(sheet?.combatSnapshot?.classId!==build.classId||sheet.combatSnapshot.level!==build.level)throw new Error('Matching structured character snapshot required');
 if(!Array.isArray(learnedSpellIds)||!learnedSpellIds.includes(spellId))throw new Error('Explicit learned rank confirmation required');
 const rank=referenceRank(build.classId,spellId),snap=sheet.combatSnapshot,audit=sheet.talentAudit;
 if(build.level<rank.learnLevel)throw new Error('Rank unavailable at character level');
 if(snap.level!==60)throw new Error('Only level-60 reference coefficients supported');
 if(rank.status==='external-reference-only'&&policy?.acceptExternalReference!==true)throw new Error('Explicit external reference acknowledgement required');
 if(rank.record.conflicts.length&&policy?.acceptSourceConflict!==true)throw new Error('Explicit source conflict acknowledgement required');
 if(rank.referenceAvailableFromPhase&&policy?.phase<rank.referenceAvailableFromPhase&&policy?.allowFutureRank!==true)throw new Error('Reference book rank not available in selected phase');
 const provenance=string(policy?.provenance,'ruleset provenance');
 const kind=rank.mode,abilityName=ROTATION_REGISTRY[build.classId].abilityRegistry[rank.abilityId]?.name;
 if(!abilityName)throw new Error('Unregistered rank');
 if(rank.weaponSubclass!==undefined&&gear.mainhand?.subclass!==rank.weaponSubclass)throw new Error('Rank requires appropriate main-hand weapon');
 if(['warrior','rogue'].includes(build.classId)&&gear.mainhand?.classs!==2)throw new Error('Main-hand weapon required');
 const gcd=finite(policy.gcdMs,'global cooldown'),cooldown=finite(policy.cooldownMs,'rank cooldown'),cost=rank.requiredPolicy?.includes('costOverride')?finite(policy.costOverride,'observed rank cost override'):rank.cost;
 const mv=models(build.classId,abilityName,audit,{manaCost:cost,energyCost:cost,rageCost:cost,castSeconds:rank.castMs/1000,gcdSeconds:gcd/1000,cooldownSeconds:cooldown/1000,rangeYards:rank.maxRange});
 const v=mv.values;
 const stats={attackPower:snap.attackPower,healingPower:snap.healingPower,...snap.schools};
 const physical=rank.components.some(x=>['weapon','combo'].includes(x.kind));
 const weapon=snap.melee.mainhand;
 if(physical){
  const wp=policy.weaponPolicy;
  if(!['actual-swing','normalised'].includes(wp))throw new Error('Explicit weapon scaling policy required');
  if(kind==='queued-melee'&&wp!=='actual-swing')throw new Error('Queued strikes require actual swing damage');
  if(wp==='normalised'){
   const speed=finite(policy.normalisedSpeed,'normalised weapon speed',.01);
   stats.weaponMin=(weapon.rawMin+snap.attackPower*speed/14+weapon.flatDamage)*weapon.handMultiplier;
   stats.weaponMax=(weapon.rawMax+snap.attackPower*speed/14+weapon.flatDamage)*weapon.handMultiplier;
  }else{stats.weaponMin=weapon.min;stats.weaponMax=weapon.max;}
 }
 const effects=[];
 for(const [index,component] of rank.components.entries()){
  const isWeapon=component.kind==='weapon',isCombo=component.kind==='combo',periodic=component.kind.startsWith('periodic-'),heal=component.kind.endsWith('heal');
  const componentName=periodic&&rank.components.length>1?abilityName+' (periodic)':abilityName;
  const m=models(build.classId,componentName,audit,{durationSeconds:periodic?component.durationMs/1000:undefined});
  const mods=m.modifiers,values=m.values;
  const baseMultiplier=heal?values.healingFactor:values.damageFactor;
  // Matching scoped effects are applied only to this component. The snapshot
  // already contains global and weapon-specific sheet contributions.
  const coefficient=isCombo?finite(policy.apPerComboPoint,'AP per combo point'):component.coefficient===null?finite(policy.componentCoefficients?.[index],'component coefficient'):component.coefficient;
  const formula=isWeapon?{min:component.flat,max:component.flat,terms:[],weapon:{minStat:'weaponMin',maxStat:'weaponMax',coefficient},multiplier:baseMultiplier}:isCombo?{comboRanges:component.ranges,terms:[{stat:'attackPower',coefficient,perComboPoint:true}],multiplier:baseMultiplier}:{min:component.min,max:component.max,terms:[{stat:component.stat,coefficient}],multiplier:baseMultiplier};
  let outcomes,applicationOutcomes,mitigation=0;
  if(isWeapon||isCombo){
   const p=policy.physical;
   if(!p)throw new Error('Explicit physical table policy required');
   const t=physicalAttackTable({type:'melee-special',weaponSkill:weapon.skill,targetDefense:snap.target.defense,hitPct:snap.melee.hitPct+(mods.hit||0),dualWieldWhite:false,dualWieldPenaltyPct:finite(p.dualWieldPenaltyPct,'dual-wield penalty'),avoidance:{dodgePct:weapon.targetDodgePct,parryPct:finite(p.parryPct,'parry probability'),blockPct:finite(p.blockPct,'block probability')},glancePct:0,glanceMultiplier:1,critPct:clamp(finite(weapon.critPct,'melee crit')+(mods.crit||0)),critSuppressionPct:finite(p.critSuppressionPct,'critical suppression'),critMultiplier:1+(finite(p.criticalMultiplier,'melee critical multiplier',1)-1)*values.criticalBonusFactor,blockValue:finite(p.blockValue,'block value'),order:p.order,position:p.position,provenance});
   outcomes=t.outcomes;mitigation=physicalArmourReduction({attackerLevel:snap.level,armour:weapon.targetArmour});
  }else if(heal){
   outcomes=periodic?(explicitBool(policy.periodicCanCrit,'periodic crit policy')?healingTable(clamp(snap.spell.critPct+(mods.crit||0)),finite(policy.healCriticalMultiplier,'healing crit multiplier',1),provenance):one):healingTable(clamp(finite(snap.spell.critPct,'spell crit')+(mods.crit||0)),finite(policy.healCriticalMultiplier,'healing critical multiplier',1),provenance);
   if(periodic)applicationOutcomes=one;
  }else{
   const resistance=policy.resistance?.[component.stat];
   if(!resistance)throw new Error('Explicit resistance distribution for '+component.stat+' required');
   const crit=periodic?(explicitBool(policy.periodicCanCrit,'periodic crit policy')?clamp(snap.spell.critPct+(mods.crit||0)):0):clamp(finite(snap.spell.critPct,'spell crit')+(mods.crit||0));
   const spellArgs={missPct:clamp(snap.spell.missPct-(mods.hit||0)),resistance:resistance.bins,resistancePolicy:resistance.policy,criticalPct:crit,criticalMultiplier:1+(finite(policy.spellCriticalMultiplier,'spell critical multiplier',1)-1)*values.criticalBonusFactor,provenance};
   if(periodic){applicationOutcomes=spellAttackTable({...spellArgs,criticalPct:0,resistance:resistance.applicationBins??resistance.bins}).outcomes;outcomes=spellAttackTable({...spellArgs,missPct:0,resistance:resistance.tickBins??resistance.bins}).outcomes;}
   else outcomes=spellAttackTable(spellArgs).outcomes;
  }
  const threatPolicy=policy.threat;
  const threat=threatPolicy===null?null:{coefficient:finite(heal?threatPolicy?.heal:threatPolicy?.damage,'threat coefficient'),flat:rank.requiredPolicy?.includes('flatThreat')?finite(policy.flatThreat,'flat threat'):0,multipliers:[values.threatFactor],distribution:heal?'split':'each'};
  // A null model means threat is unknown, not zero.
  effects.push({kind:isWeapon||isCombo?'damage':component.kind,when:component.reusePreviousHit?'landed':'always',school:isWeapon||isCombo?'physical':heal?rank.record.fields.school:component.stat,formula,outcomes,mitigation,flatReduction:0,threat,...(periodic?{durationMs:roundMs(values.durationSeconds),intervalMs:component.intervalMs,refresh:policy.refresh,tickAtExpiry:explicitBool(policy.tickAtExpiry,'tick-at-expiry policy'),snapshot:policy.snapshot,applicationOutcomes,auraName:abilityName,reusePreviousHit:component.reusePreviousHit===true}:{})});
 }
 if(rank.comboGain)effects.push({kind:'combo-gain',when:'landed',points:rank.comboGain});
 if(rank.comboSpend)effects.push({kind:'combo-spend',when:explicitBool(policy.spendOnMiss,'finisher spend on miss')?'always':'landed',points:'all'});
 const action={abilityId:rank.abilityId,spellId,rank:rank.rank,learnLevel:rank.learnLevel,source:rank.source,evidenceStatus:'reference',actorId,kind,castMs:roundMs(v.castSeconds),gcdMs:roundMs(v.gcdSeconds),cooldownMs:roundMs(v.cooldownSeconds),sharedCooldown:null,costs:[{resource:rank.resource,amount:rank.resource==='mana'?v.manaCost:rank.resource==='rage'?v.rageCost:v.energyCost}],targets:[rank.components.every(c=>c.kind.endsWith('heal'))?'ally':'enemy'],minRangeYards:rank.minRange,maxRangeYards:v.rangeYards,position:rank.position??null,comboRequired:rank.comboSpend?1:null,requiredContext:null,effects,...(kind==='queued-melee'?{swingId:'mainhand'}:{})};
 if(action.kind==='cast'&&action.castMs===0)action.kind='instant';
 if(rank.sharedCooldownGroup)action.sharedCooldown={id:rank.sharedCooldownGroup,durationMs:finite(action.cooldownMs,'shared cooldown duration',1)};
 if(build.classId==='priest'&&build.classOptions?.form==='Shadowform'&&(action.targets[0]==='ally'||rank.record.fields.school==='holy'))throw new Error('Holy healing unavailable in Shadowform');
 if(build.classId==='druid'&&(['Cat','Bear'].includes(build.classOptions?.form)||(build.classOptions?.form==='Moonkin'&&action.targets[0]==='ally')))throw new Error('Healing requires caster form');
 if(!Number.isFinite(action.costs[0].amount)||!Number.isFinite(action.castMs))throw new Error('Unresolved timing or cost');
 return {action,stats,rank,provenance,matchedTalents:mv.matched,liveVerified:false};
}
