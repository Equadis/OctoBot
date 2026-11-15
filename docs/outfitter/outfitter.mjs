import {requestJson,preloadGeometry} from './service.mjs?v=20261113-model-assets2';
import {SLOT_ICONS,iconUrl} from '../sim/core/interface.mjs?v=20261112-navigation1';
import {BACKGROUNDS,findBackground} from './backgrounds.mjs';
import {visibleOptions,lookPairs,stepLook,selectedChoice,choiceLabel} from './customization.mjs';
import {SLOTS,RACES,emptyOutfit,normalise,equip,exportTmog,importTmog,encode,decode,viewerSlot,filterItems,buildNameIndex,sameNameItems,buildIconIndex,sameIconItems} from './state.mjs?v=20261114-look1';
const $=id=>document.getElementById(id),STORAGE='octobot-outfitter-v1',SAVED='octobot-outfits-v1';
let outfit=emptyOutfit(),items=[],byId=new Map(),nameIndex=new Map(),iconIndex=new Map(),selectedSlot=1,viewer=null,revision=0,endpoint='',saved=[];
const metadata=new Map();
// Per-item notes about how the 3D preview was approximated, shown as an (i) hover beside the item's DB link.
let approxNotes=new Map();
const BACKDROP_KEY='octobot-outfitter-backdrop';
let backdropRequest=0;
// A background is a personal view setting. It is not part of an outfit, so shared links and saved outfits are unchanged.
function applyBackdrop(id,{persistChoice=true}={}){
 const wrap=document.querySelector('.model-wrap'),choice=findBackground(id),token=++backdropRequest;
 const clear=()=>{wrap.classList.remove('has-backdrop');wrap.style.removeProperty('--backdrop-image');};
 if(persistChoice){try{if(choice)localStorage.setItem(BACKDROP_KEY,choice.id);else localStorage.removeItem(BACKDROP_KEY);}catch{}}
 $('backdrop').value=choice?choice.id:'';
 if(!choice){clear();return;}
 // Load first so a failed image never leaves a blank frame.
 const probe=new Image();probe.referrerPolicy='no-referrer';
 probe.onload=()=>{if(token!==backdropRequest)return;wrap.style.setProperty('--backdrop-image',`url("${choice.url}")`);wrap.classList.add('has-backdrop');};
 probe.onerror=()=>{if(token!==backdropRequest)return;clear();$('backdrop').value='';feedback(`The ${choice.label} background could not be loaded, so the default is shown.`);};
 probe.src=choice.url;
}
function setupBackdrops(){
 const select=$('backdrop');select.replaceChildren(new Option('Default (glow)',''));
 for(const group of ['Classes','Races']){
  const optgroup=document.createElement('optgroup');optgroup.label=group;
  for(const background of BACKGROUNDS.filter(b=>b.group===group))optgroup.append(new Option(background.label,background.id));
  select.append(optgroup);
 }
 select.onchange=()=>applyBackdrop(select.value);
 let saved='';try{saved=localStorage.getItem(BACKDROP_KEY)||'';}catch{}
 if(findBackground(saved))applyBackdrop(saved,{persistChoice:false});
}
function feedback(message){$('feedback').textContent=message;}
const SLOT_KEYS={1:'head',3:'shoulder',15:'back',5:'chest',4:'shirt',19:'tabard',9:'wrist',10:'hands',6:'waist',7:'legs',8:'feet',16:'mainhand',17:'offhand',18:'ranged'};
const RACE_KEYS={1:'human',2:'orc',3:'dwarf',4:'nightelf',5:'undead',6:'tauren',7:'gnome',8:'troll'};
// Rotation and panning are scaled from the viewer's defaults, which are far too fast for a small panel.
const ROTATE_SENSITIVITY=0.3;
function icon(item){return item?.icon&&/^[a-z0-9_]+$/i.test(item.icon)?`https://wow.zamimg.com/images/wow/icons/large/${item.icon.toLowerCase()}.jpg`:null;}
function image(item){const img=document.createElement('img');img.alt='';const src=icon(item);if(src)img.src=src;img.addEventListener('error',()=>img.removeAttribute('src'),{once:true});return img;}
function safeRead(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(outfit));}catch{feedback('Browser storage is unavailable. Export your outfit to keep a copy.');}}
function saveLibrary(){try{localStorage.setItem(SAVED,JSON.stringify(saved));return true;}catch{feedback('Could not save outfit. Export it to keep a copy.');return false;}}
function sanitiseGear(value){const next=normalise(value);for(const {id,types} of SLOTS){const item=byId.get(next.gear[id]);if(next.gear[id]&&(!item||!types.includes(item.slot)))throw Error(`Unknown item or wrong slot: ${next.gear[id]}.`);}if(byId.get(next.gear[16])?.slot===17)delete next.gear[17];return next;}
function commit(next,message){outfit=sanitiseGear(next);persist();renderSlots();renderItems();if(message)feedback(message);renderModel();}
function renderRaces(){
 const box=$('race-picker');box.replaceChildren();
 for(const [id,name] of RACES){
  const button=document.createElement('button'),img=document.createElement('img');
  button.type='button';button.className='race-button';button.title=name;button.setAttribute('aria-label',name);button.setAttribute('aria-pressed',String(outfit.race===id));
  img.alt='';img.width=42;img.height=42;img.src=`races/${RACE_KEYS[id]}_${outfit.gender?'female':'male'}.png?v=20261114`;button.append(img);
  button.onclick=()=>{if(outfit.race!==id)commit({...outfit,race:id,look:{}});};box.append(button);
 }
 $('race-name').textContent=RACES.find(([id])=>id===outfit.race)?.[1]||'';
}
function renderBodies(){
 const box=$('gender-picker');box.replaceChildren();
 for(const [value,name,file] of [[0,'Male','male'],[1,'Female','female']]){
  const button=document.createElement('button'),img=document.createElement('img');
  button.type='button';button.className='race-button';button.title=name;button.setAttribute('aria-label',name);button.setAttribute('aria-pressed',String(outfit.gender===value));
  img.alt='';img.width=36;img.height=36;img.src=`body/${file}.png?v=20261114`;button.append(img);
  button.onclick=()=>{if(outfit.gender!==value)commit({...outfit,gender:value,look:{}});};box.append(button);
 }
 $('body-name').textContent=outfit.gender?'Female':'Male';
}
function renderSlots(){
 renderRaces();renderBodies();$('hide-head').checked=outfit.hideHead;$('hide-back').checked=outfit.hideBack;
 $('left-slots').replaceChildren();$('right-slots').replaceChildren();
 SLOTS.forEach((slot,index)=>{
  const item=byId.get(outfit.gear[slot.id]),container=document.createElement('div'),button=document.createElement('button');
  container.className='slot'+(item?' has-item':'');container.dataset.side=index<7?'left':'right';if(item)container.dataset.quality=String(item.quality??1);
  button.type='button';button.setAttribute('aria-pressed',String(selectedSlot===slot.id));button.title=`${slot.name}: ${item?.name||'Empty'}`;
  const picture=document.createElement('img');picture.className='slot-icon';picture.alt='';
  const fallback=iconUrl(SLOT_ICONS[SLOT_KEYS[slot.id]]);picture.src=icon(item)||fallback;picture.addEventListener('error',()=>{if(picture.src!==fallback)picture.src=fallback;},{once:true});
  const copy=document.createElement('span'),name=document.createElement('span'),value=document.createElement('span');
  copy.className='slot-copy';name.className='slot-name';name.textContent=slot.name;value.className=`item-name quality-${item?.quality??1}`;value.textContent=item?.name||'Empty';
  copy.append(name,value);button.append(picture,copy);
  button.onclick=()=>{selectedSlot=slot.id;$('results').scrollTop=0;$('type').value='';renderTypes();renderSlots();renderItems();};
  container.append(button);$(index<7?'left-slots':'right-slots').append(container);
 });
 $('browser-title').textContent=SLOTS.find(s=>s.id===selectedSlot).name;$('clear-slot').disabled=!outfit.gear[selectedSlot];
}
const ARMOUR={0:'Miscellaneous',1:'Cloth',2:'Leather',3:'Mail',4:'Plate',6:'Shields'},WEAPONS={0:'Axes',1:'Two-handed axes',2:'Bows',3:'Guns',4:'Maces',5:'Two-handed maces',6:'Polearms',7:'Swords',8:'Two-handed swords',10:'Staves',13:'Fist weapons',14:'Miscellaneous',15:'Daggers',16:'Thrown',18:'Crossbows',19:'Wands',20:'Fishing poles'};
function renderTypes(){const select=$('type');select.replaceChildren(new Option('All types',''));const choices=new Map();for(const item of filterItems(items,{slot:selectedSlot})){const key=`${item.classs}:${item.subclass}`;choices.set(key,(item.classs===4?ARMOUR:WEAPONS)[item.subclass]||'Other');}for(const [key,name] of [...choices].sort((a,b)=>a[1].localeCompare(b[1])))select.append(new Option(name,key));}
// One floating tooltip for the (i) icons, so the scrolling item list cannot clip it.
function setupInfoTips(){
 const tip=document.createElement('div');tip.className='info-tip';tip.hidden=true;document.body.append(tip);
 const show=icon=>{tip.textContent=icon.dataset.tip;tip.hidden=false;const r=icon.getBoundingClientRect(),w=tip.offsetWidth,h=tip.offsetHeight;tip.style.left=Math.max(8,Math.min(innerWidth-w-8,r.right-w))+'px';tip.style.top=(r.top-h-8<8?r.bottom+8:r.top-h-8)+'px';};
 const hide=()=>{tip.hidden=true;};
 $('results').addEventListener('mouseover',event=>{const icon=event.target.closest?.('.info-i');if(icon)show(icon);});
 $('results').addEventListener('mouseout',event=>{if(event.target.closest?.('.info-i'))hide();});
 $('results').addEventListener('focusin',event=>{const icon=event.target.closest?.('.info-i');if(icon)show(icon);});
 $('results').addEventListener('focusout',hide);
 $('results').addEventListener('scroll',()=>{hide();queueScan();});
}
function renderItems(){
 const rows=filterItems(items,{slot:selectedSlot,query:$('search').value,subclass:$('type').value,quality:$('quality').value});$('result-count').textContent=`${rows.length.toLocaleString()} ${rows.length===1?'item':'items'}`;
 const results=$('results'),scrollTop=results.scrollTop,focusedId=results.contains(document.activeElement)?document.activeElement.dataset.itemId:null;results.replaceChildren();
 for(const item of rows){
  const row=document.createElement('div');row.className='result'+(outfit.gear[selectedSlot]===item.id?' equipped':'');const thumbnail=image(item);thumbnail.loading='lazy';row.append(thumbnail);
  const button=document.createElement('button');button.className='try-item';button.type='button';button.dataset.itemId=String(item.id);button.setAttribute('aria-label',`Try on ${item.name}`);
  const title=document.createElement('span'),name=document.createElement('span'),level=document.createElement('span'),detail=document.createElement('span');
  title.className='item-row-name';name.className=`quality-${item.quality}`;name.textContent=item.name;level.className='item-level';level.textContent=`[${item.level||0}]`;title.append(name,level);
  detail.className='item-description';detail.textContent=`${(item.classs===4?ARMOUR:WEAPONS)[item.subclass]||'Other'} · Item ${item.id}`;button.append(title,detail);button.onclick=()=>{
   let next=equip(outfit,selectedSlot,item);if(selectedSlot===17&&byId.get(outfit.gear[16])?.slot===17)delete next.gear[16];commit(next,`${item.name} selected.`);
  };
  const link=document.createElement('a');link.href=`https://octowow.st/db/?item=${item.id}`;link.target='_blank';link.rel='noopener';link.textContent='DB ↗';link.setAttribute('aria-label',`${item.name} in the OctoWoW database`);const links=document.createElement('span');links.className='result-links';const note=approxNotes.get(item.id);if(note)links.append(infoIcon(note));links.append(link);row.append(button,links);results.append(row);watchRowPreview(row,item,links,link);
 }
 queueScan();
 results.scrollTop=scrollTop;if(focusedId)results.querySelector(`[data-item-id="${focusedId}"]`)?.focus({preventScroll:true});
 if(!rows.length){const text=document.createElement('p');text.className='muted';text.textContent='No matching items. Try another name, ID or filter.';results.append(text);}
}
// Works out which Classic model (if any) previews an item, and whether that is an exact match or an estimate.
const previewCache=new Map();
const SLOW_LOOKUP_MS=4000;
const NOTE_NAME='Estimated preview: shown with the Classic model of the same-named original item. It may differ from the in-game look.';
const NOTE_ICON='Estimated preview: shown with a Classic model that uses the same icon. It may differ from the in-game look.';
const NOTE_NONE='No preview: this is a custom OctoWoW appearance with no Classic 3D model. The item stays in your outfit and in saved and shared outfits.';
const NOTE_FAIL='The appearance service did not answer for this item, so it has no preview right now. It stays in your outfit. Selecting it again will retry.';
const NOTE_LEGACY='No preview: the appearance service has not been updated to find Classic models yet. The item stays in your outfit.';
// First display ID in the list whose model files exist in the Classic library, or null.
async function usableDisplay(data,slot){
 for(const displayId of Array.isArray(data.candidates)&&data.candidates.length?data.candidates:[data.displayId]){
  const path=[21,22,26].includes(slot)?`item/${displayId}`:`armor/${slot}/${displayId}`;
  try{await getJson(`${endpoint}/api/outfitter/assets/meta/${path}.json`);return displayId;}catch{}
 }
 return null;
}
function resolvePreview(item,slotId){
 const slot=viewerSlot(slotId,item),key=`${item.id}:${slot}`;
 if(previewCache.has(key))return previewCache.get(key);
 const job=(async()=>{
  let legacy=false;
  try{
   const data=await displayFor(item.id);
   // A reply without `candidates` comes from a Worker that has not been updated to look up Classic appearances.
   if(!Array.isArray(data.candidates))legacy=true;
   const own=await usableDisplay(data,slot);
   if(own!==null)return {slot,displayId:own,kind:'own',note:''};
  }catch{
   // The service itself failed (timeout or 502). Do not chain more slow lookups; report it and let the next render retry.
   queueMicrotask(()=>previewCache.delete(key));return {slot,displayId:null,kind:'error',note:NOTE_FAIL};
  }
  // No model for this exact item: borrow the model of an original item with the same name, then with the same icon.
  for(const sibling of sameNameItems(nameIndex,item)){
   try{const displayId=await usableDisplay(await displayFor(sibling.id),slot);if(displayId!==null)return {slot,displayId,kind:'name',note:NOTE_NAME};}catch{}
  }
  // Same-icon candidates are checked together; the lowest item ID (the original) wins.
  const byIcon=await Promise.all(sameIconItems(iconIndex,item).slice(0,8).map(async sibling=>{try{return await usableDisplay(await displayFor(sibling.id),slot);}catch{return null;}}));
  const iconMatch=byIcon.find(displayId=>displayId!==null);
  if(iconMatch!==undefined)return {slot,displayId:iconMatch,kind:'icon',note:NOTE_ICON};
  return {slot,displayId:null,kind:'none',legacy,note:legacy?NOTE_LEGACY:NOTE_NONE};
 })();
 previewCache.set(key,job);return job;
}
function infoIcon(note){const info=document.createElement('span');info.className='info-i';info.tabIndex=0;info.setAttribute('role','note');info.setAttribute('aria-label',note);info.dataset.tip=note;info.textContent='i';return info;}
// Item rows are checked as they scroll into view, so the (i) appears for every item with an estimated or missing preview.
// These checks are background work: they run two at a time, only for rows still on screen, and never while the 3D model
// is loading, so they cannot slow down the model the user just chose.
let scanTimer=0,modelBusy=false,scanActive=0;const scanQueue=[];const MAX_SCAN=2;
function watchRowPreview(row,item,links,link){row._preview={item,slotId:selectedSlot,links,link,row};}
function rowNearView(row){const box=$('results');if(!box||!row.isConnected)return false;const a=box.getBoundingClientRect(),r=row.getBoundingClientRect();return r.bottom>=a.top-160&&r.top<=a.bottom+160;}
function pumpScan(){
 while(!modelBusy&&scanActive<MAX_SCAN&&scanQueue.length){
  const job=scanQueue.shift();
  if(!rowNearView(job.row)){job.queued=false;continue;}
  scanActive++;
  resolvePreview(job.item,job.slotId).then(result=>{
   if(!result.note||!job.row.isConnected||job.links.querySelector('.info-i'))return;
   job.links.insertBefore(infoIcon(result.note),job.link);
  }).catch(()=>{}).finally(()=>{scanActive--;job.queued=false;job.done=true;pumpScan();});
 }
}
function scanVisibleRows(){
 const box=$('results');if(!endpoint||!box)return;
 const area=box.getBoundingClientRect();
 for(const row of box.querySelectorAll('.result')){
  const job=row._preview;if(!job||job.queued||job.done)continue;
  const r=row.getBoundingClientRect();
  if(r.bottom<area.top-160)continue;
  if(r.top>area.bottom+160)break;
  job.queued=true;scanQueue.push(job);
 }
 pumpScan();
}
function queueScan(){clearTimeout(scanTimer);scanTimer=setTimeout(scanVisibleRows,250);}
function getJson(url){return requestJson(url);}
function displayFor(id){if(!metadata.has(id))metadata.set(id,getJson(`${endpoint}/api/outfitter/item/${id}`).catch(error=>{metadata.delete(id);throw error;}));return metadata.get(id);}

