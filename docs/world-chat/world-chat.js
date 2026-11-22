import {catalog,byTag,classInfo,analyseRecruitment,filterListings,normalise} from "./lfg-catalog.mjs";
import {appendChatMessage} from "./chat-links.mjs?v=3";
import {elapsedLabel,showOlderButton,playerKey,mentionParts,rowInFocus} from "./chat-interactions.mjs?v=1";
import {installItemPopup} from "./item-popup.mjs?v=20261118-details2";
import {historyPageSize,mergeChat,cursorFor,mergeHistoryWindow,historyErrorMessage,liveFallback,SEARCH_OPTIONS} from "./chat-history.mjs?v=20261120-search";
const STAFF_LABELS={GM:"Game Master",CM:"Community Manager",DJ:"DJ",DEV:"Developer"};
const staffRoles=["DEV","GM","CM","DJ"];
const enabledStaffRoles=new Set(staffRoles);
const staffRoleFor=row=>Object.hasOwn(STAFF_LABELS,row.staffRole)?row.staffRole:"GM";
const API="https://octometrics.eqvoice.workers.dev/api/world-chat";
const byId=id=>document.getElementById(id);
const realms=["N'Zoth","Y'Shaarj","C'Thun"], select=byId("realm");
const initial=new URL(location.href).searchParams.get("realm");if(realms.includes(initial))select.value=initial;
let generation=0,controller=null,current=null,requesting=false;
let showGuilds=true;try{showGuilds=localStorage.getItem("octobot-chat-guilds")!=="hide";}catch{}
const guildToggle=byId("chat-show-guilds");guildToggle.checked=showGuilds;document.body.classList.toggle("hide-chat-guilds",!showGuilds);
guildToggle.addEventListener("change",()=>{showGuilds=guildToggle.checked;document.body.classList.toggle("hide-chat-guilds",!showGuilds);try{localStorage.setItem("octobot-chat-guilds",showGuilds?"show":"hide");}catch{}});
function node(tag,cls,value){const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=value;return e;}
function status(state,text){const e=byId("feed-state");e.dataset.state=state;e.textContent=text;}
function empty(parent,message){parent.replaceChildren(node("div","chat-empty",message));}
let focusedPlayer="",knownPlayers=new Set();
const knownClasses=new Map();
const tradeSignatures={};
const closeItemPopup=installItemPopup();
function playerButton(name,cls,key=playerKey(name)){
 const button=node("button",cls,name);button.type="button";button.dataset.player=key;
 button.setAttribute("aria-label","Highlight "+name);return button;
}
function appendMessage(parent,row,interactiveMentions=false){
 appendChatMessage(parent,row,{interactiveItems:true,appendText:interactiveMentions?(target,text)=>{
  for(const part of mentionParts(text,knownPlayers)){
   if(part.player)target.append(playerButton(part.text,"chat-mention",part.player));
   else target.append(document.createTextNode(part.text));
  }
 }:undefined});
}
function refreshKnownPlayers(){
 const next=new Set();
 for(const key of feeds)for(const row of history[key]?.rows??[])next.add(playerKey(row.author));
 for(const key of ["world","gm","lfg","wtb","wts"])for(const row of current?.[key]??[])next.add(playerKey(row.author));
 next.delete("");next.delete("unknown player");knownPlayers=next;
}
// The public API already supplies verified class IDs. Reuse them by character
// name within this realm so older loaded rows recolour even outside the live window.
function refreshKnownClasses(){
 const rows=[...feeds.flatMap(key=>history[key]?.rows??[]),...["world","gm","lfg","wtb","wts"].flatMap(key=>current?.[key]??[])];
 for(const row of rows){
  const key=playerKey(row.author);
  if(!row.gm&&key&&key!=="unknown player"&&Object.hasOwn(classInfo,row.classId))knownClasses.set(key,row.classId);
 }
}
function resolvedClass(row){
 if(row.gm||row.author==="Unknown player")return null;
 return Object.hasOwn(classInfo,row.classId)?row.classId:knownClasses.get(playerKey(row.author))??null;
}
function focusSignature(row){return JSON.stringify([row,resolvedClass(row),mentionParts(row.message,knownPlayers).filter(p=>p.player).map(p=>p.player)]);}
function applyPlayerFocus(){
 for(const line of document.querySelectorAll(".chat-line[data-author]")){
  const mentions=[...line.querySelectorAll(".chat-mention")].map(e=>e.dataset.player);
  line.classList.toggle("chat-dimmed",!rowInFocus(line.dataset.author,mentions,focusedPlayer));
 }
 for(const e of document.querySelectorAll(".chat-line [data-player]"))e.setAttribute("aria-pressed",String(Boolean(focusedPlayer)&&e.dataset.player===focusedPlayer));
}
document.addEventListener("click",event=>{
 const token=event.target instanceof Element?event.target.closest(".chat-line [data-player]"):null;
 focusedPlayer=token&&token.dataset.player!==focusedPlayer?token.dataset.player:"";applyPlayerFocus();
});
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&focusedPlayer){focusedPlayer="";applyPlayerFocus();}});
// Use the same verified class metadata and Classic class palette as LFG.
function colourAuthor(author,row){
 if(row.gm)return;
 author.style.color=classInfo[resolvedClass(row)]?.[1]??"#9D9D9D";
}
function appendChatLine(parent,row,withTime=true){
  if(withTime)parent.append(node("span","chat-time","["+new Date(row.time).toISOString().slice(11,19)+"]"));
  const content=node("span","chat-content");
  if(row.gm){
   const role=staffRoleFor(row);
   const badge=node("span","chat-gm-tag","<"+role+"> ");
   badge.dataset.siteTip=STAFF_LABELS[role];
   if(/^#[0-9a-f]{6}$/i.test(row.staffColour))badge.style.color=row.staffColour;
   content.append(badge);
  }
  const author=withTime&&row.author!=="Unknown player"?playerButton(row.author,"chat-author"):node("span","chat-author",row.author);
  colourAuthor(author,row);
  content.append(author);
  if(row.guild)content.append(node("span","chat-guild"," <"+row.guild+">"));
  content.append(document.createTextNode(": "));
  appendMessage(content,row,withTime);
  parent.append(content);
}
const feeds=["world","gm"],history={};
let historyGeneration=0,historyQuery="",searchTimer=null;
function freshFeed(){return {rows:[],ready:false,loading:false,more:false,capacity:historyPageSize(historyQuery),error:"",controller:null,signature:""};}
function syncHistoryButton(key){
 const state=history[key],button=byId(key+"-older");
 button.hidden=!showOlderButton(state,byId(key).scrollTop);button.disabled=state.loading;
 button.textContent=state.loading?"Loading…":state.error?"Retry history":historyQuery?"Load 100 more matching messages":"Load 1,000 older messages";
 byId(key+"-history-state").textContent=state.error||(state.ready?historyQuery?state.rows.length+" matching messages":state.rows.length+" messages loaded":"Loading history…");
}
function drawHistory(key,{forceBottom=false,preserveTop=false}={}){
 const parent=byId(key),state=history[key],rows=key==="gm"?state.rows.filter(row=>enabledStaffRoles.has(staffRoleFor(row))):state.rows;
 syncHistoryButton(key);
 refreshKnownPlayers();
 refreshKnownClasses();
 const rowSignatures=rows.map(focusSignature);
 const signature=JSON.stringify([state.ready,state.error,rowSignatures]);
 if(!forceBottom&&state.signature===signature)return;state.signature=signature;
 const atBottom=forceBottom||!preserveTop&&parent.scrollHeight-parent.scrollTop-parent.clientHeight<45;
 const top=parent.getBoundingClientRect().top;
 // Record the first visible row rather than relying on total height differences.
 const anchor=[...parent.children].find(e=>e.dataset.id&&e.getBoundingClientRect().bottom>top);
 const anchorId=anchor?.dataset.id,offset=anchor?anchor.getBoundingClientRect().top-top:0,before=parent.scrollTop;
 if(!rows.length)empty(parent,state.error||(!state.ready?"Loading history…":key==="gm"&&state.rows.length?"No messages from the selected staff roles.":historyQuery?"No messages match your search.":key==="gm"?"No recent verified staff messages.":"No recent public messages."));
 else{
  const existing=new Map([...parent.children].filter(e=>e.dataset.id).map(e=>[e.dataset.id,e]));
  const keep=new Set(rows.map(r=>r.id));
  for(const child of [...parent.children])if(!keep.has(child.dataset.id))child.remove();
  // Reuse unchanged DOM nodes so hover, pinned tooltips and keyboard focus survive live polls.
  for(let i=0;i<rows.length;i++){
   const row=rows[i];let line=existing.get(row.id);
   if(!line||line.dataset.signature!==rowSignatures[i]){
    const next=node("div","chat-line");next.dataset.id=row.id;next.dataset.author=playerKey(row.author);next.dataset.signature=rowSignatures[i];appendChatLine(next,row);
    if(line?.parentNode===parent)line.replaceWith(next);line=next;
   }
   if(parent.children[i]!==line)parent.insertBefore(line,parent.children[i]??null);
  }
  if(atBottom)parent.scrollTop=parent.scrollHeight;
  else{const replacement=anchorId&&[...parent.children].find(e=>e.dataset.id===anchorId);
   parent.scrollTop=replacement?parent.scrollTop+replacement.getBoundingClientRect().top-parent.getBoundingClientRect().top-offset:before;}
 }
 syncHistoryButton(key);applyPlayerFocus();
}
async function fetchHistory(key,older=false){
 const state=history[key],token=historyGeneration,realm=select.value,q=historyQuery;
 if(!state||state.loading||older&&!state.ready)return;
 state.loading=true;state.error="";state.controller=new AbortController();syncHistoryButton(key);
 const params=new URLSearchParams({realm,feed:key,q});
 const cursor=older&&cursorFor(state.rows);
 if(cursor)for(const [k,v] of Object.entries(cursor))params.set(k,v);
 const timeout=setTimeout(()=>state.controller.abort(),20000);
 try{
  const response=await fetch(API+"/history?"+params,{signal:state.controller.signal,cache:"no-store"});
  if(!response.ok){let code;try{code=(await response.json()).code;}catch{}throw Object.assign(Error(historyErrorMessage(response.status,code)),{historyFailure:true});}
  const data=await response.json();
  if(token!==historyGeneration||history[key]!==state)return;
  if(data.realm!==realm||data.feed!==key||data.query!==q||!Array.isArray(data.items)||data.pageSize!==historyPageSize(q))throw Object.assign(Error("History API response is incompatible. Live chat only."),{historyFailure:true});
  state.rows=older?mergeChat(data.items,state.rows):mergeChat(data.items,[]);
  state.ready=true;state.more=Boolean(data.hasMore);state.capacity=Math.max(state.capacity,older?state.rows.length:historyPageSize(q));
  // Merge a live poll that may have completed while the initial archive loaded.
  if(current?.realm===realm)mergeLiveHistory(key,current[key],false,older);
  refreshKnownClasses();
  drawHistory(key,{forceBottom:!older,preserveTop:older});
  for(const other of feeds)if(other!==key&&history[other])drawHistory(other);
 }catch(e){if(token!==historyGeneration||history[key]!==state)return;state.error=e.historyFailure?e.message:historyErrorMessage();
  if(!state.ready&&current?.realm===realm)state.rows=liveFallback(current[key],q);
  drawHistory(key);}
 finally{clearTimeout(timeout);if(token===historyGeneration&&history[key]===state){state.loading=false;syncHistoryButton(key);}}
}
function mergeLiveHistory(key,incoming,render=true,preserveOverride){
 const state=history[key];if(!state)return;
 if(!state.ready){
  state.rows=liveFallback(incoming,historyQuery);
  if(render)drawHistory(key);
  return;
 }
 const parent=byId(key),readingOlder=parent.scrollHeight-parent.scrollTop-parent.clientHeight>=45;
 const preserveOlder=preserveOverride??(state.loading||readingOlder);
 const next=mergeHistoryWindow(state.rows,incoming,{query:historyQuery,capacity:state.capacity,preserveOlder,hasMore:state.more});
 state.rows=next.rows;state.capacity=next.capacity;state.more=next.hasMore;
 if(render)drawHistory(key);
}
function resetHistory(query=historyQuery,load=true){
 historyGeneration++;historyQuery=query;
 for(const key of feeds){history[key]?.controller?.abort();history[key]=freshFeed();drawHistory(key);if(load)void fetchHistory(key);}
}
for(const button of document.querySelectorAll("[data-staff-role]")){
 button.addEventListener("click",()=>{
  const role=button.dataset.staffRole;
  if(enabledStaffRoles.has(role))enabledStaffRoles.delete(role);else enabledStaffRoles.add(role);
  button.setAttribute("aria-pressed",String(enabledStaffRoles.has(role)));
  drawHistory("gm");
 });
}
for(const key of feeds){
 byId(key+"-older").addEventListener("click",()=>void fetchHistory(key,history[key].ready));
 byId(key).addEventListener("scroll",()=>syncHistoryButton(key),{passive:true});
}
byId("chat-search").addEventListener("input",()=>{
 clearTimeout(searchTimer);const q=byId("chat-search").value.trim().slice(0,160);
 resetHistory(q,false);searchTimer=setTimeout(()=>{for(const key of feeds)void fetchHistory(key);},350);
});
const searchInput=byId("chat-search"),searchMenu=byId("chat-search-options"),searchWrap=byId("chat-search-wrap");
function searchOpen(open){searchMenu.hidden=!open;searchInput.setAttribute("aria-expanded",String(open));}
for(const option of SEARCH_OPTIONS){
 const b=node("button","chat-search-option");b.type="button";b.append(node("code","",option.token),node("small","",option.description));searchMenu.append(b);
 b.addEventListener("click",()=>{
  const prefix=searchInput.value.trimEnd();const next=(prefix?prefix+" ":"")+option.token;
  if(next.length>160)return;
  searchInput.value=next;searchInput.focus();searchOpen(false);
  if(!option.token.endsWith(":"))searchInput.dispatchEvent(new Event("input",{bubbles:true}));
 });
}
searchInput.addEventListener("focus",()=>searchOpen(true));
searchInput.addEventListener("click",()=>searchOpen(true));
searchInput.addEventListener("keydown",e=>{
 if(e.key==="ArrowDown"){e.preventDefault();searchOpen(true);searchMenu.querySelector("button")?.focus();}
 if(e.key==="Escape"||e.key==="Enter")searchOpen(false);
});
searchMenu.addEventListener("keydown",e=>{
 const buttons=[...searchMenu.querySelectorAll("button")],i=buttons.indexOf(document.activeElement);
 if(e.key==="Escape"){e.preventDefault();searchInput.focus();searchOpen(false);}
 if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();buttons[(i+(e.key==="ArrowDown"?1:-1)+buttons.length)%buttons.length]?.focus();}
});
document.addEventListener("pointerdown",e=>{if(!searchWrap.contains(e.target))searchOpen(false);});
searchWrap.addEventListener("focusout",e=>{if(!searchWrap.contains(e.relatedTarget))searchOpen(false);});
const defaultFilters={kind:"all",intent:"all",role:"all",tag:"all",query:"",blacklist:"",sort:"latest",alerts:false};
let filters={...defaultFilters},collapsed=new Set(),known=new Set(),primed=false,audio=null,lastLfgKey="";
try{const s=JSON.parse(localStorage.getItem("octobot-lfg-v2")||"{}");for(const k of Object.keys(defaultFilters))if(typeof s.filters?.[k]===typeof defaultFilters[k])filters[k]=s.filters[k];collapsed=new Set(Array.isArray(s.collapsed)?s.collapsed:[]);}catch{}
const save=()=>{try{localStorage.setItem("octobot-lfg-v2",JSON.stringify({filters,collapsed:[...collapsed]}));}catch{}};
function copyWhisper(author){
 if(!author||author==="Unknown player")return;
 const command="/w "+author+" ";
 navigator.clipboard?.writeText(command).then(()=>byId("lfg-notice").textContent="Copied "+command.trim()).catch(()=>byId("lfg-notice").textContent=command);
 if(!navigator.clipboard)byId("lfg-notice").textContent=command;
}
function signalNew(){
 try{if(audio?.state!=="running")return;const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=660;g.gain.value=.045;o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.16);}catch{}
}
const tagSelect=byId("lfg-tag");
for(const meta of catalog){const option=node("option","",meta.name);option.value=meta.tag;tagSelect.append(option);}
for(const key of ["kind","intent","role","tag","query","blacklist","sort","alerts"]){
 const control=byId("lfg-"+key);
 if(key==="alerts")control.checked=filters.alerts;else control.value=filters[key];
 control.addEventListener(key==="query"||key==="blacklist"?"input":"change",()=>{
  filters[key]=key==="alerts"?control.checked:control.value;
  if(key==="alerts"&&control.checked){try{audio??=new AudioContext();void audio.resume();}catch{}}
  save();lastLfgKey="";drawListings();
 });
}
byId("lfg-reset").addEventListener("click",()=>{filters={...defaultFilters};collapsed.clear();for(const key of Object.keys(defaultFilters)){const control=byId("lfg-"+key);if(key==="alerts")control.checked=false;else control.value=filters[key];}save();lastLfgKey="";drawListings();});
function updateTimers(parent,now){
 for(const e of parent.querySelectorAll("[data-expires]")){const remaining=Math.max(0,Math.ceil((Number(e.dataset.expires)-now)/1000));e.textContent=elapsedLabel(Number(e.dataset.time),now);e.classList.toggle("critical",remaining<=30);e.classList.toggle("soon",remaining>30&&remaining<=60);}
}
function drawLfg(now){
 const parent=byId("lfg"),all=current.lfg.filter(r=>r.expiresAt>now),rows=filterListings(all,filters,now);
 byId("lfg-count").textContent=rows.length+" / "+all.length;
 const ids=new Set(rows.map(r=>r.listingId??JSON.stringify([r.tag,r.author])));
 if(primed&&filters.alerts&&[...ids].some(x=>!known.has(x)))signalNew();
 known=ids;primed=true;
 const signature=JSON.stringify([rows.map(focusSignature),filters.sort,[...collapsed]]);
 if(lastLfgKey===signature){updateTimers(parent,now);return;}
 lastLfgKey=signature;
 const groups=new Map();for(const r of rows){if(!groups.has(r.tag))groups.set(r.tag,[]);groups.get(r.tag).push(r);}
 const order=new Map(catalog.map((c,i)=>[c.tag,i]));
 const tags=[...groups.keys()].sort((a,b)=>(order.get(a)??999)-(order.get(b)??999)||a.localeCompare(b));
 if(!tags.length){empty(parent,all.length?"No listings match your filters.":"No active listings.");return;}
 const frag=document.createDocumentFragment();
 for(const tag of tags){
  const meta=byTag.get(tag),entries=groups.get(tag),section=node("section","lfg-group"),header=node("button","lfg-group-header");header.type="button";header.dataset.tag=tag;header.setAttribute("aria-expanded",String(!collapsed.has(tag)));
  const arrow=node("span","lfg-arrow",collapsed.has(tag)?"▸":"▾"),icon=node("img","lfg-icon");icon.alt="";icon.loading="lazy";icon.src="https://wow.zamimg.com/images/wow/icons/small/"+(meta?.icon??"inv_misc_questionmark")+".jpg";
  const label=node("span","lfg-group-label");label.append(node("strong","",meta?.name??tag));
  if(meta?.min)label.append(node("span","lfg-meta",(meta.min===meta.max?meta.min:meta.min+"–"+meta.max)+(meta.size?" · "+meta.size+" players":"")+(meta.kind==="worldboss"?" · World boss":"")));
  header.append(arrow,icon,label,node("span","lfg-group-count",String(entries.length)));
  header.addEventListener("click",()=>{if(collapsed.has(tag))collapsed.delete(tag);else collapsed.add(tag);save();lastLfgKey="";drawLfg(Date.now());parent.querySelectorAll(".lfg-group-header").forEach(b=>{if(b.dataset.tag===tag)b.focus({preventScroll:true});});});
  section.append(header);
  if(!collapsed.has(tag)){
   entries.sort((a,b)=>filters.sort==="oldest"?a.time-b.time:b.time-a.time);
   for(const row of entries){
    const info=analyseRecruitment(row.message),line=node("div","lfg-row"),body=node("div","lfg-body"),author=node("button","lfg-player",row.author);author.type="button";author.disabled=row.author==="Unknown player";author.title="Copy /w "+row.author;author.addEventListener("click",()=>copyWhisper(row.author));
    const cls=classInfo[resolvedClass(row)];
    colourAuthor(author,row);
    const who=node("div","lfg-who");who.append(author);
    if(row.guild)who.append(node("span","lfg-guild"," <"+row.guild+">"));
    if(row.level||cls){const meta=node("span","lfg-meta"," · "+(row.level?"Lvl "+row.level+(cls?" ":""):""));if(cls){const classLabel=node("span","lfg-class",cls[0]);classLabel.style.color=cls[1];meta.append(classLabel);}who.append(meta);}
    const badges=node("div","lfg-badges");
    if(info.intent!=="Unspecified")badges.append(node("span","lfg-chip",info.intent));
    for(const role of info.roles)badges.append(node("span","lfg-chip role-"+role.toLowerCase(),role));
    if(info.needed)badges.append(node("span","lfg-chip","LF"+info.needed));
    const message=node("div","lfg-message");appendMessage(message,row);body.append(who,badges,message);
    const expiry=node("span","list-expiry");expiry.dataset.expires=row.expiresAt;expiry.dataset.time=row.time;
    line.append(body,expiry);section.append(line);
   }
  }
  frag.append(section);
 }
 parent.replaceChildren(frag);updateTimers(parent,now);
}
function drawListings(){
  if(!current)return;
  const now=Date.now();
  refreshKnownClasses();
  drawLfg(now);
  for(const key of ["wtb","wts"]){
    const parent=byId(key),rows=current[key].filter(r=>r.expiresAt>now);
    byId(key+"-count").textContent=String(rows.length);
    const signature=JSON.stringify(rows.map(focusSignature));
    if(tradeSignatures[key]!==signature){
     tradeSignatures[key]=signature;const frag=document.createDocumentFragment();
     for(const row of rows){
      const line=node("div","list-row"),body=node("div");appendChatLine(body,row,false);line.append(body);
      const expiry=node("span","list-expiry");expiry.dataset.expires=row.expiresAt;expiry.dataset.time=row.time;line.append(expiry);frag.append(line);
     }
     if(rows.length)parent.replaceChildren(frag);else empty(parent,"No active listings.");
    }
    updateTimers(parent,now);
  }
}
const deathsByRealm=new Map();
let deathRequest=null;
async function pollDeaths(){
 if(deathRequest||document.hidden)return;
 const parent=byId("hardcore-deaths");
 const request=deathRequest=new AbortController();
 const timeout=setTimeout(()=>request.abort(),8000);
 try{
  const results=await Promise.allSettled(realms.map(async realm=>{
   const previous=deathsByRealm.get(realm)??[];
   const params=new URLSearchParams({realm,after:String(previous[0]?.id??0)});
   const response=await fetch(API+"/deaths?"+params,{signal:request.signal,cache:"no-store"});
   if(!response.ok)throw Error("Death log unavailable");
   const data=await response.json();
   if(data.realm!==realm||!Array.isArray(data.items))throw Error("Invalid death log");
   if(!deathsByRealm.has(realm)||data.items.length){
    deathsByRealm.set(realm,[...data.items.map(row=>({...row,realm})),...previous].slice(0,100));
    return true;
   }
   return false;
  }));
  const rows=[...deathsByRealm.values()].flat().sort((a,b)=>Date.parse(b.time)-Date.parse(a.time)||b.id-a.id).slice(0,100);
  if(!rows.length){
   const failed=results.some(result=>result.status==="rejected");
   empty(parent,failed?"Some death feeds are unavailable. Retrying…":"No hardcore death announcements recorded yet.");
   return;
  }
  if(!results.some(result=>result.status==="fulfilled"&&result.value))return;
  parent.replaceChildren(...rows.map(row=>{
   const entry=node("div","chat-line");
   const time=new Date(row.time).toISOString().slice(11,19);
   entry.append(node("span","chat-time","["+time+"]"),node("span","death-announcement","["+row.realm+"] "+row.text));
   return entry;
  }));
 }finally{
  clearTimeout(timeout);
  deathRequest=null;
 }
}
function reset(){current=null;primed=false;known.clear();knownPlayers.clear();knownClasses.clear();focusedPlayer="";closeItemPopup();lastLfgKey="";for(const k of Object.keys(tradeSignatures))delete tradeSignatures[k];for(const key of ["lfg","wtb","wts"]){empty(byId(key),"Waiting for verified data…");byId(key+"-count").textContent="";}byId("last-updated").textContent="";}
async function poll(){
  if(requesting)return;requesting=true;
  const token=generation, realm=select.value;controller=new AbortController();
  const timeout=setTimeout(()=>controller?.abort(),8000);
  try{
    const response=await fetch(API+"?realm="+encodeURIComponent(realm),{signal:controller.signal,cache:"no-store"});
    if(!response.ok)throw Error("HTTP "+response.status);
    const data=await response.json();
    if(token!==generation||data.realm!==realm)return;
    for(const key of ["world","gm","lfg","wtb","wts"])if(!Array.isArray(data[key]))throw Error("Invalid feed");
    current=data;status(data.status,data.status==="live"?"Live · collector connected":data.status==="stale"?"Collector stale · last known messages":"Waiting for collector");
    byId("last-updated").textContent="Updated "+new Date(data.generatedAt).toISOString().slice(11,19)+" UTC";
    mergeLiveHistory("world",data.world,false);mergeLiveHistory("gm",data.gm,false);drawHistory("world");drawHistory("gm");drawListings();
  }catch{if(token===generation)status("error","Feed unavailable · retrying");}
  finally{clearTimeout(timeout);requesting=false;if(token!==generation)void poll();}
}
select.addEventListener("change",()=>{generation++;controller?.abort();const u=new URL(location.href);u.searchParams.set("realm",select.value);window.history.replaceState(null,"",u);clearTimeout(searchTimer);reset();resetHistory(historyQuery);status("waiting","Connecting…");void poll();});
document.addEventListener("visibilitychange",()=>{if(!document.hidden)void pollDeaths();});
reset();empty(byId("hardcore-deaths"),"Loading death announcements…");void pollDeaths();resetHistory();void poll();setInterval(()=>void pollDeaths(),30000);setInterval(()=>void poll(),5000);setInterval(drawListings,1000);
