import fs from 'node:fs';
import {classifyEquipmentEffect,parseItemSet} from '../../docs/sim/core/item-effects.mjs';
import {petEquipmentEffectKey} from '../../docs/sim/core/combat-pet-stats.mjs';
import {parseTimedEquipmentTooltip} from '../../docs/sim/core/combat-item-tooltip-runtime.mjs';
const root=new URL('../../docs/sim/data/items/',import.meta.url);
const load=name=>JSON.parse(fs.readFileSync(new URL(name,root),'utf8'));
const eq=load('equipment.json'),details={...load('details-supplement.json'),...load('details.json')};
const petText=/\b(?:pet(?:'s|s)?|demon(?:'s|s)?|Mend Pet|Health Funnel|Mana Funnel|Firebolt|Lash of Pain|Blood Pact|Tainted Blood|Seduction|Torment|Felstorm)\b/i;
const items=[],setLines=new Map(),seen=new Set();
function classify(raw){
 const result=classifyEquipmentEffect(raw);
 const modifiers=(result.modifiers??[]).map(row=>({...row,companionRuntimeKey:petEquipmentEffectKey(row)}));
 const timed=parseTimedEquipmentTooltip(raw);
 const companionRuntimeUse=timed?.effect.recipient==='companion'?(timed.effect.guaranteedCrit?'critical-charge':'timed-aura'):null;
 return {raw,status:result.status,playerStats:result.stats,modifiers,companionRuntimeUse};
}
for(const listing of eq){
 const item=details[listing.id];if(!item||seen.has(listing.id))continue;seen.add(listing.id);
 const effects=(item.effects||[]).filter(x=>petText.test(x)).map(classify);
 if(effects.length)items.push({id:listing.id,name:listing.name,source:'https://octowow.st/db/?item='+listing.id,effects});
 const set=parseItemSet({...listing,...item});
 if(set)for(const bonus of set.bonuses)if(petText.test(bonus.effect)){const key=set.key+JSON.stringify(bonus);if(!setLines.has(key))setLines.set(key,{set:set.name,pieces:bonus.pieces,exampleItemId:listing.id,source:'https://octowow.st/db/?item='+listing.id,...classify(bonus.effect)});}
}
const sets=[...setLines.values()];
const itemEffects=items.flatMap(item=>item.effects);
const all=[...itemEffects,...sets];
const scoped=all.filter(effect=>effect.status==='scoped');
const mapped=all.filter(effect=>effect.companionRuntimeUse||effect.modifiers.some(modifier=>modifier.companionRuntimeKey));
const statusCounts={},companionRuntimeModifiers={};
for(const effect of all)statusCounts[effect.status]=(statusCounts[effect.status]??0)+1;
for(const {companionRuntimeKey:key} of mapped.flatMap(effect=>effect.modifiers)){
 if(key)companionRuntimeModifiers[key]=(companionRuntimeModifiers[key]??0)+1;
}
const summary={
 items:items.length,
 itemEffectLines:itemEffects.length,
 distinctSetBonusLines:sets.length,
 scopedEffectLines:scoped.length,
 petScopedEffectLines:scoped.filter(effect=>effect.modifiers.some(modifier=>modifier.scope==='Pet')).length,
 statusCounts,
 companionRuntimeEffectLines:mapped.length,
 companionRuntimeModifiers,
 companionRuntimeUseLines:mapped.filter(effect=>effect.companionRuntimeUse).length,
 liveVerified:0,
};
console.log('PET_EQUIPMENT_AUDIT_BEGIN'+JSON.stringify(summary)+'PET_EQUIPMENT_AUDIT_END');
fs.writeFileSync('pet-equipment-audit.json',JSON.stringify({summary,items,sets},null,2)+'\n');
