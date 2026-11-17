// Parse the original WoW chat markup without ever interpreting it as HTML.
// Item links use numeric IDs; ordinary links allow only HTTP(S). Never interpret player text as HTML.
const qualityColors=new Set(["9d9d9d","ffffff","1eff00","0070dd","0070ff","a335ee","ff8000","e6cc80","00ccff"]);
export function itemColour(value){
 const color=String(value??"").replace(/^#/,"").toLowerCase();
 return qualityColors.has(color)?"#"+color:null;
}
export function itemId(value){
 return Number.isSafeInteger(value)&&value>0&&value<=2147483647?value:null;
}
export function parseChatMessage(raw){
 const text=String(raw??"").replace(/[\u0000-\u001f\u007f]/g," ").trim();
 const tokens=/\|\||\|c([0-9a-fA-F]{8})|\|r|\|H([^|\r\n]*)\|h([^|\r\n]*)\|h|\|T[^|]*\|t/g;
 let last=0,colour=null;const parts=[];
 function addText(s){if(!s)return;const prev=parts[parts.length-1];if(prev&&!prev.itemId)prev.text+=s;else parts.push({text:s});}
 for(const m of text.matchAll(tokens)){
  addText(text.slice(last,m.index));last=m.index+m[0].length;
  if(m[0]==="||"){addText("|");continue;}
  if(m[1]){colour=itemColour(m[1].slice(2));continue;}
  if(m[0]==="|r"){colour=null;continue;}
  if(m[2]!==undefined){
   const payload=/^item:([0-9]{1,10})(?::[+-]?\d*)*$/i.exec(m[2]);
   const id=payload&&itemId(Number(payload[1]));
   if(id&&m[3])parts.push({text:m[3],itemId:id,colour:colour??"#ffffff"});
   else addText(m[3]);
  }
 }
 addText(text.slice(last));
 return {message:parts.map(p=>p.text).join(""),parts};
}
export function publicChatMessage(stored){
 const {message,parts}=parseChatMessage(stored);
 return {message,...(parts.some(p=>p.itemId)?{parts}:{})};
}
const visitedKey="octobot-chat-visited-v1",visited=new Set();
try{for(const url of JSON.parse(globalThis.localStorage?.getItem(visitedKey)||"[]").slice(-1000))if(typeof url==="string")visited.add(url);}catch{}
function markVisited(url){visited.delete(url);visited.add(url);while(visited.size>1000)visited.delete(visited.values().next().value);try{globalThis.localStorage?.setItem(visitedKey,JSON.stringify([...visited]));}catch{}}
export function splitWebLinks(value){
 const text=String(value??""),parts=[];let last=0;
 // Explicit URLs, www links, and commonly pasted Discord invite links.
 const re=/(?:https?:\/\/|www\.|discord\.gg\/|discord\.com\/invite\/)[^\s<>"'|]+/gi;
 for(const m of text.matchAll(re)){
  const start=m.index;
  if(start>0&&/[a-z0-9_:@/]/i.test(text[start-1]))continue;
  let label=m[0];
  while(/[.,!?;:]$/.test(label))label=label.slice(0,-1);
  for(const [open,close] of [["(",")"],["[","]"],["{","}"]]){
   while(label.endsWith(close)&&label.split(close).length>label.split(open).length)label=label.slice(0,-1);
  }
  let href;try{
   const url=new URL(/^https?:\/\//i.test(label)?label:"https://"+label);
   if(!["http:","https:"].includes(url.protocol)||!url.hostname||url.username||url.password||!url.hostname.includes("."))continue;
   href=url.href;
  }catch{continue;}
  if(start>last)parts.push({text:text.slice(last,start)});
  parts.push({text:label,href});last=start+label.length;
 }
 if(last<text.length)parts.push({text:text.slice(last)});
 return parts;
}
function appendWebText(parent,text){
 const doc=parent.ownerDocument;
 for(const p of splitWebLinks(text)){
  if(!p.href){parent.append(doc.createTextNode(p.text));continue;}
  const a=doc.createElement("a");a.className="chat-web-link"+(visited.has(p.href)?" is-visited":"");a.href=p.href;a.target="_blank";a.rel="noopener noreferrer";a.textContent=p.text;
  const seen=()=>{markVisited(p.href);a.classList.add("is-visited");};
  a.addEventListener("click",seen);a.addEventListener("auxclick",e=>{if(e.button===1)seen();});parent.append(a);
 }
}
export function appendChatMessage(parent,row){
 const doc=parent.ownerDocument;
 const message=String(row.message??"");
 const parts=row.parts;
 if(!Array.isArray(parts)||parts.some(p=>!p||typeof p.text!=="string")||parts.map(p=>p.text).join("")!==message){
  appendWebText(parent,message);return;
 }
 for(const part of parts){
  const id=itemId(part.itemId);
  if(!id){appendWebText(parent,part.text);continue;}
  const a=doc.createElement("a");
  a.className="chat-item-link";a.href="https://octowow.st/db/?item="+id;
  a.target="_blank";a.rel="noopener noreferrer";
  a.style.color=itemColour(part.colour)??"#ffffff";
  a.textContent=part.text;parent.append(a);
 }
}
