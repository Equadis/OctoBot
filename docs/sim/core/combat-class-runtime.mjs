import {activeSeal,sealProcEffect,sealProbability} from './combat-seal-reference.mjs';
import {createPoisonRuntime} from './combat-poison-reference.mjs';
import {validateCastProc} from './combat-cast-procs.mjs';
import {validateSwingRage,swingRage,validateIncomingRage,incomingRage} from './combat-rage-reference.mjs';
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
const trigger=(when,last)=>when==='always'||(when==='landed'&&last?.landed===true)||(when==='missed'&&last?.landed===false)||(when==='critical'&&last?.landed===true&&last?.critical===true)||(when==='noncritical'&&last?.landed===true&&last?.critical===false);
function validateFormula(f,stats,comboEnabled){
 if(!f||typeof f!=='object')throw new Error('Explicit formula required');
 const checkStat=k=>{id(k,'stat');finite(stats?.[k],k);};
 const bounds=(a,b)=>{finite(a,'base minimum',0);finite(b,'base maximum',a);};
 if(f.comboRanges){if(!comboEnabled||!Array.isArray(f.comboRanges)||!f.comboRanges.length)throw new Error('Combo ranges require bank');for(const r of f.comboRanges){if(!Array.isArray(r)||r.length!==2)throw new Error('Invalid combo range');bounds(r[0],r[1]);}}
 else bounds(f.min,f.max);
 if(!Array.isArray(f.terms))throw new Error('Explicit formula terms required');
 for(const t of f.terms){checkStat(t.stat);finite(t.coefficient,'coefficient');if(t.comboCoefficients!==undefined){if(!comboEnabled||!Array.isArray(t.comboCoefficients)||!t.comboCoefficients.length||t.comboCoefficients.some(n=>!Number.isFinite(n)))throw new Error('Explicit per-combo coefficients require bank');}
  if(t.perComboPoint!==undefined){bool(t.perComboPoint,'per-combo-point flag');if(t.perComboPoint&&!comboEnabled)throw new Error('Combo term requires bank');}}
 if(f.weapon){checkStat(f.weapon.minStat);checkStat(f.weapon.maxStat);bounds(stats[f.weapon.minStat],stats[f.weapon.maxStat]);finite(f.weapon.coefficient,'weapon coefficient',0);}
 finite(f.multiplier,'formula multiplier',0);
}
function range(e,target,actor,f,stats,baseFactor=1){
 const requiresPoints=!!f.comboRanges||f.terms.some(t=>t.perComboPoint||t.comboCoefficients);const points=requiresPoints?e.comboPoints.points(target):0;
 const base=f.comboRanges?f.comboRanges[points-1]:[f.min,f.max];
 if(!base)throw new Error('Explicit combo-point rank range unavailable');
 const stat=k=>e.auras.stat(actor,k,finite(stats[k],k));
 let extra=0;for(const t of f.terms)extra+=stat(t.stat)*(t.comboCoefficients?(t.comboCoefficients[points-1]??(()=>{throw new Error('Missing combo coefficient');})()):t.coefficient)*(t.perComboPoint?points:1);
 const wm=f.weapon?f.weapon.coefficient:0;
 const a=(base[0]*baseFactor+extra+(f.weapon?stat(f.weapon.minStat)*wm:0))*f.multiplier;
 const b=(base[1]*baseFactor+extra+(f.weapon?stat(f.weapon.maxStat)*wm:0))*f.multiplier;
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
  choose(x.when,['always','landed','missed','critical','noncritical'],'effect trigger');
  if(['damage','heal','periodic-damage','periodic-heal'].includes(x.kind)){
   validateFormula(x.formula,ctx.stats,ctx.comboEnabled);validateOutcomes(x.outcomes);validateThreat(x.threat);if(x.leech){if(!['damage','periodic-damage'].includes(x.kind))throw new Error('Leech requires damage');finite(x.leech.fraction,'leech fraction',0);choose(x.leech.basis,['effective','post-mitigation'],'leech basis');}if(x.channelApplicationOutcomes)validateOutcomes(x.channelApplicationOutcomes);if(x.swingRage){if(x.kind!=='damage'||!has(ctx.pools,'rage'))throw new Error('Swing rage requires rage pool and direct damage');validateSwingRage(x.swingRage);}
   if(x.ownedBleedBonus){if(!Array.isArray(x.ownedBleedBonus.names)||!x.ownedBleedBonus.names.length||x.ownedBleedBonus.names.some(v=>typeof v!=='string'))throw new Error('Explicit bleed names required');finite(x.ownedBleedBonus.fraction,'bleed factor',0);}if(x.tickResource){if(!x.kind.startsWith('periodic')||!has(ctx.pools,x.tickResource.resource))throw new Error('Periodic resource gain requires resource pool');finite(x.tickResource.amount,'tick resource gain',0);}
   finite(x.mitigation,'mitigation',0);if(x.mitigation>1)throw new Error('Invalid mitigation');finite(x.flatReduction,'flat reduction',0);
   if(x.additionalResource){if(x.kind!=='damage'||!has(ctx.pools,x.additionalResource.resource))throw new Error('Additional spend requires damage and known resource');finite(x.additionalResource.coefficient,'additional resource coefficient',0);finite(x.additionalResource.cap,'additional resource cap',0);choose(x.additionalResource.payment,['always','landed'],'additional spend policy');if(x.additionalResource.mode!==undefined)choose(x.additionalResource.mode,['fraction-of-base'],'additional resource mode');}
   if(x.kind.startsWith('periodic')){if((x.formula.comboRanges||x.formula.terms.some(t=>t.perComboPoint||t.comboCoefficients))&&x.snapshot!=='snapshot')throw new Error('Periodic combo scaling requires an application snapshot');int(x.durationMs,'periodic duration',1);if(x.durationByCombo){if(!ctx.comboEnabled||!Array.isArray(x.durationByCombo))throw new Error('Combo duration requires bank');for(const ms of x.durationByCombo)int(ms,'combo duration',1);}
   int(x.intervalMs,'tick interval',1);if(x.baseTickMultipliers!==undefined&&(!Array.isArray(x.baseTickMultipliers)||x.baseTickMultipliers.length!==Math.floor(x.durationMs/x.intervalMs)||x.baseTickMultipliers.some(n=>!Number.isFinite(n)||n<0)))throw new Error('Explicit periodic base multipliers must match tick count');if(x.replacePeriodicAuras!==undefined&&(!Array.isArray(x.replacePeriodicAuras)||x.replacePeriodicAuras.some(n=>typeof n!=='string'||!n)))throw new Error('Invalid periodic replacement set');if(x.tickMultipliers!==undefined&&(!Array.isArray(x.tickMultipliers)||x.tickMultipliers.length!==Math.floor(x.durationMs/x.intervalMs)||x.tickMultipliers.some(n=>!Number.isFinite(n)||n<0)))throw new Error('Explicit periodic tick multipliers must match tick count');choose(x.refresh,['restart','preserve-next-tick'],'refresh');bool(x.tickAtExpiry,'expiry tick');choose(x.snapshot,['snapshot','dynamic'],'snapshot policy');validateOutcomes(x.applicationOutcomes);id(x.auraName,'aura name');}
  }else if(x.kind==='consume-periodic'){
   id(x.auraName,'periodic source name');int(x.durationMs,'periodic consumption',1);
  }else if(x.kind==='health-to-resource'){
   validateFormula(x.formula,ctx.stats,ctx.comboEnabled);if(!has(ctx.pools,x.resource))throw new Error('Unknown health conversion resource');finite(x.factor,'resource conversion factor',0);
  }else if(x.kind==='absorb'){
   validateFormula(x.formula,ctx.stats,ctx.comboEnabled);id(x.id,'absorb id');int(x.durationMs,'absorb duration',1);choose(x.refresh,['replace','keep-stronger'],'absorb refresh');if(x.schools!==null&&(!Array.isArray(x.schools)||!x.schools.length||x.schools.some(s=>typeof s!=='string'||!s)))throw new Error('Explicit absorb school policy required');
  }else if(x.kind==='resource'){
   if(!has(ctx.pools,x.resource))throw new Error('Unknown effect resource '+x.resource);finite(x.delta,'resource delta');
  }else if(x.kind==='judgement'){choose(x.consume,['cast','landed'],'Judgement consume policy');
  }else if(x.kind==='combo-gain'){
   if(!ctx.comboEnabled)throw new Error('Combo effect requires target bank');int(x.points,'combo gain',1);
  }else if(x.kind==='combo-spend'){
   if(!ctx.comboEnabled)throw new Error('Combo effect requires target bank');if(x.points!=='all')int(x.points,'combo spend',1);
  }else if(x.kind==='aura'){
   choose(x.auraTarget,['actor','target'],'aura target');if(!x.aura)throw new Error('Explicit aura required');id(x.aura.id,'aura id');id(x.aura.name,'aura name');choose(x.aura.kind,['buff','debuff'],'aura kind');choose(x.aura.stackPolicy,['replace','add','max'],'stack policy');choose(x.aura.refreshPolicy,['refresh','preserve'],'aura refresh policy');int(x.aura.maxStacks,'max stacks',1);int(x.aura.stacks,'stacks',1);int(x.aura.durationMs,'aura duration',1);if(!Array.isArray(x.aura.modifiers))throw new Error('Explicit aura modifiers required');if(x.durationByCombo){if(!ctx.comboEnabled||!Array.isArray(x.durationByCombo)||!x.durationByCombo.length)throw new Error('Combo duration requires bank');for(const ms of x.durationByCombo)int(ms,'combo duration',1);}
  }else if(x.kind==='cooldown-reset'){id(x.abilityId,'reset ability id');if(!ctx.abilityIds?.has(x.abilityId))throw new Error('Cooldown reset references unknown action');
  }else if(x.kind==='proc'){
   id(x.id,'proc id');finite(x.chance,'proc chance',0);if(x.chance>1)throw new Error('Invalid proc chance');int(x.internalCooldownMs,'proc ICD');validateEffects(x.effects,ctx,depth+1);
  }else if(x.kind==='class-state'){
   id(x.key,'class state key');if(!ctx.classState||!has(ctx.classState,x.key)||!['stance','form','seal','aspect','shield','armour'].includes(x.key))throw new Error('Unsupported class state transition');id(x.value,'class state value');
  }else if(x.kind==='taunt'){
   bool(x.matchHighest,'match highest threat');int(x.forcedMs,'taunt duration');
  }else throw new Error('Unsupported rank effect '+x.kind);
 }
}
function gainRage(e,actor,source,delta){if(delta<=0)return;const q=e.resources.change([{resource:'rage',delta}]);if(!q.ok)throw new Error('Rage generation failed');e.recordMechanic('resource-change',{actorId:actor,source,resource:'rage',delta,overflow:q.overflow.rage??0});}
function executeEffects(e,actor,target,source,effects,stats,enemyIds,depth=0,classState={},castContext={}){
 let last=null,primaryHit=null;
 const resolve=(x,amountRange)=>{
  const chargeKey=x.school==='nature'?'chargedNatureBonusPct':x.school==='physical'?'chargedPhysicalBonusPct':null;const charge=chargeKey&&['damage','periodic-damage'].includes(x.kind)?[...(x.school==='nature'?e.auras.active(actor,'buff'):[]),...e.auras.active(target,'debuff')].find(a=>(x.school==='physical'||a.ownerId===actor)&&a.modifiers.some(m=>m.stat===chargeKey)):null;const chargeFactor=charge?1+charge.modifiers.find(m=>m.stat===chargeKey).value/100:1;const bleedFactor=x.ownedBleedBonus?1+x.ownedBleedBonus.fraction*e.auras.active(target,'debuff').filter(a=>a.ownerId===actor&&x.ownedBleedBonus.names.includes(a.name)).length:1;const damageEffect=['damage','periodic-damage'].includes(x.kind);const holyBonus=damageEffect&&x.school==='holy'?e.auras.stat(target,'holyDamageTakenFlat',0):0;const vengeance=damageEffect?1+e.auras.stat(actor,'vengeanceDamagePct',0)/100:1;amountRange={min:(amountRange.min+holyBonus)*chargeFactor*bleedFactor*vengeance,max:(amountRange.max+holyBonus)*chargeFactor*bleedFactor*vengeance};
  let outcomes=x.outcomes;if(castContext.guaranteeHit===true&&x.kind==='damage'){const landed=outcomes.filter(o=>o.landed),sum=landed.reduce((n,o)=>n+o.probability,0);if(sum<=0)throw new Error('Guaranteed cast has no landed outcome');outcomes=landed.map(o=>({...o,probability:o.probability/sum}));}
  const hit=sampleAttack({...amountRange,outcomes,mitigation:x.mitigation,flatReduction:x.flatReduction,random:e.random});
  e.recordMechanic('attack-result',{actorId:actor,targetId:target,source,school:x.school??null,...(x.hand?{hand:x.hand}:{}),...hit});
  // A miss does not generate hit-dependent flat threat; landed zero damage can.
  if(!hit.landed)return hit;if(charge&&hit.raw>0)e.auras.consume(charge,1);
  let threat=x.threat===null?null:{actorId:actor,...x.threat};const isHeal=x.kind.endsWith('heal');
  if(threat&&isHeal){const alive=enemyIds.filter(id=>e.unit(id).alive);threat=alive.length?{...threat,enemyIds:alive}:null;}
  if(threat&&damageEffect&&classState.righteousFury!=='On'){const reduction=e.auras.stat(actor,'vengeanceThreatReductionPct',0);if(reduction)threat={...threat,multipliers:[...threat.multipliers,Math.max(0,1-reduction/100)]};}
  const value=hit.raw;
  if(isHeal)e.heal({actorId:actor,targetId:target,source,value,threat});else {const damage=e.damage({actorId:actor,targetId:target,source,value,threat,school:x.school??null,leech:x.leech??null});if(x.swingRage&&e.unit(target).alive)gainRage(e,actor,source+' (rage)',swingRage(x.swingRage,hit,damage));if(depth===0&&x.kind==='damage'&&x.school==='physical'&&hit.raw>0&&!damage.ignored&&castContext.poisonRuntime)castContext.poisonRuntime.apply(e,{actor,target,hand:x.hand??castContext.hand??'mainhand',abilityId:castContext.abilityId,white:castContext.white===true,stats});
  if((depth===0||castContext.sealProc===true)&&hit.critical&&!damage.ignored&&classState.vengeanceRank>0&&e.unit(target).alive){const rank=classState.vengeanceRank;e.auras.apply({id:'vengeance',name:'Vengeance',targetId:actor,ownerId:actor,kind:'buff',durationMs:30000,maxStacks:3,stacks:1,stackPolicy:'add',refreshPolicy:'refresh',modifiers:[{stat:'vengeanceDamagePct',mode:'flat',value:rank},{stat:'vengeanceThreatReductionPct',mode:'flat',value:2*rank}]});}
  if(depth===0&&x.kind==='damage'&&x.school==='physical'&&hit.raw>0&&!damage.ignored&&castContext.white===true&&castContext.hand==='mainhand'&&castContext.sealModels?.size&&e.unit(target).alive){const s=activeSeal(e,actor,castContext.sealModels);if(s){const q=attemptProc(e.resources.cooldowns,{id:'seal:'+actor+':'+s.aura.id,chance:sealProbability(s.model),internalCooldownMs:s.model.internalCooldownMs},e.random);if(q.triggered){e.recordMechanic('proc',{actorId:actor,targetId:target,source:s.aura.name,procId:s.aura.id});executeEffects(e,actor,target,s.aura.name+' (proc)',[sealProcEffect(s.model,hit)],stats,enemyIds,depth+1,classState,{sealProc:true});}}}
  if(depth===0&&hit.raw>0&&!damage.ignored)for(const p of castContext.triggers??[]){if(!p.triggerKinds.includes(x.kind)||p.trigger==='critical'&&!hit.critical)continue;const roll=attemptProc(e.resources.cooldowns,{id:'cast-proc:'+actor+':'+p.id,chance:p.chance,internalCooldownMs:0},e.random);if(roll.triggered){e.recordMechanic('proc',{actorId:actor,targetId:target,source,procId:p.id});e.auras.apply({id:p.id,name:p.name,targetId:actor,ownerId:actor,kind:'buff',durationMs:p.durationMs,maxStacks:p.maxStacks,stacks:1,stackPolicy:'add',refreshPolicy:'refresh',modifiers:[]});}}}
  return hit;
 };
 for(const [index,x] of effects.entries()){
  if(!e.unit(actor).alive)break;
  if(!e.unit(target).alive&&!['resource','combo-gain','combo-spend','class-state'].includes(x.kind))continue;
  if(!trigger(x.when,x.kind==='proc'&&x.id==='primal-fury'?primaryHit:last))continue;
  if(x.kind==='damage'||x.kind==='heal'){const r=range(e,target,actor,x.formula,stats);const q=x.additionalResource;const extra=q?Math.min(e.resources.snapshot()[q.resource].current,q.cap):0;const bonus=q&&q.mode!=='fraction-of-base'?extra*q.coefficient*x.formula.multiplier:0,factor=q?.mode==='fraction-of-base'?1+extra*q.coefficient:1;last=resolve(x,{min:(r.min+bonus)*factor,max:(r.max+bonus)*factor});if(primaryHit===null)primaryHit=last;if(q&&extra>0&&(q.payment==='always'||last.landed)){const changed=e.resources.change([{resource:q.resource,delta:-extra}]);if(!changed.ok)throw new Error('Additional resource spend failed');e.recordMechanic('resource-change',{actorId:actor,source,resource:q.resource,delta:-extra,overflow:0});}}
  else if(x.kind.startsWith('periodic-')){
   const application=x.reusePreviousHit===true?(last===null?(()=>{throw new Error('No previous attack outcome to reuse');})():last):sampleAttack({min:0,max:0,outcomes:x.applicationOutcomes,random:e.random});last=application;if(x.reusePreviousHit!==true)e.recordMechanic('attack-result',{actorId:actor,targetId:target,source:source+' (apply)',school:x.school??null,...application});
   if(!last.landed)continue;
   const periodicId=JSON.stringify([actor,target,source,index,depth]),kind=x.kind.endsWith('heal')?'buff':'debuff';
   for(const other of e.auras.active(target,'debuff'))if(other.ownerId===actor&&x.replacePeriodicAuras?.includes(other.name)){e.periodic.remove(other.id);e.auras.remove(other,'replaced');}
   const snap=x.snapshot==='snapshot'?(x.baseTickMultipliers?{ticks:x.baseTickMultipliers.map(v=>range(e,target,actor,x.formula,stats,v))}:range(e,target,actor,x.formula,stats)):null;const durationMs=x.durationByCombo?x.durationByCombo[e.comboPoints.points(target)-1]:x.durationMs;if(!durationMs)throw new Error('Missing combo periodic duration');
   e.auras.apply({id:periodicId,name:x.auraName,targetId:target,ownerId:actor,kind,durationMs,maxStacks:1,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh'});
   e.periodic.apply({id:periodicId,durationMs,intervalMs:x.intervalMs,refresh:x.refresh,tickAtExpiry:x.tickAtExpiry,tickPriority:P.tick,expirePriority:P.expire,snapshot:snap,onTick:p=>{
    if(!e.unit(actor).alive||!e.unit(target).alive){e.periodic.remove(periodicId);e.auras.remove({id:periodicId,targetId:target,ownerId:actor,kind},'unit-dead');return;}
    const r=p.snapshot?.ticks?.[p.tickIndex-1]??p.snapshot??range(e,target,actor,x.formula,stats,x.baseTickMultipliers?.[p.tickIndex-1]??1),factor=x.tickMultipliers?.[p.tickIndex-1]??1;const landed=resolve(x,{min:r.min*factor,max:r.max*factor});if(x.tickResource&&landed.landed){const {resource,amount}=x.tickResource,q=e.resources.change([{resource,delta:amount}]);if(!q.ok)throw new Error('Periodic resource gain failed');e.recordMechanic('resource-change',{actorId:actor,source:source+' (periodic resource)',resource,delta:amount,overflow:q.overflow[resource]??0});}
   }});
  }else if(x.kind==='consume-periodic'){for(const a of e.auras.active(target,'debuff'))if(a.ownerId===actor&&a.name===x.auraName&&e.periodic.has(a.id)){e.periodic.shorten(a.id,x.durationMs);e.auras.shorten(a,x.durationMs);}}
  else if(x.kind==='health-to-resource'){const r=range(e,target,actor,x.formula,stats),cost=r.min===r.max?r.min:r.min+(r.max-r.min)*e.random();if(!e.spendHealth({actorId:actor,amount:cost,source}))throw new Error('Insufficient health for conversion');const delta=cost*x.factor,change=e.resources.change([{resource:x.resource,delta}]);if(!change.ok)throw new Error('Health conversion failed');e.recordMechanic('resource-change',{actorId:actor,source,resource:x.resource,delta,overflow:change.overflow[x.resource]??0});}
  else if(x.kind==='absorb'){const r=range(e,target,actor,x.formula,stats);const capacity=r.min===r.max?r.min:r.min+(r.max-r.min)*e.random();if(capacity>0)e.applyAbsorb({id:x.id,targetId:target,actorId:actor,source,amount:capacity,durationMs:x.durationMs,schools:x.schools,refresh:x.refresh});}
  else if(x.kind==='resource'){const change=e.resources.change([{resource:x.resource,delta:x.delta}]);if(!change.ok)throw new Error('Effect resource payment failed: '+x.resource);e.recordMechanic('resource-change',{actorId:actor,source,resource:x.resource,delta:x.delta,overflow:change.overflow[x.resource]??0});}
  else if(x.kind==='judgement'){const s=activeSeal(e,actor,castContext.sealModels);if(!s)throw new Error('Judgement requires an active seal');const r=range(e,target,actor,s.model.judgement.formula,stats);last=resolve(s.model.judgement,r);if(x.consume==='cast'||last.landed)e.auras.remove(s.aura,'judged');}
  else if(x.kind==='combo-gain'){e.comboPoints.gain(target,x.points);e.recordMechanic('combo-change',{actorId:actor,source,...e.comboPoints.snapshot()});}
  else if(x.kind==='combo-spend'){const spent=e.comboPoints.spend(target,x.points);e.recordMechanic('combo-change',{actorId:actor,source,spent,...e.comboPoints.snapshot()});}
  else if(x.kind==='aura'){const who=x.auraTarget==='actor'?actor:target;const durationMs=x.durationByCombo?x.durationByCombo[e.comboPoints.points(target)-1]:x.aura.durationMs;if(!durationMs)throw new Error('Missing combo duration');e.auras.apply({...x.aura,durationMs,targetId:who,ownerId:actor});}
  else if(x.kind==='cooldown-reset'){const remaining=e.resources.cooldowns.remaining(x.abilityId);e.resources.cooldowns.reset(x.abilityId);e.recordMechanic('cooldown-reset',{actorId:actor,source,abilityId:x.abilityId,remainingMs:remaining});}
  else if(x.kind==='proc'){const result=attemptProc(e.resources.cooldowns,{id:'proc:'+actor+':'+x.id,chance:x.chance,internalCooldownMs:x.internalCooldownMs},e.random);if(result.proc===true||result.triggered===true||result===true){e.recordMechanic('proc',{actorId:actor,targetId:target,source,procId:x.id});executeEffects(e,actor,target,source+' → '+x.id,x.effects,stats,enemyIds,depth+1,classState);}}
  else if(x.kind==='class-state'){const old=classState[x.key];classState[x.key]=x.value;e.recordMechanic('class-state-change',{actorId:actor,source,key:x.key,before:old,after:x.value});}
  else if(x.kind==='taunt')e.threat.taunt({enemyId:target,actorId:actor,matchHighest:x.matchHighest,forcedMs:x.forcedMs});
 }
 return last?.landed??null;
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
 const castProcs=sc.castProcs??[];if(!Array.isArray(castProcs))throw new Error('Explicit cast procs array required');const abilityIds=new Set(sc.actions.map(a=>a.abilityId));for(const p of castProcs)validateCastProc(p,abilityIds);if(new Set(castProcs.map(p=>p.id)).size!==castProcs.length||new Set(castProcs.map(p=>p.consumerId)).size!==castProcs.length)throw new Error('Duplicate cast proc or consumer');
 const sealModels=new Map(sc.actions.filter(a=>a.sealModel).map(a=>[a.abilityId,a.sealModel]));if(sealModels.size&&classId!=='paladin')throw new Error('Seal models require a Paladin');
 const poisonRuntime=createPoisonRuntime(sc.poisonConfig??null,abilityIds);const classState={...sc.classContext};const contextFor=actor=>({stats:statsFor(actor),pools:sc.pools,comboEnabled:!!sc.comboPoints,classState,abilityIds:new Set(sc.actions.map(a=>a.abilityId))});
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
  validateEffects(a.effects,ctx);if(a.sealModel){if(!a.abilityId.startsWith('paladin:seal-of-'))throw new Error('Invalid seal ability');int(a.sealModel.durationMs,'seal duration',1);int(a.sealModel.internalCooldownMs,'seal cooldown');finite(a.sealModel.rate,'seal proc rate',0);finite(a.sealModel.weaponSeconds,'seal weapon seconds',.01);choose(a.sealModel.rateType,['chance','ppm'],'seal rate type');choose(a.sealModel.weaponBasis,['base-white','post-mitigation-white'],'seal weapon basis');if(a.sealModel.rateType==='chance'&&a.sealModel.rate>1)throw new Error('Invalid seal probability');validateEffects([a.sealModel.proc,a.sealModel.judgement],ctx);finite(a.sealModel.proc.weaponCoefficient,'seal weapon coefficient',0);}

  const castMs=int(a.castMs,'cast time'),gcdMs=int(a.gcdMs,'GCD'),cooldownMs=int(a.cooldownMs,'ability cooldown');
  if(a.kind==='channel'){int(a.tickMs,'channel interval',1);bool(a.tickAtEnd,'final channel tick');}
  if(a.kind==='queued-melee')id(a.swingId,'swing identity');
  if(a.blockingAura!==undefined)id(a.blockingAura,'blocking target aura');
  if(a.requiresOwnedAura){id(a.requiresOwnedAura.name,'required aura name');int(a.requiresOwnedAura.minRemainingMs,'required aura time');}
  if(a.refreshGate){choose(a.refreshGate.kind,['buff','debuff'],'refresh gate kind');id(a.refreshGate.name,'refresh aura name');int(a.refreshGate.remainingMs,'refresh threshold');}
  const min=finite(a.minRangeYards,'minimum range',0),max=finite(a.maxRangeYards,'maximum range',min);
  if(a.position!==null)choose(a.position,['front','behind','side','self'],'position restriction');
  if(a.targetHealthMaxPct!==undefined){finite(a.targetHealthMaxPct,'target health threshold',0);if(a.targetHealthMaxPct>100)throw new Error('Invalid health threshold');}
  if(a.comboRequired!==null){if(!sc.comboPoints)throw new Error('Combo requirement without bank');int(a.comboRequired,'combo requirement',1);}
  if(a.requiredContext!==null&&(!a.requiredContext||typeof a.requiredContext!=='object'||Array.isArray(a.requiredContext)))throw new Error('Explicit context restriction required');
  if(a.requiredContext)for(const [k,v] of Object.entries(a.requiredContext))if(!has(sc.classContext,k))throw new Error('Required class context missing: '+k);
  if(a.multiTarget){int(a.multiTarget.cap,'multi-target cap',1);finite(a.multiTarget.falloff,'multi-target falloff',0);if(a.multiTarget.falloff>1)throw new Error('Invalid falloff');choose(a.multiTarget.policy,['ordered-nearby'],'multi-target policy');if(!sc.nearbyTargets||typeof sc.nearbyTargets!=='object')throw new Error('Explicit nearby target ordering required');}
  const castProc=castProcs.find(p=>p.consumerId===a.abilityId);if(castProc&&!['instant','cast'].includes(a.kind))throw new Error('Cast proc requires non-channel spell');const triggers=castProcs.filter(p=>p.triggerAbilityIds.includes(a.abilityId));
  const channelGate=new Map();const execute=(e,t,effects,tickIndex,castContext)=>{const eligible=effects.filter(x=>{if(!x.channelApplicationOutcomes)return true;const k=t+'|'+effects.indexOf(x);if(tickIndex===1){const v=sampleAttack({min:0,max:0,outcomes:x.channelApplicationOutcomes,random:e.random});channelGate.set(k,v.landed);e.recordMechanic('attack-result',{actorId:a.actorId,targetId:t,source:ability.name+' (channel apply)',school:x.school??null,...v});}return channelGate.get(k)===true;});if(eligible.length){const landed=executeEffects(e,a.actorId,t,ability.name,eligible,ctx.stats,sc.targetIds,0,classState,{...castContext,triggers,poisonRuntime,sealModels,abilityId:a.abilityId});if(a.abilityId==='paladin:crusader-strike'&&sc.blessedStrikes&&abilityIds.has('paladin:holy-shock')&&landed&&e.random()<sc.blessedStrikes){const remaining=e.resources.cooldowns.remaining('paladin:holy-shock');e.resources.cooldowns.reset('paladin:holy-shock');e.recordMechanic('cooldown-reset',{actorId:a.actorId,source:'Blessed Strikes',abilityId:'paladin:holy-shock',remainingMs:remaining});}}};
  const apply=(e,t,tickIndex,castContext)=>{
   if(!a.multiTarget)return execute(e,t,a.effects,tickIndex,castContext);
   const group=a.targets.includes('enemy')?sc.targetIds:sc.allyIds;const list=sc.nearbyTargets[t];
   if(!Array.isArray(list)||list.some(x=>!group.includes(x)||x===t)||new Set(list).size!==list.length)throw new Error('Invalid explicit nearby targets for '+t);
   const targets=[t,...list.filter(x=>e.unit(x).alive)].slice(0,a.multiTarget.cap);
   for(const [i,target] of targets.entries()){if(!e.unit(target).alive)continue;const effects=a.effects.map(x=>x.formula?{...x,formula:{...x.formula,multiplier:x.formula.multiplier*Math.pow(a.multiTarget.falloff,i)}}:x);execute(e,target,effects,tickIndex,castContext);}
  };
  const cooldowns=[...(gcdMs?[{id:'gcd',duration:gcdMs}]:[]),...(cooldownMs?[{id:a.abilityId,duration:cooldownMs}]:[])];
  if(a.sharedCooldown!==null){id(a.sharedCooldown?.id,'shared cooldown id');int(a.sharedCooldown?.durationMs,'shared cooldown duration',1);cooldowns.push({id:'shared:'+a.sharedCooldown.id,duration:a.sharedCooldown.durationMs});}
  return {id:a.abilityId,name:ability.name,kind:a.kind,castMs,...(castProc?{castProc}:{}),requiresGcdReady:a.requiresGcdReady??(gcdMs>0),costs:a.costs.map(x=>({resource:x.resource,delta:-x.amount})),cooldowns,targets:a.targets,available:(e)=>(!a.requiresSeal||activeSeal(e,a.actorId,sealModels)!==null)&&(!a.requiredContext||Object.entries(a.requiredContext).every(([k,v])=>classState[k]===v)),availableForTarget:(e,t)=>{const geo=geometry(sc,a.actorId,t);return geo.distance>=min&&geo.distance<=max&&(a.position===null||geo.position===a.position)&&(a.comboRequired===null||e.comboPoints.points(t)>=a.comboRequired)&&(a.targetHealthMaxPct===undefined||e.unit(t).healthPercent<=a.targetHealthMaxPct)&&(!a.blockingAura||!(e.auras.frame(t,'debuff')[a.blockingAura]?.remaining>0))&&(!a.requiresOwnedAura||(e.auras.frame(t,'debuff',a.actorId)[a.requiresOwnedAura.name]?.remaining??0)*1000>=a.requiresOwnedAura.minRemainingMs)&&a.effects.filter(x=>x.kind==='health-to-resource').every(x=>e.unit(a.actorId).health>range(e,t,a.actorId,x.formula,ctx.stats).max)&&(!a.refreshGate||(e.auras.frame(a.refreshGate.onActor?a.actorId:t,a.refreshGate.kind,a.actorId)[a.refreshGate.name]?.remaining??0)*1000<=a.refreshGate.remainingMs);},...(a.kind==='channel'?{tickMs:a.tickMs,tickAtEnd:a.tickAtEnd,onTick:apply}:a.kind==='queued-melee'?{swingId:a.swingId,resolve:apply}:{resolve:(e,t,context)=>apply(e,t,undefined,context)}),rank,spellId};
 });
 const knownAbilities=Object.fromEntries(sc.actions.map(a=>[profile.abilityRegistry[a.abilityId].name,a.rank]));
 const e=new CombatEncounter({durationMs:sc.durationMs,decisionIntervalMs:sc.decisionIntervalMs,seed:sc.seed,pools:sc.pools,units:sc.units,playerId:sc.playerId,primaryId:sc.primaryId,targetIds:sc.targetIds,allyIds:sc.allyIds,petId:sc.petId??null,comboPoints:sc.comboPoints??null,rows:sc.rows,actions,manageAuras:true,context:()=>({...classState,knownAbilities,abilityRanks:knownAbilities})});
 for(const a of sc.autos){
  if(!actors.has(a.actorId))throw new Error('Unknown auto-attack actor');for(const c of a.costs??[]){if(!has(sc.pools,c.resource))throw new Error('Unknown auto resource');finite(c.amount,'auto cost',0);}const ctx=contextFor(a.actorId);validateEffects(a.effects,ctx);id(a.source,'auto source');int(a.intervalMs,'auto interval',1);int(a.firstAtMs,'first auto time');
  e.addAutoAttack({id:a.id,intervalMs:a.intervalMs,firstAtMs:a.firstAtMs,castPolicy:a.castPolicy,actorId:a.actorId,hasteStat:a.hasteStat??null,hastePolicy:a.hastePolicy??null,resolve:(enc,t)=>{if(enc.unit(a.actorId).alive){const g=geometry(sc,a.actorId,t);if(g.distance>=finite(a.minRangeYards,'auto minimum range',0)&&g.distance<=finite(a.maxRangeYards,'auto maximum range',0)){const costs=(a.costs??[]).map(c=>({resource:c.resource,delta:-c.amount}));const paid=enc.resources.change(costs);if(!paid.ok)return;for(const c of costs)if(c.delta)enc.recordMechanic('resource-change',{actorId:a.actorId,targetId:t,source:a.source,resource:c.resource,delta:c.delta,overflow:0});executeEffects(enc,a.actorId,t,a.source,a.effects,ctx.stats,sc.targetIds,0,classState,{poisonRuntime,sealModels,white:true,hand:a.id});}}}});
 }
 if(sc.incomingRage){if(!has(sc.pools,'rage'))throw new Error('Incoming rage requires rage pool');validateIncomingRage(sc.incomingRage);}
 for(const attack of sc.incomingDamage??[]){
  int(attack.atMs,'incoming damage time');if(attack.atMs>sc.durationMs)throw new Error('Incoming damage outside encounter');id(attack.source,'incoming attack source');finite(attack.amount,'incoming damage',0);if(!sc.targetIds.includes(attack.actorId)||![sc.playerId,...sc.allyIds,...(sc.petId?[sc.petId]:[])].includes(attack.targetId))throw new Error('Invalid incoming damage unit roles');if(attack.school!==null)id(attack.school,'incoming school');
  e.timeline.schedule(attack.atMs,P.tick,()=>{if(e.unit(attack.actorId).alive&&e.unit(attack.targetId).alive){const d=e.damage({targetId:attack.targetId,actorId:attack.actorId,source:attack.source,value:attack.amount,school:attack.school});if(sc.incomingRage&&attack.targetId===sc.playerId&&e.unit(sc.playerId).alive)gainRage(e,sc.playerId,'Incoming damage (rage)',incomingRage(sc.incomingRage,attack.amount,d));}});
 }
 for(const r of sc.regeneration){if(!has(sc.pools,r.resource))throw new Error('Unknown regeneration resource');scheduleResourceRegen(e.periodic,e.resources,{...r,onTick:x=>e.recordMechanic('resource-change',{actorId:sc.playerId,source:r.id,resource:r.resource,delta:x.snapshot.amount,overflow:x.result.overflow[r.resource]??0})});}
 return e;
}
