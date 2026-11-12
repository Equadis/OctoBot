import {validateConsumables,CONSUMABLES,consumableRestriction,crossConsumableErrors} from './consumables.mjs?v=20261112-consumes1';
import {classDefinition} from './classes.mjs?v=20261112-audit1';
import {normaliseBuffs} from './buffs.mjs?v=20261112-stats1';
import {rotationProfileData} from './rotations/registry.mjs?v=20261112-rotations1';
import {CONDITION_DEFINITIONS} from './rotations/conditions.mjs?v=20261112-rotations1';
import {metricsForClass,validateRows} from './rotations/validator.mjs?v=20261112-rotations1';
// Display reference supplied by the user from Combat Gum. These values are not
// ruleset validation. Supported passive values feed planning estimates only.
const group=(id,name,all,rows,collapsed=false)=>({id,name,all,collapsed,options:rows.map(([id,name,effect,classes])=>({id,name,effect,...(classes?{classes}:{})}))});
export const BUFF_GROUPS=Object.freeze([
 group('raid','Raid Buffs',true,[
 ['battle-shout','Battle Shout','+232 AP'],['might','Blessing of Might','+222 AP'],['kings','Blessing of Kings','+10% All Stats'],['wild','Mark of the Wild','+12 Agi, +12 Str, +12 Sta'],['pack','Leader of the Pack','+3% Crit'],['earth','Strength of Earth Totem','+96 Str'],['air','Grace of Air Totem','+96 Agi'],['trueshot','Trueshot Aura','+30 AP, +3% AP'],['windfury','Windfury Totem','20% extra MH attack on hit (1.5s ICD)'],['flametongue','Flametongue Totem','+15.8–48.7 main hand fire damage based on weapon speed'],['tricks','Tricks of the Trade','+4% Crit'],['hemorrhage','Hemorrhage','+4% Phys'],['mark-death','Mark for Death','18% AP → SP, +30% AP (8s)']]),
 group('consumables','Consumables',true,[['mongoose','Elixir of the Mongoose','+25 Agi, +2% Crit'],['greater-agility','Elixir of Greater Agility','+25 Agi'],['scorpok','Ground Scorpok Assay','+25 Agi'],['firewater','Winterfall Firewater','+35 AP'],['juju-might','Juju Might','+40 AP'],['giants','Elixir of Giants','+25 Str'],['juju-power','Juju Power','+30 Str'],['dreamshard','Dreamshard Elixir','+15 SP, +2% Spell Crit']]),
 group('other-consumables','Other Consumables',false,[['emerald-mongoose','Concoction of the Emerald Mongoose','+15 SP, +25 Agi, +2% Crit, +2% Spell Crit'],['dreamwater','Concoction of the Dreamwater','+35 SP, +35 AP'],['arcane-giant','Concoction of the Arcane Giant','+35 SP, +25 Str'],['brute-force','Elixir of Brute Force','+18 Str, +18 Sta']]),
 group('spell-consumables','SP Consumables',true,[['supreme-power','Flask of Supreme Power','+150 SP'],['dreamtonic','Dreamtonic','+35 SP'],['greater-arcane','Greater Arcane Elixir','+35 SP'],['nature-power','Elixir of Greater Nature Power','+55 Nature SP'],['firepower','Elixir of Greater Firepower','+40 Fire SP'],['wizard-oil-mh','Brilliant Wizard Oil (MH)','+36 SP, +1% Spell Crit'],['wizard-oil-oh','Brilliant Wizard Oil (OH)','+36 SP, +1% Spell Crit']],true),
 group('food','Food Buffs',false,[['chili','Dragonbreath Chili','5% proc fire AoE on hit (33% SP scaling, 150% spell crit)'],['medley',"Danonzo’s Tel’Abim Medley",'+2% Haste'],['berry','Sour Mountain Berry','+10 Agi'],['skewer','Squid Eel Skewer','+20 Agi'],['carrots','Crunchy Sandwept Carrots','+32 AP'],['chimaerek',"Dirge’s Kicken Chimaerek Chops",'+2% Dodge, +30 Sta'],['fishe','Le Fishe Au Chocolat','+1% Dodge, +4 Defense']]),
 group('drink','Drink Buffs',false,[['merlot',"Medievh’s Merlot",'+25 Sta'],['rum','Rumsey Rum','+15 Sta']]),
 group('short','Short Duration Consumables',true,[['flurry','Juju Flurry','+1% Haste (3% for 20s, 60s CD — averaged to 1%)'],['quickness','Potion of Quickness','+1.25% Haste (5% for 30s, 120s CD — averaged to 1.25%)']]),
 group('target','Target Debuffs',true,[['expose','Improved Expose Armor','−2550 Armor'],['sunder','Sunder Armor (5 stacks)','−2250 Armor'],['eskhandar','Spirit of Eskhandar','−1200 Armor'],['recklessness','Curse of Recklessness','−640 Armor'],['faerie','Faerie Fire','−505 Armor'],['wind-serpent','Embrace of the Wind Serpent','−400 Armor'],['annihilator','Annihilator (3 stacks)','−300 Armor'],['shartateth',"Shar’tateth",'−250 Armor'],['ripper','The Ripper','−163 Armor'],['nightfall','Nightfall','Target takes 10% increased spell damage'],['arthas','Gift of Arthas','+8 physical damage to all attacks']]),
 group('other','Other',false,[['tea','Thistle Tea','100 Energy (300s CD)',['rogue']],['skill-book','Weapon Skill Book','+5 Weapon Skill (all types)']]),
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
 if(option.classes&&!option.classes.includes(build.classId))return `${option.name} is not applicable to this class.`;
 if(option.id==='wizard-oil-oh'&&!['warrior','rogue','hunter'].includes(build.classId))return 'This class cannot coat an off-hand weapon.';
 const item=CONSUMABLES.find(item=>item.buffId===option.id&&item.verified);
 return item?consumableRestriction(item,build):null;
}
