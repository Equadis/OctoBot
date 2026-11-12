import {filterItems,detailRestriction,detailFromDocument,listingRestriction} from './core/items.mjs?v=20261111-classes1';
import {SLOTS} from './core/builds.mjs?v=20261111-classes1';
import {iconUrl} from './core/interface.mjs?v=20261111-classes1';
import {SORT_OPTIONS,enchantsForSlot,sortEquipment} from './core/equipment-options.mjs?v=20261111-classes1';

const node=(tag,text,cls)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(cls)element.className=cls;return element;};
const shortStats=item=>{
 const labels={Strength:'Str',Agility:'Agi',Stamina:'Sta',Intellect:'Int',Spirit:'Spirit',Armour:'armour'};
 const parts=Object.entries(item.attributes||{}).map(([key,value])=>`+${value} ${labels[key]||key}`);
 if(item.armor!==undefined && !item.attributes?.Armour)parts.push(`+${item.armor} armour`);
 if(item.ammunitionDps!==undefined)parts.push(`+${item.ammunitionDps} ranged DPS`);
 if(item.dps!==undefined)parts.push(`${item.dps} DPS`);
 if(item.speed!==undefined)parts.push(`${item.speed.toFixed(2)} speed`);
 if(item.effects?.length)parts.push(...item.effects.map(effect=>effect.replace(/^Equip:\s*/,'')));
 return parts.join(', ') || (item.reqlevel>0?`Requires level ${item.reqlevel}`:'');
};

