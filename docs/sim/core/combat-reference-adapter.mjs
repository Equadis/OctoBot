import {buildImbueConfig} from './combat-imbue-reference.mjs';
import {buildCompanionConfig} from './combat-companion-reference.mjs';
import {buildPoisonConfig} from './combat-poison-reference.mjs';
import {feralWeapon} from './combat-feral-reference.mjs';
import {buildCastProcs} from './combat-cast-procs.mjs';
import {rangedWeaponModel} from './combat-ranged-reference.mjs';
import {characterStats} from './character-stats.mjs';
import {validateBuild} from './builds.mjs';
import {equipmentErrors} from './items.mjs';
import {enchantAvailable,ENCHANTS,CURRENT_ENCHANT_PHASE} from './equipment-options.mjs';
import {compileReferenceRank} from './combat-rank-compiler.mjs';
import {referenceRanks} from './combat-reference-ranks.mjs';
import {createExplicitClassEncounter} from './combat-class-runtime.mjs';
import {physicalAttackTable} from './combat-attack-tables.mjs';
import {physicalArmourReduction} from './combat-math.mjs';
import {runIterations,resourceThroughput} from './combat-statistics.mjs';
import {combatReport} from './combat-report.mjs';
import {abilityKey,ROTATION_REGISTRY} from './rotations/registry.mjs';
const finite=(x,k,min=0)=>{if(!Number.isFinite(x)||x<min)throw new Error('Explicit valid '+k+' required');return x;};
const bool=(x,k)=>{if(typeof x!=='boolean')throw new Error('Explicit '+k+' required');return x;};
const int=(x,k,min=0)=>{if(!Number.isSafeInteger(x)||x<min)throw new Error('Explicit valid '+k+' required');return x;};
const actor='player',boss='boss',ally='ally';
const supportedConditions=new Set(['rage','energy','comboPoints','mana','manaPercent','targetHealth','combatTime','targetCount','healthPercent','selfBuffActive','selfBuffRemaining','ownDebuffRemaining','buffActive','buffRemaining','buffStacks','debuffActive','debuffRemaining','debuffStacks','cooldownReady','cooldownRemaining','stanceIs','formIs','abilityKnown','abilityRank','allyHealth']);
function readGear(build,gearById){
 const lookup=id=>gearById[String(id)]??null;
 const errors=equipmentErrors(build,lookup);
 if(errors.length)throw new Error(errors.map(e=>e.slot+': '+e.reason).join('; '));
 const gear={};
 for(const [slot,ref] of Object.entries(build.gear)){
  const item=lookup(ref.id);if(!item)throw new Error('Missing exact equipment metadata for '+slot);
  if(ref.enchantId&&!enchantAvailable(ENCHANTS.find(e=>e.id===ref.enchantId)))throw new Error('Future-phase or unknown enchant: '+slot);
  gear[slot]=item;
 }
 return gear;
}
function whiteAttack(snap,hand,policy){
 const w=snap.melee[hand],p=policy.physical;
 if(!p)throw new Error('Explicit auto-attack table policy required');
 const table=physicalAttackTable({type:'melee-white',weaponSkill:w.skill,targetDefense:snap.target.defense,hitPct:hand==='mainhand'?snap.melee.hitPct:w.hitPct,dualWieldWhite:snap.melee.dual,dualWieldPenaltyPct:p.dualWieldPenaltyPct,avoidance:{dodgePct:w.targetDodgePct,parryPct:p.parryPct,blockPct:p.blockPct},glancePct:w.glanceChancePct,glanceMultiplier:w.glanceMultiplier,critPct:w.critPct,critSuppressionPct:p.critSuppressionPct,critMultiplier:p.criticalMultiplier,blockValue:p.blockValue,order:p.order,position:p.position,provenance:policy.provenance});
 const effects=[{kind:'damage',when:'always',school:'physical',formula:{min:finite(w.min,'weapon damage'),max:finite(w.max,'weapon maximum damage'),terms:[],multiplier:1,...(Number.isFinite(w.baseSpeedSeconds)&&Number.isFinite(w.handMultiplier)?{dynamicWeaponAP:w.baseSpeedSeconds*w.handMultiplier/14}:{})},outcomes:table.outcomes,mitigation:physicalArmourReduction({attackerLevel:snap.level,armour:w.targetArmour}),armourModel:{attackerLevel:snap.level,armour:w.targetArmour},flatReduction:0,...(policy.rageModel?{swingRage:{...policy.rageModel,weaponSeconds:w.baseSpeedSeconds,handFactor:finite(policy.rageModel.handFactors?.[hand],'rage hand factor')}}:{}),threat:policy.threat===null?null:{coefficient:finite(policy.threat.damage,'threat coefficient'),flat:0,multipliers:[],distribution:'each'}}];
 return {id:hand,actorId:actor,source:hand==='mainhand'?'Main-hand auto attack':'Off-hand auto attack',intervalMs:Math.round(finite(w.intervalSeconds,'swing interval',.01)*1000),firstAtMs:policy.firstSwing==='immediate'?0:Math.round(w.intervalSeconds*1000),castPolicy:policy.autoCastPolicy,...(policy.swingHastePolicy?{hasteStat:'meleeHasteFactor',hastePolicy:policy.swingHastePolicy}:{}),minRangeYards:0,maxRangeYards:5,effects};
}
// Build-based research adapter. An explicit selection of learned ranks and
// complete ruleset is mandatory. Unsupported priority actions never disappear.
export function prepareReferenceScenario({build:raw,talents,gearById={},learnedSpellIds,rankByAbility,policies,encounter,rows:explicitRows=null}){
 const build=validateBuild(raw,talents),gear=readGear(build,gearById),sheet=characterStats(build,talents,gear),snap=sheet.combatSnapshot;
 if(build.level!==60||!Number.isFinite(snap.health)||sheet.baseAudit.status!=='reference-only')throw new Error('Complete level-60 reference base stats required');
 if(build.trinketSwap?.enabled)throw new Error('Trinket swaps are not implemented in the reference adapter');

 const rows=explicitRows??build.controls.rotationRows;
 if(!Array.isArray(rows)||!rows.length)throw new Error('Explicit supported rotation required');
 if(!encounter||encounter.mode!=='reference-research'||encounter.acknowledgeIncompleteEffects!==true)throw new Error('Explicit research acknowledgement required');
 const position=encounter.position;if(!['behind','front','side'].includes(position))throw new Error('Explicit target position required');
 const distance=finite(encounter.distanceYards,'target distance');
 const allyDistance=finite(encounter.allyDistanceYards,'ally distance');
 const normalized=rows.map(row=>{
  const aid=abilityKey(build.classId,row.ability);
  if(!Number.isSafeInteger(rankByAbility?.[aid]))throw new Error('No explicitly selected reference rank for '+row.ability);
  if(!['primary','cycle','ally','self'].includes(row.target??'primary'))throw new Error('Unsupported reference rotation target: '+row.target);
  for(const c of row.conditions||[])if(!supportedConditions.has(c.metric))throw new Error('Unsupported reference rotation condition: '+c.metric);
  return {...row,abilityId:aid,target:row.target??'primary',conditions:row.conditions||[]};
 });
 const feral=build.classId==='druid'&&['Cat','Bear'].includes(build.classOptions.form),form=build.classOptions.form;
 const paw=feral?feralWeapon(snap,form,encounter.feralModel):null;
 const actions=[],stats={};const rankRows=[];
 for(const aid of new Set(normalized.map(r=>r.abilityId))){
  const spellId=rankByAbility[aid],policy=policies?.[aid];
  if(!policy)throw new Error('Explicit mechanics policy required for '+aid);
  if(policy.physical&&policy.physical.position!==position)throw new Error('Attack table position differs from encounter geometry');
  if(!Number.isSafeInteger(policy.phase))throw new Error('Explicit rank phase required');
  const compiled=compileReferenceRank({build,sheet,gear,spellId,learnedSpellIds,policy:feral?{...policy,feralModel:encounter.feralModel}:policy,actorId:actor});
  if(compiled.action.abilityId!==aid)throw new Error('Selected rank belongs to a different ability');
  for(const [k,v] of Object.entries(compiled.stats)){if(Number.isFinite(v)&&Object.hasOwn(stats,k)&&stats[k]!==v)throw new Error('Conflicting stat representations: '+k);if(Number.isFinite(v))stats[k]=v;}
  const myRows=normalized.filter(r=>r.abilityId===aid);
  if(myRows.some(r=>!compiled.action.targets.includes(r.target==='ally'?'ally':r.target==='self'?'self':'enemy')))throw new Error('Rotation target role mismatch for '+aid);
  if(encounter.recastPeriodic==='after-expiry'&&compiled.rank.refreshStrategy!=='do-not-gate'&&compiled.action.effects.some(e=>e.kind.startsWith('periodic')))compiled.action.refreshGate={kind:compiled.action.targets[0]==='ally'?'buff':'debuff',name:ROTATION_REGISTRY[build.classId].abilityRegistry[aid].name,remainingMs:0};
  actions.push(compiled.action);rankRows.push({abilityId:aid,spellId,rank:compiled.rank.rank,source:compiled.rank.source,referenceSource:compiled.rank.referenceSource,provenance:compiled.provenance});
 }
 if(!['after-expiry','rotation-only'].includes(encounter.recastPeriodic))throw new Error('Explicit periodic recast policy required');
 const pools={};
 if(build.classId==='warrior')pools.rage={current:Math.min(snap.maxRage,build.classOptions.startingRage),max:snap.maxRage};
 else if(build.classId==='rogue')pools.energy={current:Math.min(snap.maxEnergy,build.classOptions.startingEnergy),max:snap.maxEnergy};
 else pools.mana={current:finite(snap.mana,'mana pool')*build.classOptions.startingMana/100,max:snap.mana};
 if(feral){if(form==='Cat')pools.energy={current:Math.min(snap.maxEnergy,build.classOptions.startingEnergy),max:snap.maxEnergy};else pools.rage={current:Math.min(snap.maxRage,build.classOptions.startingRage),max:snap.maxRage};}
 if(actions.some(a=>a.costs.some(c=>c.resource==='flashPowder'))){const current=int(encounter.flashPowderCount,'Flash Powder count');pools.flashPowder={current,max:Math.max(1,current)};}
 if(encounter.ammoCount!==undefined)pools.ammo={current:int(encounter.ammoCount,'ammunition count'),max:int(encounter.ammoCount,'ammunition count',1)};
 for(const x of encounter.regeneration||[])if(!Object.hasOwn(pools,x.resource))throw new Error('Regeneration references unavailable resource');
 if(actions.some(a=>a.requiresSeal)&&!actions.some(a=>a.sealModel))throw new Error('Judgement requires a configured seal action');
 const imbueModel=buildImbueConfig(build,gear,encounter.imbueModel,new Set(actions.map(a=>a.abilityId)));if(imbueModel?.name==='Frostbrand Weapon'&&imbueModel.elementalWeapons.rank>0&&actions.some(a=>a.abilityId==='shaman:frost-shock'&&!a.effects.some(x=>x.kind==='aura'&&x.aura.id==='frost-shock')))throw new Error('Frostbrand Elemental Weapons requires an explicit Frost Shock debuff model');const poisonConfig=buildPoisonConfig(build,gear,encounter.poisonModel,new Set(actions.map(a=>a.abilityId)));const autos=[];
 if(bool(encounter.includeMelee,'auto-attack choice')){
   const p=encounter.autoPolicy;
   if(!p||!['immediate','after-interval'].includes(p.firstSwing)||!['continue','skip-during-cast'].includes(p.autoCastPolicy)||p.physical?.position!==position)throw new Error('Explicit matching auto-attack timing and position required');
   if(feral){const formSnap={...snap,melee:{...snap.melee,mainhand:paw,hitPct:paw.hitPct,dual:false}};autos.push(whiteAttack(formSnap,'mainhand',p));}else for(const hand of ['mainhand','offhand'])if(gear[hand]?.classs===2)autos.push(whiteAttack(snap,hand,p));
 }
 if(encounter.includeRanged===true){if(build.classId!=='hunter')throw new Error('Ranged auto adapter currently supports Hunter');const p=encounter.rangedAutoPolicy,r=rangedWeaponModel(snap,p);autos.push({id:'ranged',actorId:actor,source:'Auto Shot',intervalMs:r.intervalMs,firstAtMs:r.intervalMs,castPolicy:p.autoCastPolicy,minRangeYards:8,maxRangeYards:35,costs:r.ammoCost?[{resource:'ammo',amount:r.ammoCost}]:[],effects:[{kind:'damage',when:'always',school:'physical',formula:{min:r.stats.rangedMin,max:r.stats.rangedMax,terms:[],multiplier:1},outcomes:r.outcomes,mitigation:r.mitigation,flatReduction:0,threat:null}]});}
 if(actions.some(a=>a.kind==='queued-melee')&&!autos.some(a=>a.id==='mainhand'))throw new Error('Queued strike requires enabled main-hand swings');
 const durationMs=int(encounter.durationMs,'encounter duration',1);
 if(durationMs>3600000)throw new Error('Encounter exceeds maximum duration');
 const companion=buildCompanionConfig(build,encounter.companionModel,durationMs);if(actions.some(a=>a.requiresCompanion)&&!companion)throw new Error('Selected ability requires a configured companion');if(companion){pools[companion.pool.resource]={current:companion.pool.current,max:companion.pool.max};if((encounter.regeneration??[]).some(r=>r.resource===companion.pool.resource))throw new Error('Companion regeneration must use companion model');autos.push(...companion.autos);}
 const enemyHealth=finite(encounter.enemyHealth,'enemy health',1),allyMax=finite(encounter.allyMaxHealth,'ally maximum health',1),allyHealth=finite(encounter.allyHealth,'ally health',1);
 if(allyHealth>allyMax)throw new Error('Ally health exceeds cap');
 const hasHealing=actions.some(a=>a.targets.includes('ally'));const extraEnemies=encounter.additionalEnemies??[],extraAllies=encounter.additionalAllies??[];if(!Array.isArray(extraEnemies)||!Array.isArray(extraAllies)||extraEnemies.length>39||extraAllies.length>39)throw new Error('Invalid explicit encounter units');
 const enemyCurrentHealth=encounter.enemyCurrentHealth===undefined?enemyHealth:finite(encounter.enemyCurrentHealth,'starting enemy health',1);if(enemyCurrentHealth>enemyHealth)throw new Error('Enemy health exceeds cap');
 const units=[{id:actor,maxHealth:snap.health},{id:boss,maxHealth:enemyHealth,health:enemyCurrentHealth},...(hasHealing?[{id:ally,maxHealth:allyMax,health:allyHealth}]:[]),...extraEnemies,...extraAllies,...(companion?[companion.unit]:[])];
 const classContext={...build.classOptions,...(build.classId==='paladin'?{vengeanceRank:Number(build.talents['440']??0)}:{})};const castProcData=buildCastProcs(build,actions,encounter.castProcPolicies,{requireComplete:encounter.requireCompleteCastProcs===true});
 const sc={mode:'research',provenance:'Build-based reference mechanics; not live verified',classId:build.classId,level:build.level,durationMs,decisionIntervalMs:int(encounter.decisionIntervalMs,'decision interval',1),pools,units,playerId:actor,primaryId:boss,targetIds:[boss,...extraEnemies.map(x=>x.id)],allyIds:[...(hasHealing?[ally]:[]),...extraAllies.map(x=>x.id)],nearbyTargets:encounter.nearbyTargets??{[boss]:[],[ally]:[]},stats:{[actor]:stats,...(companion?{pet:companion.stats}:{})},...(companion?{petId:'pet',companionPriority:companion.priority,companionRegen:companion.regen,companionTalents:companion.talents,companionDamageMultiplier:companion.damageMultiplier}:{}),classContext,geometry:{[actor]:{[actor]:{distance:0,position:'self'},[boss]:{distance,position},...(hasHealing?{[ally]:{distance:allyDistance,position:'front'}}:{}),...encounter.additionalGeometry},...(companion?{pet:Object.fromEntries([boss,...extraEnemies.map(x=>x.id)].map(id=>[id,companion.geometry]))}:{})},rows:normalized,actions,autos,...(build.classId==='warlock'?{malediction:Number(build.talents['352']??0)>0,highestLearnedAgonyConfirmed:encounter.highestLearnedAgonyConfirmed===true}:{}),castProcs:castProcData.procs,poisonConfig,imbueModel,sealTwist:encounter.sealTwist??null,...(build.classId==='paladin'?{blessedStrikes:Number(build.talents['459']??0)*.2}:{}),regeneration:encounter.regeneration||[],incomingDamage:encounter.incomingDamage||[],partyDamage:encounter.partyDamage||[],...(encounter.stealthPolicy?{stealthPolicy:encounter.stealthPolicy}:{}),incomingRage:encounter.incomingRage??null,...(build.classId==='rogue'||feral&&form==='Cat'?{comboPoints:{cap:5,initialTarget:boss,initialPoints:build.classId==='rogue'?build.classOptions.comboPoints:int(encounter.initialComboPoints??0,'starting feral combo points')}}:{})};
 return {scenario:sc,rankRows,sourceNote:sheet.sourceNote,limitations:['Reference base stats, hit tables and coefficients are not live verified.',...(feral?['Fixed form; measured paw damage and timings supplied explicitly, not equipment weapon damage. Shapeshifting not modelled.']:[]),'Only selected compiled ranks, static sheet effects, explicit regeneration and configured auto attacks are executed.',...(actions.some(a=>a.effects.some(x=>x.kind==='mark-for-death'))?['Mark for Death uses explicitly selected party recipients, AP scaling basis and school-power interpretation of magical bonus. Party auras are recorded, but scripted party damage is already post-mitigation and is not recalculated.']:[]),...(actions.some(a=>a.requiresStealth||a.effects.some(x=>x.kind==='vanish'))?['Rogue timed stealth, opener gating, optional threat reduction/reagent costs and Cloaked in Shadows absorb are modeled; detection, movement cleansing, enemy aggro and trinket swaps remain unimplemented.']:[]),...(actions.some(a=>a.effects.some(x=>x.kind==='shadow-of-death'))?['Shadow of Death accumulates attributed damage under an explicit ruleset, with AP snapshotted on application; optional scripted party damage is post-mitigation input. No inferred party rotations.']:[]),...(actions.some(a=>a.effects.some(x=>x.kind==='utility-curse'))?['Utility curse damage amplification and armour reduction are dynamic; resistance reduction and enemy AP are tracked but do not alter explicit resistance tables or scripted enemy attacks. Curse application threat is not modelled. Malediction requires an explicitly confirmed highest learned Agony action.']:[]),...(encounter.autoPolicy?.rageModel?['Swing rage uses explicitly supplied damage, weapon-speed, critical and hand factors; not live validated.']:build.classId==='warrior'?['No swing-driven rage model supplied; starting rage and explicit regeneration only.']:[]),'Remaining unimplemented proc talents, racials, enemy movement and cast-time effects, set effects, item use, dynamic buffs and debuffs, school vulnerabilities, mana rules and threat policies may change actual results.',...(actions.some(a=>a.sealModel)?['Seals are activated by rotation actions, start inactive, and are mutually exclusive. '+(encounter.sealTwist?'Explicit directional twisting is enabled; overlap timing and eligibility are not live verified.':'Seal twisting is disabled unless an explicit overlap policy is supplied.')+' Wisdom and Light support the player’s configured mana and healing procs; Crusader applies configurable AP, haste, attack penalty and Judgement holy vulnerability. Raidwide proc distribution, Crusader haste overlap and proc chaining remain unimplemented.']:[]),...(actions.some(a=>a.elementalShieldModel)?['Elemental shields respond only to scripted incoming hits with configured schools, ICD, amount and scaling. Stable Shields, Call of Earth, Improved Water Shield and Undertow use imported talent values; Lightning Strike has explicit empowered-shield policies. Pushback and off-player shields remain unimplemented.']:[]),...(imbueModel?['Explicit main-hand Shaman weapon imbue is active from encounter start; no recast or totem interaction; Elemental Weapons follows imported talent descriptions with explicit unresolved policies.']:[]),...(companion?['Companion uses explicit observed stats, learned rank confirmations, damage and resource policies; no inferred family base stats or automatic owner scaling. Explicit damage, periodic damage, area targeting and threat-only utility are available; other special ability effects, pet training and other talent inheritance remain incomplete. Hunter Unleashed Fury, Bestial Discipline, Ferocity, Spirit Bond and Frenzy use explicit static inclusion and dynamic talent policies.']:[]),...(poisonConfig?['Explicit per-hand poison policies are active; application rates, charge semantics and resistances require live verification. Wound healing reduction is modelled; Crippling and Mind-numbing track debuffs but do not yet simulate enemy movement or enemy casting.']:[]),...(castProcData.procs.length?['Configured timed cast procs: '+castProcData.procs.map(x=>x.name).join(', ')+'. Imported talent descriptions, not live-verified timing.']:[]),...castProcData.omitted,encounter.incomingDamage?.length?'Healing uses explicit scripted incoming damage.':'Healing uses a fixed explicit ally deficit; no incoming damage is assumed.'],liveVerified:false};
}
export function runReferenceScenario(prepared,{seed,iterations}){
 if(!prepared||prepared.liveVerified!==false||prepared.scenario.mode!=='research')throw new Error('Prepared reference scenario required');
 const create=s=>createExplicitClassEncounter({...prepared.scenario,seed:s});
 const sample=create(seed).run(),report=combatReport(sample);
 const healing=prepared.scenario.actions.some(a=>a.sealModel?.kind==='light'||a.elementalShieldModel?.kind==='earth'||a.effects.some(e=>e.kind==='heal'||e.kind==='periodic-heal'||e.leech)),absorbing=prepared.scenario.actions.some(a=>a.effects.some(e=>e.kind==='absorb')),damaging=prepared.scenario.actions.some(a=>a.targets.includes('enemy')||a.elementalShieldModel?.kind==='lightning')||prepared.scenario.autos.length>0||!!prepared.scenario.companionPriority?.abilities.length;
 const manaReturning=prepared.scenario.actions.some(a=>a.sealModel?.kind==='wisdom'||a.elementalShieldModel?.kind==='water'||a.effects.some(e=>e.kind==='health-to-resource'));const type=absorbing&&!healing&&!damaging?'aps':healing&&!damaging?'hps':manaReturning&&!damaging&&!healing?'manaPerSecond':'dps';const aps=r=>r.events.filter(e=>e.type==='absorb'&&e.actorId===actor).reduce((n,e)=>n+e.amount,0)/(r.durationMs/1000);
 const metric=r=>{if(type==='aps')return aps(r);if(type==='manaPerSecond')return resourceThroughput(r,actor,'mana').perSecond.effectiveGain;const t=r.attribution.actors[actor].totals;return (type==='hps'?t.allyHealing:t.enemyDamage)/(r.durationMs/1000);};
 const pet=prepared.scenario.petId;const petDps=r=>r.attribution.actors[pet].totals.enemyDamage/(r.durationMs/1000),playerDps=r=>r.attribution.actors[actor].totals.enemyDamage/(r.durationMs/1000);const stats=runIterations({seed,iterations,createEncounter:create,metrics:{[type]:metric,...(pet?{petDps,combinedDps:r=>playerDps(r)+petDps(r)}:{}),...(Object.hasOwn(prepared.scenario.pools,'mana')?{...(type==='manaPerSecond'?{}:{manaPerSecond:r=>resourceThroughput(r,actor,'mana').perSecond.effectiveGain}),manaOverflowPerSecond:r=>resourceThroughput(r,actor,'mana').perSecond.overflow,manaSpentPerSecond:r=>resourceThroughput(r,actor,'mana').perSecond.spent,netManaPerSecond:r=>resourceThroughput(r,actor,'mana').perSecond.net}:{}),...(healing&&damaging?{hps:r=>r.attribution.actors[actor].totals.allyHealing/(r.durationMs/1000)}:{}),...(absorbing&&type!=='aps'?{aps}:{} )}});
 return {kind:'reference-only',metric:type,rankRows:prepared.rankRows,limitations:prepared.limitations,statistics:stats.metrics[type],allStatistics:stats.metrics,example:report,exampleEvents:sample.events,liveVerified:false};
}
