// Classic training references are candidates, not OctoWoW DB rank verification.
const classic='https://www.wow-petopia.com/classic/abilities.php';
const historical='https://octowow.st/forum/viewtopic.php?t=2322';
const guide='https://octowow.st/index.php/hunter';
const warlockHistorical='https://octowow.st/forum/viewtopic.php?t=2328';
export const HUNTER_FAMILIES=Object.freeze(['Bat','Bear','Boar','Carrion Bird','Cat','Crab','Crocolisk','Fox','Gorilla','Hyena','Owl','Raptor','Scorpid','Serpent','Spider','Tallstrider','Turtle','Wind Serpent','Wolf']);
export const DEMON_TYPES=Object.freeze(['Imp','Voidwalker','Succubus','Felhunter','Infernal','Felguard','Doomguard']);
const custom=new Set(['Fox','Serpent']);
export function familyEvidence(family){return HUNTER_FAMILIES.includes(family)?{status:custom.has(family)?'historical-custom-reference':'classic-reference',source:custom.has(family)?historical:classic,liveVerified:false}:null;}
const ability=(families,levels,{passive=false,...rest}={})=>({families,levels,passive,source:classic,rankStatus:'classic-reference',...rest});
const common='all',meleeLevels=[1,8,16,24,32,40,48,56],resLevels=[20,30,40,50,60],trainingLevels=[10,12,18,24,30,36,42,48,54,60];
const derived=(families,levels,extra={})=>ability(families,levels,extra);
export const HUNTER_TRAINING=Object.freeze({
 Bite:ability(['Bat','Bear','Boar','Carrion Bird','Cat','Crocolisk','Gorilla','Hyena','Raptor','Spider','Tallstrider','Turtle','Wind Serpent','Wolf'],meleeLevels,{historicalCoefficient:{stat:'petAP',perHit:.05,source:historical}}),
 Claw:ability(['Bear','Carrion Bird','Cat','Crab','Owl','Raptor','Scorpid'],meleeLevels,{historicalCoefficient:{stat:'petAP',perHit:1/42,source:historical}}),
 Charge:ability(['Boar'],[1,12,24,36,48,60]),
 Cower:ability(common,[5,15,25,35,45,55]),
 Dash:ability(['Boar','Cat','Hyena','Tallstrider','Wolf'],[30,40,50]),
 Dive:ability(['Bat','Carrion Bird','Owl','Wind Serpent'],[30,40,50]),
 'Furious Howl':ability(['Wolf'],[10,24,40,56],{focus:50,resourceSource:guide}),
 'Lightning Breath':ability(['Wind Serpent'],[1,12,24,36,48,60],{historicalCoefficient:{stat:'petSP',perHit:.5,source:historical},conflict:'https://octowow.st/bug-report?id=320'}),
 Prowl:ability(['Cat'],[30,40,50]),
 'Scorpid Poison':ability(['Scorpid'],[8,24,40,56],{focus:25,cooldownSeconds:3,resourceSource:guide,historicalCoefficient:{stat:'petSP',perTick:.1,source:historical}}),
 Screech:ability(['Bat','Carrion Bird','Owl'],[8,24,48,56],{cooldownSeconds:5,resourceSource:guide}),
 'Shell Shield':ability(['Turtle'],[20],{cooldownSeconds:60,resourceSource:guide}),
 Thunderstomp:ability(['Gorilla'],[30,40,50],{cooldownSeconds:40,resourceSource:guide,historicalCoefficient:{stat:'petSP',perHit:.21,source:historical}}),
 Growl:ability(common,[1,10,20,30,40,50,60],{focus:10,resourceSource:guide}),
 'Great Stamina':ability(common,trainingLevels,{passive:true}),
 'Natural Armor':ability(common,trainingLevels,{passive:true}),
 ...Object.fromEntries(['Arcane','Fire','Frost','Nature','Shadow'].map(s=>[s+' Resistance',derived(common,resLevels,{passive:true})])),
 'Poison Spit':{families:['Serpent'],levels:null,passive:false,source:historical,rankStatus:'unresolved',historicalCoefficient:{stat:'petSP',perTick:.25,source:historical}}
});
export const DEMON_ABILITY_CANDIDATES=Object.freeze({
 Imp:['Firebolt','Blood Pact','Phase Shift','Fire Shield'],
 Voidwalker:['Torment','Sacrifice','Consume Shadows','Suffering'],
 Succubus:['Lash of Pain','Seduction','Soothing Kiss','Lesser Invisibility'],
 Felhunter:['Devour Magic','Spell Lock','Tainted Blood','Paranoia'],
 Infernal:[],Felguard:['Felstorm'],Doomguard:[]
});
export function petAbilityCandidates(classId,pet,level){
 if(classId==='warlock')return (DEMON_ABILITY_CANDIDATES[pet]||[]).map(name=>({name,rankStatus:'unresolved',maxCandidateRank:null,knownRank:null,source:warlockHistorical,simulationReady:false}));
 if(classId!=='hunter'||!HUNTER_FAMILIES.includes(pet)||!Number.isInteger(level)||level<1||level>60)return [];
 return Object.entries(HUNTER_TRAINING).filter(([,a])=>a.families===common||a.families.includes(pet)).map(([name,a])=>({
 name,...a,rankStatus:custom.has(pet)&&a.families===common?'classic-reference-custom-family':a.rankStatus,
 maxCandidateRank:a.levels?a.levels.filter(l=>l<=level).length:null,knownRank:null,simulationReady:false
 }));
}
// Caller may supply observed learned ranks, but this cannot certify the server
// ruleset or assume all level-qualified abilities have been trained.
export function reviewLearnedRanks(classId,pet,level,learned=[]){
 const candidates=petAbilityCandidates(classId,pet,level),seen=new Set(),errors=[],warnings=[];
 for(const entry of learned){
  if(!entry||typeof entry.name!=='string'||!Number.isInteger(entry.rank)||entry.rank<1){errors.push('Malformed ability rank.');continue;}
  if(seen.has(entry.name)){errors.push('Duplicate learned ability: '+entry.name);continue;}seen.add(entry.name);
  const candidate=candidates.find(a=>a.name===entry.name);
  if(!candidate){warnings.push('Family compatibility unverified: '+entry.name);continue;}
  if(candidate.maxCandidateRank!==null&&entry.rank>candidate.maxCandidateRank)warnings.push('Exceeds Classic reference level/rank: '+entry.name);
  if(candidate.rankStatus==='unresolved')warnings.push('Rank data unresolved: '+entry.name);
 }
 return {errors,warnings,liveVerified:false,simulationReady:false};
}
export function trainingInventory(){return {hunterFamilies:HUNTER_FAMILIES.length,classicFamilies:HUNTER_FAMILIES.length-custom.size,historicalCustomFamilies:custom.size,demonTypes:DEMON_TYPES.length,hunterAbilityTypes:Object.keys(HUNTER_TRAINING).length,classicRankCandidates:Object.values(HUNTER_TRAINING).reduce((n,a)=>n+(a.levels?.length||0),0),guideResourceRules:Object.values(HUNTER_TRAINING).filter(a=>a.resourceSource===guide).length,verifiedOctoRankRows:0,liveVerified:0};}
