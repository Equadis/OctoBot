import {postSwapBuild} from './core/trinket-swaps.mjs?v=20261113-swaps1';
import {filterItems,listingBuild,detailRestriction,detailFromDocument,listingRestriction,equipmentErrors} from './core/items.mjs?v=20261130-ui2';
import {SLOTS} from './core/builds.mjs?v=20261201-ui3';
import {iconUrl} from './core/interface.mjs?v=20261112-display1';
import {fixSigns} from './core/signs.mjs?v=1';
import {scheduleScrollingNames} from '../scrolling-names.mjs?v=20261130-ui2';
import {SORT_OPTIONS,ENCHANTS,enchantsForSlot,enchantChoicesForSlot,sortEquipment} from './core/equipment-options.mjs?v=20261130-ui2';

// Single-line text that pans sideways when it does not fit (the Auction House effect); stationary when it fits.
const clip=(tag,text,cls='')=>{const outer=document.createElement(tag);outer.className=('ah-name-clip '+cls).trim();const inner=document.createElement('span');inner.className='ah-name-text';inner.textContent=text;outer.append(inner);return outer;};
const node=(tag,text,cls)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(cls)element.className=cls;return element;};
const signed=value=>`${Number(value)<0?'-':'+'}${Math.abs(Number(value))}`;
const shortStats=item=>{
 const labels={Strength:'Str',Agility:'Agi',Stamina:'Sta',Intellect:'Int',Spirit:'Spirit',Armour:'armor'};
 const parts=Object.entries(item.attributes||{}).map(([key,value])=>`${signed(value)} ${labels[key]||key}`);
 if(item.armor!==undefined && !item.attributes?.Armour)parts.push(`${signed(item.armor)} armor`);
 if(item.ammunitionDps!==undefined)parts.push(`${signed(item.ammunitionDps)} ranged DPS`);
 if(item.dps!==undefined)parts.push(`${item.dps} DPS`);
 if(item.speed!==undefined)parts.push(`${item.speed.toFixed(2)} speed`);
 if(item.effects?.length)parts.push(...item.effects.map(effect=>effect.replace(/^Equip:\s*/,'')));
 return fixSigns(parts.join(', ')) || (item.reqlevel>0?`Requires level ${item.reqlevel}`:'');
};

