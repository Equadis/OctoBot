import {consumableEffectAudit} from './consumable-effects.mjs?v=20261117-buff-audit1';
import {CONSUMABLE_DATA} from './consumable-data.mjs?v=20261112-consumes1';
import {classDefinition} from './classes.mjs?v=20261112-audit1';
import {isManaClass,validRace,RACE_MASKS,CLASS_RESOURCES} from './class-rules.mjs?v=20261112-audit1';
const canonical=name=>name.toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]/g,'');
const ALIASES={'Elixir of the Mongoose':'mongoose','Elixir of Greater Agility':'greater-agility','Ground Scorpok Assay':'scorpok','Winterfall Firewater':'firewater','Juju Might':'juju-might','Elixir of Giants':'giants','Juju Power':'juju-power','Dreamshard Elixir':'dreamshard','Concoction of the Emerald Mongoose':'emerald-mongoose','Concoction of the Dreamwater':'dreamwater','Concoction of the Arcane Giant':'arcane-giant','Elixir of Brute Force':'brute-force','Flask of Supreme Power':'supreme-power',Dreamtonic:'dreamtonic','Greater Arcane Elixir':'greater-arcane','Elixir of Greater Nature Power':'nature-power','Elixir of Greater Firepower':'firepower','Dragonbreath Chili':'chili',"Danonzo's Tel'Abim Medley":'medley','Sour Mountain Berry':'berry','Squid Eel Skewer':'skewer','Crunchy Sandwept Carrots':'carrots',"Dirge's Kickin' Chimaerok Chops":'chimaerek','Le Fishe Au Chocolat':'fishe',"Medivh's Merlot":'merlot','Rumsey Rum Black Label':'rum','Juju Flurry':'flurry','Potion of Quickness':'quickness','Thistle Tea':'tea'};
const alias=new Map(Object.entries(ALIASES).map(([name,id])=>[canonical(name),id]));
export const CONSUMABLES=Object.freeze(CONSUMABLE_DATA.map(raw=>{
 const effect=(raw.effects||[]).join(' '),resource=/increases rage|rage by|rage over|\d+ rage/i.test(effect)?'rage':/restores? .*energy|\d+ energy/i.test(effect)?'energy':/restores? .*mana|\d+ mana|mana every/i.test(effect)?'mana':null;
 const audit=consumableEffectAudit(raw);
 const duration=effect.match(/(?:for|lasts) (\d+(?:\.\d+)?)\s*(sec|min|hour|hr)/i);
 const category=/potion/i.test(raw.name)?'Potion':/flask/i.test(raw.name)?'Flask':/elixir|concoction/i.test(raw.name)?'Elixir':/rune/i.test(raw.name)?'Rune':/bandage/i.test(raw.name)?'Bandage':/\b(?:oil|sharpening stone|weightstone)\b/i.test(raw.name)&&audit.status==='enhancement'?'Weapon coating':'Food & Utility';
 return Object.freeze({...raw,effectAudit:audit,buffId:alias.get(canonical(raw.name))||null,resource,category,durationSeconds:audit.durationSeconds??(duration?Number(duration[1])*({sec:1,min:60,hour:3600,hr:3600}[duration[2].toLowerCase()]):null),
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
 if(/^(?:Plans|Recipe|Pattern|Schematic|Formula|Design|Manual):/i.test(item.name)||/teaches you how to|learn how to (?:make|create)/i.test(item.effects.join(' ')))return 'Crafting recipes are not combat consumables.';
 if((item.resource==='mana'||item.effectAudit?.stats?.mana>0||item.effectAudit?.stats?.mp5>0)&&!isManaClass(build.classId)&&!/restores?[^.]*mana and health|health and mana/i.test(item.effects.join(' ')))return 'Requires a Mana-using class.';
 if(item.resource==='rage'&&!['warrior','druid'].includes(build.classId))return 'Requires Rage.';
 if(item.resource==='energy'&&!['rogue','druid'].includes(build.classId))return 'Requires Energy.';
 // Weapon coatings are configured on the weapon, not as a second simultaneous coating.
 if(item.category==='Weapon coating')return 'Choose a coating in the weapon configuration.';
 if(item.effectAudit?.status==='enhancement')return 'Permanent or weapon enhancements belong in equipment configuration.';
 if(/poison/i.test(item.name)&&!/poison resistance|protection|purification/i.test(item.name))return 'Configure Rogue poisons on the weapon.';
 const skill=item.tooltipText.match(/Requires (First Aid|Cooking|Alchemy|Engineering) \((\d+)\)/);
 if(skill&&(build.skills?.[skill[1]]||0)<Number(skill[2]))return `Requires ${skill[1]} (${skill[2]}).`;
 return null;
}
export function consumableGroup(item){
 const explicit=explicitStacking(item);if(explicit.group)return explicit.group;
 if(item.category==='Flask')return 'flask';
 if(/gets you drunk to boot/i.test((item.effects||[]).join(' '))&&item.effectAudit?.status==='prepull')return 'drink';
 if(/well fed|Must remain seated while eating.*(?:also increase|also gain)/i.test((item.effects||[]).join(' ')))return 'food';
 const scroll=item.name?.match(/^Scroll of (Strength|Agility|Intellect|Stamina|Spirit|Protection)(?: [IVX]+)?$/i);if(scroll)return 'scroll-'+scroll[1].toLowerCase();
 if(/^Elixir of (?:Minor |Lesser |Greater )?Agility$|^Elixir of the Mongoose$/i.test(item.name))return 'agility-elixir';
 if(/^Elixir of (?:Giants|Lion's Strength|Ogre's Strength)$/i.test(item.name))return 'strength-elixir';
 if(/^(?:Greater )?Arcane Elixir$/i.test(item.name))return 'arcane-elixir';
 return null;
}
export function selectConsumable(ids,id){
 const item=CONSUMABLE_BY_ID.get(id);if(!item)throw new Error('Unknown consumable.');
 return [...ids.filter(other=>!consumablesConflict(item,CONSUMABLE_BY_ID.get(other))),id];
}
export function validateConsumables(ids,build){
 if(ids===undefined)return [];
 if(!Array.isArray(ids)||ids.length>100)throw new Error('Invalid consumable selection.');
 let result=[];
 for(const id of ids){if(!Number.isSafeInteger(id))throw new Error('Invalid consumable ID.');const item=CONSUMABLE_BY_ID.get(id),reason=consumableRestriction(item,build);if(reason)throw new Error(`${item?.name||id}: ${reason}`);if(item.buffId)throw new Error('Use the shared buff selection for this consumable.');result=selectConsumable(result,id);}
 return result;
}
/** Unambiguous long-duration passive facts only, never potion averaging. */
export function consumablePassiveStats(item){const audit=item?.effectAudit||consumableEffectAudit(item);return audit.status==='prepull'?{...audit.stats}:{};}
// An engine must explicitly implement every selected timed effect and its verified
// cooldown. Displaying an item is not counted as simulation support.
export function consumableEngineErrors(build,supportedIds=[]){return (build.controls.consumableIds||[]).flatMap(id=>{const item=CONSUMABLE_BY_ID.get(id);return [...(!supportedIds.includes(id)?[`Consumable ${id} is not implemented by the combat engine.`]:[]),...(item?.sharedCooldown&&!item.cooldownVerified?[`Consumable ${id}: server cooldown is unresolved.`]:[])];});}

const LEGACY_GROUPS={'agility-elixir':['mongoose','greater-agility','emerald-mongoose'],'strength-elixir':['giants','juju-power','arcane-giant'],'arcane-elixir':['greater-arcane','arcane-giant'],flask:['supreme-power'],drink:['merlot','rum'],food:['chili','medley','berry','skewer','carrots','chimaerek','fishe']};
export function resolveConsumableSelection(controls,prefer='consumables'){
 let buffIds=[...new Set(controls.buffIds)],consumableIds=[...new Set(controls.consumableIds||[])];
 for(const id of consumableIds){const group=consumableGroup(CONSUMABLE_BY_ID.get(id)||{}),old=LEGACY_GROUPS[group]||[];if(!old.some(id=>buffIds.includes(id)))continue;if(prefer==='consumables')buffIds=buffIds.filter(id=>!old.includes(id));else consumableIds=consumableIds.filter(other=>other!==id);}
 return {...controls,buffIds,consumableIds};
}
export function crossConsumableErrors(controls){const next=resolveConsumableSelection(controls);return next.buffIds.length===new Set(controls.buffIds).size?[]:['A consumable conflicts with a selected shared buff.'];}

// Published item text is evidence of exclusivity; shared cooldowns and similar
// stat names alone are not. Unlisted interactions remain explicitly unresolved.
export function explicitStacking(item){
 const text=(item.effects||[]).join(' ');
 if(/(?:only have the effect of one Zanza potion at a time|Only one type of Zanza potion may be active)/i.test(text))return {group:'zanza',status:'verified-tooltip',source:item.source};
 if(/only have the effect of one flask at a time/i.test(text))return {group:'flask',status:'verified-tooltip',source:item.source};
 return {group:null,status:'unresolved',source:item.source};
}
export function consumablesConflict(a,b){
 if(!a||!b)return false;if(a.id===b.id)return true;
 const group=consumableGroup(a);if(group&&group===consumableGroup(b))return true;
 // Two items applying the identical source spell represent one selected effect.
 return Boolean(a.verified&&b.verified&&a.spellIds?.some(id=>b.spellIds?.includes(id)));
}
export function stackingNote(item){
 const fact=explicitStacking(item);
 if(fact.group)return `Stacking: only one ${fact.group} effect, confirmed by the official item tooltip.`;
 if(consumableGroup(item))return 'Stacking: reference replacement group; OctoWoW-specific behaviour is not independently verified.';
 return 'Stacking: OctoWoW-specific interactions are unresolved. A shared cooldown alone does not mean mutually exclusive buffs.';
}
// Fixed display order must not depend on current selection.
export function orderConsumables(items){return [...items].sort((a,b)=>a.name.localeCompare(b.name)||a.id-b.id);}
