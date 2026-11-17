import {referenceRanks,referenceRank} from './combat-reference-ranks.mjs';
import {abilityKey,ROTATION_REGISTRY} from './rotations/registry.mjs';
import {CURRENT_ENCHANT_PHASE} from './equipment-options.mjs';
import {prepareReferenceScenario} from './combat-reference-adapter.mjs';

const physicalKinds=new Set(['weapon','combo','execute','physical-ap','combo-aura','combo-bleed']);
const isMelee=r=>r.components.some(c=>physicalKinds.has(c.kind));
const isRanged=r=>r.components.some(c=>c.kind==='ranged-weapon');
const rowsFor=b=>b.controls.rotationRows;
const rankPhase=r=>r.referenceAvailableFromPhase??1;
const provenance='Explicit experimental rotation policy; reference mechanics, not live verified';
const order=['miss','dodge','parry','block','glance','crit'];
const physical=position=>({dualWieldPenaltyPct:19,parryPct:0,blockPct:0,critSuppressionPct:0,criticalMultiplier:2,blockValue:0,order,position});
const resistance=()=>Object.fromEntries(['fire','frost','shadow','nature','arcane','holy'].map(s=>[s,{policy:'none',bins:[{fraction:0,probability:1}]}]));
function availableRanks(b){return referenceRanks(b.classId).filter(r=>rankPhase(r)<=CURRENT_ENCHANT_PHASE&&r.learnLevel<=b.level);}
function distinctActions(b){return [...new Map(rowsFor(b).map(row=>[abilityKey(b.classId,row.ability),row.ability])).entries()];}
function defaults(rank,position,normalisedSpeed){
 const policy={provenance,phase:CURRENT_ENCHANT_PHASE,acceptExternalReference:false,acceptSourceConflict:false,
 gcdMs:rank.mode==='queued-melee'?0:rank.resource==='energy'?1000:1500,cooldownMs:rank.referenceCooldownMs??0,
 weaponPolicy:rank.mode==='queued-melee'?'actual-swing':'normalised',normalisedSpeed,physical:physical(position),
 periodicCanCrit:false,healCriticalMultiplier:1.5,spellCriticalMultiplier:1.5,resistance:resistance(),
 refresh:'restart',tickAtExpiry:true,snapshot:'snapshot',threat:null,spendOnMiss:false,
 targetPolicy:'ordered-nearby',channelTickAtEnd:true,swingHastePolicy:'preserve-progress'};
 for(const field of rank.requiredPolicy??[]){
  if(field==='componentCoefficients')policy.componentCoefficients=rank.components.map(c=>c.coefficient??null);
  if(field==='costOverride')policy.costOverride=null;
  if(field==='weaponDamageModel')policy.weaponDamageModel={coefficient:null,flatDamage:null};
  if(field==='stancePolicy')policy.stancePolicy=null;
  if(field==='consecrationModel')policy.consecrationModel={baseTick:null,coefficient:null,tickMultipliers:[null,null,null,null,null,null,null,null],tickCanMiss:null};
  if(field==='apPerComboPoint')policy.apPerComboPoint=null;
  if(field==='lifeTapFactor')policy.lifeTapFactor=null;
  if(field==='consumeOnMiss')policy.consumeOnMiss=null;
  if(field==='executeModel')policy.executeModel={baseDamage:null,extraRageCoefficient:null,extraRageCap:null,payment:null};
  if(field==='physicalAPModel')policy.physicalAPModel={coefficient:null,flatDamage:null};
  if(field==='rangedModel')policy.rangedModel={attackPower:null,weaponPolicy:'normalised',normalisedSpeed:2.8,ammoUsesActualSpeed:true,missPct:null,critPct:null,blockPct:0,blockValue:0,critSuppressionPct:0,criticalMultiplier:2,order,ammoPerShot:1};
 }
 return policy;
}
export function rotationReferenceTemplate(build,gearById={}){
 if(!rowsFor(build)?.length)throw new Error('Configure a nonempty rotation first.');
 const choices=availableRanks(build),rankByAbility={},policies={},rankChoices={},unsupported=[];
 const position=build.classOptions.attackPosition==='Front'?'front':'behind',weapon=gearById[String(build.gear.mainhand?.id)];
 const normalisedSpeed=weapon?.subclass===15?1.7:weapon?.slot===17?3.3:2.4;
 const selected=[];
 for(const [id,name] of distinctActions(build)){
  const options=choices.filter(r=>r.abilityId===id).sort((a,b)=>b.rank-a.rank);
  if(!options.length){unsupported.push(name);continue;}
  rankChoices[id]=options.map(({spellId,rank,source,status})=>({spellId,rank,source,status}));
  const rank=options[0];selected.push(rank);rankByAbility[id]=rank.spellId;policies[id]=defaults(rank,position,normalisedSpeed);
 }
 if(unsupported.length)return {unsupported,config:null,rankChoices};
 const melee=selected.some(isMelee),ranged=selected.some(isRanged);
 const encounter={mode:'reference-research',acknowledgeIncompleteEffects:true,position,distanceYards:melee||selected.some(r=>r.maxRange<=8)?3:20,allyDistanceYards:20,
 includeMelee:melee,includeRanged:ranged,autoPolicy:{provenance,physical:physical(position),threat:null,firstSwing:'after-interval',autoCastPolicy:'skip-during-cast',swingHastePolicy:'preserve-progress'},
 recastPeriodic:'rotation-only',durationMs:build.planning.duration*1000,decisionIntervalMs:build.controls.keyInterval,
 enemyHealth:1e9,allyMaxHealth:1e9,allyHealth:1,regeneration:[],incomingDamage:[]};
 if(ranged){encounter.ammoCount=null;encounter.rangedAutoPolicy={...structuredClone(policies[selected.find(isRanged).abilityId]),autoCastPolicy:'skip-during-cast'};encounter.rangedAutoPolicy.rangedModel.weaponPolicy='actual-swing';}
 return {unsupported,rankChoices,config:{rankByAbility,policies,encounter,seed:42,iterations:build.planning.iterations}};
}
export function prepareRotationLab({build,talents,gearById,config,confirmed}){
 if(confirmed!==true)throw new Error('Confirm all selected ranks and explicit assumptions.');
 if(!config||typeof config!=='object'||Array.isArray(config))throw new Error('Explicit rotation configuration required');
 if(build.planning.durationVary||build.controls.variability)throw new Error('Disable fight-duration and keypress variability for the current fixed-timing reference runtime.');
 if(build.classOptions.moving==='Yes')throw new Error('Movement is not implemented.');
 if(!Number.isSafeInteger(config.seed)||config.seed<0||config.seed>4294967295)throw new Error('Invalid seed');
 if(!Number.isSafeInteger(config.iterations)||config.iterations<1||config.iterations>10000)throw new Error('Use 1–10,000 research iterations');
 const encounter=config.encounter;
 if(encounter?.durationMs!==build.planning.duration*1000||encounter?.decisionIntervalMs!==build.controls.keyInterval||config.iterations!==build.planning.iterations)throw new Error('Encounter duration, decision interval and iterations must match the current build. Regenerate settings.');
 const ids=distinctActions(build).map(([id])=>id);
 if(!ids.length)throw new Error('No rotation actions');
 if(Object.keys(config.rankByAbility??{}).length!==ids.length||Object.keys(config.policies??{}).length!==ids.length)throw new Error('Exactly one rank and policy required per distinct rotation action');
 const learnedSpellIds=[];
 for(const id of ids){
  const rank=referenceRank(build.classId,config.rankByAbility[id]);const p=config.policies[id];
  if(rank.abilityId!==id||rankPhase(rank)>CURRENT_ENCHANT_PHASE||rank.learnLevel>build.level)throw new Error('Wrong ability, level or phase for '+id);
  if(!p||p.phase!==CURRENT_ENCHANT_PHASE||p.allowFutureRank===true)throw new Error('Current-phase policy required for '+id);
  const requirement=ROTATION_REGISTRY[build.classId].abilityRegistry[id]?.talentId;
  if(requirement!=null&&!(build.talents[String(requirement)]>0))throw new Error('Learn the required talent for '+id);
  for(const c of rank.components){
   const field='target'+String(c.stat)[0]?.toUpperCase()+String(c.stat).slice(1)+'Res';
   if(build.planning[field]>0&&p.resistance?.[c.stat]?.policy==='none')throw new Error('Nonzero target resistance requires an explicit distribution for '+c.stat);
  }
  learnedSpellIds.push(rank.spellId);
 }
 const prepared=prepareReferenceScenario({build,talents,gearById,learnedSpellIds,rankByAbility:config.rankByAbility,policies:config.policies,encounter});
 prepared.limitations.push('Saved priority rows executed unchanged with the confirmed per-rank policies. Fixed timing; only explicitly configured regeneration, additional targets and incoming damage are included.');
 return {prepared,seed:config.seed,iterations:config.iterations};
}
