import {filterItems,detailRestriction,detailFromDocument,listingRestriction} from './core/items.mjs';
import {iconUrl} from './core/interface.mjs';

export function itemPicker({getBuild,onEquip,onClear}) {
  const $=id=>document.getElementById(id);
  let items=null,details={},manifest=null,slot=null,page=0,queryVersion=0,loading=null;
  const CACHE_KEY='octosim.item-details.v1';
  const limit=12, pending=new Map();
  async function load() {
    if(items)return;
    if(loading)return loading;
    loading=(async()=>{
      const responses=await Promise.all(['equipment.json','details.json','manifest.json'].map(name=>fetch(new URL(`./data/items/${name}`,import.meta.url))));
      if(responses.some(response=>!response.ok))throw new Error('The equipment catalogue could not load. Please try again.');
      const [catalogue,bundled,coverage]=await Promise.all(responses.map(response=>response.json()));
      details=bundled;manifest=coverage;
      try{
        const cached=JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
        for(const entry of cached.slice(-128)){
          const d=entry.detail;
          if(Date.now()-entry.savedAt<86400000 && Number.isInteger(d?.id) && Number.isInteger(d.classMask) && Number.isInteger(d.raceMask) && Array.isArray(d.requirements) && typeof d.summary==='string' && d.source===`https://octowow.st/db/?item=${d.id}`)details[d.id]=d;
        }
      }catch{}
      items=catalogue;
      $('catalogue-status').textContent=`${manifest.equipmentCount.toLocaleString()} equipment records`;
    })();
    try{await loading;}finally{loading=null;}
  }
  async function detail(item) {
    if(details[item.id])return details[item.id];
    if(!pending.has(item.id))pending.set(item.id,(async()=>{
      const response=await fetch(`https://octowow.st/db/?item=${item.id}`,{credentials:'omit',signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error(`Database detail request failed (${response.status}).`);
      const parsed=detailFromDocument(new DOMParser().parseFromString(await response.text(),'text/html'),item.id);
      details[item.id]=parsed;
      try{
        const cached=JSON.parse(localStorage.getItem(CACHE_KEY) || '[]').filter(entry=>entry.detail?.id!==item.id).slice(-127);
        cached.push({savedAt:Date.now(),detail:parsed});localStorage.setItem(CACHE_KEY,JSON.stringify(cached));
      }catch{}
      return parsed;
    })().finally(()=>pending.delete(item.id)));
    return pending.get(item.id);
  }
  function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
  function search() {
    if(!items)return;
    const version=++queryVersion;
    const build=getBuild();
    const candidates=filterItems(items,{build,slot,search:$('item-reference').value,quality:$('item-quality').value})
      .filter(item=>!details[item.id] || !detailRestriction(item,details[item.id],build,slot));
    page=Math.max(0,Math.min(page,Math.max(0,Math.ceil(candidates.length/limit)-1)));
    const shown=candidates.slice(page*limit,(page+1)*limit);
    $('item-count').textContent=`${candidates.length.toLocaleString()} matching candidates · ${candidates.length?page*limit+1:0}–${Math.min((page+1)*limit,candidates.length)}. Additional restrictions checked on selection.`;
    $('item-results').replaceChildren();
    if(!shown.length)$('item-results').append(node('p','No matching equipment for this slot, class and level.','muted'));
    for(const item of shown){
      const row=node('div',undefined,'item-row'), image=node('img');image.src=iconUrl(item.icon);image.alt='';image.loading='lazy';
      const copy=node('div'),link=node('a',item.name,`q${item.quality}`);link.href=`https://octowow.st/db/?item=${item.id}`;link.target='_blank';link.rel='noopener noreferrer';
      const summary=node('div',`Item ${item.id} · Item level ${item.level || 0} · Requires level ${item.reqlevel || 0}`,'item-description');
      copy.append(link,summary);
      const button=node('button',details[item.id]?'Equip':'Check & equip');button.type='button';
      button.addEventListener('click',async()=>{
        button.disabled=true;button.textContent='Checking…';$('item-error').textContent='';
        try{
          const source=await detail(item);
          if(version!==queryVersion || !$('item-dialog').open)return;
          const reason=detailRestriction(item,source,getBuild(),slot);
          if(reason){row.remove();$('item-error').textContent=reason;return;}
          onEquip(slot,{id:item.id,label:source.name,icon:item.icon,attributes:source.attributes,twoHanded:source.slot===17,verified:true});
          $('item-dialog').close();
        }catch(error){$('item-error').textContent=`Could not verify this item’s restrictions. ${error.message} Open its database link to check the source; the item has not been equipped.`;}
        finally{button.disabled=false;button.textContent=details[item.id]?'Equip':'Check & equip';}
      });
      if(details[item.id])summary.textContent=details[item.id].summary;
      row.append(image,copy,button);$('item-results').append(row);
    }
    $('item-previous').disabled=page===0;$('item-next').disabled=(page+1)*limit>=candidates.length;
  }
  $('item-form').addEventListener('submit',event=>{event.preventDefault();page=0;search();});
  let timer;$('item-reference').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{page=0;search();},200);});
  $('item-quality').addEventListener('change',()=>{page=0;search();});
  $('item-previous').addEventListener('click',()=>{page--;search();});$('item-next').addEventListener('click',()=>{page++;search();});
  $('clear-item').addEventListener('click',()=>{onClear(slot);$('item-dialog').close();});
  return {
    async open(nextSlot){slot=nextSlot;page=0;$('item-reference').value='';$('item-error').textContent='';$('item-count').textContent='Loading equipment catalogue…';$('item-results').replaceChildren();$('clear-item').disabled=!getBuild().gear[slot];$('item-dialog').showModal();try{await load();search();}catch(error){$('item-error').textContent=error.message;}},
    usable(slot,id){const item=items?.find(item=>item.id===id);return Boolean(item && details[id] && !detailRestriction(item,details[id],getBuild(),slot));},
    lookup(id){const item=items?.find(item=>item.id===id); return item ? {...item,...details[id]} : null;},
    async verifyGear(){
      await load();
      const build=getBuild(),invalid=[];
      for(const [slot,equipped] of Object.entries(build.gear)){
        const item=items.find(item=>item.id===equipped.id);
        const reason=item ? listingRestriction(item,build,slot) || (details[item.id] && detailRestriction(item,details[item.id],build,slot)) : 'Item is absent from the catalogue.';
        if(reason)invalid.push(`${slot}: ${reason}`);
      }
      return invalid;
    },
  };
}
