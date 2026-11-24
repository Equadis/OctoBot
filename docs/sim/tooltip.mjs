import {ENCHANTS} from './core/equipment-options.mjs?v=20261130-ui2';
import {fixSigns} from './core/signs.mjs?v=1';
// Plain-text, viewport-clamped tooltips shared by equipment and talents.
const tooltip=document.createElement('div');tooltip.id='planner-tooltip';tooltip.className='planner-tooltip';tooltip.setAttribute('role','tooltip');tooltip.hidden=true;document.body.append(tooltip);
let generation=0,anchor=null,point=null,activeContent=null;
function position(){
 if(!anchor||tooltip.hidden)return;
 const box=anchor.getBoundingClientRect();
 const x=point?.x ?? box.right, y=point?.y ?? box.top;
 const width=tooltip.offsetWidth,height=tooltip.offsetHeight;
 tooltip.style.left=`${Math.max(8,Math.min(x+16,innerWidth-width-8))}px`;
 tooltip.style.top=`${Math.max(8,Math.min(y+16,innerHeight-height-8))}px`;
}
function paint(content){
 const host=anchor?.closest('dialog[open]') || document.body;
 if(tooltip.parentNode!==host)host.append(tooltip);
 tooltip.replaceChildren();
 const name=document.createElement('strong');name.textContent=content.title;tooltip.append(name);
 for(const line of content.lines || []){const p=document.createElement('p');p.textContent=line;tooltip.append(p);}
 // Optional lower-priority source and accuracy notes sit below the item attributes.
 for(const note of content.notes || []){const p=document.createElement('p');p.className='tooltip-note';p.textContent=note;tooltip.append(p);}
 tooltip.hidden=false;position();
}
function hide(){generation++;if(anchor)anchor.removeAttribute('aria-describedby');anchor=null;point=null;activeContent=null;tooltip.hidden=true;}
export function attachTooltip(target,getContent){
 target.removeAttribute('title');
 const show=async event=>{
  const token=++generation;anchor=target;activeContent=getContent;point=event.type==='mouseenter'?{x:event.clientX,y:event.clientY}:null;target.setAttribute('aria-describedby',tooltip.id);
  try{const result=getContent();if(result?.then){paint({title:'Loading…'});const content=await result;if(token===generation)paint(content);}else paint(result);}
  catch{if(token===generation)paint({title:'Details unavailable',lines:['Open the database link to view this item.']});}
 };
 target.addEventListener('mouseenter',show);target.addEventListener('focusin',show);
 target.addEventListener('mouseleave',hide);target.addEventListener('focusout',hide);
 target.addEventListener('mousemove',event=>{if(anchor===target){point={x:event.clientX,y:event.clientY};position();}});
 target.addEventListener('keydown',event=>{if(event.key==='Escape')hide();});
}
window.addEventListener('scroll',hide,true);window.addEventListener('resize',hide);document.addEventListener('pointerdown',hide);

export function refreshTooltip(){if(activeContent && !tooltip.hidden){const content=activeContent();if(!content?.then)paint(content);}}

export function equipmentTooltip(metadata, fallback={}) {
  if(!metadata)return {title:fallback.label || `Item #${fallback.id}`,lines:['Details unavailable.']};
  // The full database tooltip (stats, requirements, effects) is preferred, as in the item preview beside the selector.
  const full=Boolean(metadata.tooltipText);
  const summary=(metadata.tooltipText || metadata.summary || `Item level ${metadata.level || 0} · Requires level ${metadata.reqlevel || 0}`).split('\n').filter((line,index)=>line.trim()&&(index!==0 || line!==metadata.name));
  const enchant=ENCHANTS.find(enchant=>enchant.id===fallback.enchantId);
  return {title:metadata.name,lines:[...summary.map(fixSigns),...(!full&&Array.isArray(metadata.effects)?metadata.effects:[]),...(enchant?[`Enchanted: ${enchant.name.replace(/\s*\((?:MH|OH)\)/g,'')}`]:[])]};
}
