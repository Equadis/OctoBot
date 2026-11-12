import {CONSUMABLE_DATA} from './consumable-data.mjs?v=20261112-audit1';
import {classDefinition} from './classes.mjs?v=20261112-audit1';
import {isManaClass,validRace,RACE_MASKS,CLASS_RESOURCES} from './class-rules.mjs?v=20261112-audit1';
const canonical=name=>name.toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]/g,'');
const ALIASES={'Elixir of the Mongoose':'mongoose','Elixir of Greater Agility':'greater-agility','Ground Scorpok Assay':'scorpok','Winterfall Firewater':'firewater','Juju Might':'juju-might','Elixir of Giants':'giants','Juju Power':'juju-power','Dreamshard Elixir':'dreamshard','Concoction of the Emerald Mongoose':'emerald-mongoose','Concoction of the Dreamwater':'dreamwater','Concoction of the Arcane Giant':'arcane-giant','Elixir of Brute Force':'brute-force','Flask of Supreme Power':'supreme-power',Dreamtonic:'dreamtonic','Greater Arcane Elixir':'greater-arcane','Elixir of Greater Nature Power':'nature-power','Elixir of Greater Firepower':'firepower','Dragonbreath Chili':'chili',"Danonzo's Tel'Abim Medley":'medley','Sour Mountain Berry':'berry','Squid Eel Skewer':'skewer','Crunchy Sandwept Carrots':'carrots',"Dirge's Kicken Chimaerek Chops":'chimaerek','Le Fishe Au Chocolat':'fishe',"Medievh's Merlot":'merlot','Rumsey Rum':'rum','Juju Flurry':'flurry','Potion of Quickness':'quickness','Thistle Tea':'tea'};
const alias=new Map(Object.entries(ALIASES).map(([name,id])=>[canonical(name),id]));
export const CONSUMABLES=Object.freeze(CONSUMABLE_DATA.map(raw=>{
 const effect=(raw.effects||[]).join(' '),resource=/increases rage|rage by|rage over|\d+ rage/i.test(effect)?'rage':/restores? .*energy|\d+ energy/i.test(effect)?'energy':/restores? .*mana|\d+ mana|mana every/i.test(effect)?'mana':null;
 const duration=effect.match(/(?:for|lasts) (\d+(?:\.\d+)?)\s*(sec|min|hour|hr)/i);
 const category=/potion/i.test(raw.name)?'Potion':/flask/i.test(raw.name)?'Flask':/elixir|concoction/i.test(raw.name)?'Elixir':/rune/i.test(raw.name)?'Rune':/bandage/i.test(raw.name)?'Bandage':/oil|sharpening|weightstone/i.test(raw.name)?'Weapon coating':'Food & Utility';
 return Object.freeze({...raw,buffId:alias.get(canonical(raw.name))||null,resource,category,durationSeconds:duration?Number(duration[1])*({sec:1,min:60,hour:3600,hr:3600}[duration[2].toLowerCase()]):null,
 // Category alone is insufficient proof of a server cooldown. Values remain
 // unresolved until the corresponding source spell/item category is verified.
 cooldownSeconds:null,cooldownVerified:false,sharedCooldown:category==='Potion'?'potion':category==='Rune'?'rune':category==='Bandage'?'bandage':null});
}));
export const CONSUMABLE_BY_ID=new Map(CONSUMABLES.map(item=>[item.id,item]));
export function consumableRestriction(item,build){
 if(!item?.verified)return 'Official effects and restrictions have not been verified.';
 if(!validRace(build.classId,build.race))return 'Invalid class/race combination.';
 if(item.classMask!==-1&&!(item.classMask&classDefinition(build.classId).mask))return 'This consumable is restricted to another class.';
 if(item.raceMask!==-1&&!(item.raceMask&RACE_MASKS[build.race]))return 'This consumable is restricted to another race.';
 if(item.requiredLevel>build.level)return `Requires level ${item.requiredLevel}.`;
 if(!item.effects.length)return 'No verified usable effect.';
 if(item.resource==='mana'&&!isManaClass(build.classId)&&!/restores?[^.]*mana and health|health and mana/i.test(item.effects.join(' ')))return 'Requires a Mana-using class.';
 if(item.resource==='rage'&&!['warrior','druid'].includes(build.classId))return 'Requires Rage.';
 if(item.resource==='energy'&&!['rogue','druid'].includes(build.classId))return 'Requires Energy.';
 // Weapon coatings are configured on the weapon, not as a second simultaneous coating.
 if(item.category==='Weapon coating')return 'Choose a coating in the weapon configuration.';
 if(/poison/i.test(item.name)&&!/poison resistance|protection|purification/i.test(item.name))return 'Configure Rogue poisons on the weapon.';
 const skill=item.tooltipText.match(/Requires (First Aid|Cooking|Alchemy|Engineering) \((\d+)\)/);
 if(skill&&(build.skills?.[skill[1]]||0)<Number(skill[2]))return `Requires ${skill[1]} (${skill[2]}).`;
 return null;
}
export function consumableGroup(item){
 if(item.sharedCooldown)return item.sharedCooldown;
 if(item.category==='Flask')return 'flask';
 if(/Dreamless Sleep/i.test(item.name))return 'potion';
 if(item.category==='Food & Utility'&&/well fed/i.test((item.effects||[]).join(' ')))return 'food';
 if(/(?:Agility|Mongoose)/i.test(item.name))return 'agility-elixir';
 if(/(?:Giants|Strength)/i.test(item.name))return 'strength-elixir';
 if(/(?:Arcane Elixir)/i.test(item.name))return 'arcane-elixir';
 return null;
}
export function selectConsumable(ids,id){
 const item=CONSUMABLE_BY_ID.get(id);if(!item)throw new Error('Unknown consumable.');
 const group=consumableGroup(item);return [...ids.filter(other=>other!==id&&(!group||consumableGroup(CONSUMABLE_BY_ID.get(other)||{})!==group)),id];
}
export function validateConsumables(ids,build){
 if(ids===undefined)return [];
 if(!Array.isArray(ids)||ids.length>100)throw new Error('Invalid consumable selection.');
 let result=[];
 for(const id of ids){if(!Number.isSafeInteger(id))throw new Error('Invalid consumable ID.');const item=CONSUMABLE_BY_ID.get(id),reason=consumableRestriction(item,build);if(reason)throw new Error(`${item?.name||id}: ${reason}`);if(item.buffId)throw new Error('Use the shared buff selection for this consumable.');result=selectConsumable(result,id);}
 return result;
}
/** Unambiguous long-duration passive facts only, never potion averaging. */
export function consumablePassiveStats(item){
 if(!item?.verified||(item.category==='Potion'&&!(item.durationSeconds>=1800))||item.category==='Rune'||item.category==='Bandage')return {};
 const text=item.effects.join(' '),stats={};let m;
 for(const [word,key] of [['Strength','str'],['Agility','agi'],['Stamina','sta'],['Intellect','int'],['Spirit','spi']]){
  m=text.match(new RegExp(`(?:increases? (?:your )?${word} by|${word} (?:is )?increased by) (\\d+)`,'i'));if(m)stats[key]=Number(m[1]);
 }
 m=text.match(/(?:damage done by spells and magical effects|spell damage|damage and healing done by magical spells and effects).*?(?:by up to|by) (\d+)/i);if(m)stats.sp=Number(m[1]);
 m=text.match(/(?:attack power by|attack power increased by) (\d+)/i);if(m)stats.ap=Number(m[1]);
 m=text.match(/(?:Regenerate|Restores?) (\d+) mana (?:every|per) 5 sec/i);if(m)stats.mp5=Number(m[1]);
 m=text.match(/Increases (?:your )?Intellect and Spirit by (\d+)/i);if(m){stats.int=Number(m[1]);stats.spi=Number(m[1]);}
 m=text.match(/(?:maximum health by|maximum health is increased by) (\d+)/i);if(m)stats.health=Number(m[1]);
 m=text.match(/(?:maximum mana by|maximum mana is increased by) (\d+)/i);if(m)stats.mana=Number(m[1]);
 return stats;
}
// An engine must explicitly implement every selected timed effect and its verified
// cooldown. Displaying an item is not counted as simulation support.
export function consumableEngineErrors(build,supportedIds=[]){return (build.controls.consumableIds||[]).flatMap(id=>{const item=CONSUMABLE_BY_ID.get(id);return [...(!supportedIds.includes(id)?[`Consumable ${id} is not implemented by the combat engine.`]:[]),...(item?.sharedCooldown&&!item.cooldownVerified?[`Consumable ${id}: server cooldown is unresolved.`]:[])];});}

const LEGACY_GROUPS={potion:['quickness'],'agility-elixir':['mongoose','greater-agility','emerald-mongoose'],'strength-elixir':['giants','juju-power','arcane-giant'],'arcane-elixir':['greater-arcane','arcane-giant'],flask:['supreme-power'],food:['chili','medley','berry','skewer','carrots','chimaerek','fishe']};
export function resolveConsumableSelection(controls,prefer='consumables'){
 let buffIds=[...controls.buffIds],consumableIds=[...(controls.consumableIds||[])];
 for(const id of consumableIds){const group=consumableGroup(CONSUMABLE_BY_ID.get(id)||{}),old=LEGACY_GROUPS[group]||[];if(!old.some(id=>buffIds.includes(id)))continue;if(prefer==='consumables')buffIds=buffIds.filter(id=>!old.includes(id));else consumableIds=consumableIds.filter(other=>other!==id);}
 return {...controls,buffIds,consumableIds};
}
export function crossConsumableErrors(controls){const next=resolveConsumableSelection(controls);return next.buffIds.length===controls.buffIds.length?[]:['A consumable conflicts with a selected shared buff.'];}
