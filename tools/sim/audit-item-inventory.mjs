import {NON_EQUIPPABLE_SOURCE_IDS,equipmentListingWithDetail} from '../../docs/sim/core/items.mjs';
import {classifyEquipmentEffect,equipmentItemAudit,parseItemSet} from '../../docs/sim/core/item-effects.mjs';
import fs from 'node:fs';
const root=new URL('../../docs/sim/data/items/',import.meta.url);
const load=n=>JSON.parse(fs.readFileSync(new URL(n,root),'utf8'));
const eq=load('equipment.json'),cat=load('catalogue.json'),details={...load('details-supplement.json'),...load('details.json')};
const ids=new Set(eq.map(x=>x.id)),cats=cat.filter(x=>[2,4,6,11].includes(x.classs)&&x.slot>0);
const missing=eq.filter(x=>!details[x.id]).map(x=>({id:x.id,name:x.name,slot:x.slot}));
const counts=new Map(),effects=new Map(),setLines=new Map(),attributes=new Map(),samples=[];
const inc=(m,k,ex)=>{const a=m.get(k)||{count:0,examples:[]};a.count++;if(a.examples.length<3)a.examples.push(ex);m.set(k,a)};
const normal=s=>s.replace(/\b\d+(?:\.\d+)?\b/g,'#').replace(/\s+/g,' ').trim();
for(const item of eq){const d=details[item.id];if(!d)continue;
 for(const [k,v] of Object.entries(d.attributes||{}))inc(attributes,k,{id:item.id,value:v});
 for(const raw of d.effects||[])inc(effects,normal(raw),{id:item.id,raw});
 const text=d.tooltipText||'';
 for(const line of text.split('\n'))if(/\(\d+\) Set:|Set:|\(\d+\/\d+\)/i.test(line))inc(setLines,normal(line),{id:item.id,line});
 if(samples.length<4&&(/Set:|\(\d+\/\d+\)/i.test(text)))samples.push({id:item.id,keys:Object.keys(d),text:text.slice(-1800),effects:d.effects});
}
const top=(m,n)=>[...m].sort((a,b)=>b[1].count-a[1].count).slice(0,n);
const statusCounts={},patternsByStatus={},affected=new Set(),validSetKeys=new Set(),unparsedSets=[],mismatches=[];let totalLines=0,fullyStatic=0,affectedSetItems=0;
for(const x of eq){const d=details[x.id];if(!d)continue;const a=equipmentItemAudit({...x,...d});let complete=true;for(const e of a.effects){totalLines++;statusCounts[e.status]=(statusCounts[e.status]||0)+1;if(e.status!=='passive'){complete=false;affected.add(x.id);const k=normal(e.raw);(patternsByStatus[e.status]??=new Set()).add(k);}}if(complete)fullyStatic++;const set=parseItemSet({...x,...d});if(set){validSetKeys.add(set.key);affectedSetItems++;}else if(/\(\d+\/\d+\)/.test(d.tooltipText||''))unparsedSets.push({id:x.id,name:x.name});if(x.slot!==d.slot||x.name!==d.name)mismatches.push({id:x.id,listing:x.slot,detail:d.slot,name:x.name,detailName:d.name});}
const setStatus={};for(const [k,v] of setLines){if(!/^\(#\) Set:/i.test(k))continue;for(const e of v.examples.slice(0,1)){const line=e.line.replace(/^\(\d+\) Set:\s*/,'');const status=classifyEquipmentEffect(line).status;setStatus[status]=(setStatus[status]||0)+1;}}
const discrepancyTypes={};for(const x of mismatches){const key=x.listing+' → '+x.detail+(x.name!==x.detailName?' + name':'');discrepancyTypes[key]=(discrepancyTypes[key]||0)+1;}
const normalized=eq.map(x=>equipmentListingWithDetail(x,details[x.id])).filter(Boolean);
const eligibleMissing=normalized.filter(x=>!details[x.id]);
const summary={classification:{totalLines,statusCounts,fullyStatic,itemsWithUncalculated:affected.size,patternsByStatus:Object.fromEntries(Object.entries(patternsByStatus).map(([k,v])=>[k,v.size])),validSetKeys:validSetKeys.size,affectedSetItems,unparsedSetItems:unparsedSets.length,unparsedExamples:unparsedSets.slice(0,15),setStatus,actualBonusPatterns:Object.values(setStatus).reduce((a,b)=>a+b,0),listingDetailMismatches:mismatches.length,discrepancyTypes,normalizedEquipment:normalized.length,eligibleMissing:eligibleMissing.length,sourceExcluded:missing.filter(x=>NON_EQUIPPABLE_SOURCE_IDS[x.id]),mismatchExamples:mismatches.slice(0,10)},equipment:eq.length,unique:ids.size,catalogue:cat.length,dressable:cats.length,missing,onlyCatalogue:cats.filter(x=>!ids.has(x.id)).map(x=>x.id),attributePatterns:top(attributes,99),effectPatterns:effects.size,topEffects:top(effects,100),setPatterns:setLines.size,topSetLines:top(setLines,35),samples,detailKeys:Object.keys(details[eq.find(x=>details[x.id]).id]),listingExample:eq[0]};
console.log('ITEM_AUDIT_BEGIN'+JSON.stringify(summary)+'ITEM_AUDIT_END');
fs.writeFileSync('item-inventory-audit.json',JSON.stringify({summary,effects:[...effects],setLines:[...setLines],mismatches},null,2));

const unresolvedEffectSamples=[...effects].filter(([,v])=>classifyEquipmentEffect(v.examples[0].raw).status==='unmapped').sort((a,b)=>b[1].count-a[1].count).map(([pattern,v])=>({pattern,count:v.count,example:v.examples[0]}));
const setExceptions=unparsedSets.map(x=>({...x,text:details[x.id].tooltipText}));
console.log('ITEM_REVIEW_BEGIN'+JSON.stringify({unresolvedEffectSamples,setExceptions})+'ITEM_REVIEW_END');

console.log('ITEM_SET_PATTERNS_BEGIN'+JSON.stringify([...setLines].filter(([k])=>/^\(#\) Set:/i.test(k)).map(([k,v])=>[v.count,v.examples[0].line,v.examples[0].id]))+'ITEM_SET_PATTERNS_END');
console.log('ITEM_CONDITIONAL_PATTERNS_BEGIN'+JSON.stringify([...effects].filter(([,v])=>classifyEquipmentEffect(v.examples[0].raw).status==='conditional').map(([k,v])=>[v.count,v.examples[0].raw,v.examples[0].id]))+'ITEM_CONDITIONAL_PATTERNS_END');
