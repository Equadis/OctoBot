// Configuration values only; a combat adapter must explicitly implement them.
const choice=(key,label,values,value=values[0])=>({key,label,values,value});
const number=(key,label,value,min,max)=>({key,label,value,min,max});
const mana=()=>number('startingMana','Starting Mana %',100,0,100);
const scenario=(key,label,values)=>choice(key,'Scenario: '+label,values);
const poison=['None','Instant Poison VI','Deadly Poison V','Wound Poison IV','Crippling Poison II','Mind-numbing Poison III'];
export const CLASS_OPTIONS=Object.freeze({
 warrior:[choice('stance','Stance',['Battle','Berserker','Defensive']),number('startingRage','Starting Rage',0,0,100)],
 rogue:[choice('mhPoison','MH Poison',poison),choice('ohPoison','OH Poison',poison),number('startingEnergy','Starting Energy',100,0,100),number('comboPoints','Starting Combo Points',0,0,5),scenario('attackPosition','Attack Position',['Unspecified','Behind','Front']),scenario('targetCreature','Target Creature',['Unspecified','Humanoid','Giant','Beast','Dragonkin','Undead','Demon','Elemental','Mechanical'])],
 paladin:[choice('seal','Seal',['None','Seal of Command','Seal of Righteousness','Seal of the Crusader','Seal of Wisdom','Seal of Light']),choice('aura','Aura',['None','Retribution Aura','Sanctity Aura','Devotion Aura','Concentration Aura']),mana(),scenario('righteousFury','Righteous Fury',['Off','On'])],
 druid:[choice('form','Form',['Humanoid','Moonkin','Cat','Bear']),choice('catBuilder','Cat Builder',['Shred','Claw']),mana(),number('startingEnergy','Starting Energy',100,0,100),number('startingRage','Starting Rage',0,0,100),number('activeBleeds','Scenario: Own Active Bleeds',0,0,5),scenario('targetMoonfire','Target Moonfire',['Off','On']),scenario('targetInsectSwarm','Target Insect Swarm',['Off','On']),scenario('targetRejuvenation','Target Rejuvenation',['Off','On']),scenario('outdoors','Outdoors',['Unspecified','Yes','No'])],
 shaman:[choice('mhImbue','Weapon Imbue',['None','Windfury Weapon','Flametongue Weapon','Rockbiter Weapon','Frostbrand Weapon']),mana(),scenario('elementalDevastationProc','Elemental Devastation Proc',['Inactive','Active'])],
 hunter:[choice('aspect','Aspect',['None','Aspect of the Hawk','Aspect of the Monkey','Aspect of the Wild','Aspect of the Wolf']),choice('pet','Pet',['None','Cat','Wolf','Wind Serpent','Raptor','Boar','Bear']),number('petLevel','Pet Level',60,1,60),mana(),scenario('targetCreature','Target Creature',['Unspecified','Humanoid','Giant','Beast','Dragonkin','Undead','Demon','Elemental','Mechanical'])],
 mage:[choice('armour','Armour',['None','Mage Armor','Ice Armor','Frost Armor']),mana(),scenario('lowMana','Below 35% Mana',['Unspecified','Yes','No'])],
 warlock:[choice('pet','Demon',['None','Imp','Voidwalker','Succubus','Felhunter','Felguard','Doomguard']),choice('curse','Assigned Curse',['Curse of Agony','Curse of the Elements','Curse of Shadow','Curse of Recklessness','None']),mana(),number('soulShards','Soul Shards',10,0,100),number('afflictionEffects','Scenario: Active Affliction Effects',0,0,10)],
 priest:[choice('form','Form',['Humanoid','Shadowform']),choice('useVampiricEmbrace','Vampiric Embrace',['Off','On']),mana(),scenario('targetRenew','Target Renew',['Off','On'])],
});
export function defaultClassOptions(classId){return Object.fromEntries(CLASS_OPTIONS[classId].map(option=>[option.key,option.value]));}
export function validateClassOptions(input,classId){
 const options=CLASS_OPTIONS[classId],result=defaultClassOptions(classId);if(input===undefined)return result;
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid class options.');
 for(const [key,value] of Object.entries(input)){
  const option=options.find(option=>option.key===key);
  if(!option||(option.values?!option.values.includes(value):!Number.isInteger(value)||value<option.min||value>option.max))throw new Error(`Invalid class option: ${key}.`);
  result[key]=value;
 }
 return result;
}
