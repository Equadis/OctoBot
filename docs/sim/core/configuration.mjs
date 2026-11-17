import {validateConsumables,CONSUMABLES,consumableRestriction,crossConsumableErrors} from './consumables.mjs?v=20261117-stacking-audit1';
import {classDefinition} from './classes.mjs?v=20261112-audit1';
import {normaliseBuffs,worldBuffRestriction,WEAPON_MASTERY} from './buffs.mjs?v=20261117-buff-audit4';
import {rotationProfileData} from './rotations/registry.mjs?v=20261112-rotations1';
import {CONDITION_DEFINITIONS} from './rotations/conditions.mjs?v=20261112-rotations1';
import {metricsForClass,validateRows} from './rotations/validator.mjs?v=20261112-rotations1';
// Display reference supplied by the user from Combat Gum. These values are not
// ruleset validation. Supported passive values feed planning estimates only.
const group=(id,name,all,rows,collapsed=false)=>({id,name,all,collapsed,options:rows.map(([id,name,effect,classes])=>({id,name,effect,...(classes?{classes}:{})}))});
export const BUFF_GROUPS=Object.freeze([
 group('raid','Raid Buffs',true,[
 ['battle-shout','Battle Shout','+232 AP (Rank 7)'],['might','Improved Blessing of Might','+222 AP (Rank 7, improved)'],['kings','Blessing of Kings','+10% All Stats'],['wild','Mark / Gift of the Wild','+12 All Stats, +285 Armour, +20 Resistances'],['pack','Leader of the Pack','+3% Melee/Ranged Crit'],['earth','Improved Strength of Earth Totem','+96 Str (Rank 5, improved)'],['air','Improved Grace of Air Totem','+96 Agi (Rank 3, improved)'],['trueshot','Trueshot Aura (database rank 3)','+100 melee/ranged AP; conflicting source'],['windfury','Windfury Totem','20% extra MH attack; AP / cooldown rules unresolved'],['flametongue','Flametongue Totem','Weapon-speed Fire damage; max-rank formula unverified'],['tricks','Tricks of the Trade (2 active stacks)','+4% Crit (12s)'],['hemorrhage','Hemorrhage (tooltip)','+2% target physical damage taken; conflicting source'],['mark-death','Mark for Death','18% AP → SP, +30% AP (8s)'],['fortitude','Prayer of Fortitude','+54 Stamina (Rank 2)'],['arcane-intellect','Arcane Intellect','+31 Intellect (Rank 5)'],['divine-spirit','Divine Spirit','+40 Spirit (Rank 4)'],['wisdom','Blessing of Wisdom','+33 MP5 (Rank 6)',['paladin','hunter','druid','shaman','mage','warlock','priest']]]),
 group('consumables','Consumables',true,[['mongoose','Elixir of the Mongoose','+25 Agi, +2% Crit'],['greater-agility','Elixir of Greater Agility','+25 Agi'],['scorpok','Ground Scorpok Assay','+25 Agi'],['firewater','Winterfall Firewater','+35 AP'],['juju-might','Juju Might','+40 AP'],['giants','Elixir of Giants','+25 Str'],['juju-power','Juju Power','+30 Str']]),
 group('spell-consumables','SP Consumables',true,[['supreme-power','Flask of Supreme Power','+150 Spell Damage'],['dreamtonic','Dreamtonic','+35 Spell Damage'],['greater-arcane','Greater Arcane Elixir','+35 Spell Damage'],['dreamshard','Dreamshard Elixir','+15 SP, +2% Spell Crit'],['nature-power','Elixir of Greater Nature Power','+55 Nature SP'],['firepower','Elixir of Greater Firepower','+40 Fire SP'],['wizard-oil-mh','Brilliant Wizard Oil (MH)','+36 Spell Damage, +1% Spell Crit'],['wizard-oil-oh','Brilliant Wizard Oil (OH)','+36 Spell Damage, +1% Spell Crit']]),
 group('other-consumables','Other Consumables',false,[['emerald-mongoose','Concoction of the Emerald Mongoose','+15 SP, +25 Agi, +2% Crit, +2% Spell Crit'],['dreamwater','Concoction of the Dreamwater','+35 Spell Damage, +35 AP'],['arcane-giant','Concoction of the Arcane Giant','+35 Spell Damage, +25 Str'],['brute-force','Elixir of Brute Force','+18 Str, +18 Sta']]),
 group('food','Food Buffs',false,[['chili','Dragonbreath Chili','Melee-triggered Fire AoE for 10 min; proc and scaling unverified'],['medley',"Danonzo’s Tel’Abim Medley",'+2% Haste'],['berry','Sour Mountain Berry','+10 Agi'],['skewer','Squid Eel Skewer','+20 Agi'],['carrots','Crunchy Sandwept Carrots','+32 AP'],['chimaerek',"Dirge’s Kickin’ Chimaerok Chops",'+2% Dodge, +30 Sta'],['fishe','Le Fishe Au Chocolat','+1% Dodge, +4 Defense']]),
 group('drink','Drink Buffs',false,[['merlot',"Medivh’s Merlot",'+25 Sta'],['rum','Rumsey Rum Black Label','+15 Sta']]),
 group('short','Short Duration Consumables',true,[['flurry','Juju Flurry','+3% Haste for 20s (reference; uptime unresolved)'],['quickness','Potion of Quickness','+5% Haste for 30s (timed; not averaged)']]),
 group('target','Target Debuffs',true,[['expose','Improved Expose Armor','−2550 Armor'],['sunder','Sunder Armor (5 stacks)','−2250 Armor'],['eskhandar','Spirit of Eskhandar (unverified)','Armour reduction not established; excluded from estimates'],['recklessness','Curse of Recklessness','−640 Armour, +90 Target AP'],['faerie','Faerie Fire','−505 Armor'],['wind-serpent','Embrace of the Wind Serpent (active)','−400 Armour after 55 stacks'],['annihilator','Annihilator (3 stacks)','−600 Armour'],['shartateth',"Shar’tateth",'−250 Armor'],['ripper','The Ripper (unverified)','Armour reduction not established; excluded from estimates'],['corrosive-poison','Corrosive Poison (active)','−60 Armour for 30s; proc uptime unverified'],['nightfall','Nightfall (active)','Target takes 15% increased spell damage for 5s'],['arthas','Gift of Arthas','+8 physical damage taken by target'],['curse-elements','Curse of the Elements','−75 Fire/Frost Resistance, +10% Fire/Frost damage taken'],['curse-shadow','Curse of Shadow','−75 Shadow/Arcane Resistance, +10% Shadow/Arcane damage taken']]),
 group('other','Other',false,[['tea','Thistle Tea','100 Energy; actual item cooldown unverified',['rogue']],['skill-book','All Weapon Masteries (legacy)','+5 per eligible weapon type; assumes all relevant quests completed']]),
 group('mastery','Weapon Masteries',false,WEAPON_MASTERY.map(m=>[m.id,m.name,'+5 skill after completing the corresponding quest'])),
 group('world','World Buffs',false,[['fengus','Fengus’ Ferocity','+200 AP'],['slipkik','Slip’kik’s Savvy','+3% Spell Crit']]),
]);
export const BUFF_OPTIONS=Object.freeze(BUFF_GROUPS.flatMap(group=>group.options));
export const ABILITIES=rotationProfileData('warrior').abilities;
export const METRICS=Object.freeze(Object.fromEntries(Object.entries(CONDITION_DEFINITIONS).map(([id,def])=>[id,def.label])));
export const OPERATORS=Object.freeze(['>=','<=','>','<','=']);
export const ROTATION_PRESETS=rotationProfileData('warrior').presets;
export const defaultControls=()=>({buffIds:[],consumableIds:[],teaThreshold:20,rotationRole:'dps',rotationPreset:'custom',rotationRows:[],keyInterval:100,variability:true,variabilityMs:35});
export function rotationProfile(classId='warrior'){return {...rotationProfileData(classId),metrics:metricsForClass(classId)};}
export function validateRotationRows(rows,classId='warrior'){return validateRows(rows,classId);}
export function validateControls(input,classId='warrior',context={}){
 const build={classId,race:classDefinition(classId).race,level:60,gear:{},skills:{},...context};
 const profile=rotationProfile(classId);
 const defaults=defaultControls();if(input===undefined)return defaults;
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid configuration controls.');
 if(!Array.isArray(input.buffIds)||input.buffIds.length>BUFF_OPTIONS.length||input.buffIds.some(id=>!BUFF_OPTIONS.some(option=>option.id===id)))throw new Error('Invalid buff selection.');
 for(const id of input.buffIds){const reason=buffRestriction(BUFF_OPTIONS.find(b=>b.id===id),build);if(reason)throw new Error(reason);}
 const consumableIds=validateConsumables(input.consumableIds,build);
 const crossErrors=crossConsumableErrors({...input,consumableIds});if(crossErrors.length)throw new Error(crossErrors[0]);
 const legacyRogue={
  'assassination-noxious':'assassination-noxious','combat-sinister':'combat-sinister-envenom','subtlety-hemorrhage':'subtlety-hemorrhage'
 };
 const rotationPreset=classId==='rogue'?(legacyRogue[input.rotationPreset]||input.rotationPreset):input.rotationPreset;
 const rotationRole=input.rotationRole??profile.presets.find(p=>p.id===rotationPreset)?.role??'dps';if(!['dps','tank','healing'].includes(rotationRole)||!profile.presets.some(p=>p.role===rotationRole))throw new Error('Unsupported rotation role for this class.');
 if(!profile.presets.some(preset=>preset.id===rotationPreset))throw new Error('Unknown rotation preset.');
 for(const [key,min,max] of [['teaThreshold',0,100],['keyInterval',10,5000],['variabilityMs',0,5000]])if(!Number.isInteger(input[key])||input[key]<min||input[key]>max)throw new Error(`Invalid ${key}.`);
 if(typeof input.variability!=='boolean')throw new Error('Invalid key-press variability.');
 return {buffIds:normaliseBuffs(input.buffIds),consumableIds,teaThreshold:input.teaThreshold,rotationRole,rotationPreset,rotationRows:validateRotationRows(input.rotationRows,classId),keyInterval:input.keyInterval,variability:input.variability,variabilityMs:input.variabilityMs};
}

export function buffRestriction(option,build){
 if(!option)return 'Unknown buff.';
 const mastery=WEAPON_MASTERY.find(m=>m.id===option.id);
 if(mastery&&build.level<60)return 'Requires level 60.';
 if(mastery&&!mastery.subclasses.some(s=>classDefinition(build.classId).weapons.includes(s)))return 'This class cannot use this weapon type.';
 if(option.classes&&!option.classes.includes(build.classId))return `${option.name} is not applicable to this class.`;
 if(option.id.startsWith('wizard-oil-')&&build.level<45)return 'Requires level 45.';
 if(option.id==='wizard-oil-oh'&&!['warrior','rogue','hunter'].includes(build.classId))return 'This class cannot coat an off-hand weapon.';
 const item=CONSUMABLES.find(item=>item.buffId===option.id&&item.verified);
 return item?consumableRestriction(item,build):null;
}

// Availability is separate from build validation: retain saved world-buff choices when switching encounters.
export function buffScenarioRestriction(option,build){return buffRestriction(option,build)||worldBuffRestriction(option?.id,build.planning);}
