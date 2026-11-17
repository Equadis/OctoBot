import {referenceRank,referenceRanks} from './combat-reference-ranks.mjs';
import {ROTATION_REGISTRY} from './rotations/registry.mjs';
import {CURRENT_ENCHANT_PHASE} from './equipment-options.mjs';
import {prepareReferenceScenario} from './combat-reference-adapter.mjs';
// The lab is deliberately a controlled reference experiment; it is not a live-server rotation.
export function labRanks(classId){return referenceRanks(classId).map(r=>({...r,available:(r.referenceAvailableFromPhase??1)<=CURRENT_ENCHANT_PHASE,name:ROTATION_REGISTRY[classId].abilityRegistry[r.abilityId]?.name??r.abilityId})).sort((a,b)=>a.name.localeCompare(b.name)||b.rank-a.rank);}
export function prepareLab({build,talents,gearById,spellId,confirmed,seed=42,costOverride=null,periodicCoefficient=null,cooldownMs,executeModel=null,physicalAPModel=null}){
 if(confirmed!==true)throw new Error('Confirm learned rank and experimental assumptions first');
 const rank=referenceRank(build.classId,spellId),name=ROTATION_REGISTRY[build.classId].abilityRegistry[rank.abilityId]?.name;
 if(!name)throw new Error('Reference rank identity is not registered');
 if((rank.referenceAvailableFromPhase??1)>CURRENT_ENCHANT_PHASE)throw new Error('Rank unavailable in the current reference phase');
 if(build.classOptions.moving==='Yes')throw new Error('Moving casts are not modelled in the reference lab');
 if(build.planning.durationVary)throw new Error('The reference lab requires a fixed fight duration');
 if(build.planning.iterations>10000)throw new Error('The reference lab supports up to 10,000 iterations');
 if(!Number.isSafeInteger(seed)||seed<0||seed>4294967295)throw new Error('Invalid seed');
 if(!Number.isSafeInteger(cooldownMs)||cooldownMs<0)throw new Error('Enter an explicit cooldown in milliseconds');
 const healing=rank.components.every(c=>c.kind.endsWith('heal'));
 const physical=rank.components.some(c=>['weapon','combo','physical-ap','execute','combo-aura'].includes(c.kind));
 const magical=rank.components.filter(c=>!c.kind.endsWith('heal')&&!['weapon','combo','physical-ap','execute','combo-aura'].includes(c.kind));
 for(const c of magical){const field='target'+c.stat[0].toUpperCase()+c.stat.slice(1)+'Res';if(build.planning[field]>0)throw new Error('Nonzero '+c.stat+' resistance needs an explicit measured resistance distribution');}
 const position=build.classOptions.attackPosition==='Front'?'front':'behind';
 const weapon=gearById[String(build.gear.mainhand?.id)];
 const normalisedSpeed=weapon?.subclass===15?1.7:weapon?.slot===17?3.3:2.4;
 const provenance='Explicit reference lab policy: no partial resistance, behind unless front selected, fixed encounter, no resource regeneration; not server validated';
 const policy={provenance,phase:CURRENT_ENCHANT_PHASE,acceptExternalReference:true,acceptSourceConflict:true,gcdMs:rank.mode==='queued-melee'?0:rank.resource==='energy'?1000:1500,cooldownMs,weaponPolicy:rank.mode==='queued-melee'?'actual-swing':'normalised',normalisedSpeed,physical:{dualWieldPenaltyPct:19,parryPct:0,blockPct:0,blockValue:0,critSuppressionPct:0,criticalMultiplier:2,order:['miss','dodge','parry','block','glance','crit'],position},periodicCanCrit:false,healCriticalMultiplier:1.5,spellCriticalMultiplier:1.5,resistance:Object.fromEntries(['fire','frost','shadow','nature','arcane','holy'].map(s=>[s,{policy:'none',bins:[{fraction:0,probability:1}]}])),refresh:'restart',tickAtExpiry:true,snapshot:'snapshot',threat:null,apPerComboPoint:.03,spendOnMiss:false,costOverride,executeModel,physicalAPModel,channelTickAtEnd:true,swingHastePolicy:'preserve-progress',componentCoefficients:[null,periodicCoefficient]};
 const encounter={mode:'reference-research',acknowledgeIncompleteEffects:true,position,distanceYards:physical?3:20,allyDistanceYards:20,includeMelee:physical,autoPolicy:{...policy,firstSwing:'after-interval',autoCastPolicy:'skip-during-cast'},recastPeriodic:'after-expiry',durationMs:build.planning.duration*1000,decisionIntervalMs:100,enemyHealth:1e9,...(rank.targetHealthMaxPct!==undefined?{enemyCurrentHealth:1e9*rank.targetHealthMaxPct/100}:{}),allyMaxHealth:1e9,allyHealth:1,regeneration:[]};
 const prepared=prepareReferenceScenario({build,talents,gearById,learnedSpellIds:[spellId],rankByAbility:{[rank.abilityId]:spellId},policies:{[rank.abilityId]:policy},encounter,rows:[{ability:name,target:healing?'ally':'primary',conditions:[]}]});
 prepared.limitations.push('Single learned rank benchmark, not the saved rotation. Fixed 100 ms decision interval; no resource regeneration, incoming damage, threat or partial resistance. Selected gear and static talents are used; dynamic effects may be omitted.');
 return {prepared,seed,iterations:build.planning.iterations};
}
