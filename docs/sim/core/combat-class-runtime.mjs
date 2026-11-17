import {CombatEncounter} from './combat-execution.mjs';
import {expectedOutcome} from './combat-math.mjs';
import {sampleAttack} from './combat-attack-tables.mjs';
import {scheduleResourceRegen,attemptProc,REFERENCE_PRIORITIES as P} from './combat-timeline.mjs';
import {ROTATION_REGISTRY} from './rotations/registry.mjs';
import {rankEvidence} from './combat-rank-evidence.mjs';
// Experimental explicit-rank execution: every numerical field must be
// supplied by a reviewed ruleset (or clearly labelled synthetic fixture).
// Registry identities and database observations do not constitute live proof.
export const CLASS_RUNTIME_REVISION='octo-class-runtime-20261117-1';
export const CLASS_RESOURCES=Object.freeze({warrior:['rage'],rogue:['energy'],paladin:['mana'],hunter:['mana'],mage:['mana'],warlock:['mana','soulShards'],druid:['mana','energy','rage'],shaman:['mana'],priest:['mana']});
const finite=(x,n,min=-Infinity)=>{if(!Number.isFinite(x)||x<min)throw new Error('Invalid '+n);return x;};
const int=(x,n,min=0)=>{if(!Number.isSafeInteger(x)||x<min)throw new Error('Invalid '+n);return x;};
const id=(x,n='identifier')=>{if(typeof x!=='string'||!x.trim())throw new Error('Invalid '+n);return x;};
const bool=(x,n)=>{if(typeof x!=='boolean')throw new Error('Explicit '+n+' required');return x;};
const choose=(x,vals,n)=>{if(!vals.includes(x))throw new Error('Invalid '+n);return x;};
const has=(o,k)=>o!=null&&Object.hasOwn(o,k);
const trigger=(when,landed)=>when==='always'||(when==='landed'&&landed===true)||(when==='missed'&&landed===false);
function validateFormula(f,stats,comboEnabled){
 if(!f||typeof f!=='object')throw new Error('Explicit formula required');
 const checkStat=k=>{id(k,'stat');finite(stats?.[k],k);};
 const bounds=(a,b)=>{finite(a,'base minimum',0);finite(b,'base maximum',a);};
 if(f.comboRanges){if(!comboEnabled||!Array.isArray(f.comboRanges)||!f.comboRanges.length)throw new Error('Combo ranges require bank');for(const r of f.comboRanges){if(!Array.isArray(r)||r.length!==2)throw new Error('Invalid combo range');bounds(r[0],r[1]);}}
 else bounds(f.min,f.max);
 if(!Array.isArray(f.terms))throw new Error('Explicit formula terms required');
 for(const t of f.terms){checkStat(t.stat);finite(t.coefficient,'coefficient');if(t.perComboPoint!==undefined){bool(t.perComboPoint,'per-combo-point flag');if(t.perComboPoint&&!comboEnabled)throw new Error('Combo term requires bank');}}
 if(f.weapon){checkStat(f.weapon.minStat);checkStat(f.weapon.maxStat);bounds(stats[f.weapon.minStat],stats[f.weapon.maxStat]);finite(f.weapon.coefficient,'weapon coefficient',0);}
 finite(f.multiplier,'formula multiplier',0);
}
function range(e,target,actor,f,stats){
 const points=e.comboPoints?.points(target)??0;
 const base=f.comboRanges?f.comboRanges[points-1]:[f.min,f.max];
 if(!base)throw new Error('Explicit combo-point rank range unavailable');
 const stat=k=>e.auras.stat(actor,k,finite(stats[k],k));
 let extra=0;for(const t of f.terms)extra+=stat(t.stat)*t.coefficient*(t.perComboPoint?points:1);
 const wm=f.weapon?f.weapon.coefficient:0;
 const a=(base[0]+extra+(f.weapon?stat(f.weapon.minStat)*wm:0))*f.multiplier;
 const b=(base[1]+extra+(f.weapon?stat(f.weapon.maxStat)*wm:0))*f.multiplier;
 if(b<a)throw new Error('Dynamic damage range is reversed');
 return {min:Math.max(0,a),max:Math.max(0,b)};
}
function validateOutcomes(outcomes){expectedOutcome({min:0,max:0,outcomes});if(outcomes.some(o=>typeof o.landed!=='boolean'))throw new Error('Explicit outcome landed flags required');}
function validateThreat(t){
 if(t===null)return;
 if(!t||!Array.isArray(t.multipliers))throw new Error('Explicit threat model or null required');
 finite(t.coefficient,'threat coefficient',0);finite(t.flat,'flat threat',0);for(const v of t.multipliers)finite(v,'threat multiplier',0);choose(t.distribution,['each','split'],'threat distribution');
}
function validateEffects(effects,ctx,depth=0){
 if(!Array.isArray(effects)||!effects.length||depth>4)throw new Error('Invalid effect list or proc recursion');
 for(const x of effects){
  choose(x.when,['always','landed','missed'],'effect trigger');
  if(['damage','heal','periodic-damage','periodic-heal'].includes(x.kind)){
   validateFormula(x.formula,ctx.stats,ctx.comboEnabled);validateOutcomes(x.outcomes);validateThreat(x.threat);
   finite(x.mitigation,'mitigation',0);if(x.mitigation>1)throw new Error('Invalid mitigation');finite(x.flatReduction,'flat reduction',0);
   if(x.kind.startsWith('periodic')){if(x.formula.comboRanges||x.formula.terms.some(t=>t.perComboPoint))throw new Error('Periodic combo scaling requires explicit application snapshot adapter');int(x.durationMs,'periodic duration',1);int(x.intervalMs,'tick interval',1);choose(x.refresh,['restart','preserve-next-tick'],'refresh');bool(x.tickAtExpiry,'expiry tick');choose(x.snapshot,['snapshot','dynamic'],'snapshot policy');validateOutcomes(x.applicationOutcomes);id(x.auraName,'aura name');}
  }else if(x.kind==='resource'){
   if(!has(ctx.pools,x.resource))throw new Error('Unknown effect resource '+x.resource);finite(x.delta,'resource delta');
  }else if(x.kind==='combo-gain'){
   if(!ctx.comboEnabled)throw new Error('Combo effect requires target bank');int(x.points,'combo gain',1);
  }else if(x.kind==='combo-spend'){
   if(!ctx.comboEnabled)throw new Error('Combo effect requires target bank');if(x.points!=='all')int(x.points,'combo spend',1);
  }else if(x.kind==='aura'){
   if(!x.aura)throw new Error('Explicit aura required');id(x.aura.id,'aura id');id(x.aura.name,'aura name');choose(x.aura.kind,['buff','debuff'],'aura kind');choose(x.aura.stackPolicy,['replace','add','max'],'stack policy');choose(x.aura.refreshPolicy,['refresh','preserve'],'aura refresh policy');int(x.aura.maxStacks,'max stacks',1);int(x.aura.stacks,'stacks',1);int(x.aura.durationMs,'aura duration',1);if(!Array.isArray(x.aura.modifiers))throw new Error('Explicit aura modifiers required');
  }else if(x.kind==='proc'){
   id(x.id,'proc id');finite(x.chance,'proc chance',0);if(x.chance>1)throw new Error('Invalid proc chance');int(x.internalCooldownMs,'proc ICD');validateEffects(x.effects,ctx,depth+1);
  }else if(x.kind==='taunt'){
   bool(x.matchHighest,'match highest threat');int(x.forcedMs,'taunt duration');
  }else throw new Error('Unsupported rank effect '+x.kind);
 }
}
function executeEffects(e,actor,target,source,effects,stats,enemyIds,depth=0){
 let landed=null;
 const resolve=(x,amountRange)=>{
  const hit=sampleAttack({...amountRange,outcomes:x.outcomes,mitigation:x.mitigation,flatReduction:x.flatReduction,random:e.random});
  e.recordMechanic('attack-result',{actorId:actor,targetId:target,source,school:x.school??null,...hit});
  // A miss does not generate hit-dependent flat threat; landed zero damage can.
  if(!hit.landed)return hit;
  let threat=x.threat===null?null:{actorId:actor,...x.threat};const isHeal=x.kind.endsWith('heal');
  if(threat&&isHeal){const alive=enemyIds.filter(id=>e.unit(id).alive);threat=alive.length?{...threat,enemyIds:alive}:null;}
  const value=hit.raw;
  if(isHeal)e.heal({actorId:actor,targetId:target,source,value,threat});else e.damage({actorId:actor,targetId:target,source,value,threat});
  return hit;
 };
 for(const [index,x] of effects.entries()){
  if(!e.unit(actor).alive||!e.unit(target).alive)break;
  if(!trigger(x.when,landed))continue;
  if(x.kind==='damage'||x.kind==='heal'){landed=resolve(x,range(e,target,actor,x.formula,stats)).landed;}
  else if(x.kind.startsWith('periodic-')){
   const application=sampleAttack({min:0,max:0,outcomes:x.applicationOutcomes,random:e.random});landed=application.landed;e.recordMechanic('attack-result',{actorId:actor,targetId:target,source:source+' (apply)',school:x.school??null,...application});
   if(!landed)continue;
   const periodicId=JSON.stringify([actor,target,source,index,depth]),kind=x.kind.endsWith('heal')?'buff':'debuff';
   const snap=x.snapshot==='snapshot'?range(e,target,actor,x.formula,stats):null;
   e.auras.apply({id:periodicId,name:x.auraName,targetId:target,ownerId:actor,kind,durationMs:x.durationMs,maxStacks:1,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh'});
   e.periodic.apply({id:periodicId,durationMs:x.durationMs,intervalMs:x.intervalMs,refresh:x.refresh,tickAtExpiry:x.tickAtExpiry,tickPriority:P.tick,expirePriority:P.expire,snapshot:snap,onTick:p=>{
    if(!e.unit(actor).alive||!e.unit(target).alive){e.periodic.remove(periodicId);e.auras.remove({id:periodicId,targetId:target,ownerId:actor,kind},'unit-dead');return;}
    resolve(x,p.snapshot??range(e,target,actor,x.formula,stats));
   }});
  }else if(x.kind==='resource'){const change=e.resources.change([{resource:x.resource,delta:x.delta}]);if(!change.ok)throw new Error('Effect resource payment failed: '+x.resource);e.recordMechanic('resource-change',{actorId:actor,source,resource:x.resource,delta:x.delta,overflow:change.overflow[x.resource]??0});}
  else if(x.kind==='combo-gain'){e.comboPoints.gain(target,x.points);e.recordMechanic('combo-change',{actorId:actor,source,...e.comboPoints.snapshot()});}
  else if(x.kind==='combo-spend'){const spent=e.comboPoints.spend(target,x.points);e.recordMechanic('combo-change',{actorId:actor,source,spent,...e.comboPoints.snapshot()});}
  else if(x.kind==='aura'){const who=x.auraTarget==='actor'?actor:target;e.auras.apply({...x.aura,targetId:who,ownerId:actor});}
  else if(x.kind==='proc'){const result=attemptProc(e.resources.cooldowns,{id:'proc:'+actor+':'+x.id,chance:x.chance,internalCooldownMs:x.internalCooldownMs},e.random);if(result.proc===true||result.triggered===true||result===true){e.recordMechanic('proc',{actorId:actor,targetId:target,source,procId:x.id});executeEffects(e,actor,target,source+' → '+x.id,x.effects,stats,enemyIds,depth+1);}}
  else if(x.kind==='taunt')e.threat.taunt({enemyId:target,actorId:actor,matchHighest:x.matchHighest,forcedMs:x.forcedMs});
 }
 return landed;
}
function geometry(scenario,actor,target){
 const x=scenario.geometry?.[actor]?.[target];if(!x)throw new Error('Explicit geometry missing for '+actor+' → '+target);
 return {distance:finite(x.distance,'distance',0),position:choose(x.position,['front','behind','side','self'],'position')};
}
export function createExplicitClassEncounter(input){
 const sc=structuredClone(input),classId=sc.classId,profile=ROTATION_REGISTRY[classId];
 if(!profile||!CLASS_RESOURCES[classId])throw new Error('Unsupported class');
 if(sc.mode!=='research'||!id(sc.provenance,'ruleset provenance'))throw new Error('Explicit research mode required');
 int(sc.level,'character level',1);if(sc.level>60)throw new Error('Unsupported character level');
 if(!sc.pools||!sc.stats||!Array.isArray(sc.actions)||!Array.isArray(sc.autos)||!Array.isArray(sc.regeneration))throw new Error('Explicit class scenario required');
 const primaryResource=CLASS_RESOURCES[classId][0];if(!has(sc.pools,primaryResource))throw new Error('Class primary resource is missing: '+primaryResource);
 const allowed=new Set([...CLASS_RESOURCES[classId],...(classId==='hunter'?['petFocus','ammo']:classId==='warlock'?['petMana']:[])]);
 for(const k of Object.keys(sc.pools))if(!allowed.has(k))throw new Error('Unsupported class resource: '+k);
 if(sc.comboPoints&&!['rogue','druid'].includes(classId))throw new Error('Combo bank unsupported for class');
 if(sc.petId&&!['hunter','warlock'].includes(classId))throw new Error('Companion engine unsupported for class');
 const actors=new Set([sc.playerId,...(sc.petId?[sc.petId]:[])]),statsFor=actor=>{const s=sc.stats[actor];if(!s)throw new Error('Explicit actor stats missing: '+actor);return s;};
 const contextFor=actor=>({stats:statsFor(actor),pools:sc.pools,comboEnabled:!!sc.comboPoints});
 const actions=sc.actions.map(a=>{
  const ability=profile.abilityRegistry[a.abilityId];if(!ability)throw new Error('Unregistered class ability '+a.abilityId);
  const rank=int(a.rank,'learned rank',1),spellId=int(a.spellId,'spell id',1),learnLevel=int(a.learnLevel,'learn level',1);
  if(sc.level<learnLevel)throw new Error('Rank not available at selected level');
  if(!ability.spellIds?.includes(spellId)&&!ability.candidateSpells?.some(s=>s.id===spellId)&&!rankEvidence(a.abilityId,spellId))throw new Error('Spell identity not registered for this ability');
  id(a.source,'rank source');choose(a.evidenceStatus,['published-partial','reference','synthetic','live-observation'],'evidence status');
  if(!actors.has(a.actorId)||a.actorId!==sc.playerId)throw new Error('Priority actions must belong to player; use independent companion autos');
  const ctx=contextFor(a.actorId);
  if(!Array.isArray(a.costs)||!Array.isArray(a.effects)||!Array.isArray(a.targets)||!a.targets.length)throw new Error('Explicit ability costs, effects and targets required');
  for(const c of a.costs){if(!has(sc.pools,c.resource))throw new Error('Unknown action resource');finite(c.amount,'resource cost',0);}
  validateEffects(a.effects,ctx);
  const castMs=int(a.castMs,'cast time'),gcdMs=int(a.gcdMs,'GCD'),cooldownMs=int(a.cooldownMs,'ability cooldown');
  if(a.kind==='channel'){int(a.tickMs,'channel interval',1);bool(a.tickAtEnd,'final channel tick');}
  if(a.kind==='queued-melee')id(a.swingId,'swing identity');
  const min=finite(a.minRangeYards,'minimum range',0),max=finite(a.maxRangeYards,'maximum range',min);
  if(a.position!==null)choose(a.position,['front','behind','side','self'],'position restriction');
  if(a.comboRequired!==null){if(!sc.comboPoints)throw new Error('Combo requirement without bank');int(a.comboRequired,'combo requirement',1);}
  if(a.requiredContext!==null&&(!a.requiredContext||typeof a.requiredContext!=='object'||Array.isArray(a.requiredContext)))throw new Error('Explicit context restriction required');
  if(a.requiredContext)for(const [k,v] of Object.entries(a.requiredContext))if(!has(sc.classContext,k))throw new Error('Required class context missing: '+k);
  const apply=(e,t)=>executeEffects(e,a.actorId,t,ability.name,a.effects,ctx.stats,sc.targetIds);
  const cooldowns=[...(gcdMs?[{id:'gcd',duration:gcdMs}]:[]),...(cooldownMs?[{id:a.abilityId,duration:cooldownMs}]:[])];
  if(a.sharedCooldown!==null){id(a.sharedCooldown?.id,'shared cooldown id');int(a.sharedCooldown?.durationMs,'shared cooldown duration',1);cooldowns.push({id:'shared:'+a.sharedCooldown.id,duration:a.sharedCooldown.durationMs});}
  return {id:a.abilityId,name:ability.name,kind:a.kind,castMs,costs:a.costs.map(x=>({resource:x.resource,delta:-x.amount})),cooldowns,targets:a.targets,available:()=>!a.requiredContext||Object.entries(a.requiredContext).every(([k,v])=>sc.classContext[k]===v),availableForTarget:(e,t)=>{const geo=geometry(sc,a.actorId,t);return geo.distance>=min&&geo.distance<=max&&(a.position===null||geo.position===a.position)&&(a.comboRequired===null||e.comboPoints.points(t)>=a.comboRequired);},...(a.kind==='channel'?{tickMs:a.tickMs,tickAtEnd:a.tickAtEnd,onTick:apply}:a.kind==='queued-melee'?{swingId:a.swingId,resolve:apply}:{resolve:apply}),rank,spellId};
 });
 const knownAbilities=Object.fromEntries(sc.actions.map(a=>[profile.abilityRegistry[a.abilityId].name,a.rank]));
 const e=new CombatEncounter({durationMs:sc.durationMs,decisionIntervalMs:sc.decisionIntervalMs,seed:sc.seed,pools:sc.pools,units:sc.units,playerId:sc.playerId,primaryId:sc.primaryId,targetIds:sc.targetIds,allyIds:sc.allyIds,petId:sc.petId??null,comboPoints:sc.comboPoints??null,rows:sc.rows,actions,manageAuras:true,context:()=>({...sc.classContext,knownAbilities,abilityRanks:knownAbilities})});
 for(const a of sc.autos){
  if(!actors.has(a.actorId))throw new Error('Unknown auto-attack actor');const ctx=contextFor(a.actorId);validateEffects(a.effects,ctx);id(a.source,'auto source');int(a.intervalMs,'auto interval',1);int(a.firstAtMs,'first auto time');
  e.addAutoAttack({id:a.id,intervalMs:a.intervalMs,firstAtMs:a.firstAtMs,castPolicy:a.castPolicy,resolve:(enc,t)=>{if(enc.unit(a.actorId).alive){const g=geometry(sc,a.actorId,t);if(g.distance>=finite(a.minRangeYards,'auto minimum range',0)&&g.distance<=finite(a.maxRangeYards,'auto maximum range',0))executeEffects(enc,a.actorId,t,a.source,a.effects,ctx.stats,sc.targetIds);}}});
 }
 for(const r of sc.regeneration){if(!has(sc.pools,r.resource))throw new Error('Unknown regeneration resource');scheduleResourceRegen(e.periodic,e.resources,{...r,onTick:x=>e.recordMechanic('resource-change',{actorId:sc.playerId,source:r.id,resource:r.resource,delta:x.snapshot.amount,overflow:x.result.overflow[r.resource]??0})});}
 return e;
}
