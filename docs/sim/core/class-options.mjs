import {HUNTER_FAMILIES,DEMON_TYPES} from './pet-training-audit.mjs?v=20261117-pet-audit2';
// Configuration values only; a combat adapter must explicitly implement them.
const choice=(key,label,values,value=values[0])=>({key,label,values,value});
const number=(key,label,value,min,max)=>({key,label,value,min,max});
const mana=()=>number('startingMana','Starting Mana %',100,0,100);
const poison=['None','Instant Poison VI','Deadly Poison V','Wound Poison IV','Agitating Poison','Crippling Poison II','Mind-numbing Poison III'];
const BASE_CLASS_OPTIONS={
 warrior:[choice('stance','Stance',['Battle','Berserker','Defensive']),number('startingRage','Starting Rage',0,0,100)],
 rogue:[choice('mhPoison','MH Poison',poison),choice('ohPoison','OH Poison',poison),number('startingEnergy','Starting Energy',100,0,110),number('comboPoints','Starting Combo Points',0,0,5),choice('attackPosition','Scenario: Attack Position',['Unspecified','Behind','Front'])],
 paladin:[choice('seal','Seal',['None','Seal of Command','Seal of Righteousness','Seal of the Crusader','Seal of Wisdom','Seal of Light']),choice('aura','Aura',['None','Retribution Aura','Sanctity Aura','Devotion Aura','Concentration Aura']),mana(),choice('righteousFury','Scenario: Righteous Fury',['Off','On'])],
 druid:[choice('form','Form',['Humanoid','Moonkin','Cat','Bear']),choice('catBuilder','Cat Builder',['Shred','Claw']),mana(),number('startingEnergy','Starting Energy',100,0,110),number('startingRage','Starting Rage',0,0,100),number('activeBleeds','Scenario: Own Active Bleeds',0,0,5),choice('targetMoonfire','Scenario: Target Moonfire',['Off','On']),choice('targetInsectSwarm','Scenario: Target Insect Swarm',['Off','On']),choice('targetRejuvenation','Scenario: Target Rejuvenation',['Off','On'])],
 shaman:[choice('shield','Shield spell',['None','Lightning Shield','Water Shield']),choice('mhImbue','Weapon Imbue',['None','Windfury Weapon','Flametongue Weapon','Rockbiter Weapon','Frostbrand Weapon']),mana(),choice('elementalDevastationProc','Scenario: Elemental Devastation Proc',['Inactive','Active'])],
 hunter:[choice('aspect','Aspect',['None','Aspect of the Hawk','Aspect of the Monkey','Aspect of the Wild','Aspect of the Wolf']),choice('pet','Pet',['None',...HUNTER_FAMILIES]),number('petLevel','Pet Level',60,1,60),choice('petHappiness','Pet Happiness (reference)',['Unknown','Unhappy','Content','Happy']),number('observedRangedAP','Observed Ranged AP (-1 = unknown)',-1,-1,100000),mana()],
 mage:[choice('armour','Armor',['None','Mage Armor','Ice Armor','Frost Armor']),mana(),choice('lowMana','Scenario: Below 35% Mana',['Unspecified','Yes','No'])],
 warlock:[choice('pet','Demon',['None',...DEMON_TYPES]),choice('curse','Assigned Curse',['Curse of Agony','Curse of the Elements','Curse of Shadow','Curse of Recklessness','None']),mana(),number('soulShards','Soul Shards',10,0,100),number('afflictionEffects','Scenario: Active Affliction Effects',0,0,4),choice('soulLink','Scenario: Soul Link Aura',['Off','On'])],
 priest:[choice('form','Form',['Humanoid','Shadowform']),choice('useVampiricEmbrace','Vampiric Embrace',['Off','On']),mana(),choice('targetRenew','Scenario: Target Renew',['Off','On'])],
};
export const CLASS_OPTIONS=Object.freeze(Object.fromEntries(Object.entries(BASE_CLASS_OPTIONS).map(([id,options])=>[id,[...options,choice('targetCreature','Scenario: Target Creature',['Unspecified','Undead','Demon','Beast','Dragonkin','Elemental','Humanoid','Giant','Mechanical','Player']),choice('moving','Scenario: Moving',['No','Yes']),choice('outdoors','Scenario: Outdoors',['No','Yes','Unspecified'])]])));
export function defaultClassOptions(classId){return Object.fromEntries(CLASS_OPTIONS[classId].map(option=>[option.key,option.value]));}
// startingEnergy can reach the talent-derived cap (110 with Vigor); a value above the current cap is clamped, never rejected, so older saves stay valid.
export function validateClassOptions(input,classId,{energyCap}={}){
 const options=CLASS_OPTIONS[classId],result=defaultClassOptions(classId);if(input===undefined)return result;
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid class options.');
 for(const [key,value] of Object.entries(input)){
  const option=options.find(option=>option.key===key);
  if(!option||(option.values?!option.values.includes(value):!Number.isInteger(value)||value<option.min||value>option.max))throw new Error(`Invalid class option: ${key}.`);
  result[key]=key==='startingEnergy'&&energyCap!==undefined?Math.min(value,energyCap):value;
 }
 return result;
}
