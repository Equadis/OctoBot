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
  const author=(row.gm?"<GM> ":"")+row.author+(row.guild?" <"+row.guild+">":"")+":";
  content.append(node("span","chat-author",author),document.createTextNode(" "+row.message));
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
function drawListings(){
  if(!current)return;
  const now=Date.now();
  for(const key of ["lfg","wtb","wts"]){
    const parent=byId(key),rows=current[key].filter(r=>r.expiresAt>now);
    byId(key+"-count").textContent=String(rows.length);
    const frag=document.createDocumentFragment();
    for(const row of rows){
      const remaining=Math.max(0,Math.ceil((row.expiresAt-now)/1000)),line=node("div","list-row");
      if(key==="lfg")line.append(node("span","list-tag",row.tag));
      const body=node("div");appendChatLine(body,row,false);line.append(body);
      line.append(node("span","list-expiry"+(remaining<=30?" critical":remaining<=60?" soon":""),Math.floor(remaining/60)+":"+String(remaining%60).padStart(2,"0")));frag.append(line);
    }
    if(rows.length)parent.replaceChildren(frag);else empty(parent,"No active listings.");
  }
}
function reset(){current=null;for(const key of ["world","gm","lfg","wtb","wts"]){empty(byId(key),"Waiting for verified data…");byId(key+"-count").textContent="";}byId("last-updated").textContent="";}
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
