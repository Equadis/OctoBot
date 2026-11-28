import {ROTATION_REGISTRY} from './rotations/registry.mjs';
// Facts describe public guide statements only. A partial contract is NOT a
// learned rank, fully implemented spell, or authorised simulation result.
const fact=(classId,id,fields,unknown)=>({classId,id:classId+':'+id,source:'https://octowow.st/index.php/'+classId,status:'published-partial',fields,unknown});
export const ABILITY_CONTRACTS=Object.freeze([
 fact('warrior','bloodthirst',{attackPowerCoefficient:.35},['flat damage by rank','cost','cooldown','crit rules']),
 fact('warrior','shield-slam',{scalesWith:['attackPower','blockValue']},['coefficients','base damage','cost','threat']),
 fact('warrior','mortal-strike',{scalesWith:['weaponDamage']},['weapon multiplier','rank damage','cost','cooldown']),
 fact('rogue','sinister-strike',{cost:{resource:'energy',amount:40}},['weapon scaling','flat damage by rank','combo points','refund rules']),
 fact('rogue','eviscerate',{cost:{resource:'energy',amount:30}},['damage per combo point and rank','scaling','refund rules']),
 fact('rogue','rupture',{cost:{resource:'energy',amount:20}},['tick interval','duration','AP scaling','refund rules']),
 fact('rogue','slice-and-dice',{cost:{resource:'energy',amount:20}},['duration per combo point','haste','refresh rules']),
 fact('rogue','blade-flurry',{minLevel:30,cost:{resource:'energy',amount:25},cooldownSeconds:4,toggle:true},['damage penalty','energy regen penalty','cleave targeting']),
 fact('rogue','noxious-assault',{attackPowerCoefficient:.30,appliesBothPoisons:true},['flat damage','per-hand coefficient allocation','cost','proc order']),
 fact('paladin','crusader-strike',{ranks:[{level:10,cost:20,baseDamage:30,holyBonusPerStack:5},{level:22,cost:40,baseDamage:46,holyBonusPerStack:9},{level:34,cost:70,baseDamage:70,holyBonusPerStack:14},{level:46,cost:100,baseDamage:106,holyBonusPerStack:21},{level:58,cost:120,baseDamage:160,holyBonusPerStack:29}],maxStacks:5,durationSeconds:30},['school and hit table','scaling','cooldown','stack timing']),
 fact('paladin','holy-strike',{minLevel:4,cooldownSeconds:6,ranks:[{rank:1,cost:5},{rank:8,level:60,cost:90}]},['weapon coefficient','restoration values','intermediate ranks','school and threat']),
 fact('hunter','kill-command',{cost:{resource:'mana',amount:5,percentOfBase:true},cooldownSeconds:8,petAttackPowerCoefficient:.8,requiresOwnerCrit:true},['pet attack table','proc window','rounding']),
 fact('hunter','aimed-shot',{cooldownSeconds:26,ranks:[{rank:6,cost:205}]},['damage','cast time','rank learnability','reset conditions']),
 fact('hunter','arcane-shot',{ranks:[{rank:8,cost:125}],scalesWith:['rangedWeaponDamage']},['weapon multiplier','base arcane damage','other ranks']),
 fact('mage','arcane-surge',{minLevel:32,cost:{resource:'mana',amount:85},cooldownSeconds:8},['damage/cast speed buff size','duration','GCD']),
 fact('mage','fireball',{ranks:[{rank:11,cost:275},{rank:12,cost:295}]},['base damage','coefficient','tick data','learnability']),
 fact('mage','arcane-rupture',{minLevel:20,cooldownSeconds:15},['damage','mana cost','buff magnitude/duration']),
 fact('priest','smite',{guideCost:40,guideRankCount:9},['rank-specific costs','base damage','coefficient','cast time']),
 fact('priest','power-word-shield',{scalesWith:['spellPower'],shield:true},['rank absorption','cost','coefficient','weakened soul']),
 fact('shaman','stormstrike',{ranks:[{rank:1,cost:21,percentOfBase:true,cooldownSeconds:20},{rank:2,level:60,cost:12,percentOfBase:true,cooldownSeconds:12}]},['weapon damage coefficient','nature bonus','charges','threat']),
 fact('shaman','water-shield',{charges:3,manaPerCharge:83,durationSeconds:600},['rank applicability','exact internal cooldown','proc eligibility']),
 fact('shaman','earth-shield',{charges:3,healPerCharge:150,durationSeconds:600,pushbackAvoidancePct:30},['rank applicability','healing coefficient','internal cooldown']),
 fact('druid','savage-bite',{minLevel:58,cost:{resource:'rage',amount:30},cooldownSeconds:6,normalDamageCoefficient:.8,flatDamage:30,forms:['Bear','Dire Bear']},['form damage baseline','threat multiplier','attack table']),
 fact('druid','wrath',{ranks:[{rank:9,level:60,cost:210}]},['base damage','coefficient','crit rules']),
 fact('druid','regrowth',{ranks:[{rank:9,cost:704}],costReductionFromVanillaPct:20},['direct healing','periodic healing','coefficient split','tick rules']),
 fact('warlock','dark-harvest',{learnLevels:[40,50,60],cooldownSeconds:30,resetOnTargetDeathDuringChannel:true},['mana cost','channel interval/duration','base damage','coefficient']),
 fact('warlock','soul-fire',{minLevel:38,guideRankCount:4,guideCost:260,cooldownSeconds:30},['rank-specific cost','base damage','coefficient','shard usage']),
 fact('warlock','conflagrate',{immolateDurationConsumedSeconds:3},['base damage','coefficient','cost','cooldown','tick accounting'])
]);
const contracts=new Map(ABILITY_CONTRACTS.map(x=>[x.id,x]));
export function abilityContract(id){return contracts.get(id)||null;}
export function combatAbilityInventory(){
 const classes=Object.entries(ROTATION_REGISTRY).map(([classId,p])=>{
  const rows=Object.values(p.abilityRegistry).map(a=>({id:a.id,name:a.name,identityStatus:a.verification,candidateSpellIds:a.spellIds,contract:abilityContract(a.id),simulationReady:false}));
  return {classId,registered:rows.length,publishedPartial:rows.filter(x=>x.contract).length,withoutContract:rows.filter(x=>!x.contract).length,simulationReady:0,rows};
 });
 const ids=new Set(classes.flatMap(c=>c.rows.map(r=>r.id)));
 return {classes,totals:{classes:classes.length,registered:classes.reduce((n,c)=>n+c.registered,0),publishedPartial:classes.reduce((n,c)=>n+c.publishedPartial,0),withoutContract:classes.reduce((n,c)=>n+c.withoutContract,0),simulationReady:0},unregisteredContracts:ABILITY_CONTRACTS.filter(c=>!ids.has(c.id)).map(c=>c.id)};
}
