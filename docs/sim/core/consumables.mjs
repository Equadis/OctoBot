import {BUFF_CONFLICTS,normaliseBuffs} from './buffs.mjs?v=20261128-merge1';
import {consumableEffectAudit} from './consumable-effects.mjs?v=20261117-buff-audit4';
import {CONSUMABLE_DATA} from './consumable-data.mjs?v=20261112-consumes1';
import {classDefinition} from './classes.mjs?v=20261128-merge1';
import {isManaClass,validRace,RACE_MASKS,CLASS_RESOURCES} from './class-rules.mjs?v=20261128-merge1';
const canonical=name=>name.toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]/g,'');
const ALIASES={'Elixir of the Mongoose':'mongoose','Elixir of Greater Agility':'greater-agility','Ground Scorpok Assay':'scorpok','Winterfall Firewater':'firewater','Juju Might':'juju-might','Elixir of Giants':'giants','Juju Power':'juju-power','Dreamshard Elixir':'dreamshard','Concoction of the Emerald Mongoose':'emerald-mongoose','Concoction of the Dreamwater':'dreamwater','Concoction of the Arcane Giant':'arcane-giant','Elixir of Brute Force':'brute-force','Flask of Supreme Power':'supreme-power',Dreamtonic:'dreamtonic','Greater Arcane Elixir':'greater-arcane','Elixir of Greater Nature Power':'nature-power','Elixir of Greater Firepower':'firepower','Dragonbreath Chili':'chili',"Danonzo's Tel'Abim Medley":'medley','Sour Mountain Berry':'berry','Squid Eel Skewer':'skewer','Crunchy Sandwept Carrots':'carrots',"Dirge's Kickin' Chimaerok Chops":'chimaerek','Le Fishe Au Chocolat':'fishe',"Medivh's Merlot":'merlot','Rumsey Rum Black Label':'rum','Juju Flurry':'flurry','Potion of Quickness':'quickness','Thistle Tea':'tea'};
const alias=new Map(Object.entries(ALIASES).map(([name,id])=>[canonical(name),id]));
export const CONSUMABLES=Object.freeze(CONSUMABLE_DATA.map(raw=>{
 const effect=(raw.effects||[]).join(' '),resource=/increases rage|rage by|rage over|\d+ rage/i.test(effect)?'rage':/restores? .*energy|\d+ energy/i.test(effect)?'energy':/restores? .*mana|\d+ mana|mana every/i.test(effect)?'mana':null;
 const audit=consumableEffectAudit(raw);
 const duration=effect.match(/(?:for|lasts) (\d+(?:\.\d+)?)\s*(sec|min|hour|hr)/i);
 const category=/potion/i.test(raw.name)?'Potion':/only have the effect of one flask at a time/i.test(effect)?'Flask':/elixir|concoction/i.test(raw.name)?'Elixir':/rune/i.test(raw.name)?'Rune':/bandage/i.test(raw.name)?'Bandage':/\b(?:oil|sharpening stone|weightstone)\b/i.test(raw.name)&&audit.status==='enhancement'?'Weapon coating':'Food & Utility';
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
 if(!item)return null;
 const explicit=explicitStacking(item);if(explicit.group)return explicit.group;
 if(item.category==='Flask'&&item.verified)return 'flask';
 if(/gets you drunk to boot/i.test((item.effects||[]).join(' '))&&item.effectAudit?.status==='prepull')return 'drink';
 if(/well fed|Must remain seated while eating.*(?:also increase|also gain)/i.test((item.effects||[]).join(' ')))return 'food';
 const scroll=item.name?.match(/^Scroll of (Strength|Agility|Intellect|Stamina|Spirit|Protection)(?: [IVX]+)?$/i);if(scroll)return 'scroll-'+scroll[1].toLowerCase();
 if(/^Elixir of (?:Minor |Lesser |Greater )?Agility$|^Elixir of the Mongoose$/i.test(item.name))return 'agility-elixir';
 if(/^Elixir of (?:Giants|Lion's Strength|Ogre's Strength)$/i.test(item.name))return 'strength-elixir';
 if(/^(?:Greater )?Arcane Elixir$/i.test(item.name))return 'arcane-elixir';
 if(/^Elixir of (?:Minor |Greater |Superior )?Defense$/i.test(item.name))return 'defence-elixir';
 if(/^(?:Weak |Strong |Mighty |Major )?Troll's Blood Potion$/i.test(item.name))return 'troll-blood';
 const school=item.name?.match(/^Elixir of (?:Greater )?(Firepower|Frost Power|Nature Power|Arcane Power|Shadow Power)$/i);if(school)return 'school-elixir-'+school[1].toLowerCase();
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

// The manual groups preserve the existing Combat Gum-derived replacement policy.
 // These are not confirmations of server aura stacking. Compound items can
 // belong to several groups; do not collapse pairwise conflicts transitively.
export const LEGACY_GROUPS={'agility-elixir':['mongoose','greater-agility','emerald-mongoose'],'strength-elixir':['giants','juju-power','arcane-giant'],'arcane-elixir':['greater-arcane','arcane-giant'],flask:['supreme-power'],'school-elixir-firepower':['firepower'],'school-elixir-nature power':['nature-power'],drink:['merlot','rum'],food:['chili','medley','berry','skewer','carrots','chimaerek','fishe']};
const SHARED_ITEMS=new Map();
for(const item of CONSUMABLES)if(item.buffId&&item.verified){
 const entries=SHARED_ITEMS.get(item.buffId)||[];entries.push(item);SHARED_ITEMS.set(item.buffId,entries);
}
export function sharedConsumableConflict(buffId,item){
 if(!item)return null;
 if(item.buffId===buffId)return {kind:'same-selection',evidence:'catalogue-alias'};
 const group=consumableGroup(item);
 if(group&&LEGACY_GROUPS[group]?.includes(buffId)){
  const record=(SHARED_ITEMS.get(buffId)||[]).find(x=>explicitStacking(x).group===group);
  return {kind:'replacement-group',group,evidence:record&&explicitStacking(item).group===group?'verified-tooltip':'reference-policy'};
 }
 for(const shared of SHARED_ITEMS.get(buffId)||[]){
  const conflict=consumableConflictReason(shared,item);if(conflict)return conflict;
 }
 return null;
}
export function resolveConsumableSelection(controls,prefer='consumables'){
 let buffIds=normaliseBuffs(controls.buffIds||[]),consumableIds=[];
 // Alias-coded catalogue choices are invalid in saved builds; direct/unvalidated
 // evaluation canonicalises them rather than counting the same aura twice.
 const ids=[];
 for(const id of controls.consumableIds||[]){
  const item=CONSUMABLE_BY_ID.get(id);if(!item)continue;
  if(item.buffId){buffIds=normaliseBuffs([...buffIds,item.buffId]);continue;}
  ids.push(id);
 }
 for(const id of ids)consumableIds=selectConsumable(consumableIds,id);
 for(const id of [...consumableIds]){
  const item=CONSUMABLE_BY_ID.get(id),conflicts=buffIds.filter(b=>sharedConsumableConflict(b,item));
  if(!conflicts.length)continue;
  if(prefer==='consumables')buffIds=buffIds.filter(b=>!conflicts.includes(b));
  else consumableIds=consumableIds.filter(other=>other!==id);
 }
 return {...controls,buffIds,consumableIds};
}
export function crossConsumableErrors(controls){
 return (controls.consumableIds||[]).some(id=>(controls.buffIds||[]).some(b=>sharedConsumableConflict(b,CONSUMABLE_BY_ID.get(id))))?['A consumable conflicts with a selected shared buff.']:[];
}
// Published item text is evidence of exclusivity; shared cooldowns and similar
// stat names alone are not. Unlisted interactions remain explicitly unresolved.
export function explicitStacking(item){
 if(!item?.verified)return {group:null,status:'unresolved',source:item?.source};
 const text=(item.effects||[]).join(' ');
 if(/(?:only have the effect of one Zanza potion at a time|Only one type of Zanza potion may be active)/i.test(text))return {group:'zanza',status:'verified-tooltip',source:item.source};
 if(/only have the effect of one flask at a time/i.test(text))return {group:'flask',status:'verified-tooltip',source:item.source};
 return {group:null,status:'unresolved',source:item.source};
}
export function consumableConflictReason(a,b){
 if(!a||!b)return null;
 if(a.id===b.id)return {kind:'same-item',evidence:'catalogue-identity'};
 const ea=explicitStacking(a),eb=explicitStacking(b);
 if(ea.group&&ea.group===eb.group)return {kind:'replacement-group',group:ea.group,evidence:'verified-tooltip'};
 const group=consumableGroup(a);if(group&&group===consumableGroup(b))return {kind:'replacement-group',group,evidence:'reference-policy'};
 // Match complete nonempty spell signatures; an overlapping spell in a
 // multi-effect item does not prove the entire item is interchangeable.
 const signature=i=>[...new Set((i.spellIds||[]).filter(id=>Number.isSafeInteger(id)&&id>0))].sort((x,y)=>x-y).join(',');
 const sa=signature(a),sb=signature(b);
 if(a.verified&&b.verified&&sa&&sa===sb&&JSON.stringify(a.effects||[])===JSON.stringify(b.effects||[]))return {kind:'identical-effect',evidence:'matching-tooltip-and-source-spells'};
 return null;
}
export function consumablesConflict(a,b){return Boolean(consumableConflictReason(a,b));}
export function stackingInventory(){
 const groups={},sharedPairs=[],identicalPairs=[],explicitPairs=[],referencePairs=[];
 for(const item of CONSUMABLES){
  const group=consumableGroup(item);if(group){const e=groups[group]??={items:0,tooltipConfirmed:0};e.items++;if(explicitStacking(item).group===group)e.tooltipConfirmed++;}
  if(!item.verified||item.buffId)continue;
  for(const buffId of new Set([...Object.values(LEGACY_GROUPS).flat(),...SHARED_ITEMS.keys()])){
   const reason=sharedConsumableConflict(buffId,item);if(reason)sharedPairs.push({buffId,itemId:item.id,...reason});
  }
 }
 for(let i=0;i<CONSUMABLES.length;i++)for(let j=i+1;j<CONSUMABLES.length;j++){
  const a=CONSUMABLES[i],b=CONSUMABLES[j];if(!a.verified||!b.verified)continue;
  const reason=consumableConflictReason(a,b);if(!reason)continue;
  (reason.kind==='identical-effect'?identicalPairs:reason.evidence==='verified-tooltip'?explicitPairs:referencePairs).push({a:a.id,b:b.id,...reason});
 }
 return {groups,sharedPairs,identicalPairs,explicitPairs,referencePairs,sharedBuffReferencePairs:BUFF_CONFLICTS,liveVerifiedPairs:0};
}
export function stackingNote(item){
 const fact=explicitStacking(item);
 if(fact.group)return `Stacking: only one ${fact.group} effect, confirmed by the official item tooltip.`;
 if(consumableGroup(item))return 'Stacking: reference replacement group; OctoWoW-specific behavior is not independently verified.';
 return 'Stacking: OctoWoW-specific interactions are unresolved. A shared cooldown alone does not mean mutually exclusive buffs.';
}
// Fixed display order must not depend on current selection.
export function orderConsumables(items){return [...items].sort((a,b)=>a.name.localeCompare(b.name)||a.id-b.id);}
