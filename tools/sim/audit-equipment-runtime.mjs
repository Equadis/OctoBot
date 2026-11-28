import fs from 'node:fs';
import {classifyEquipmentEffect,parseItemSet} from '../../docs/sim/core/item-effects.mjs';
import {parseTimedEquipmentTooltip} from '../../docs/sim/core/combat-item-tooltip-runtime.mjs';
import {equipmentListingWithDetail} from '../../docs/sim/core/items.mjs';
const root=new URL('../../docs/sim/data/items/',import.meta.url);
const load=n=>JSON.parse(fs.readFileSync(new URL(n,root),'utf8'));
const details={...load('details-supplement.json'),...load('details.json')};
const items=load('equipment.json').map(x=>equipmentListingWithDetail(x,details[x.id])).filter(Boolean);
const itemRows=[],setRows=[],seen=new Set();
function row(text,meta){const classification=classifyEquipmentEffect(text).status;const mapping=parseTimedEquipmentTooltip(text);return {...meta,text,classification,runtime:mapping?'explicit-policy-required':null,kind:mapping?.effect.kind??null};}
for(const item of items){const d=details[item.id];if(!d)continue;for(const text of d.effects??[])itemRows.push(row(text,{itemId:item.id,name:item.name}));const set=parseItemSet({...item,...d});if(!set)continue;for(const x of set.bonuses){const k=JSON.stringify([set.key,x.pieces,x.effect]);if(seen.has(k))continue;seen.add(k);setRows.push(row(x.effect,{set:set.name,pieces:x.pieces,roster:set.members}));}}
function summarize(rows){const eligible=rows.filter(r=>['event','conditional','unmapped'].includes(r.classification));return {total:rows.length,eventConditionalUnmapped:eligible.length,mapped:eligible.filter(r=>r.runtime).length,unmapped:eligible.filter(r=>!r.runtime).length,byKind:eligible.filter(r=>r.runtime).reduce((o,r)=>(o[r.kind]=(o[r.kind]??0)+1,o),{})};}
const summary={items:items.length,itemEffects:summarize(itemRows),setBonuses:summarize(setRows),liveVerified:0};
fs.writeFileSync('equipment-runtime-audit.json',JSON.stringify({summary,itemRows,setRows},null,2)+'\n');console.log(JSON.stringify(summary));
