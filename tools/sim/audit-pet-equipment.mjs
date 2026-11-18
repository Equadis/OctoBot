import fs from 'node:fs';
import {classifyEquipmentEffect,parseItemSet} from '../../docs/sim/core/item-effects.mjs';
const root=new URL('../../docs/sim/data/items/',import.meta.url);
const load=name=>JSON.parse(fs.readFileSync(new URL(name,root),'utf8'));
const eq=load('equipment.json'),details={...load('details-supplement.json'),...load('details.json')};
const petText=/\b(?:pet(?:'s|s)?|demon(?:'s|s)?|Mend Pet|Health Funnel|Mana Funnel|Firebolt|Lash of Pain|Blood Pact|Tainted Blood|Seduction|Torment|Felstorm)\b/i;
const items=[],setLines=new Map(),seen=new Set();
function classify(raw){const result=classifyEquipmentEffect(raw);return {raw,status:result.status,playerStats:result.stats,modifiers:result.modifiers||[]};}
for(const listing of eq){
 const item=details[listing.id];if(!item||seen.has(listing.id))continue;seen.add(listing.id);
 const effects=(item.effects||[]).filter(x=>petText.test(x)).map(classify);
 if(effects.length)items.push({id:listing.id,name:listing.name,source:'https://octowow.st/db/?item='+listing.id,effects});
 const set=parseItemSet({...listing,...item});
 if(set)for(const bonus of set.bonuses)if(petText.test(bonus.effect)){const key=set.key+JSON.stringify(bonus);if(!setLines.has(key))setLines.set(key,{set:set.name,pieces:bonus.pieces,exampleItemId:listing.id,source:'https://octowow.st/db/?item='+listing.id,...classify(bonus.effect)});}
}
const sets=[...setLines.values()],all=[...items.flatMap(x=>x.effects),...sets],scoped=all.filter(e=>e.status==='scoped'),statusCounts={};
for(const e of all)statusCounts[e.status]=(statusCounts[e.status]||0)+1;
returnReport();
function returnReport(){const summary={items:items.length,itemEffectLines:items.reduce((n,x)=>n+x.effects.length,0),distinctSetBonusLines:sets.length,scopedEffectLines:scoped.length,petScopedEffectLines:scoped.filter(e=>e.modifiers.some(m=>m.scope==='Pet')).length,statusCounts,liveVerified:0}; console.log('PET_EQUIPMENT_AUDIT_BEGIN'+JSON.stringify(summary)+'PET_EQUIPMENT_AUDIT_END');fs.writeFileSync('pet-equipment-audit.json',JSON.stringify({summary,items,sets},null,2));}
