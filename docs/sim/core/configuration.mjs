// Display reference supplied by the user from Combat Gum. These values are not
// ruleset validation and are not applied to combat or character calculations.
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
export const ABILITIES=Object.freeze(['Execute','Bloodthirst','Mortal Strike','Whirlwind','Heroic Strike','Cleave','Slam','Overpower','Rend','Master Strike','Shield Slam','Revenge','Sunder Armor','Battle Shout','Demoralizing Shout','Thunder Clap','Bloodrage','Berserker Rage','Death Wish','Recklessness','Sweeping Strikes','Shield Block']);
export const METRICS=Object.freeze({rage:'Rage',targetHealth:'Target Health %',auraDuration:'Aura Duration (s)'});
export const OPERATORS=Object.freeze(['>=','<=','>','<','=']);
const c=(metric,operator,value,aura='')=>({metric,operator,value,aura});
const row=(ability,conditions=[])=>({ability,conditions});
export const ROTATION_PRESETS=Object.freeze([
 {id:'arms-twohand',name:'Arms | Two-Handed',description:'Execute, Mortal Strike and Overpower; Slam and Heroic Strike as rage allows.',rows:[row('Execute',[c('targetHealth','<=',20)]),row('Mortal Strike'),row('Overpower'),row('Slam',[c('rage','>=',40)]),row('Heroic Strike',[c('rage','>=',60)])]},
 {id:'fury-dual',name:'Fury | Dual Wield',description:'Execute, Bloodthirst and Whirlwind; Heroic Strike at high rage.',rows:[row('Execute',[c('targetHealth','<=',20)]),row('Bloodthirst'),row('Whirlwind'),row('Heroic Strike',[c('rage','>=',60)])]},
 {id:'fury-twohand',name:'Fury | Two-Handed',description:'Execute, Bloodthirst and Whirlwind; Slam as rage allows.',rows:[row('Execute',[c('targetHealth','<=',20)]),row('Bloodthirst'),row('Whirlwind'),row('Slam',[c('rage','>=',40)])]},
 {id:'protection-shield',name:'Protection | Shield',description:'Shield Slam and Revenge; maintain Sunder Armor and spend excess rage with Heroic Strike.',rows:[row('Shield Slam'),row('Revenge'),row('Sunder Armor'),row('Heroic Strike',[c('rage','>=',60)])]},
 {id:'custom',name:'New Custom Rotation',description:'',rows:[]},
]);
export const defaultControls=()=>({buffIds:[],teaThreshold:20,rotationPreset:'custom',rotationRows:[],keyInterval:100,variability:true,variabilityMs:35});
export function validateRotationRows(rows){
 if(!Array.isArray(rows)||rows.length>30)throw new Error('A rotation can contain at most 30 abilities.');
 return rows.map(row=>{
  if(!row||!ABILITIES.includes(row.ability)||!Array.isArray(row.conditions)||row.conditions.length>6)throw new Error('Invalid rotation ability or conditions.');
  return {ability:row.ability,conditions:row.conditions.map(condition=>{
   if(!condition||!Object.hasOwn(METRICS,condition.metric)||!OPERATORS.includes(condition.operator)||!Number.isFinite(condition.value)||condition.value<0||condition.value>10000||typeof condition.aura!=='string'||condition.aura.length>80)throw new Error('Invalid rotation condition.');
   return {metric:condition.metric,operator:condition.operator,value:condition.value,aura:condition.aura};
  })};
 });
}
export function validateControls(input){
 const defaults=defaultControls();if(input===undefined)return defaults;
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid configuration controls.');
 if(!Array.isArray(input.buffIds)||input.buffIds.length>BUFF_OPTIONS.length||input.buffIds.some(id=>!BUFF_OPTIONS.some(option=>option.id===id)))throw new Error('Invalid buff selection.');
 if(!ROTATION_PRESETS.some(preset=>preset.id===input.rotationPreset))throw new Error('Unknown rotation preset.');
 for(const [key,min,max] of [['teaThreshold',0,100],['keyInterval',10,5000],['variabilityMs',0,5000]])if(!Number.isInteger(input[key])||input[key]<min||input[key]>max)throw new Error(`Invalid ${key}.`);
 if(typeof input.variability!=='boolean')throw new Error('Invalid key-press variability.');
 return {buffIds:[...new Set(input.buffIds)],teaThreshold:input.teaThreshold,rotationPreset:input.rotationPreset,rotationRows:validateRotationRows(input.rotationRows),keyInterval:input.keyInterval,variability:input.variability,variabilityMs:input.variabilityMs};
}
