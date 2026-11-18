import {richItemTooltip} from "../auction-house/item-presentation.mjs?v=20261118-details1";
import {itemAuctionHref} from "./chat-interactions.mjs?v=1";
// A single viewport-clamped, pinned-or-hover item popup. No player-supplied HTML is rendered.
export function installItemPopup(){
 const popup=document.createElement("div");popup.id="chat-item-popup";popup.className="chat-item-popup";popup.hidden=true;document.body.append(popup);
 let anchor=null,pinned=false,generation=0,content=null,suppressFocus=false;
 const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 function place(){
  if(!anchor||popup.hidden)return;
  const b=anchor.getBoundingClientRect(),w=popup.offsetWidth,h=popup.offsetHeight,m=8;
  popup.style.left=Math.max(m,Math.min(b.left,innerWidth-w-m))+"px";
  popup.style.top=Math.max(m,Math.min(b.bottom+6+h<=innerHeight-m?b.bottom+6:b.top-h-6,innerHeight-h-m))+"px";
 }
 function close(){
  generation++;if(anchor){anchor.removeAttribute("aria-describedby");anchor.setAttribute("aria-expanded","false");}
  anchor=null;pinned=false;content=null;popup.hidden=true;
 }
 function paint(){
  if(!anchor)return;
  const id=Number(anchor.dataset.itemId),label=anchor.textContent.replace(/^\[|\]$/g,""),data=content;
  const title=make("strong",data?.title||label);title.style.color=anchor.style.color;
  popup.replaceChildren(title);
  if(!data)popup.append(make("p","Loading item details…","chat-item-note"));
  else{
   for(const line of data.lines??[])popup.append(make("p",line));
   for(const note of data.notes??[])popup.append(make("p",note,"chat-item-note"));
  }
  if(pinned){
   const actions=make("div","","chat-item-actions");
   for(const [label,href] of [["Open in AH ↗",itemAuctionHref(id)],["Open in DB ↗","https://octowow.st/db/?item="+id]]){
    const a=make("a",label);a.href=href;a.target="_blank";a.rel="noopener noreferrer";actions.append(a);
   }
   popup.append(actions,make("p","Auction House data: N'Zoth (Normal).","chat-item-note"));
  }
  popup.classList.toggle("is-pinned",pinned);popup.setAttribute("role",pinned?"dialog":"tooltip");popup.setAttribute("aria-label",label);popup.hidden=false;place();
 }
 function show(target,pin=false){
  if(anchor===target){if(pin){pinned=true;anchor.setAttribute("aria-expanded","true");paint();}return;}
  close();anchor=target;pinned=pin;anchor.setAttribute("aria-describedby",popup.id);anchor.setAttribute("aria-expanded",String(pin));paint();
  const token=++generation,id=Number(target.dataset.itemId),name=target.textContent.replace(/^\[|\]$/g,"");
  Promise.resolve(richItemTooltip({item_id:id,item_name:name})).then(data=>{if(token===generation){content=data;paint();}}).catch(()=>{if(token===generation){content={title:name,notes:["Item details unavailable. Open the database to view this item."]};paint();}});
 }
 const target=e=>e.target instanceof Element?e.target.closest(".chat-item-link[data-item-id]"):null;
 document.addEventListener("pointerover",e=>{const a=target(e);if(a&&!pinned&&e.pointerType!=="touch")show(a);});
 document.addEventListener("pointerout",e=>{if(!pinned&&anchor&&target(e)===anchor&&!anchor.contains(e.relatedTarget))close();});
 document.addEventListener("focusin",e=>{const a=target(e);if(a&&!pinned&&!suppressFocus)show(a);});
 document.addEventListener("focusout",e=>{if(!pinned&&anchor&&target(e)===anchor)close();});
 document.addEventListener("click",e=>{
  const a=target(e);
  if(a){e.preventDefault();if(anchor===a&&pinned)close();else show(a,true);return;}
  if(!popup.contains(e.target))close();
 });
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&anchor){const prev=anchor;close();if(popup.contains(document.activeElement)){suppressFocus=true;prev.focus({preventScroll:true});suppressFocus=false;}}else if(e.key==="Tab"&&pinned&&document.activeElement===anchor&&!e.shiftKey){e.preventDefault();popup.querySelector("a")?.focus();}});
 window.addEventListener("resize",()=>{if(pinned)place();else close();});
 window.addEventListener("scroll",event=>{if(popup.contains(event.target))return;if(!pinned){close();return;}const b=anchor.getBoundingClientRect(),scroller=anchor.closest(".chat-scroll"),s=scroller?.getBoundingClientRect();if(b.bottom<0||b.top>innerHeight||s&&(b.bottom<s.top||b.top>s.bottom))close();else place();},true);
 new MutationObserver(()=>{if(anchor&&!anchor.isConnected)close();}).observe(document.body,{childList:true,subtree:true});
 return close;
}