export function itemPicker({getBuild,onEquip,onClear}) {
 const $=id=>document.getElementById(id);
 let hovering=null,hoverToken=0,active=false,items=null,details={},references={},slot=null,loading=null,previewed=null,direction='desc',previewVersion=0,previewTimer=null,candidates=[],rowElements=new Map(),equipVersion=0,session=0;
 let selectionContext={};
 const selectionBuild=()=>selectionContext.getBuild?.()||getBuild();
 const CACHE_KEY='octosim.item-details.v2',pending=new Map();
 // Names are re-measured whenever the list changes size (a window resize, the column width changing).
 if(typeof ResizeObserver==='function')new ResizeObserver(()=>scheduleScrollingNames($('item-results'))).observe($('item-results'));
 for(const [value,label] of SORT_OPTIONS){const option=node('option',label);option.value=value;$('item-sort').append(option);}
 async function load(){
  if(items)return;if(loading)return loading;
  loading=(async()=>{
   const responses=await Promise.all(['equipment.json','details.json','catalogue-manifest.json','reference-tooltips.json','details-supplement.json'].map(name=>fetch(new URL(`./data/items/${name}?v=20261111-picker1`,import.meta.url),{cache:'no-cache'})));
   if(responses.some(response=>!response.ok))throw new Error('The equipment catalog could not load.');
   const [catalogue,bundled,manifest,referenceData,supplement]=await Promise.all(responses.map(response=>response.json()));details={...supplement,...bundled};references=referenceData.items;
   try{for(const entry of JSON.parse(localStorage.getItem(CACHE_KEY)||'[]').slice(-128)){const d=entry.detail;if(Date.now()-entry.savedAt<86400000 && Number.isInteger(d?.id) && Number.isInteger(d.classMask) && Number.isInteger(d.raceMask) && Array.isArray(d.requirements) && typeof d.summary==='string' && d.source===`https://octowow.st/db/?item=${d.id}`)if(!details[d.id])details[d.id]=d;}}catch{}
   items=catalogue.map(item=>({...item,...(details[item.id]?{name:details[item.id].name,slot:details[item.id].slot,reqlevel:details[item.id].requiredLevel}:{}),icon:/^[a-z0-9_]+$/i.test(item.icon||'')?item.icon:'inv_misc_questionmark'}));$('catalogue-status').textContent=`${manifest.equipmentCount.toLocaleString()} equipment records`;
  })();try{await loading;}finally{loading=null;}
 }
 async function detail(item){
  if(details[item.id])return details[item.id];
  if(!pending.has(item.id))pending.set(item.id,(async()=>{
   const response=await fetch(`https://octowow.st/db/?item=${item.id}`,{credentials:'omit',signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw new Error(`Database detail request failed (${response.status}).`);
   const parsed=detailFromDocument(new DOMParser().parseFromString(await response.text(),'text/html'),item.id);details[item.id]=parsed;item.slot=parsed.slot;item.reqlevel=parsed.requiredLevel;
   try{const cached=JSON.parse(localStorage.getItem(CACHE_KEY)||'[]').filter(entry=>entry.detail?.id!==item.id).slice(-127);cached.push({savedAt:Date.now(),detail:parsed});localStorage.setItem(CACHE_KEY,JSON.stringify(cached));}catch{}
   return parsed;
  })().finally(()=>pending.delete(item.id)));
  return pending.get(item.id);
 }
 // Filter state can be saved and restored when the visitor leaves the page and comes back.
 function filterState(){return {search:$('item-reference').value,sort:$('item-sort').value,quality:$('item-quality').value,direction};}
 function applyFilters(filters){
  if(!filters)return;
  if(typeof filters.search==='string')$('item-reference').value=filters.search.slice(0,200);
  if([...$('item-sort').options].some(option=>option.value===filters.sort))$('item-sort').value=filters.sort;
  if([...$('item-quality').options].some(option=>option.value===filters.quality))$('item-quality').value=filters.quality;
  if(filters.direction==='asc'||filters.direction==='desc'){direction=filters.direction;$('item-direction').textContent=direction==='desc'?'▼':'▲';$('item-direction').setAttribute('aria-label',`Sort direction: ${direction==='desc'?'descending':'ascending'}`);$('item-direction').title=direction==='desc'?'Descending':'Ascending';}
 }
 function error(message=''){$('item-error').textContent=message;}
 function updateEnchants(){
  const build=selectionBuild(), equipped=build.gear[slot], item=equipped&&items?.find(item=>item.id===equipped.id);
  const current=equipped?.enchantId||'';
  const options=item?enchantChoicesForSlot(slot,build.classId,item,build.level):[];
  const empty=node('option','None');empty.value='';$('item-enchant').replaceChildren(empty);
  for(const enchant of options){const option=node('option',enchant.displayName);option.value=enchant.id;option.disabled=enchant.disabled;$('item-enchant').append(option);}
  $('item-enchant').value=options.some(enchant=>enchant.id===current)?current:'';
  $('item-enchant').disabled=!options.length;
  // Trinkets (and any slot without enchants) show no enchant control; the grid cell stays so the filters do not shift.
  $('item-enchant').closest('.field').classList.toggle('field-hidden',slot==='trinket1'||slot==='trinket2'||(!!selectionContext.heading&&!options.length));
 }
 // The enchant shown with a previewed item is the one in the Item Enchant dropdown, when it fits that item. Display only: item data and character stats are untouched.
 function previewEnchant(item){
  // While an equipped item is hovered, its own slot and enchant are shown; otherwise the Item Enchant dropdown decides.
  const hovered=hovering&&item&&hovering.item.id===item.id;
  const id=hovered?hovering.enchantId:$('item-enchant').value,slotKey=hovered?hovering.slot:slot;
  if(!id||!item)return null;
  const build=selectionBuild();return enchantsForSlot(slotKey,build.classId,item,build.level).some(enchant=>enchant.id===id)?ENCHANTS.find(enchant=>enchant.id===id)||null:null;
 }
 function repaintPreview(){if(hovering)return paintHovered();if(previewed)paintPreview(previewed,details[previewed.id]||references[previewed.id],details[previewed.id]?'':'Loading…');}
 function paintPreview(item,source=null,state=''){
  const preview=$('item-preview');preview.replaceChildren();preview.setAttribute('aria-busy',String(state==='Loading…'));
  const header=node('div',undefined,'item-preview-header'),image=node('img');image.src=iconUrl(item.icon);image.alt='';
  const text=node('div');text.append(node('h3',item.name,`q${item.quality}`),node('span',`Item Level ${item.level || 0}`,'small muted'));header.append(image,text);preview.append(header);
  const tooltip=node('div',undefined,'item-full-tooltip');
  const lines=fixSigns(source?.tooltipText || source?.summary || `${item.name}\nRequires level ${item.reqlevel || 0}\n${shortStats(item)}`).split('\n').filter(line=>line.trim());
  if(!source?.tooltipText && source?.effects)lines.push(...source.effects.map(fixSigns));
  let setEffect=false;
  for(const [index,line] of lines.entries()){if(/^\(\d+\) Set:/.test(line.trim()))setEffect=true;if(/^["“]/.test(line.trim()))setEffect=false;tooltip.append(node('div',line,index===0?`q${item.quality}`:setEffect||/^(Equip:|Use:|Chance on hit:)/.test(line.trim())?'item-effect':''));}
  const enchant=previewEnchant(item);
  if(enchant)tooltip.append(node('div',`Enchanted: ${enchant.name.replace(/\s*\((?:MH|OH)\)/g,'')}`,'item-enchant'));
  preview.append(tooltip);
  if(state)preview.append(node('p',state,'item-preview-status'));
 }
 async function previewItem(item){
  if(!item)return;
  clearTimeout(previewTimer);const version=++previewVersion;previewed=item;error();
  for(const [id,row] of rowElements){const active=id===item.id;row.classList.toggle('previewed',active);row.setAttribute('aria-selected',String(selectionBuild().gear[slot]?.id===id));row.tabIndex=active?0:-1;}
  if(!hovering)paintPreview(item,details[item.id]||references[item.id],details[item.id]?'':'Loading…');
  try{
   const source=await detail(item);if(version!==previewVersion || !active)return;
   const reason=detailRestriction(item,source,selectionBuild(),slot); 
   if(!hovering)paintPreview(item,source);if(reason)error(reason);
   const row=rowElements.get(item.id);if(row){const text=row.querySelector('.item-description .ah-name-text');if(text){text.textContent=shortStats({...item,...source});scheduleScrollingNames(row);}}
  }catch(failure){if(version!==previewVersion || !active)return; if(!hovering)paintPreview(item,references[item.id],references[item.id]?'Combat Gum reference':'Full item details are unavailable.');error('Official item restrictions could not be verified. This item cannot be equipped.');}
 }
 function search(){
  if(!items)return;
  clearTimeout(previewTimer);++previewVersion;
  const build=selectionBuild();
  candidates=sortEquipment(filterItems(items,{build,slot,search:$('item-reference').value,quality:$('item-quality').value}).filter(item=>(!details[item.id] || !detailRestriction(item,details[item.id],listingBuild(build,item,slot),slot)) && (details[item.id] || !references[item.id]?.classes || references[item.id].classes.toLowerCase().split(/[^a-z]+/).includes(build.classId))),$('item-sort').value,direction,details,references);
  $('item-count').textContent=`${candidates.length.toLocaleString()} ${candidates.length===1?'item':'items'}`;
  const fragment=document.createDocumentFragment();rowElements=new Map();
  for(const [index,item] of candidates.entries()){
   const row=node('div',undefined,'item-row');row.setAttribute('role','option');row.setAttribute('aria-selected',String(build.gear[slot]?.id===item.id));row.tabIndex=-1;
   row.classList.toggle('equipped',build.gear[slot]?.id===item.id);
   const image=node('img');image.src=iconUrl(item.icon);image.alt='';image.loading='lazy';
   const copy=node('div',undefined,'item-row-copy'),name=node('div',undefined,'item-row-name');name.append(clip('span',item.name,`q${item.quality}`),node('span',`[${item.level || 0}]`,'item-level'));
   copy.append(name,clip('div',shortStats({...item,...references[item.id],...details[item.id]}),'item-description'));
   const link=node('a','DB ↗','item-db-link ext-db-link');link.setAttribute('aria-label',`${item.name} in the OctoWoW database`);link.href=`https://octowow.st/db/?item=${item.id}`;link.target='_blank';link.rel='noopener noreferrer';link.addEventListener('click',event=>event.stopPropagation());
   row.append(image,copy,link);
   row.addEventListener('click',()=>selectItem(item));
   row.addEventListener('mouseenter',()=>{clearTimeout(previewTimer);previewTimer=setTimeout(()=>{if(previewed?.id!==item.id)previewItem(item);},220);});
   row.addEventListener('mouseleave',()=>clearTimeout(previewTimer));
   row.addEventListener('focus',()=>{if(previewed?.id!==item.id)previewItem(item);});
   row.addEventListener('keydown',event=>{
    if(event.target!==row)return;
    if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?candidates.length-1:Math.max(0,Math.min(candidates.length-1,index+(event.key==='ArrowDown'?1:-1)));rowElements.get(candidates[next].id)?.focus();}
    else if(event.key==='Enter'||event.key===' '){event.preventDefault();selectItem(item);}
   });
   rowElements.set(item.id,row);fragment.append(row);
  }
  $('item-results').replaceChildren(fragment);$('item-results').scrollTop=0;scheduleScrollingNames($('item-results'));
  const item=candidates.find(item=>item.id===previewed?.id) || candidates.find(item=>item.id===build.gear[slot]?.id) || candidates[0];
  if(item)previewItem(item);
  else{++previewVersion;previewed=null;$('item-preview').replaceChildren(node('p','No matching items.','muted'));}
 }
 // Hovering an equipped item shows it, with its enchant, in the same preview panel; leaving restores whatever was shown before.
 function paintHovered(){const {item}=hovering;paintPreview(item,details[item.id]||references[item.id],details[item.id]?'':'Loading…');}
 function hoverEquipped(slotKey){
  const equipped=getBuild().gear[slotKey],item=equipped&&items?.find(entry=>entry.id===equipped.id);
  if(!item)return;
  const token=++hoverToken;hovering={item,slot:slotKey,enchantId:equipped.enchantId||''};paintHovered();
  if(!details[item.id])detail(item).then(()=>{if(hovering&&token===hoverToken)paintHovered();}).catch(()=>{if(hovering&&token===hoverToken)paintPreview(item,references[item.id],references[item.id]?'Combat Gum reference':'Full item details are unavailable.');});
 }
 function endHover(){
  if(!hovering)return;hovering=null;++hoverToken;
  if(previewed)paintPreview(previewed,details[previewed.id]||references[previewed.id],details[previewed.id]?'':'Loading…');
  else $('item-preview').replaceChildren(node('p','Select an item.','muted'));
 }
 // Keeps the list, the clear button and the enchant list in step with the equipped item without redrawing (or rescrolling) the list.
 function refreshEquipped(){
  const build=selectionBuild(),equippedId=build.gear[slot]?.id;
  for(const [id,row] of rowElements){row.classList.toggle('equipped',id===equippedId);row.setAttribute('aria-selected',String(id===equippedId));}
  $('clear-item').disabled=!equippedId;
 }
 async function selectItem(item,explicitEnchant,close=true){
  if(!item||!active)return;
  clearTimeout(previewTimer);
  const request=++equipVersion, activeSession=session, targetSlot=slot, context=selectionContext;
  const current=()=>request===equipVersion&&activeSession===session&&active;
  try{
   const source=await detail(item);if(!current())return;
   const build=selectionBuild(), reason=detailRestriction(item,source,build,targetSlot);
   if(reason){error(reason);updateEnchants();return;}
   const options=enchantsForSlot(targetSlot,build.classId,item,build.level);
   const wanted=explicitEnchant===undefined?build.gear[targetSlot]?.enchantId:explicitEnchant;
   const enchantId=options.some(enchant=>enchant.id===wanted)?wanted:'';
   if(explicitEnchant&&enchantId!==explicitEnchant){error('This enchant is unavailable in the current phase or incompatible with this slot.');updateEnchants();return;}
   (context.onEquip||onEquip)(targetSlot,{id:item.id,label:(source.name||item.name).slice(0,80),enchantId,twoHanded:(source.slot||item.slot)===17});
   updateEnchants();refreshEquipped();repaintPreview();error();
  }catch(failure){if(current()){error('Official item restrictions could not be verified. '+failure.message);updateEnchants();}}
 }
 $('item-form').addEventListener('submit',event=>{event.preventDefault();clearTimeout(searchTimer);search();});
 let searchTimer;$('item-reference').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(search,180);});
 for(const id of ['item-quality','item-sort'])$(id).addEventListener('change',search);
 $('item-direction').addEventListener('click',()=>{direction=direction==='desc'?'asc':'desc';$('item-direction').textContent=direction==='desc'?'▼':'▲';$('item-direction').setAttribute('aria-label',`Sort direction: ${direction==='desc'?'descending':'ascending'}`);$('item-direction').title=direction==='desc'?'Descending':'Ascending';search();});
 $('item-enchant').addEventListener('change',()=>{const equipped=selectionBuild().gear[slot],item=equipped&&items?.find(item=>item.id===equipped.id);repaintPreview();if(item)selectItem(item,$('item-enchant').value,false);});
 $('clear-item').addEventListener('click',()=>{(selectionContext.onClear||onClear)(slot);updateEnchants();refreshEquipped();repaintPreview();error();});
  return {
  filters:filterState,hoverEquipped,endHover,
  async inspect(id){await load();const item=items.find(item=>item.id===id);if(!item)return null;try{return {...item,...await detail(item)};}catch{return {...item,summary:`Item level ${item.level || 0} · Requires level ${item.reqlevel || 0}\nFull details unavailable.`};}},
  async open(nextSlot,options={}){selectionContext=options;if(!SLOTS[nextSlot])throw new Error('Unknown slot.');slot=nextSlot;const activeSession=++session;++equipVersion;++previewVersion;clearTimeout(previewTimer);clearTimeout(searchTimer);previewed=null;$('item-reference').value='';applyFilters(options.filters);$('item-selector-heading').textContent=options.heading||SLOTS[slot];error();$('item-count').textContent='Loading…';$('item-results').replaceChildren();$('item-preview').replaceChildren();$('item-enchant').value='';$('item-enchant').disabled=true;$('clear-item').disabled=!selectionBuild().gear[slot];active=true;try{await load();if(activeSession!==session||!active)return;updateEnchants();search();}catch(failure){if(activeSession===session&&active)error(failure.message);}},
  usable(slot,id){const item=items?.find(item=>item.id===id);return Boolean(item && details[id] && !detailRestriction(item,details[id],getBuild(),slot));},
  lookup(id){const item=items?.find(item=>item.id===id);return item?{...item,...details[id]}:null;},
  async repairCandidate(candidate){await load();for(const ref of [...Object.values(candidate.gear),...Object.values(candidate.trinketSwap?.gear||{})]){const item=items.find(i=>i.id===ref.id);if(item)try{await detail(item);}catch{}}const errors=equipmentErrors(candidate,id=>{const item=items.find(i=>i.id===id);return item&&details[id]?{...item,...details[id]}:null;});const repaired=structuredClone(candidate);for(const e of errors)delete repaired.gear[e.slot];const changes=errors.map(e=>`${e.slot}: ${e.reason}`);if(repaired.trinketSwap?.enabled){const swapErrors=equipmentErrors(postSwapBuild(repaired),id=>{const item=items.find(i=>i.id===id);return item&&details[id]?{...item,...details[id]}:null;});if(swapErrors.length){repaired.trinketSwap.enabled=false;changes.push(...swapErrors.map(e=>`Trinket swap disabled: ${e.slot}: ${e.reason}`));}}return {build:repaired,changes};},
  async verifyCandidate(candidate){await load();for(const ref of [...Object.values(candidate.gear),...Object.values(candidate.trinketSwap?.gear||{})]){const item=items.find(i=>i.id===ref.id);if(item)try{await detail(item);}catch{}}const errors=equipmentErrors(candidate,id=>{const item=items.find(i=>i.id===id);return item&&details[id]?{...item,...details[id]}:null;});if(candidate.trinketSwap?.enabled)errors.push(...equipmentErrors(postSwapBuild(candidate),id=>{const item=items.find(i=>i.id===id);return item&&details[id]?{...item,...details[id]}:null;}).map(e=>({...e,slot:'Swap '+e.slot})));if(errors.length)throw new Error(errors.map(e=>`${e.slot}: ${e.reason}`).join(' '));return candidate;},
  async verifyGear(){await load();const build=getBuild(),invalid=[];for(const [slot,equipped] of Object.entries(build.gear)){const item=items.find(item=>item.id===equipped.id);const reason=item?listingRestriction(item,build,slot)||(details[item.id]&&detailRestriction(item,details[item.id],build,slot)):'Item is absent from the catalog.';if(reason)invalid.push(`${slot}: ${reason}`);}return invalid;},
 };
}
