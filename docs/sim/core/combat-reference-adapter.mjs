import {characterStats} from './character-stats.mjs';
import {validateBuild} from './builds.mjs';
import {equipmentErrors} from './items.mjs';
import {enchantAvailable,ENCHANTS,CURRENT_ENCHANT_PHASE} from './equipment-options.mjs';
import {compileReferenceRank} from './combat-rank-compiler.mjs';
import {referenceRanks} from './combat-reference-ranks.mjs';
import {createExplicitClassEncounter} from './combat-class-runtime.mjs';
import {physicalAttackTable} from './combat-attack-tables.mjs';
import {physicalArmourReduction} from './combat-math.mjs';
import {runIterations} from './combat-statistics.mjs';
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
 const effects=[{kind:'damage',when:'always',school:'physical',formula:{min:finite(w.min,'weapon damage'),max:finite(w.max,'weapon maximum damage'),terms:[],multiplier:1},outcomes:table.outcomes,mitigation:physicalArmourReduction({attackerLevel:snap.level,armour:w.targetArmour}),flatReduction:0,threat:policy.threat===null?null:{coefficient:finite(policy.threat.damage,'threat coefficient'),flat:0,multipliers:[],distribution:'each'}}];
 return {id:hand,actorId:actor,source:hand==='mainhand'?'Main-hand auto attack':'Off-hand auto attack',intervalMs:Math.round(finite(w.intervalSeconds,'swing interval',.01)*1000),firstAtMs:policy.firstSwing==='immediate'?0:Math.round(w.intervalSeconds*1000),castPolicy:policy.autoCastPolicy,minRangeYards:0,maxRangeYards:5,effects};
}
// Build-based research adapter. An explicit selection of learned ranks and
// complete ruleset is mandatory. Unsupported priority actions never disappear.
export function prepareReferenceScenario({build:raw,talents,gearById={},learnedSpellIds,rankByAbility,policies,encounter,rows:explicitRows=null}){
 const build=validateBuild(raw,talents),gear=readGear(build,gearById),sheet=characterStats(build,talents,gear),snap=sheet.combatSnapshot;
 if(build.level!==60||!Number.isFinite(snap.health)||sheet.baseAudit.status!=='reference-only')throw new Error('Complete level-60 reference base stats required');
 if(build.trinketSwap?.enabled)throw new Error('Trinket swaps are not implemented in the reference adapter');
 if(build.classOptions.pet&&build.classOptions.pet!=='None')throw new Error('Companion statistics require a separate explicit companion ruleset');
 const rows=explicitRows??build.controls.rotationRows;
 if(!Array.isArray(rows)||!rows.length)throw new Error('Explicit supported rotation required');
 if(!encounter||encounter.mode!=='reference-research'||encounter.acknowledgeIncompleteEffects!==true)throw new Error('Explicit research acknowledgement required');
 const position=encounter.position;if(!['behind','front','side'].includes(position))throw new Error('Explicit target position required');
 const distance=finite(encounter.distanceYards,'target distance');
 const allyDistance=finite(encounter.allyDistanceYards,'ally distance');
 const normalized=rows.map(row=>{
  const aid=abilityKey(build.classId,row.ability);
  if(!Number.isSafeInteger(rankByAbility?.[aid]))throw new Error('No explicitly selected reference rank for '+row.ability);
  if(!['primary','cycle','ally'].includes(row.target??'primary'))throw new Error('Unsupported reference rotation target: '+row.target);
  for(const c of row.conditions||[])if(!supportedConditions.has(c.metric))throw new Error('Unsupported reference rotation condition: '+c.metric);
  return {...row,abilityId:aid,target:row.target??'primary',conditions:row.conditions||[]};
 });
 const actions=[],stats={};const rankRows=[];
 for(const aid of new Set(normalized.map(r=>r.abilityId))){
  const spellId=rankByAbility[aid],policy=policies?.[aid];
  if(!policy)throw new Error('Explicit mechanics policy required for '+aid);
  if(policy.physical&&policy.physical.position!==position)throw new Error('Attack table position differs from encounter geometry');
  if(!Number.isSafeInteger(policy.phase))throw new Error('Explicit rank phase required');
  const compiled=compileReferenceRank({build,sheet,gear,spellId,learnedSpellIds,policy,actorId:actor});
  if(compiled.action.abilityId!==aid)throw new Error('Selected rank belongs to a different ability');
  for(const [k,v] of Object.entries(compiled.stats)){if(Number.isFinite(v)&&Object.hasOwn(stats,k)&&stats[k]!==v)throw new Error('Conflicting stat representations: '+k);if(Number.isFinite(v))stats[k]=v;}
  const myRows=normalized.filter(r=>r.abilityId===aid);
  if(myRows.some(r=>(r.target==='ally')!==compiled.action.targets.includes('ally')))throw new Error('Rotation target role mismatch for '+aid);
  if(encounter.recastPeriodic==='after-expiry'&&compiled.rank.refreshStrategy!=='do-not-gate'&&compiled.action.effects.some(e=>e.kind.startsWith('periodic')))compiled.action.refreshGate={kind:compiled.action.targets[0]==='ally'?'buff':'debuff',name:ROTATION_REGISTRY[build.classId].abilityRegistry[aid].name,remainingMs:0};
  actions.push(compiled.action);rankRows.push({abilityId:aid,spellId,rank:compiled.rank.rank,source:compiled.rank.source,referenceSource:compiled.rank.referenceSource,provenance:compiled.provenance});
 }
 if(!['after-expiry','rotation-only'].includes(encounter.recastPeriodic))throw new Error('Explicit periodic recast policy required');
 const pools={};
 if(build.classId==='warrior')pools.rage={current:Math.min(snap.maxRage,build.classOptions.startingRage),max:snap.maxRage};
 else if(build.classId==='rogue')pools.energy={current:Math.min(snap.maxEnergy,build.classOptions.startingEnergy),max:snap.maxEnergy};
 else pools.mana={current:finite(snap.mana,'mana pool')*build.classOptions.startingMana/100,max:snap.mana};
 for(const x of encounter.regeneration||[])if(!Object.hasOwn(pools,x.resource))throw new Error('Regeneration references unavailable resource');
 const autos=[];
 if(bool(encounter.includeMelee,'auto-attack choice')){
   const p=encounter.autoPolicy;
   if(!p||!['immediate','after-interval'].includes(p.firstSwing)||!['continue','skip-during-cast'].includes(p.autoCastPolicy)||p.physical?.position!==position)throw new Error('Explicit matching auto-attack timing and position required');
   for(const hand of ['mainhand','offhand'])if(gear[hand]?.classs===2)autos.push(whiteAttack(snap,hand,p));
 }
 if(actions.some(a=>a.kind==='queued-melee')&&!autos.some(a=>a.id==='mainhand'))throw new Error('Queued strike requires enabled main-hand swings');
 const durationMs=int(encounter.durationMs,'encounter duration',1);
 if(durationMs>3600000)throw new Error('Encounter exceeds maximum duration');
 const enemyHealth=finite(encounter.enemyHealth,'enemy health',1),allyMax=finite(encounter.allyMaxHealth,'ally maximum health',1),allyHealth=finite(encounter.allyHealth,'ally health',1);
 if(allyHealth>allyMax)throw new Error('Ally health exceeds cap');
 const hasHealing=actions.some(a=>a.targets.includes('ally'));
 const units=[{id:actor,maxHealth:snap.health},{id:boss,maxHealth:enemyHealth},...(hasHealing?[{id:ally,maxHealth:allyMax,health:allyHealth}]:[])];
 const classContext={...build.classOptions};
 const sc={mode:'research',provenance:'Build-based reference mechanics; not live verified',classId:build.classId,level:build.level,durationMs,decisionIntervalMs:int(encounter.decisionIntervalMs,'decision interval',1),pools,units,playerId:actor,primaryId:boss,targetIds:[boss],allyIds:hasHealing?[ally]:[],stats:{[actor]:stats},classContext,geometry:{[actor]:{[boss]:{distance,position},...(hasHealing?{[ally]:{distance:allyDistance,position:'front'}}:{})}},rows:normalized,actions,autos,regeneration:encounter.regeneration||[],...(build.classId==='rogue'?{comboPoints:{cap:5,initialTarget:boss,initialPoints:build.classOptions.comboPoints}}:{})};
 return {scenario:sc,rankRows,sourceNote:sheet.sourceNote,limitations:['Reference base stats, hit tables and coefficients are not live verified.','Only selected compiled ranks, static sheet effects, explicit regeneration and optional melee swings are executed.','Unimplemented proc talents, racials, poisons, set effects, item use, dynamic buffs and debuffs, school vulnerabilities, mana rules and threat policies may change actual results.','Healing uses a fixed explicit ally deficit; no incoming damage is assumed.'],liveVerified:false};
}
export function runReferenceScenario(prepared,{seed,iterations}){
 if(!prepared||prepared.liveVerified!==false||prepared.scenario.mode!=='research')throw new Error('Prepared reference scenario required');
 const create=s=>createExplicitClassEncounter({...prepared.scenario,seed:s});
 const sample=create(seed).run(),report=combatReport(sample);
 const healing=prepared.scenario.actions.some(a=>a.targets.includes('ally')),damaging=prepared.scenario.actions.some(a=>a.targets.includes('enemy'))||prepared.scenario.autos.length>0;
 const type=healing&&!damaging?'hps':'dps';
 const metric=r=>{const t=r.attribution.actors[actor].totals;return (type==='hps'?t.allyHealing:t.enemyDamage)/(r.durationMs/1000);};
 const stats=runIterations({seed,iterations,createEncounter:create,metrics:{[type]:metric,...(healing&&damaging?{hps:r=>r.attribution.actors[actor].totals.allyHealing/(r.durationMs/1000)}:{})}});
 return {kind:'reference-only',metric:type,rankRows:prepared.rankRows,limitations:prepared.limitations,statistics:stats.metrics[type],allStatistics:stats.metrics,example:report,exampleEvents:sample.events,liveVerified:false};
}
