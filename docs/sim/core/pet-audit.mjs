// Planning-only pet contributions. No imported Vanilla pet baselines or fabricated DPS.
import {HUNTER_FAMILIES,petAbilityCandidates,familyEvidence,trainingInventory} from './pet-training-audit.mjs?v=20261117-pet-audit2';
export const PET_RULESET_REVISION='octo-pet-audit-20261117-2';
const hunterGuide='https://octowow.st/index.php/hunter',warlockGuide='https://octowow.st/index.php/warlock';
const hunterBug='https://octowow.st/bug-report?id=320',unleashedPatch='https://octowow.st/forum/viewtopic.php?p=17845',unleashedFollowup='https://octowow.st/forum/viewtopic.php?p=18613';
export const PET_CATALOGUE=Object.freeze({
 hunter:Object.fromEntries(HUNTER_FAMILIES.map(name=>[name,{}])),
 warlock:{Imp:{min:1},Voidwalker:{min:10},Succubus:{min:20},Felhunter:{min:30},Infernal:{min:50,greater:true},Felguard:{min:60,greater:true,durationSeconds:180,cooldownSeconds:1800},Doomguard:{min:60,greater:true}}
});
export const PET_ABILITY_FACTS=Object.freeze({
 hunter:{Growl:{focus:10},Thunderstomp:{cooldownSeconds:40},'Shell Shield':{cooldownSeconds:60},'Scorpid Poison':{focus:25,cooldownSeconds:3},'Furious Howl':{focus:50},Screech:{cooldownSeconds:5},'Kill Command':{petAttackPowerPct:80,cooldownSeconds:8,baseOwnerManaPct:5}},
 warlock:{'Demon Gate':{pet:'Felguard',durationSeconds:180,cooldownSeconds:1800,baseOwnerManaPct:80}}
});
const scale=(v,p)=>Number.isFinite(v)&&v>=0?v*p/100:null;
const observerRap=n=>Number.isFinite(n)&&n>=0?n:null;
export function petProfile(build,talentData,owner={}){
 const c=build.classId;if(!PET_CATALOGUE[c])return null;
 const pet=build.classOptions?.pet||'None',opt=PET_CATALOGUE[c][pet],level=c==='hunter'?build.classOptions?.petLevel:build.level;
 const issues=[],contributions=[],events=[],ranked=new Map((talentData?.talents||[]).filter(t=>Number.isInteger(build.talents?.[t.id])&&build.talents[t.id]>0&&build.talents[t.id]<=t.maxRanks).map(t=>[t.name,{...t,rank:build.talents[t.id]}]));
 const source=t=>'https://octowow.st/db/?spell='+t.spellIds[t.rank-1];
 const add=(t,label,amount,unit='',note='Tooltip-derived contribution only; final pet totals and rounding await live verification.')=>contributions.push({talent:t.name,label,amount,unit,note,source:source(t)});
 const ev=(t,note,details={})=>events.push({name:t.name,source:source(t),note,...details});
 const param=(t,i)=>t.rankParameters?.[i]?.[t.rank-1];
 const use=(name,fn)=>{const t=ranked.get(name);if(t)fn(t)};
 if(pet==='None'){
  use(c==='hunter'?'Alone Against the World':'Soul Entrapment',t=>add(t,'Petless owner damage modifier',param(t,0),'%','Only while no companion is controlled; not added to permanent player stats.'));
  if(c==='warlock')use('Demonic Sacrifice',t=>ev(t,'Requires an actually sacrificed common demon; selecting None alone does not grant a sacrifice aura.'));
  return {pet,level:null,active:false,status:'petless',contributions,events,issues,baseStats:null,directBuffs:{applied:[],status:'unverified'}};
 }
 if(!opt||!Number.isInteger(level)||level<1||level>build.level||c==='hunter'&&build.level<10||c==='warlock'&&build.level<opt?.min){
  issues.push('Pet type or level is incompatible with the owner (training/summoning availability needs verification).');return {pet,level,active:false,status:'ineligible',contributions,events,issues,baseStats:null,directBuffs:{applied:[],status:'unverified'}};
 }
 const abilityCandidates=petAbilityCandidates(c,pet,level);
 issues.push('Companion base attributes, family damage/armour/health modifiers and attack speeds are not verified.');
 issues.push('Ability rank candidates are reference data, not learned spells. No automatic training or damage projection.');
 issues.push('Direct pet buff eligibility, range and uptime are unresolved. Owner buffs are not automatically copied; only explicitly described talent inheritance is evaluated.');
 if(c==='hunter'){
  use('Endurance Training',t=>{add(t,'Inherited Stamina',scale(owner.stamina,param(t,0)));add(t,'Pet health multiplier contribution',param(t,1),'%')});
  use('Thick Hide',t=>{add(t,'Inherited item Armour',scale(owner.itemArmour,param(t,0)));add(t,'Pet armour multiplier contribution',param(t,1),'%')});
  use('Spirit Bond',t=>{const rap=observerRap(owner.rangedAP);add(t,'Inherited melee AP',scale(rap,param(t,0)),'','Requires observed owner ranged AP for this loadout; no assumed ranged AP formula.');add(t,'Inherited spell power',scale(rap,param(t,1)),'','Requires observed owner ranged AP for this loadout.');ev(t,'Both owner and pet heal periodically; no passive HP added.',{healPct:param(t,2),intervalSeconds:5});if(rap===null)issues.push('Enter observed ranged AP to evaluate Spirit Bond AP/SP contributions.')});
  use('Unleashed Fury',t=>add(t,'Pet damage modifier',param(t,0),'%','Tooltip value only; Lightning Breath interaction disputed in '+hunterBug));
  use('Ferocity',t=>add(t,'Pet crit contribution',param(t,0),'%'));
  use('Bestial Precision',t=>{add(t,'Pet physical hit contribution',param(t,0),'%');add(t,'Pet spell hit contribution',param(t,1),'%');add(t,'Pet weapon skill contribution',param(t,2))});
  use('Bestial Discipline',t=>{add(t,'Extra Focus per tick',param(t,0));add(t,'Special ability cooldown reduction',param(t,1),'%')});
  use('Scent of Blood',t=>ev(t,'Attack-triggered damage modifier.',{procChancePct:param(t,0),damagePct:40,durationSeconds:8}));
  use('Bestial Wrath',t=>ev(t,'Grants Scent of Blood and control immunity; actual uptime not simulated.',{durationSeconds:18,cooldownSeconds:90}));
  use('Frenzy',t=>ev(t,'Pet critical-strike trigger.',{procChancePct:param(t,0),attackSpeedPct:30,durationSeconds:8}));
  use('Kill Command',t=>ev(t,'Requires owner critical strike and pet attack; no base pet AP available.',PET_ABILITY_FACTS.hunter['Kill Command']));
  use('Coordinated Assault',t=>ev(t,'Imported talent refers to owner AP; historical patch summary refers to pet AP. Scope unresolved.',{damagePct:20,windowSeconds:6,internalCooldownSeconds:3}));
 }else{
  use('Fel Stamina',t=>{add(t,'Inherited Stamina',scale(owner.stamina,param(t,0)));add(t,'Pet crit taken reduction',param(t,1),'%')});
  use('Fel Intellect',t=>{add(t,'Inherited Intellect',scale(owner.intellect,param(t,0)));add(t,'Mana regeneration while casting',param(t,1),'%')});
  use('Unholy Power',t=>add(t,'Demon damage modifier',param(t,0),'%'));
  use('Sinister Pursuit',t=>add(t,'Demon movement speed modifier',param(t,0),'%'));
  use('Demonic Precision',t=>{const p=param(t,0),inherit=param(t,1);add(t,'Melee and spell hit contribution',Number.isFinite(owner.spellHit)?p+scale(owner.spellHit,inherit):null,'%');add(t,'Melee and spell crit contribution',Number.isFinite(owner.spellCrit)?p+scale(owner.spellCrit,inherit):null,'%','Owner crit uses the current reference sheet; live transfer and rounding unresolved.')});
  use('Master Demonologist',t=>{const k={Imp:[0,'Owner and demon spell cost reduction','%'],Voidwalker:[1,'Owner and demon physical damage reduction','%'],Succubus:[2,'Owner and demon damage modifier','%'],Felhunter:[3,'Owner and demon all resistance contribution','']}[pet]||[4,'Owner and greater demon spell crit contribution','%'];add(t,k[1],param(t,k[0]),k[2],'Imported tooltip snapshot; current greater demon variants and stacking unresolved.')});
  use('Nether Studies',t=>{const ability={Imp:'Blood Pact',Voidwalker:'Torment',Succubus:'Seduction',Felhunter:'Tainted Blood'}[pet];if(ability)add(t,ability+' effect modifier',param(t,0),'%')});
  use('Demonic Swiftness',t=>{if(pet==='Imp')add(t,'Firebolt cast time reduction',param(t,0),'s');if(pet==='Succubus')add(t,'Lash of Pain cooldown reduction',param(t,1),'s')});
  use('Power Overwhelming',t=>ev(t,'Timed demon damage buff at a base-health cost.',{damagePct:20,durationSeconds:10,baseHealthCostPct:40}));
  use('Soul Link',t=>ev(t,'While demon controlled, damage dealt increases for both and owner damage is redirected.',{damagePct:5,transferPct:20}));
  use('Unleashed Potential',t=>ev(t,'Oct 23 patch confirms combined Fire/Shadow AP; developer follow-up says SP fix was still pending. No SP assumption or permanent AP applied.',{perStackPct:param(t,0),maxStacks:3,durationSeconds:20,maxStackCombinedAP: Number.isFinite(owner.fireSpellPower)&&Number.isFinite(owner.shadowSpellPower)?(owner.fireSpellPower+owner.shadowSpellPower)*param(t,0)*3/100:null,sources:[unleashedPatch,unleashedFollowup],status:'source-conflict'}));
  if(opt.greater)issues.push('Greater demon duration/control and exact summon availability are not fully validated.');
 }
 return {pet,level,active:true,status:'partial-contributions',baseStats:null,contributions,events,issues,abilityCandidates,familyEvidence:c==='hunter'?familyEvidence(pet):null,directBuffs:{applied:[],status:'unverified'},source:c==='hunter'?hunterGuide:warlockGuide};
}
export function petEngineErrors(build,engine,talents){
 if(!PET_CATALOGUE[build.classId]||!build.classOptions?.pet||build.classOptions.pet==='None')return [];
 const p=petProfile(build,talents);
 if(!p.active)return p.issues;
 if(!engine||engine.petRulesetRevision!==PET_RULESET_REVISION||!engine.verifiedPetTypes?.includes(p.pet))return ['Selected companion base statistics, abilities and pet ruleset are not verified by the combat engine.'];
 return [];
}
export function petInventory(){return {rulesetRevision:PET_RULESET_REVISION,configuredTypes:Object.values(PET_CATALOGUE).reduce((n,v)=>n+Object.keys(v).length,0),verifiedBaseTables:0,liveValidatedTypes:0,catalogue:PET_CATALOGUE,training:trainingInventory(),abilityFacts:PET_ABILITY_FACTS,sources:[hunterGuide,warlockGuide,hunterBug,unleashedPatch,unleashedFollowup]};}
