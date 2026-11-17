// Parse the original WoW chat markup without ever interpreting it as HTML.
// Only numeric item IDs may become links; no player-supplied URLs or styles.
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
export function appendChatMessage(parent,row){
 const doc=parent.ownerDocument;
 const message=String(row.message??"");
 const parts=row.parts;
 if(!Array.isArray(parts)||parts.some(p=>!p||typeof p.text!=="string")||parts.map(p=>p.text).join("")!==message){
  parent.append(doc.createTextNode(message));return;
 }
 for(const part of parts){
  const id=itemId(part.itemId);
  if(!id){parent.append(doc.createTextNode(part.text));continue;}
  const a=doc.createElement("a");
  a.className="chat-item-link";a.href="https://octowow.st/db/?item="+id;
  a.target="_blank";a.rel="noopener noreferrer";
  a.style.color=itemColour(part.colour)??"#ffffff";
  a.textContent=part.text;parent.append(a);
 }
}