export function itemPicker({getBuild,onEquip,onClear}) {
 const $=id=>document.getElementById(id);
 let items=null,details={},references={},referenceSelection=false,slot=null,loading=null,selected=null,direction='desc',previewVersion=0,previewTimer=null,candidates=[],rowElements=new Map(),selectedDetail=null;
 const CACHE_KEY='octosim.item-details.v2',pending=new Map();
 for(const [value,label] of SORT_OPTIONS){const option=node('option',label);option.value=value;$('item-sort').append(option);}
 async function load(){
  if(items)return;if(loading)return loading;
  loading=(async()=>{
   const responses=await Promise.all(['equipment.json','details.json','manifest.json','reference-tooltips.json'].map(name=>fetch(new URL(`./data/items/${name}?v=20261111-picker1`,import.meta.url))));
   if(responses.some(response=>!response.ok))throw new Error('The equipment catalogue could not load.');
   const [catalogue,bundled,manifest,referenceData]=await Promise.all(responses.map(response=>response.json()));details=bundled;references=referenceData.items;
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
 function error(message=''){$('item-error').textContent=message;}
 function updateEnchants(){
  const current=$('item-enchant').value;
  const options=enchantsForSlot(slot,getBuild().classId,selected);
  const empty=node('option','— None —');empty.value='';$('item-enchant').replaceChildren(empty);
  for(const enchant of options){const option=node('option',enchant.name);option.value=enchant.id;$('item-enchant').append(option);}
  $('item-enchant').value=options.some(enchant=>enchant.id===current)?current:'';
  $('item-enchant').disabled=!options.length;
 }
 function paintPreview(item,source=null,state=''){
  const preview=$('item-preview');preview.replaceChildren();preview.setAttribute('aria-busy',String(state==='Loading…'));
  const header=node('div',undefined,'item-preview-header'),image=node('img');image.src=iconUrl(item.icon);image.alt='';
  const text=node('div');text.append(node('h3',item.name,`q${item.quality}`),node('span',`Item Level ${item.level || 0}`,'small muted'));header.append(image,text);preview.append(header);
  const tooltip=node('div',undefined,'item-full-tooltip');
  const lines=(source?.tooltipText || source?.summary || `${item.name}\nRequires level ${item.reqlevel || 0}\n${shortStats(item)}`).split('\n').filter(line=>line.trim());
  if(!source?.tooltipText && source?.effects)lines.push(...source.effects);
  let setEffect=false;
  for(const [index,line] of lines.entries()){if(/^\(\d+\) Set:/.test(line.trim()))setEffect=true;if(/^["“]/.test(line.trim()))setEffect=false;tooltip.append(node('div',line,index===0?`q${item.quality}`:setEffect||/^(Equip:|Use:|Chance on hit:)/.test(line.trim())?'item-effect':''));}
  preview.append(tooltip);
  if(state)preview.append(node('p',state,'item-preview-status'));
 }
 async function previewItem(item){
  if(!item)return;
  clearTimeout(previewTimer);const version=++previewVersion;selected=item;selectedDetail=null;referenceSelection=false;error();$('select-item').textContent='Select';$('select-item').disabled=true;
  for(const [id,row] of rowElements){const active=id===item.id;row.classList.toggle('previewed',active);row.setAttribute('aria-selected',String(active));row.tabIndex=active?0:-1;}
  updateEnchants();paintPreview(item,details[item.id]||references[item.id],details[item.id]?'':'Loading…');
  try{
   const source=await detail(item);if(version!==previewVersion || !$('item-dialog').open)return;
   const reason=detailRestriction(item,source,getBuild(),slot);selectedDetail=reason?null:source;
   paintPreview(item,source);$('select-item').disabled=Boolean(reason);if(reason)error(reason);
   const row=rowElements.get(item.id);if(row)row.querySelector('.item-description').textContent=shortStats({...item,...source});
  }catch(failure){if(version!==previewVersion || !$('item-dialog').open)return;referenceSelection=true;$('select-item').disabled=false;$('select-item').textContent='Select reference';paintPreview(item,references[item.id],references[item.id]?'Combat Gum reference':'Full item details are unavailable.');error('Official item restrictions could not be verified. This will save an unverified planning reference.');}
 }
 function search(){
  if(!items)return;
  const build=getBuild();
  candidates=sortEquipment(filterItems(items,{build,slot,search:$('item-reference').value,quality:$('item-quality').value}).filter(item=>(!details[item.id] || !detailRestriction(item,details[item.id],build,slot)) && (details[item.id] || !references[item.id]?.classes || references[item.id].classes.toLowerCase().split(/[^a-z]+/).includes(build.classId))),$('item-sort').value,direction,details,references);
  $('item-count').textContent=`${candidates.length.toLocaleString()} ${candidates.length===1?'item':'items'}`;
  const fragment=document.createDocumentFragment();rowElements=new Map();
  for(const [index,item] of candidates.entries()){
   const row=node('div',undefined,'item-row');row.setAttribute('role','option');row.setAttribute('aria-selected','false');row.tabIndex=-1;
   row.classList.toggle('equipped',build.gear[slot]?.id===item.id);
   const image=node('img');image.src=iconUrl(item.icon);image.alt='';image.loading='lazy';
   const copy=node('div',undefined,'item-row-copy'),name=node('div',undefined,'item-row-name');name.append(node('span',item.name,`q${item.quality}`),node('span',`[${item.level || 0}]`,'item-level'));
   copy.append(name,node('div',shortStats({...item,...references[item.id],...details[item.id]}),'item-description'));
   const link=node('a','Octo DB','item-db-link');link.href=`https://octowow.st/db/?item=${item.id}`;link.target='_blank';link.rel='noopener noreferrer';link.addEventListener('click',event=>event.stopPropagation());
   row.append(image,copy,link);
   row.addEventListener('click',()=>previewItem(item));
   row.addEventListener('mouseenter',()=>{clearTimeout(previewTimer);previewTimer=setTimeout(()=>{if(selected?.id!==item.id)previewItem(item);},220);});
   row.addEventListener('mouseleave',()=>clearTimeout(previewTimer));
   row.addEventListener('focus',()=>{if(selected?.id!==item.id)previewItem(item);});
   row.addEventListener('keydown',event=>{
    if(event.target!==row)return;
    if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?candidates.length-1:Math.max(0,Math.min(candidates.length-1,index+(event.key==='ArrowDown'?1:-1)));rowElements.get(candidates[next].id)?.focus();}
    else if(event.key==='Enter'){event.preventDefault();selectItem();}
   });
   rowElements.set(item.id,row);fragment.append(row);
  }
  $('item-results').replaceChildren(fragment);$('item-results').scrollTop=0;
  const item=candidates.find(item=>item.id===selected?.id) || candidates.find(item=>item.id===build.gear[slot]?.id) || candidates[0];
  if(item)previewItem(item);
  else{++previewVersion;selected=null;selectedDetail=null;$('select-item').disabled=true;$('item-preview').replaceChildren(node('p','No matching items.','muted'));}
 }
 function selectItem(){
  if(!selected || (!selectedDetail && !referenceSelection))return;
  const reason=selectedDetail?detailRestriction(selected,selectedDetail,getBuild(),slot):listingRestriction(selected,getBuild(),slot);if(reason){error(reason);return;}
  const enchantId=$('item-enchant').value;
  if(enchantId && !enchantsForSlot(slot,getBuild().classId,selected).some(enchant=>enchant.id===enchantId)){error('This enchant cannot be used in this slot.');return;}
  onEquip(slot,{id:selected.id,label:(selectedDetail?.name||selected.name).slice(0,80),enchantId,twoHanded:(selectedDetail?.slot||selected.slot)===17});$('item-dialog').close();
 }
 $('item-form').addEventListener('submit',event=>{event.preventDefault();clearTimeout(searchTimer);search();});
 let searchTimer;$('item-reference').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(search,180);});
 for(const id of ['item-quality','item-sort'])$(id).addEventListener('change',search);
 $('item-direction').addEventListener('click',()=>{direction=direction==='desc'?'asc':'desc';$('item-direction').textContent=direction==='desc'?'Descending ▼':'Ascending ▲';search();});
 $('select-item').addEventListener('click',selectItem);
 $('clear-item').addEventListener('click',()=>{onClear(slot);$('item-dialog').close();});
 $('item-dialog').addEventListener('close',()=>{++previewVersion;clearTimeout(previewTimer);clearTimeout(searchTimer);});
 return {
  async inspect(id){await load();const item=items.find(item=>item.id===id);if(!item)return null;try{return {...item,...await detail(item)};}catch{return {...item,summary:`Item level ${item.level || 0} · Requires level ${item.reqlevel || 0}\nFull details unavailable.`};}},
  async open(nextSlot){slot=nextSlot;selected=null;selectedDetail=null;$('item-reference').value='';$('item-dialog-heading').textContent=SLOTS[slot];error();$('select-item').disabled=true;$('item-count').textContent='Loading…';$('item-results').replaceChildren();$('item-preview').replaceChildren();$('item-enchant').value='';$('clear-item').disabled=!getBuild().gear[slot];$('item-dialog').showModal();try{await load();search();const enchantId=getBuild().gear[slot]?.enchantId;if(enchantId && [...$('item-enchant').options].some(option=>option.value===enchantId))$('item-enchant').value=enchantId;}catch(failure){error(failure.message);}},
  usable(slot,id){const item=items?.find(item=>item.id===id);return Boolean(item && details[id] && !detailRestriction(item,details[id],getBuild(),slot));},
  lookup(id){const item=items?.find(item=>item.id===id);return item?{...item,...details[id]}:null;},
  async verifyGear(){await load();const build=getBuild(),invalid=[];for(const [slot,equipped] of Object.entries(build.gear)){const item=items.find(item=>item.id===equipped.id);const reason=item?listingRestriction(item,build,slot)||(details[item.id]&&detailRestriction(item,details[item.id],build,slot)):'Item is absent from the catalogue.';if(reason)invalid.push(`${slot}: ${reason}`);}return invalid;},
 };
}
