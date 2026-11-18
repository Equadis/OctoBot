import {reactiveTemplate} from './combat-warrior-reactive.mjs';
import {markForDeathTemplate} from './combat-mark-for-death.mjs';
import {bladeFlurryTemplate} from './combat-blade-flurry.mjs';
import {shadowOfDeathTemplate} from './combat-shadow-of-death.mjs';
import {companionTemplate} from './combat-companion-reference.mjs';
import {elementalShieldTemplate,lightningStrikeTemplate} from './combat-elemental-shield.mjs';
import {sealTemplate} from './combat-seal-reference.mjs';
import {imbueTemplate} from './combat-imbue-reference.mjs';
import {poisonTemplate} from './combat-poison-reference.mjs';
import {feralTemplate} from './combat-feral-reference.mjs';
import {referenceRanks,referenceRank} from './combat-reference-ranks.mjs';
import {abilityKey,ROTATION_REGISTRY} from './rotations/registry.mjs';
import {CURRENT_ENCHANT_PHASE} from './equipment-options.mjs';
import {prepareReferenceScenario} from './combat-reference-adapter.mjs';

const physicalKinds=new Set(['weapon','combo','execute','physical-ap','combo-aura','combo-bleed','physical-flat','physical-bleed']);
const isMelee=r=>r.components.some(c=>physicalKinds.has(c.kind)||c.kind==='seal-aura'||c.kind==='blade-flurry');
const isRanged=r=>r.components.some(c=>['ranged-weapon','ranged-arcane'].includes(c.kind));
const rowsFor=b=>b.controls.rotationRows;
const hunterCommand=id=>['hunter:auto-shot','hunter:pet-attack'].includes(id);
const rankPhase=r=>r.referenceAvailableFromPhase??1;
const provenance='Explicit experimental rotation policy; reference mechanics, not live verified';
const order=['miss','dodge','parry','block','glance','crit'];
const physical=position=>({dualWieldPenaltyPct:19,parryPct:0,blockPct:0,critSuppressionPct:0,criticalMultiplier:2,blockValue:0,order,position});
const resistance=()=>Object.fromEntries(['fire','frost','shadow','nature','arcane','holy'].map(s=>[s,{policy:'none',bins:[{fraction:0,probability:1}]}]));
function availableRanks(b){return referenceRanks(b.classId).filter(r=>rankPhase(r)<=CURRENT_ENCHANT_PHASE&&r.learnLevel<=b.level&&(!r.form||r.form===b.classOptions.form)&&(!r.forms||r.forms.includes(b.classOptions.form)));}
function distinctActions(b){return [...new Map(rowsFor(b).map(row=>[abilityKey(b.classId,row.ability),row.ability])).entries()];}
function defaults(rank,position,normalisedSpeed){
 const policy={provenance,phase:CURRENT_ENCHANT_PHASE,acceptExternalReference:false,acceptSourceConflict:false,
 gcdMs:rank.referenceGcdMs??(rank.mode==='queued-melee'?0:rank.resource==='energy'?1000:1500),cooldownMs:rank.referenceCooldownMs??0,
 weaponPolicy:rank.mode==='queued-melee'?'actual-swing':'normalised',normalisedSpeed,physical:physical(position),
 periodicCanCrit:false,healCriticalMultiplier:1.5,spellCriticalMultiplier:1.5,resistance:resistance(),
 refresh:'restart',tickAtExpiry:true,snapshot:'snapshot',threat:null,spendOnMiss:false,
 targetPolicy:'ordered-nearby',channelTickAtEnd:true,swingHastePolicy:'preserve-progress'};
 if(['hunter:carve','hunter:multi-shot'].includes(rank.abilityId))policy.sharedShotCooldownMs=10000;
 for(const field of rank.requiredPolicy??[]){
  if(field==='darkHarvestModel')policy.darkHarvestModel={totalBase:rank.record.fields.talentTooltipTotal??rank.record.fields.historicalTotal,totalCoefficient:null,durationMs:8000,tickMs:null,intervalFactor:null,expiryPolicy:null,activation:'channel-start',agonyOverflow:'clamp-last'};
  if(field==='drainSoulModel'){policy.drainSoulModel={totalBase:rank.record.fields.historicalTotal,totalCoefficient:null,durationMs:6000,tickMs:1000,tickCost:rank.record.fields.historicalTickCost,grantShard:false};}
  if(field==='druidDebuffModel')policy.druidDebuffModel={amount:rank.record.fields.referenceAmount,durationMs:rank.record.fields.referenceDurationMs,outcomes:null,threat:null,...(rank.abilityId==='druid:demoralizing-roar'?{radius:10,cap:null}:{})};
  if(field==='moltenBlastModel')policy.moltenBlastModel={min:rank.record.fields.referenceDamage[0],max:rank.record.fields.referenceDamage[1],coefficient:rank.record.fields.referenceCoefficient,refreshEnabled:null,refresh:null,durationMs:null,bonusBasis:'raw-periodic-per-second',bonusDamagePerSecond:null,bonusOutcomes:null};
  if(field==='earthquakeModel')policy.earthquakeModel={min:rank.record.fields.referenceDamage[0],max:rank.record.fields.referenceDamage[1],coefficient:rank.record.fields.referenceCoefficient,cap:null,delayMs:4000,slowPct:15,radius:10,splash:.35,aftershock:.3,targeting:'explicit-anchor-nearby',damageBasis:'independent-base-rolls'};
  if(field==='areaModel')policy.areaModel={min:rank.record.fields.referenceDamage?.[0]??rank.record.fields.classicTotal??null,max:rank.record.fields.referenceDamage?.[1]??rank.record.fields.classicTotal??null,coefficient:null,cap:rank.abilityId==='priest:prayer-of-healing'?5:null,...(rank.abilityId==='warlock:rain-of-fire'?{durationMs:8000,tickMs:1000}:rank.abilityId==='mage:blast-wave'?{radius:10,controlEnabled:null,durationMs:6000,slowPct:null}:{targeting:'explicit-party-near-anchor'})};
  if(field==='siphonLifeModel')policy.siphonLifeModel={totalBase:rank.record.fields.classicTotal,totalCoefficient:null,durationMs:30000,intervalMs:null};
  if(field==='lacerateModel')policy.lacerateModel={baseMana:null,manaCostPct:8,windowMs:null,consume:null,trigger:null,tickMs:null,bleedBasis:null,refresh:null};
  if(field==='intimidationModel')policy.intimidationModel={windowMs:null,eligibleSources:[],stunOutcomes:null,threatTiming:'after-trigger',range:null};
  if(field==='steadyShotModel')policy.steadyShotModel={baseMana:null,weaponCoefficient:null,flatDamage:null,castMs:1000,minRange:8,maxRange:35,learnedCastIdentityConfirmed:false};
  if(field==='scatterShotModel')policy.scatterShotModel={baseMana:null,manaCostPct:8,range:15,controlEnabled:null,autoResume:null,resumeAbilityIds:[]};
  if(field==='fireTrapModel')policy.fireTrapModel={initialMin:rank.record.fields.classicInitial?.[0]??null,initialMax:rank.record.fields.classicInitial?.[1]??null,totalPeriodic:rank.record.fields.classicTotal,durationMs:rank.record.fields.referenceDurationMs,tickMs:rank.record.fields.referenceTickMs,lifetimeMs:60000,triggerDelayMs:null,placementRange:5,cap:rank.abilityId==='hunter:immolation-trap'?1:null,targeting:rank.abilityId==='hunter:immolation-trap'?'single-anchor':'static-anchor-nearby',pendingPolicy:null,prepullAtZero:null,sharedCooldownMs:null,initialAPCoefficient:rank.abilityId==='hunter:immolation-trap'?0:1/6.5,periodicAPPerTick:rank.abilityId==='hunter:immolation-trap'?.1:1/30,initialOutcomes:null,applicationOutcomes:null,tickOutcomes:null,applicationPolicy:null,resistancePolicy:'explicit-post-talent',acknowledgeMissingNettle:false};
  if(field==='mendPetModel')policy.mendPetModel={totalBase:rank.record.fields.referenceTotalHeal,totalCoefficient:null,durationMs:5000,tickMs:1000,cleansePolicy:'explicit-aura-ids',cleanseAuraIds:[]};
  if(field==='bestialWrathModel')policy.bestialWrathModel={baseMana:null,manaCostPct:12,range:null};
  if(field==='hunterMarkModel')policy.hunterMarkModel={rangedAP:rank.record.fields.referenceRangedAP,durationMs:120000,outcomes:null,scope:'all-ranged',stacking:'strongest'};
  if(field==='rapidFireModel')policy.rapidFireModel={castReductionPct:null};
  if(field==='componentCoefficients')policy.componentCoefficients=rank.components.map(c=>c.coefficient??null);
  if(field==='utilityCurseModel')policy.utilityCurseModel={durationMs:null,outcomes:null,schools:null,damageBonusPct:null,resistanceReduction:null,armourReduction:null,enemyAttackPowerBonus:null};
  if(field==='paladinDefenseModel')policy.paladinDefenseModel=rank.abilityId==='paladin:righteous-fury'?{mode:'enable-only',threatBonusPct:null,improvedBasis:null}:{durationMs:10000,charges:4,blockBonusPct:45,baseDamage:rank.record.fields.referenceDamage,spellPowerCoefficient:null,mitigation:null,outcomes:null,additionalThreatPct:50,threat:null};
  if(field==='arcaneRuptureModel')policy.arcaneRuptureModel={min:rank.record.fields.classicDamageRange?.[0]??null,max:rank.record.fields.classicDamageRange?.[1]??null,coefficient:null,durationMs:8000,buffTrigger:null};
  if(field==='evocationModel')policy.evocationModel={manaPerTick:null,durationMs:8000,tickMs:2000};
  if(field==='frostControlModel')policy.frostControlModel={min:null,max:null,coefficient:null,cap:null,radius:rank.maxRange,durationMs:8000,slowPct:rank.abilityId==='mage:cone-of-cold'?50:0,breakChancePct:null,controlEnabled:null};
  if(field==='iceBarrierModel')policy.iceBarrierModel={base:rank.record.fields.referenceAbsorb,coefficient:null,durationMs:60000};
  if(field==='paladinDamageModel')policy.paladinDamageModel={min:rank.record.fields.classicDamageRange?.[0]??null,max:rank.record.fields.classicDamageRange?.[1]??null,coefficient:null,threatFactor:null,...(rank.abilityId==='paladin:exorcism'?{targetTypes:rank.record.fields.classicTargetTypes}:{healthMaxPct:20})};
  if(field==='masterStrikeModel')policy.masterStrikeModel={targetMounted:null,secondaryEnabled:null};
  if(field==='warriorDisciplineModel')policy.warriorDisciplineModel=rank.abilityId==='warrior:shield-block'?{durationMs:null,stances:null,charges:null,blockBonusPct:null,consume:null}:rank.abilityId==='warrior:recklessness'?{durationMs:15000,stances:null,includeWhite:null,abilityIds:[],criticalMultiplier:null,damageTakenPct:20}:{durationMs:20000,stances:null,charges:5,includeWhite:true,abilityIds:[],radius:null,copyFactor:null,copyBasis:null,consume:null,threat:null};
  if(field==='thunderClapModel')policy.thunderClapModel={baseDamage:rank.record.fields.referenceDamage,apCoefficient:null,durationMs:rank.record.fields.referenceDurationMs,slowPct:10};
  if(field==='shieldSlamModel')policy.shieldSlamModel={min:null,max:null,blockValue:null,blockCoefficient:null,apCoefficient:null};
  if(field==='reactiveModel')policy.reactiveModel=reactiveTemplate(rank.abilityId);
  if(field==='flatThreat')policy.flatThreat=null;
  if(field==='warriorActivationModel')policy.warriorActivationModel={stances:null,durationMs:rank.record.fields.referenceDurationMs??rank.record.fields.durationMs??null,...(rank.abilityId==='warrior:demoralizing-shout'?{radius:10,amount:rank.components[0].referenceAmount,outcomes:null,threat:null}:rank.abilityId==='warrior:bloodrage'?{healthCostPct:null,instantRage:10,tickRage:null,intervalMs:null,tickAtExpiry:null,activateEnrage:null}:rank.abilityId==='warrior:berserker-rage'?{incomingRageFactor:null}:{})};
  if(field==='warriorUtilityModel')policy.warriorUtilityModel={amount:rank.components[0].referenceAmount,durationMs:rank.components[0].durationMs,...(rank.abilityId==='warrior:sunder-armor'?{maxStacks:5,outcomes:null,threat:null}:{radius:20,includeOwner:true,allies:[]})};
  if(field==='markForDeathModel')policy.markForDeathModel=markForDeathTemplate();
  if(field==='vanishModel')policy.vanishModel={durationMs:null,reagentCost:null,threatReduction:null,cloakedAllies:[]};
  if(field==='bladeFlurryModel')policy.bladeFlurryModel=bladeFlurryTemplate();
  if(field==='shadowOfDeathModel')policy.shadowOfDeathModel=shadowOfDeathTemplate();
  if(field==='exposeModel')policy.exposeModel={durationMs:rank.components[0].durationMs,armourByCombo:[1,2,3,4,5].map(n=>n*rank.components[0].armourPerCombo),outcomes:null};
  if(field==='rogueCooldownModel')policy.rogueCooldownModel=rank.abilityId==='rogue:preparation'?{resetAbilityIds:[]}:rank.abilityId==='rogue:cold-blood'?{durationMs:null,criticalMultiplier:null,consume:null}:{};
  if(field==='sealModel')policy.sealModel=sealTemplate(rank.abilityId,rank.record.fields);
  if(field==='elementalShieldModel')policy.elementalShieldModel=elementalShieldTemplate(rank);
  if(field==='lightningStrikeModel')policy.lightningStrikeModel=lightningStrikeTemplate();
  if(field==='judgementPolicy')policy.judgementPolicy={consume:null};
  if(field==='crusaderModel')policy.crusaderModel={apCoefficient:null,weaponCoefficient:null,spellPowerCoefficient:null,weaponPolicy:null,normalisedSpeed:null,holyBonusMultiplier:1};
  if(field==='arcaneShotModel')policy.arcaneShotModel={flatDamage:null,weaponCoefficient:null,spellPowerCoefficient:null,defense:null};
  if(field==='dualWeaponModel')policy.dualWeaponModel={mainhand:{coefficient:null,flatDamage:null},offhand:{coefficient:null,flatDamage:null},offhandNormalisedSpeed:null};
  if(field==='rendStancePolicy')policy.rendStancePolicy=['Battle','Defensive'];
  if(field==='hemorrhageModel')policy.hemorrhageModel={charges:50,durationMs:15000,bonusPct:2};
  if(field==='biteModel')policy.biteModel={ranges:Array(5).fill(null),apPerComboPoint:null,pctPerEnergy:null,energyCap:null,payment:null};
  if(field==='stormstrikeModel')policy.stormstrikeModel={scope:null,charges:null,durationMs:null,bonusPct:null};
  if(field==='costOverride')policy.costOverride=null;
  if(field==='castOverrideMs')policy.castOverrideMs=null;
  if(field==='shieldModel')policy.shieldModel={base:null,coefficient:null,stat:null,durationMs:null,lockoutMs:null};
  if(field==='leechModel')policy.leechModel={fraction:null,basis:null};
  if(field==='channelApplicationPolicy')policy.channelApplicationPolicy=null;
  if(field==='holyShockModel')policy.holyShockModel={role:null,coefficient:null,resetChance:null,resetTrigger:null};
  if(field==='weaponDamageModel')policy.weaponDamageModel={coefficient:null,flatDamage:null};
  if(field==='stancePolicy')policy.stancePolicy=null;
  if(field==='consecrationModel')policy.consecrationModel={baseTick:null,coefficient:null,tickMultipliers:[null,null,null,null,null,null,null,null],tickCanMiss:null};
  if(field==='apPerComboPoint')policy.apPerComboPoint=null;
  if(field==='lifeTapFactor')policy.lifeTapFactor=null;
  if(field==='consumeOnMiss')policy.consumeOnMiss=null;
  if(field==='executeModel')policy.executeModel={baseDamage:null,extraRageCoefficient:null,extraRageCap:null,payment:null};
  if(field==='physicalAPModel')policy.physicalAPModel={coefficient:null,flatDamage:null};
  if(field==='noxiousModel')policy.noxiousModel={attackModel:null,poisonTrigger:null};
  if(field==='killCommandModel')policy.killCommandModel={baseMana:null,ownerRangeYards:null,petMaxRangeYards:null,windowMs:null,consume:null,triggerAbilityIds:[],includeMelee:null,includeRanged:null,allowDuringPetCast:null,outcomes:null,mitigation:null,flatReduction:null,threat:null};
  if(field==='rangedModel')policy.rangedModel={attackPower:null,weaponPolicy:'normalised',normalisedSpeed:2.8,ammoUsesActualSpeed:true,missPct:null,critPct:null,blockPct:0,blockValue:0,critSuppressionPct:0,criticalMultiplier:2,order,ammoPerShot:1};
 }
 if(rank.abilityId==='shaman:frost-shock')policy.frostShockModel=null; // Explicit {durationMs,slowPct} for target debuff interactions.
 return policy;
}
export function rotationReferenceTemplate(build,gearById={}){
 if(!rowsFor(build)?.length)throw new Error('Configure a nonempty rotation first.');
 const choices=availableRanks(build),rankByAbility={},policies={},rankChoices={},unsupported=[];
 const position=build.classOptions.attackPosition==='Front'?'front':'behind',weapon=gearById[String(build.gear.mainhand?.id)];
 const normalisedSpeed=weapon?.subclass===15?1.7:weapon?.slot===17?3.3:2.4;
 const selected=[];
 for(const [id,name] of distinctActions(build)){
  if(hunterCommand(id)){rankChoices[id]=[{spellId:null,rank:null,status:'scheduler-command',source:'https://octowow.st/index.php/hunter'}];rankByAbility[id]=null;policies[id]={phase:CURRENT_ENCHANT_PHASE,provenance,command:id,activation:'scheduled-phase'};continue;}
  const options=choices.filter(r=>r.abilityId===id).sort((a,b)=>b.rank-a.rank);
  if(!options.length){unsupported.push(name);continue;}
  rankChoices[id]=options.map(({spellId,rank,source,status})=>({spellId,rank,source,status}));
  const rank=options[0];selected.push(rank);rankByAbility[id]=rank.spellId;policies[id]=defaults(rank,position,normalisedSpeed);
 }
 if(unsupported.length)return {unsupported,config:null,rankChoices};
 const melee=selected.some(isMelee),ranged=selected.some(isRanged)||Object.hasOwn(rankByAbility,'hunter:auto-shot');
 const encounter={...(build.classId==='paladin'&&Number(build.talents?.['460']??0)>0?{daybreakModel:{durationMs:30000,min:248,max:289,healingCoefficient:null,abilityIds:selected.filter(r=>r.components.some(c=>c.kind==='heal')).map(r=>r.abilityId),includeOwner:null,triggerDamageBasis:null,refresh:null,threat:null,outcomes:null}}:{}),...(build.classId==='paladin'&&Number(build.talents?.['474']??0)>0?{reckoningPolicy:null}:{}),...(selected.some(r=>r.abilityId==='paladin:exorcism')?{targetTypes:{boss:null}}:{}),mode:'reference-research',acknowledgeIncompleteEffects:true,position,distanceYards:melee||selected.some(r=>r.maxRange<=10)?3:20,allyDistanceYards:20,
 includeMelee:melee,includeRanged:ranged,autoPolicy:{provenance,physical:physical(position),threat:null,firstSwing:'after-interval',autoCastPolicy:'skip-during-cast',swingHastePolicy:'preserve-progress'},
 recastPeriodic:'rotation-only',durationMs:build.planning.duration*1000,decisionIntervalMs:build.controls.keyInterval,
 enemyHealth:1e9,allyMaxHealth:1e9,allyHealth:1,regeneration:[],incomingDamage:[],requireCompleteCastProcs:true,...(build.classId==='warlock'&&build.talents?.['347']>0?{castProcPolicies:{nightfall:{durationMs:null}}}:{})};
 if(selected.some(r=>['hunter:mend-pet','hunter:bestial-wrath'].includes(r.abilityId)))encounter.petDistanceYards=null;
 if(['hunter','warlock'].includes(build.classId)&&build.classOptions.pet&&build.classOptions.pet!=='None')encounter.companionModel=companionTemplate(build);
 if(build.classId==='paladin'&&selected.some(r=>r.components.some(c=>c.kind==='seal-aura')))encounter.sealTwist=null; // Optional explicit {windowMs,swingPolicy,pairs}; no assumed live window.
 if(build.classId==='shaman'&&build.classOptions.mhImbue&&build.classOptions.mhImbue!=='None')encounter.imbueModel=imbueTemplate(build.classOptions.mhImbue,selected.filter(r=>r.components.some(c=>['weapon','physical-flat','physical-ap'].includes(c.kind))).map(r=>r.abilityId));
 if(encounter.imbueModel?.name==='Frostbrand Weapon'&&Number(build.talents?.['263']??0)>0)encounter.imbueModel.elementalWeapons={chanceMode:null,frostShockScope:null,criticalMultiplier:null};
 if(encounter.imbueModel?.name==='Rockbiter Weapon'&&Number(build.talents?.['263']??0)>0)encounter.imbueModel.elementalWeapons={bulwarkBasis:null};
 if(selected.some(r=>r.abilityId==='warlock:drain-soul')){encounter.soulShardCount=0;encounter.soulShardCap=null;encounter.soulShardEligibleTargets=[];}
 if(build.classId==='rogue'&&selected.some(r=>r.requiresStealth||r.abilityId==='rogue:vanish')){encounter.stealthPolicy={initial:null,autoPolicy:null,breakOnIncoming:null};if(selected.some(r=>r.abilityId==='rogue:vanish'))encounter.flashPowderCount=null;}
 if(build.classId==='rogue'){const eligible=selected.filter(r=>r.components.some(c=>['weapon','combo','physical-flat','physical-ap'].includes(c.kind))).map(r=>r.abilityId);encounter.poisonModel={};for(const [hand,key] of [['mainhand','mhPoison'],['offhand','ohPoison']]){const name=build.classOptions[key];if(name&&name!=='None')encounter.poisonModel[hand]=poisonTemplate(name,eligible);}}
 if(build.classId==='druid'&&['Cat','Bear'].includes(build.classOptions.form)){encounter.feralModel=feralTemplate(build.classOptions.form);if(build.classOptions.form==='Cat')encounter.initialComboPoints=0;}
 if(build.classId==='warrior'||build.classId==='druid'&&build.classOptions.form==='Bear')encounter.autoPolicy.rageModel={provenance:'Explicit research estimate; https://octowow.st/index.php/warrior describes terms but not coefficients',perDamage:null,perWeaponSecond:null,damageBasis:'post-mitigation',handFactors:{mainhand:null,offhand:null},criticalFactor:null,rounding:'none',allowZeroDamage:false};
 if(build.classId==='hunter'&&Number(build.talents?.['385']??0)>0&&encounter.companionModel)encounter.scentOfBloodPolicy={includeWhite:null,abilityIds:[],refresh:'preserve-longer'};
 if(ranged){encounter.ammoCount=null;const shot=selected.find(isRanged);encounter.rangedAutoPolicy={...(shot?structuredClone(policies[shot.abilityId]):{provenance,rangedModel:{attackPower:null,weaponPolicy:'actual-swing',normalisedSpeed:2.8,ammoUsesActualSpeed:true,missPct:null,critPct:null,blockPct:0,blockValue:0,critSuppressionPct:0,criticalMultiplier:2,order,ammoPerShot:1}}),autoCastPolicy:'skip-during-cast'};encounter.rangedAutoPolicy.rangedModel.weaponPolicy='actual-swing';if(rowsFor(build).some(row=>row.conditions.some(c=>c.metric==='safeRangedWindow')))encounter.rangedWindowPolicy={marginMs:null,mode:'reference-no-clip'};}
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
  if(hunterCommand(id)){const p=config.policies[id];if(config.rankByAbility[id]!==null||p?.phase!==CURRENT_ENCHANT_PHASE||p.command!==id||p.activation!=='scheduled-phase')throw new Error('Explicit rankless Hunter command policy required');continue;}
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
