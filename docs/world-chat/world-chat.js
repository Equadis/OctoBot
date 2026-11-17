import {catalog,byTag,classInfo,analyseRecruitment,filterListings,normalise} from "./lfg-catalog.mjs";
import {appendChatMessage} from "./chat-links.mjs";
const API="https://octometrics.eqvoice.workers.dev/api/world-chat";
const byId=id=>document.getElementById(id);
const realms=["N'Zoth","Y'Shaarj","C'Thun"], select=byId("realm");
const initial=new URL(location.href).searchParams.get("realm");if(realms.includes(initial))select.value=initial;
let generation=0,controller=null,current=null,requesting=false;
function node(tag,cls,value){const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=value;return e;}
function status(state,text){const e=byId("feed-state");e.dataset.state=state;e.textContent=text;}
function empty(parent,message){parent.replaceChildren(node("div","chat-empty",message));}
function appendChatLine(parent,row,withTime=true){
  if(withTime)parent.append(node("span","chat-time","["+new Date(row.time).toISOString().slice(11,19)+"]"));
  const content=node("span","chat-content");
  if(row.gm)content.append(node("span","chat-gm-tag","<GM> "));
  content.append(node("span","chat-author",row.author+(row.guild?" <"+row.guild+">":"")),document.createTextNode(": "));
  appendChatMessage(content,row);
  parent.append(content);
}
function drawFeed(key,rows){
  const parent=byId(key),atBottom=parent.scrollHeight-parent.scrollTop-parent.clientHeight<45;
  const existing=parent.firstElementChild?.dataset.id, first=rows[0]?.id;
  const before=parent.scrollTop,oldHeight=parent.scrollHeight;
  if(!rows.length)empty(parent,key==="gm"?"No recent verified GM messages.":"No recent public messages.");
  else {
    const frag=document.createDocumentFragment();
    for(const row of rows){
      const line=node("div","chat-line");line.dataset.id=row.id;
      appendChatLine(line,row);frag.append(line);
    }
    parent.replaceChildren(frag);
    parent.scrollTop=atBottom?parent.scrollHeight:Math.max(0,existing===first?before:before+parent.scrollHeight-oldHeight);
  }
  byId(key+"-count").textContent=String(rows.length);
}
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
 for(const e of parent.querySelectorAll("[data-expires]")){const seconds=Math.max(0,Math.ceil((Number(e.dataset.expires)-now)/1000));e.textContent=Math.floor(seconds/60)+":"+String(seconds%60).padStart(2,"0");e.classList.toggle("critical",seconds<=30);e.classList.toggle("soon",seconds>30&&seconds<=60);}
}
function drawLfg(now){
 const parent=byId("lfg"),all=current.lfg.filter(r=>r.expiresAt>now),rows=filterListings(all,filters,now);
 byId("lfg-count").textContent=rows.length+" / "+all.length;
 const ids=new Set(rows.map(r=>r.listingId??JSON.stringify([r.tag,r.author])));
 if(primed&&filters.alerts&&[...ids].some(x=>!known.has(x)))signalNew();
 known=ids;primed=true;
 const signature=JSON.stringify([rows,filters.sort,[...collapsed]]);
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
    const cls=classInfo[row.classId];
    const who=node("div","lfg-who");who.append(author);
    if(row.guild)who.append(node("span","lfg-guild"," <"+row.guild+">"));
    if(row.level||cls){const meta=node("span","lfg-meta"," · "+(row.level?"Lvl "+row.level+(cls?" ":""):""));if(cls){const classLabel=node("span","lfg-class",cls[0]);classLabel.style.color=cls[1];meta.append(classLabel);}who.append(meta);}
    const badges=node("div","lfg-badges");
    if(info.intent!=="Unspecified")badges.append(node("span","lfg-chip",info.intent));
    for(const role of info.roles)badges.append(node("span","lfg-chip role-"+role.toLowerCase(),role));
    if(info.needed)badges.append(node("span","lfg-chip","LF"+info.needed));
    const message=node("div","lfg-message");appendChatMessage(message,row);body.append(who,badges,message);
    const expiry=node("span","list-expiry");expiry.dataset.expires=row.expiresAt;
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
  drawLfg(now);
  for(const key of ["wtb","wts"]){
    const parent=byId(key),rows=current[key].filter(r=>r.expiresAt>now);
    byId(key+"-count").textContent=String(rows.length);
    const frag=document.createDocumentFragment();
    for(const row of rows){
      const remaining=Math.max(0,Math.ceil((row.expiresAt-now)/1000)),line=node("div","list-row");

      const body=node("div");appendChatLine(body,row,false);line.append(body);
      line.append(node("span","list-expiry"+(remaining<=30?" critical":remaining<=60?" soon":""),Math.floor(remaining/60)+":"+String(remaining%60).padStart(2,"0")));frag.append(line);
    }
    if(rows.length)parent.replaceChildren(frag);else empty(parent,"No active listings.");
  }
}
function reset(){current=null;primed=false;known.clear();lastLfgKey="";for(const key of ["world","gm","lfg","wtb","wts"]){empty(byId(key),"Waiting for verified data…");byId(key+"-count").textContent="";}byId("last-updated").textContent="";}
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
    drawFeed("world",data.world);drawFeed("gm",data.gm);drawListings();
  }catch{if(token===generation)status("error","Feed unavailable · retrying");}
  finally{clearTimeout(timeout);requesting=false;if(token!==generation)void poll();}
}
select.addEventListener("change",()=>{generation++;controller?.abort();const u=new URL(location.href);u.searchParams.set("realm",select.value);history.replaceState(null,"",u);reset();status("waiting","Connecting…");void poll();});
reset();void poll();setInterval(()=>void poll(),5000);setInterval(drawListings,1000);
