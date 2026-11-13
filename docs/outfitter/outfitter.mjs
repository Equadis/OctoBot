import {requestJson,preloadGeometry} from './service.mjs?v=20261113-model-assets2';
import {SLOTS,RACES,emptyOutfit,normalise,equip,exportTmog,importTmog,encode,decode,viewerSlot,filterItems} from './state.mjs';
const $=id=>document.getElementById(id),STORAGE='octobot-outfitter-v1',SAVED='octobot-outfits-v1',PAGE_SIZE=10;
let outfit=emptyOutfit(),items=[],byId=new Map(),selectedSlot=1,page=0,viewer=null,revision=0,endpoint='',saved=[];
const metadata=new Map();
function feedback(message){$('feedback').textContent=message;}
function icon(item){return item?.icon&&/^[a-z0-9_]+$/i.test(item.icon)?`https://wow.zamimg.com/images/wow/icons/large/${item.icon.toLowerCase()}.jpg`:null;}
function image(item){const img=document.createElement('img');img.alt='';const src=icon(item);if(src)img.src=src;img.addEventListener('error',()=>img.removeAttribute('src'),{once:true});return img;}
function safeRead(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(outfit));}catch{feedback('Browser storage is unavailable. Export your outfit to keep a copy.');}}
function saveLibrary(){try{localStorage.setItem(SAVED,JSON.stringify(saved));return true;}catch{feedback('Could not save outfit. Export it to keep a copy.');return false;}}
function sanitiseGear(value){const next=normalise(value);for(const {id,types} of SLOTS){const item=byId.get(next.gear[id]);if(next.gear[id]&&(!item||!types.includes(item.slot)))throw Error(`Unknown item or wrong slot: ${next.gear[id]}.`);}if(byId.get(next.gear[16])?.slot===17)delete next.gear[17];return next;}
function commit(next,message){outfit=sanitiseGear(next);persist();renderSlots();renderItems();if(message)feedback(message);renderModel();}
function renderSlots(){
 $('race').value=String(outfit.race);$('gender').value=String(outfit.gender);$('hide-head').checked=outfit.hideHead;$('hide-back').checked=outfit.hideBack;
 $('left-slots').replaceChildren();$('right-slots').replaceChildren();
 SLOTS.forEach((slot,index)=>{
  const item=byId.get(outfit.gear[slot.id]),button=document.createElement('button');button.className='slot';button.type='button';button.setAttribute('aria-pressed',String(selectedSlot===slot.id));button.title=`${slot.name}: ${item?.name||'Empty'}`;
  button.append(image(item));const text=document.createElement('span'),name=document.createElement('small'),value=document.createElement('span');name.textContent=slot.name;value.className=`item-name quality-${item?.quality??1}`;value.textContent=item?.name||'Empty';text.append(name,value);button.append(text);button.onclick=()=>{selectedSlot=slot.id;page=0;$('type').value='';renderTypes();renderSlots();renderItems();};$(index<7?'left-slots':'right-slots').append(button);
 });
 $('browser-title').textContent=SLOTS.find(s=>s.id===selectedSlot).name;$('clear-slot').disabled=!outfit.gear[selectedSlot];
}
const ARMOUR={0:'Miscellaneous',1:'Cloth',2:'Leather',3:'Mail',4:'Plate',6:'Shields'},WEAPONS={0:'Axes',1:'Two-handed axes',2:'Bows',3:'Guns',4:'Maces',5:'Two-handed maces',6:'Polearms',7:'Swords',8:'Two-handed swords',10:'Staves',13:'Fist weapons',14:'Miscellaneous',15:'Daggers',16:'Thrown',18:'Crossbows',19:'Wands',20:'Fishing poles'};
function renderTypes(){const select=$('type');select.replaceChildren(new Option('All types',''));const choices=new Map();for(const item of filterItems(items,{slot:selectedSlot})){const key=`${item.classs}:${item.subclass}`;choices.set(key,(item.classs===4?ARMOUR:WEAPONS)[item.subclass]||'Other');}for(const [key,name] of [...choices].sort((a,b)=>a[1].localeCompare(b[1])))select.append(new Option(name,key));}
function renderItems(){
 const rows=filterItems(items,{slot:selectedSlot,query:$('search').value,subclass:$('type').value,quality:$('quality').value}),pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));page=Math.min(page,pages-1);$('result-count').textContent=`${rows.length.toLocaleString()} ${rows.length===1?'item':'items'}`;$('page-count').textContent=`${page+1} / ${pages}`;$('previous').disabled=page===0;$('next').disabled=page===pages-1;
 const results=$('results');results.replaceChildren();
 for(const item of rows.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE)){
  const row=document.createElement('div');row.className='result'+(outfit.gear[selectedSlot]===item.id?' equipped':'');row.append(image(item));
  const button=document.createElement('button');button.className='try-item';button.type='button';button.setAttribute('aria-label',`Try on ${item.name}`);const name=document.createElement('strong'),detail=document.createElement('small');name.className=`quality-${item.quality}`;name.textContent=item.name;detail.textContent=`Item ${item.id} · Level ${item.reqlevel||1}`;button.append(name,detail);button.onclick=()=>{
   let next=equip(outfit,selectedSlot,item);if(selectedSlot===17&&byId.get(outfit.gear[16])?.slot===17)delete next.gear[16];commit(next,`${item.name} selected.`);
  };
  const link=document.createElement('a');link.href=`https://octowow.st/db/?item=${item.id}`;link.target='_blank';link.rel='noopener';link.textContent='DB ↗';link.setAttribute('aria-label',`${item.name} in the OctoWoW database`);row.append(button,link);results.append(row);
 }
 if(!rows.length){const text=document.createElement('p');text.className='muted';text.textContent='No matching items. Try another name, ID or filter.';results.append(text);}
}
function getJson(url){return requestJson(url);}
function displayFor(id){if(!metadata.has(id))metadata.set(id,getJson(`${endpoint}/api/outfitter/item/${id}`).catch(error=>{metadata.delete(id);throw error;}));return metadata.get(id);}
function clearViewer(){if(viewer){try{viewer.destroy();}catch{}viewer=null;}$('model').replaceChildren();}
async function renderModel(){
 const token=++revision,current=structuredClone(outfit);clearViewer();$('model-status').hidden=false;$('model-status').textContent='Loading 3D preview…';$('appearance-notice').hidden=true;
 try {
  if(!endpoint)throw Error('The appearance service is not configured.');
  if(!window.ZamModelViewer||!window.jQuery)throw Error('The 3D viewer could not load. Check your connection and reload the preview.');
  // Detect an undeployed service before constructing a viewer that would stay blank.
  const character=await getJson(`${endpoint}/api/outfitter/assets/meta/character/${current.race*2-1+current.gender}.json`);
  await preloadGeometry(`${endpoint}/api/outfitter/assets/`,character.Model);
  const unavailable=[];
  const appearances=await Promise.all(SLOTS.map(async ({id})=>{
   const item=byId.get(current.gear[id]);if(!item||(id===1&&current.hideHead)||(id===15&&current.hideBack))return null;
   try{const data=await displayFor(item.id),slot=viewerSlot(id,item);const path=[21,22,26].includes(slot)?`item/${data.displayId}`:`armor/${slot}/${data.displayId}`;await getJson(`${endpoint}/api/outfitter/assets/meta/${path}.json`);return [slot,data.displayId];}
   catch{unavailable.push(item.name);return null;}
  }));
  if(token!==revision)return;
  const container=$('model'),wrap=container.parentElement;
  viewer=new window.ZamModelViewer({type:2,container:window.jQuery(container),aspect:wrap.clientWidth/wrap.clientHeight,contentPath:`${endpoint}/api/outfitter/assets/`,dataEnv:'classic',env:'classic',gameDataEnv:'classic',hd:false,physics:false,models:{id:current.race*2-1+current.gender,type:16},items:appearances.filter(Boolean)});
  if(!viewer.renderer)throw Error('WebGL is unavailable. Enable hardware acceleration or try a WebGL-capable browser.');
  viewer.setAdaptiveMode?.(true);
  // actorPromises resolves after model metadata; isLoaded also waits for geometry.
  await Promise.race([Promise.all(viewer?.renderer?.actorPromises||[]),new Promise((_,reject)=>setTimeout(()=>reject(Error('The character model timed out. Try reloading the preview.')),25000))]);
  if(token!==revision)return;
  const started=Date.now();
  const check=()=>{
   if(token!==revision)return;
   if(viewer?.renderer?.actors?.some(actor=>actor.isLoaded?.())){$('model-status').hidden=true;return;}
   if(Date.now()-started>25000){$('model-status').textContent='Model assets could not finish loading. Try Reload preview.';return;}
   setTimeout(check,250);
  };check();
  if(unavailable.length){$('appearance-notice').hidden=false;$('appearance-notice').textContent=`Preview unavailable for: ${unavailable.join(', ')}. These items remain in your outfit; custom server appearances may not exist in the Classic model library.`;}
 } catch(error){if(token===revision){$('model-status').textContent=`3D preview unavailable. ${error.message} You can still browse, save and share outfits.`;}}
}
function renderSaved(){const target=$('saved-outfits');target.replaceChildren();if(!saved.length){const p=document.createElement('span');p.className='muted';p.textContent='No saved outfits yet.';target.append(p);}saved.forEach((entry,index)=>{const row=document.createElement('div');row.className='saved-card';const load=document.createElement('button');load.textContent=entry.name;load.onclick=()=>{try{commit(entry.outfit,`${entry.name} loaded.`);}catch(e){feedback(e.message);}};const remove=document.createElement('button');remove.className='reset';remove.textContent='×';remove.setAttribute('aria-label',`Delete ${entry.name}`);remove.onclick=()=>{saved.splice(index,1);saveLibrary();renderSaved();};row.append(load,remove);target.append(row);});}
function shareUrl(){const url=new URL(location.href);url.search='';url.hash='outfit='+encode(outfit);return url.href;}
async function copy(text,message){try{await navigator.clipboard.writeText(text);feedback(message);}catch{$('outfit-code').value=text;$('exchange').showModal();$('outfit-code').select();$('exchange-status').textContent='Select and copy this text.';}}
function fromText(text){const trimmed=text.trim();if(trimmed.startsWith('T.O.L.')){const imported=importTmog(trimmed);return {...outfit,gear:imported.gear};}const url=new URL(trimmed);if(!url.hash.startsWith('#outfit='))throw Error('Enter a Tmog code or OctoBot outfit link.');return decode(url.hash.slice(8));}
async function start(){
 for(const [id,name] of RACES)$('race').append(new Option(name,id));
 try{
  const response=await fetch('../sim/data/items/catalogue.json');if(!response.ok)throw Error('Equipment catalogue unavailable.');items=await response.json();byId=new Map(items.map(i=>[i.id,i]));
  let message='Select an equipment slot, then choose an item to try on.';
  try{outfit=sanitiseGear(safeRead(STORAGE,emptyOutfit()));}catch{outfit=emptyOutfit();message='The previous outfit could not be restored. Import a saved code to recover it.';}
  if(location.hash.startsWith('#outfit=')){try{outfit=sanitiseGear(decode(location.hash.slice(8)));persist();message='Shared outfit loaded.';}catch(e){message=`Could not load shared outfit: ${e.message}`;}}
  saved=safeRead(SAVED,[]);if(!Array.isArray(saved))saved=[];saved=saved.filter(e=>e&&typeof e.name==='string'&&e.name.length<=80&&e.outfit).slice(0,100);
  renderSlots();renderTypes();renderItems();renderSaved();feedback(message);
  try{const config=await getJson('../telemetry.json');const url=new URL(config.endpoint,location.href);if(url.protocol!=='https:'&&url.origin!==location.origin)throw Error();endpoint=url.origin;}catch{endpoint='';}
  renderModel();
 }catch(error){feedback(error.message);$('model-status').textContent='Could not load the equipment catalogue. Reload the page to try again.';return;}
 $('race').onchange=()=>commit({...outfit,race:Number($('race').value)});$('gender').onchange=()=>commit({...outfit,gender:Number($('gender').value)});
 $('hide-head').onchange=()=>commit({...outfit,hideHead:$('hide-head').checked});$('hide-back').onchange=()=>commit({...outfit,hideBack:$('hide-back').checked});
 for(const id of ['search','type','quality'])$(id).addEventListener(id==='search'?'input':'change',()=>{page=0;renderItems();});
 $('previous').onclick=()=>{page--;renderItems();};$('next').onclick=()=>{page++;renderItems();};
 $('clear-slot').onclick=()=>{const next=structuredClone(outfit);delete next.gear[selectedSlot];commit(next,'Item removed.');};
 $('reset').onclick=()=>commit(emptyOutfit(),'Outfit reset.');$('retry').onclick=()=>renderModel();$('camera-reset').onclick=()=>renderModel();
 $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.preview-panel').requestFullscreen();}catch{feedback('Full screen is unavailable in this browser.');}};
 $('save').onclick=()=>{$('outfit-name').value='';$('save-dialog').showModal();$('outfit-name').focus();};$('cancel-save').onclick=()=>$('save-dialog').close();
 $('save-form').onsubmit=event=>{event.preventDefault();const name=$('outfit-name').value.trim();if(!name)return;const entry={name,outfit:structuredClone(outfit)},index=saved.findIndex(e=>e.name===name);if(index>=0)saved[index]=entry;else{if(saved.length>=100){feedback('You have 100 saved outfits. Delete one before saving another.');return;}saved.push(entry);}const ok=saveLibrary();renderSaved();$('save-dialog').close();if(ok)feedback(`${name} saved in this browser.`);};
 $('share').onclick=()=>copy(shareUrl(),'Outfit link copied.');
 $('import').onclick=()=>{$('outfit-code').value=exportTmog(outfit);$('exchange-status').textContent='Tmog codes contain equipment. OctoBot links also include race, body and visibility settings.';$('exchange').showModal();};
 $('copy-code').onclick=()=>copy($('outfit-code').value,'Code copied.');$('apply-code').onclick=()=>{try{commit(fromText($('outfit-code').value),'Outfit imported.');$('exchange').close();}catch(error){$('exchange-status').textContent=error.message;}};
 window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#outfit=')){try{commit(decode(location.hash.slice(8)),'Shared outfit loaded.');}catch(error){feedback(error.message);}}});
 const modelResize=new ResizeObserver(()=>{const wrap=$('model').parentElement,width=wrap.clientWidth,height=wrap.clientHeight;if(width&&height)viewer?.renderer?.onResize?.(width,height,width/height);});
 modelResize.observe($('model').parentElement);
 window.addEventListener('pagehide',()=>{revision++;modelResize.disconnect();clearViewer();});
}
// Modules can execute before deferred third-party scripts have finished.
if(document.readyState==='complete')start();else window.addEventListener('load',start,{once:true});