// ---- Appearance (skin, face, hair, facial hair / markings / piercings ...) and animation
const ANIMATION_KEY='octobot-outfitter-animation';
const customizationCache=new Map();let lookOptions=[],animationPaused=false;
const ICON_PAUSE='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="6" y="4" width="4.2" height="16" rx="1" fill="currentColor"/><rect x="13.8" y="4" width="4.2" height="16" rx="1" fill="currentColor"/></svg>';
const ICON_PLAY='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><polygon points="7,4 20,12 7,20" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
// Shows Pause while playing and Play while paused, each with its own tooltip.
function showPlayState(paused){
 const button=$('anim-pause');animationPaused=paused;
 button.setAttribute('aria-pressed',String(paused));button.innerHTML=paused?ICON_PLAY:ICON_PAUSE;
 const label=paused?'Play animation':'Pause animation';button.title=label;button.setAttribute('aria-label',label);
}
// Frame stepping: pauses, then moves the animation clock by whole frames (WoW animations run at 30 frames per second).
const FRAME_MS=1000/30;
function stepAnimation(frames){
 const actor=characterActor(),state=actor?.d?.B?.c;if(!state?.e||!(state.e.h>0))return;
 try{actor.setAnimPaused(true);}catch{}showPlayState(true);
 const length=state.e.h;state.c=(((Math.round(state.c/FRAME_MS)+frames)*FRAME_MS)%length+length)%length;
}
async function loadLookOptions(chrModelId){
 if(!Number.isInteger(chrModelId))return [];
 try{
  if(!customizationCache.has(chrModelId))customizationCache.set(chrModelId,getJson(`${endpoint}/api/outfitter/assets/meta/charactercustomization/${chrModelId}.json`));
  return visibleOptions(await customizationCache.get(chrModelId));
 }catch{customizationCache.delete(chrModelId);return [];}
}
function characterActor(){return viewer?.renderer?.actors?.find(actor=>typeof actor.setAppearance==='function'&&typeof actor.getNumAnimations==='function')||null;}
// Pushes an appearance onto the live model without saving it. Returns false when the model is not ready.
function pushAppearance(look){
 const actor=characterActor();if(!actor)return false;
 try{actor.setAppearance({options:lookPairs(lookOptions,look),sheathMain:actor.k,sheathOff:actor.x});return true;}catch{return false;}
}
let openLookMenu=null;
function closeLookMenu({revert=true}={}){
 if(!openLookMenu)return;
 const {menu,pill}=openLookMenu;openLookMenu=null;
 menu.remove();pill.classList.remove('open');
 if(revert)pushAppearance(outfit.look); // hovering only previews; leaving without choosing restores the saved look
}
document.addEventListener('pointerdown',event=>{if(openLookMenu&&!openLookMenu.row.contains(event.target))closeLookMenu();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&openLookMenu){const {pill}=openLookMenu;closeLookMenu();pill.querySelector('.look-main')?.focus();}});
function openChoiceMenu(option,row,pill){
 closeLookMenu();
 const menu=document.createElement('div');menu.className='look-menu';menu.setAttribute('role','listbox');menu.setAttribute('aria-label',option.name);
 const current=selectedChoice(option,outfit.look);
 option.choices.forEach((choice,index)=>{
  const item=document.createElement('button');item.type='button';item.className='look-choice'+(choice.id===current.id?' selected':'');item.setAttribute('role','option');item.setAttribute('aria-selected',String(choice.id===current.id));
  item.textContent=String(index+1);if(choice.name)item.title=choice.name;
  const preview=()=>pushAppearance({...outfit.look,[option.id]:choice.id}); // only while hovered or focused
  item.addEventListener('pointerenter',preview);item.addEventListener('focus',preview);
  item.onclick=()=>{closeLookMenu({revert:false});changeLook({...outfit.look,[option.id]:choice.id});};
  menu.append(item);
 });
 menu.addEventListener('pointerleave',()=>pushAppearance(outfit.look));
 row.append(menu);pill.classList.add('open');openLookMenu={menu,pill,row};
 menu.querySelector('.selected')?.scrollIntoView({block:'nearest'});
}
function renderLook(){
 closeLookMenu({revert:false});
 const box=$('look-options');box.replaceChildren();
 if(!lookOptions.length){const p=document.createElement('p');p.className='muted';p.textContent='Appearance options are unavailable for this character.';box.append(p);$('look-reset').disabled=true;return;}
 $('look-reset').disabled=!Object.keys(outfit.look||{}).length;
 for(const option of lookOptions){
  // One button per option: [‹] Name ........ number [›]. The arrows cycle; the middle opens the full list.
  const row=document.createElement('div'),pill=document.createElement('div'),main=document.createElement('button'),name=document.createElement('span'),value=document.createElement('span');
  row.className='look-option';pill.className='look-pill';
  name.className='look-name';name.textContent=option.name;
  const index=option.choices.indexOf(selectedChoice(option,outfit.look));
  value.className='look-value';value.textContent=String(index+1);
  main.type='button';main.className='look-main';main.setAttribute('aria-haspopup','listbox');main.setAttribute('aria-label',`${option.name}, option ${index+1}. Open the list`);main.append(name,value);
  main.onclick=()=>{if(openLookMenu&&openLookMenu.pill===pill)closeLookMenu();else openChoiceMenu(option,row,pill);};
  const arrow=(label,delta,text)=>{const button=document.createElement('button');button.type='button';button.className='look-arrow';button.textContent=text;button.setAttribute('aria-label',`${label} ${option.name}`);button.onclick=()=>{closeLookMenu({revert:false});changeLook(stepLook(lookOptions,outfit.look,option.id,delta));};return button;};
  pill.append(arrow('Previous',-1,'‹'),main,arrow('Next',1,'›'));row.append(pill);box.append(row);
 }
}
// Appearance is part of the saved and shared outfit. The live model is updated in place so there is no reload.
function changeLook(look){
 outfit={...outfit,look};persist();renderLook();
 if(!pushAppearance(look))renderModel();
}
function setupAnimation(){
 const actor=characterActor(),select=$('animation'),pause=$('anim-pause');
 if(!actor||!actor.isLoaded?.()){return;}
 const names=new Set();for(let i=0;i<actor.getNumAnimations();i++){const name=actor.getAnimation(i);if(name)names.add(name);}
 const list=[...names].sort((a,b)=>a==='Stand'?-1:b==='Stand'?1:a.localeCompare(b));
 select.replaceChildren(...list.map(name=>new Option(name,name)));
 select.disabled=!list.length;pause.disabled=!list.length;$('anim-prev').disabled=!list.length;$('anim-next').disabled=!list.length;showPlayState(false);
 let saved='';try{saved=localStorage.getItem(ANIMATION_KEY)||'';}catch{}
 const choice=list.includes(saved)?saved:list.includes('Stand')?'Stand':list[0];
 if(!choice)return;
 select.value=choice;try{actor.setAnimation(choice,true);}catch{}
}
// The viewer's own default is two notches too close, so every fresh or reset camera starts one scroll further out.
const DEFAULT_ZOOM=-1;
function applyDefaultCamera(r){if(!r)return;r.zoom.current=DEFAULT_ZOOM;r.zoom.target=DEFAULT_ZOOM;r.zoom.rateCurrent=0;}
// Renders the model from the default (reset) camera and returns a small preview image, then restores the user's view.
function captureSnapshot(){
 const r=viewer?.renderer,canvas=r?.context?.canvas;
 if(!r||!canvas||!r.actors?.some(actor=>actor.isLoaded?.()))return null;
 const keep={azimuth:r.azimuth,zenith:r.zenith,translation:[...r.translation],current:r.zoom.current,target:r.zoom.target,rate:r.zoom.rateCurrent};
 try{
  r.azimuth=defaultView.azimuth;r.zenith=defaultView.zenith;r.translation[0]=defaultView.translation[0];r.translation[1]=defaultView.translation[1];r.translation[2]=defaultView.translation[2];
  r.zoom.current=r.zoom.target=DEFAULT_ZOOM;r.zoom.rateCurrent=0;
  const out=document.createElement('canvas');out.width=132;out.height=144;const g=out.getContext('2d',{willReadFrequently:true});
  // The model is centred in a taller-than-wide panel; scale it to cover the thumbnail without distortion.
  const scale=Math.max(out.width/canvas.width,out.height/canvas.height);
  for(let attempt=0;attempt<3;attempt++){
   r.draw(performance.now()+attempt*16);
   g.fillStyle='#182333';g.fillRect(0,0,out.width,out.height);
   g.drawImage(canvas,(out.width-canvas.width*scale)/2,(out.height-canvas.height*scale)/2,canvas.width*scale,canvas.height*scale);
   // Only keep a snapshot that actually shows the character; a blank frame falls back to the placeholder.
   const px=g.getImageData(0,0,out.width,out.height).data;let drawn=0;
   for(let i=0;i<px.length;i+=4)if(px[i]!==0x18||px[i+1]!==0x23||px[i+2]!==0x33)drawn++;
   if(drawn>200)return out.toDataURL('image/jpeg',0.82);
  }
  return null;
 }catch{return null;}
 finally{r.azimuth=keep.azimuth;r.zenith=keep.zenith;r.translation[0]=keep.translation[0];r.translation[1]=keep.translation[1];r.translation[2]=keep.translation[2];r.zoom.current=keep.current;r.zoom.target=keep.target;r.zoom.rateCurrent=keep.rate;try{r.draw(performance.now());}catch{}}
}
let defaultView={azimuth:Math.PI*1.5,zenith:Math.PI/2,translation:[0,0,0]};
function tuneCamera(r){
 const jq=window.jQuery;if(!r||!jq)return;
 defaultView={azimuth:r.azimuth,zenith:r.zenith,translation:[...r.translation]};
 if(keptView)applyView(r,keptView);else applyDefaultCamera(r);
 // Replaces the viewer's document-level pointer handler. The viewer re-registers its own each time it starts.
 jq(document).off('mousemove.webgl touchmove.webgl').on('mousemove.webgl touchmove.webgl',event=>{
  if(!(r.mouseDown||r.rightMouseDown)||r.mouseX===undefined)return;
  const point=event.type==='touchmove'?event.originalEvent.touches[0]:event,dx=point.clientX-r.mouseX,dy=point.clientY-r.mouseY;
  if(r.mouseDown){
   const turn=Math.PI*2,scale=turn*ROTATE_SENSITIVITY/r.width;
   r.azimuth=(((r.up[2]===1?r.azimuth-dx*scale:r.azimuth+dx*scale)%turn)+turn)%turn;
   r.zenith=Math.min(Math.PI-1e-4,Math.max(1e-4,r.zenith+dy*scale));
  }else{
   // Right-drag moves the model exactly as far as the pointer, measured at the model's depth.
   const distance=r.distance*Math.pow(r.zoom.rateStep+1,-r.zoom.current),perPixel=2*distance*Math.tan(r.fov/2*Math.PI/180)/r.height;
   r.translation[0]+=dx*perPixel;r.translation[1]+=dy*perPixel;
  }
  r.mouseX=point.clientX;r.mouseY=point.clientY;event.stopPropagation();
 });
}
function clearViewer(){if(viewer){try{viewer.destroy();}catch{}viewer=null;}$('model').replaceChildren();}
// The user's camera survives re-renders (hiding the head or back, changing gear); only "Reset camera" returns to the default view.
let keptView=null;
function readView(r){return {azimuth:r.azimuth,zenith:r.zenith,translation:[...r.translation],zoom:r.zoom.target};}
function applyView(r,view){r.azimuth=view.azimuth;r.zenith=view.zenith;r.translation[0]=view.translation[0];r.translation[1]=view.translation[1];r.translation[2]=view.translation[2];r.zoom.current=view.zoom;r.zoom.target=view.zoom;r.zoom.rateCurrent=0;}
async function renderModel(resetCamera=false){
 keptView=!resetCamera&&viewer?.renderer?.actors?.length?readView(viewer.renderer):null;modelBusy=true;for(const job of scanQueue)job.queued=false;scanQueue.length=0;
 const token=++revision,current=structuredClone(outfit);clearViewer();$('model-status').hidden=false;$('model-status').textContent='Loading 3D preview…';approxNotes=new Map();
 try {
  if(!endpoint)throw Error('The appearance service is not configured.');
  if(!window.ZamModelViewer||!window.jQuery)throw Error('The 3D viewer could not load. Check your connection and reload the preview.');
  // Detect an undeployed service before constructing a viewer that would stay blank.
  const character=await getJson(`${endpoint}/api/outfitter/assets/meta/character/${current.race*2-1+current.gender}.json`);
  await preloadGeometry(`${endpoint}/api/outfitter/assets/`,character.Model);
  lookOptions=await loadLookOptions(character.Character&&character.Character.ChrModelId);
  if(token!==revision)return;
  renderLook();
  const unavailable=[],approximated=[],approximatedByIcon=[],nextNotes=new Map(),unavailableIds=[],slowItems=[];let outdatedService=false;
  const appearances=await Promise.all(SLOTS.map(async ({id})=>{
   const item=byId.get(current.gear[id]);if(!item||(id===1&&current.hideHead)||(id===15&&current.hideBack))return null;
   // A lookup the appearance service is slow to answer must not hold up the whole model: show what is ready and add the
   // slow item as soon as it resolves.
   const result=await Promise.race([resolvePreview(item,id),new Promise(resolve=>setTimeout(()=>resolve({kind:'slow',displayId:null,slot:viewerSlot(id,item)}),SLOW_LOOKUP_MS))]);
   if(result.kind==='slow'){slowItems.push({item,id});return null;}
   if(result.kind==='name')approximated.push(item.name);
   else if(result.kind==='icon')approximatedByIcon.push(item.name);
   else if(result.kind==='none'){unavailable.push(item.name);unavailableIds.push(item.id);if(result.legacy)outdatedService=true;}
   if(result.note)nextNotes.set(item.id,result.note);
   return result.displayId===null?null:[result.slot,result.displayId];
  }));
  if(token!==revision)return;
  const container=$('model'),wrap=container.parentElement;
  viewer=new window.ZamModelViewer({type:2,container:window.jQuery(container),aspect:wrap.clientWidth/wrap.clientHeight,contentPath:`${endpoint}/api/outfitter/assets/`,dataEnv:'classic',env:'classic',gameDataEnv:'classic',hd:false,physics:false,...(lookOptions.length?{charCustomization:{options:lookPairs(lookOptions,current.look)}}:{}),models:{id:current.race*2-1+current.gender,type:16},items:appearances.filter(Boolean)});
  if(!viewer.renderer)throw Error('WebGL is unavailable. Enable hardware acceleration or try a WebGL-capable browser.');
  viewer.setAdaptiveMode?.(true);
  tuneCamera(viewer.renderer);
  // actorPromises resolves after model metadata; isLoaded also waits for geometry.
  await Promise.race([Promise.all(viewer?.renderer?.actorPromises||[]),new Promise((_,reject)=>setTimeout(()=>reject(Error('The character model timed out. Try reloading the preview.')),25000))]);
  if(token!==revision)return;
  const started=Date.now();
  const check=()=>{
   if(token!==revision)return;
   if(viewer?.renderer?.actors?.some(actor=>actor.isLoaded?.())){const r=viewer.renderer;if(keptView)applyView(r,keptView);else applyDefaultCamera(r);$('model-status').hidden=true;modelBusy=false;setupAnimation();queueScan();return;}
   if(Date.now()-started>25000){$('model-status').textContent='Model assets could not finish loading. Try Reload preview.';modelBusy=false;return;}
   setTimeout(check,250);
  };check();
  for(const id of unavailableIds)nextNotes.set(id,outdatedService?'No preview: the appearance service has not been updated to find Classic models yet. The item stays in your outfit.':'No preview: this is a custom OctoWoW appearance with no Classic 3D model. The item stays in your outfit and in saved and shared outfits.');
  approxNotes=nextNotes;renderItems();
  if(slowItems.length){
   feedback(`Still fetching the model for ${slowItems.map(entry=>entry.item.name).join(', ')}. The preview will update when it arrives.`);
   for(const {item,id} of slowItems)resolvePreview(item,id).then(result=>{if(token===revision&&result.displayId!==null)renderModel();else if(token===revision&&result.note){approxNotes.set(item.id,result.note);renderItems();feedback(`No preview for ${item.name} right now: ${result.kind==='error'?'the appearance service did not answer. Select it again to retry.':'it has no Classic model.'}`);}}).catch(()=>{});
  }
 } catch(error){if(token===revision){modelBusy=false;$('model-status').textContent=`3D preview unavailable. ${error.message} You can still browse, save and share outfits.`;}}
}
function renderSaved(){
 const target=$('saved-outfits');target.replaceChildren();
 if(!saved.length){const p=document.createElement('span');p.className='muted';p.textContent='No saved outfits yet.';target.append(p);}
 saved.forEach((entry,index)=>{
  const card=document.createElement('div');card.className='saved-card';
  const load=document.createElement('button');load.type='button';load.className='saved-load';load.setAttribute('aria-label',`Load ${entry.name}`);
  const preview=document.createElement('span');preview.className='saved-preview';
  if(typeof entry.snapshot==='string'&&entry.snapshot.startsWith('data:image/')){const img=document.createElement('img');img.alt='';img.src=entry.snapshot;preview.append(img);}
  else preview.classList.add('empty');
  const label=document.createElement('span');label.className='saved-name';label.textContent=entry.name;
  load.append(preview,label);load.onclick=()=>{try{commit(entry.outfit,`${entry.name} loaded.`);}catch(e){feedback(e.message);}};
  const remove=document.createElement('button');remove.type='button';remove.className='saved-remove';remove.textContent='×';remove.setAttribute('aria-label',`Delete ${entry.name}`);
  remove.onclick=()=>{saved.splice(index,1);saveLibrary();renderSaved();};
  card.append(load,remove);target.append(card);
 });
}
function shareUrl(){const url=new URL(location.href);url.search='';url.hash='outfit='+encode(outfit);return url.href;}
async function copy(text,message){try{await navigator.clipboard.writeText(text);feedback(message);}catch{$('outfit-code').value=text;$('exchange').showModal();$('outfit-code').select();$('exchange-status').textContent='Select and copy this text.';}}
function fromText(text){const trimmed=text.trim();if(trimmed.startsWith('T.O.L.')){const imported=importTmog(trimmed);return {...outfit,gear:imported.gear};}const url=new URL(trimmed);if(!url.hash.startsWith('#outfit='))throw Error('Enter a Tmog code or OctoBot outfit link.');return decode(url.hash.slice(8));}
async function start(){
 setupBackdrops();setupInfoTips();
 try{
  const response=await fetch('../sim/data/items/catalogue.json');if(!response.ok)throw Error('Equipment catalogue unavailable.');items=await response.json();byId=new Map(items.map(i=>[i.id,i]));nameIndex=buildNameIndex(items);iconIndex=buildIconIndex(items);
  let message='Select an equipment slot, then choose an item to try on.';
  try{outfit=sanitiseGear(safeRead(STORAGE,emptyOutfit()));}catch{outfit=emptyOutfit();message='The previous outfit could not be restored. Import a saved code to recover it.';}
  if(location.hash.startsWith('#outfit=')){try{outfit=sanitiseGear(decode(location.hash.slice(8)));persist();message='Shared outfit loaded.';}catch(e){message=`Could not load shared outfit: ${e.message}`;}}
  saved=safeRead(SAVED,[]);if(!Array.isArray(saved))saved=[];saved=saved.filter(e=>e&&typeof e.name==='string'&&e.name.length<=80&&e.outfit).slice(0,100);
  renderSlots();renderTypes();renderItems();renderSaved();feedback(message);
  try{const config=await getJson('../telemetry.json');const url=new URL(config.endpoint,location.href);if(url.protocol!=='https:'&&url.origin!==location.origin)throw Error();endpoint=url.origin;}catch{endpoint='';}renderItems();
  renderModel();
 }catch(error){feedback(error.message);$('model-status').textContent='Could not load the equipment catalogue. Reload the page to try again.';return;}

 $('hide-head').onchange=()=>commit({...outfit,hideHead:$('hide-head').checked});$('hide-back').onchange=()=>commit({...outfit,hideBack:$('hide-back').checked});
 for(const id of ['search','type','quality'])$(id).addEventListener(id==='search'?'input':'change',()=>{$('results').scrollTop=0;renderItems();});
 $('clear-slot').onclick=()=>{const next=structuredClone(outfit);delete next.gear[selectedSlot];commit(next,'Item removed.');};
 $('reset').onclick=()=>{applyBackdrop('');commit(emptyOutfit(),'Outfit and background reset.');};
 $('reset-items').onclick=()=>{const hadBackdrop=Boolean($('backdrop').value);applyBackdrop('');if(!Object.keys(outfit.gear).length){feedback(hadBackdrop?'Background reset.':'No items are equipped.');return;}commit({...outfit,gear:{}},'All items removed. Race, body and appearance are unchanged.');};$('retry').onclick=()=>renderModel();$('camera-reset').onclick=()=>renderModel(true);
 $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.preview-panel').requestFullscreen();}catch{feedback('Full screen is unavailable in this browser.');}};
 $('look-reset').onclick=()=>changeLook({});
 $('animation').onchange=()=>{const actor=characterActor(),name=$('animation').value;try{if(actor){actor.setAnimPaused(false);actor.setAnimation(name,true);}}catch{}showPlayState(false);try{localStorage.setItem(ANIMATION_KEY,name);}catch{}};
 $('anim-pause').onclick=()=>{const actor=characterActor();if(!actor)return;const next=!animationPaused;try{actor.setAnimPaused(next);}catch{}showPlayState(next);};
 $('anim-prev').onclick=event=>stepAnimation(event.ctrlKey||event.metaKey?-5:-1);
 $('anim-next').onclick=event=>stepAnimation(event.ctrlKey||event.metaKey?5:1);
 $('save').onclick=()=>{$('outfit-name').value='';$('save-dialog').showModal();$('outfit-name').focus();};$('cancel-save').onclick=()=>$('save-dialog').close();
 $('save-form').onsubmit=event=>{event.preventDefault();const name=$('outfit-name').value.trim();if(!name)return;const snapshot=captureSnapshot(),entry={name,outfit:structuredClone(outfit),...(snapshot?{snapshot}:{})},index=saved.findIndex(e=>e.name===name);if(index>=0)saved[index]=entry;else{if(saved.length>=100){feedback('You have 100 saved outfits. Delete one before saving another.');return;}saved.push(entry);}const ok=saveLibrary();renderSaved();$('save-dialog').close();if(ok)feedback(`${name} saved in this browser.`);};
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
