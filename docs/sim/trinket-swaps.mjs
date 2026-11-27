import {TRINKET_SWAP_MODES,postSwapBuild} from './core/trinket-swaps.mjs?v=20261113-swap-label1';
import {attachTooltip,equipmentTooltip} from './tooltip.mjs?v=20261124-tips2';
import {SLOT_ICONS,iconUrl} from './core/interface.mjs?v=20261112-navigation1';
import {scheduleScrollingNames} from '../scrolling-names.mjs?v=20261202-pan-paint';
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const SHORT={rogue:'VT',hunter:'FD'};
// Swap controls sit directly under the trinket slots in the gear panel, as in Combat Gum.
export function trinketSwapControls({getBuild,onChange,openPicker,inspect}){
 const mode=TRINKET_SWAP_MODES[getBuild().classId];if(!mode)return {render(){}};
 const anchor=document.querySelector('#slots-right [data-slot="trinket2"]');if(!anchor)return {render(){}};
 const panel=node('div',undefined,'trinket-swap');
 const enabled=node('input');enabled.type='checkbox';enabled.id='trinket-swap-enabled';
 // "Vanish" / "Feign Death" on the first line, "Trinket Swap" on the second.
 const enableLabel=node('label',undefined,'swap-toggle'),title=node('span',undefined,'swap-title');
 const split=mode.label.match(/^(.*?)\s*(Trinket Swap)$/)||[null,mode.label,''];
 title.append(node('span',split[1]),document.createTextNode(' '),node('span',split[2]));enableLabel.append(enabled,title);
 const timing=node('input');timing.type='number';timing.min='0';timing.max='3600';timing.step='0.1';timing.id='trinket-swap-time';timing.setAttribute('aria-label','Swap time in seconds');
 const timingLabel=node('label',undefined,'swap-timing');timingLabel.append(node('span','Swap at'),timing,node('span','s'));
 const options=node('div',undefined,'swap-options');options.append(enableLabel,timingLabel);panel.append(options);
 const slotsWrap=node('div',undefined,'swap-slots');panel.append(slotsWrap);
 const slots=new Map();
 const save=patch=>{try{onChange({...getBuild(),trinketSwap:{...getBuild().trinketSwap,...patch}});}finally{render();}};
 for(const [slot,number] of [['trinket1',1],['trinket2',2]]){
  const container=node('div',undefined,'slot swap-slot'),button=node('button');button.type='button';
  const name=`${SHORT[getBuild().classId]} ${number}`;button.setAttribute('aria-label',`Edit ${mode.label}: Trinket ${number}`);
  const icon=node('img','','slot-icon');icon.src=iconUrl(SLOT_ICONS[slot]);icon.alt='';icon.decoding='async';icon.referrerPolicy='no-referrer';
  const itemName=node('span',undefined,'item-name ah-name-clip'),itemText=node('span','Empty','ah-name-text'),copy=node('span',undefined,'slot-copy');
  itemName.append(itemText);copy.append(node('span',name,'slot-name'),itemName);
  button.append(icon,copy);container.append(button);slotsWrap.append(container);
  slots.set(slot,{container,itemName,itemText,icon});
  button.addEventListener('click',()=>openPicker(slot,{
   getBuild:()=>postSwapBuild(getBuild()),
   onEquip:(_slot,item)=>save({gear:{...getBuild().trinketSwap.gear,[slot]:{id:item.id,label:item.label}}}),
   onClear:()=>{const gear={...getBuild().trinketSwap.gear};delete gear[slot];save({gear});},
   heading:`${mode.label}: ${slot==='trinket1'?'Trinket 1':'Trinket 2'}`,
  }));
  attachTooltip(button,async()=>{const ref=getBuild().trinketSwap.gear[slot];return ref?equipmentTooltip(await inspect(ref.id),ref):{title:'Keep starting trinket',lines:['Empty']};});
 }
 anchor.after(panel);
 enabled.addEventListener('change',()=>{
  const build=getBuild();try{onChange({...build,classOptions:enabled.checked&&build.classId==='hunter'?{...build.classOptions,pet:'None'}:build.classOptions,trinketSwap:{...build.trinketSwap,enabled:enabled.checked}});}finally{render();}
 });
 timing.addEventListener('change',()=>save({atSeconds:Number(timing.value)}));
 function render(){
  const swap=getBuild().trinketSwap;enabled.checked=swap.enabled;timing.value=swap.atSeconds;
  // The two replacement slots only appear while the swap is switched on.
  slotsWrap.hidden=!swap.enabled;
  for(const [slot,view] of slots){
   const ref=swap.gear[slot];
   view.itemText.textContent=ref?.label||'Empty';view.container.classList.toggle('has-item',Boolean(ref));
   if(!ref){view.icon.src=iconUrl(SLOT_ICONS[slot]);view.itemName.className='item-name ah-name-clip';delete view.container.dataset.quality;continue;}
   view.container.dataset.quality='1';
   Promise.resolve(inspect(ref.id)).then(meta=>{
    if(swap.gear[slot]?.id!==ref.id||!meta)return;
    if(meta.icon)view.icon.src=iconUrl(meta.icon);
    view.container.dataset.quality=String(meta.quality??1);
    view.itemName.className=`item-name ah-name-clip q${meta.quality??1}`;
    if(meta.name)view.itemText.textContent=meta.name;
    scheduleScrollingNames(view.container);
   }).catch(()=>{});
  }
  scheduleScrollingNames(slotsWrap);
 }
 render();return {render};
}
