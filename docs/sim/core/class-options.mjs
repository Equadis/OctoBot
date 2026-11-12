// Configuration values only; a combat adapter must explicitly implement them.
const choice=(key,label,values,value=values[0])=>({key,label,values,value});
const number=(key,label,value,min,max)=>({key,label,value,min,max});
const mana=()=>number('startingMana','Starting Mana %',100,0,100);
const poison=['None','Instant Poison VI','Deadly Poison V','Wound Poison IV','Crippling Poison II','Mind-numbing Poison III'];
export const CLASS_OPTIONS=Object.freeze({
 warrior:[choice('stance','Stance',['Battle','Berserker','Defensive']),number('startingRage','Starting Rage',0,0,100)],
 rogue:[choice('mhPoison','MH Poison',poison),choice('ohPoison','OH Poison',poison),number('startingEnergy','Starting Energy',100,0,100),number('comboPoints','Starting Combo Points',0,0,5)],
 paladin:[choice('seal','Seal',['None','Seal of Command','Seal of Righteousness','Seal of the Crusader','Seal of Wisdom','Seal of Light']),choice('aura','Aura',['None','Retribution Aura','Sanctity Aura','Devotion Aura']),mana()],
 druid:[choice('form','Form',['Humanoid','Moonkin','Cat','Bear']),mana(),number('startingEnergy','Starting Energy',100,0,100),number('startingRage','Starting Rage',0,0,100)],
 shaman:[choice('mhImbue','Weapon Imbue',['None','Windfury Weapon','Flametongue Weapon','Rockbiter Weapon','Frostbrand Weapon']),mana()],
 hunter:[choice('aspect','Aspect',['None','Aspect of the Hawk','Aspect of the Monkey','Aspect of the Wild']),choice('pet','Pet',['None','Cat','Wolf','Wind Serpent','Raptor','Boar','Bear']),number('petLevel','Pet Level',60,1,60),mana()],
 mage:[choice('armour','Armour',['None','Mage Armor','Ice Armor','Frost Armor']),mana()],
 warlock:[choice('pet','Demon',['None','Imp','Voidwalker','Succubus','Felhunter']),mana(),number('soulShards','Soul Shards',10,0,100)],
 priest:[choice('form','Form',['Humanoid','Shadowform']),mana()],
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
