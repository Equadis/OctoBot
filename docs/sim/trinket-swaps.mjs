import {TRINKET_SWAP_MODES,defaultTrinketSwap,postSwapBuild} from './core/trinket-swaps.mjs?v=20261113-swap-label1';
import {attachTooltip,equipmentTooltip} from './tooltip.mjs?v=20261113-swaps1';
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
export function trinketSwapControls({getBuild,onChange,openPicker,inspect}){
 const mode=TRINKET_SWAP_MODES[getBuild().classId];if(!mode)return {render(){}};
 const panel=node('section',undefined,'trinket-swap'),heading=node('div',undefined,'card-heading'),reset=node('button','Reset','panel-reset');
 reset.type='button';reset.setAttribute('aria-label','Reset trinket swap');heading.append(node('h3',mode.label),reset);panel.append(heading);
 const enabled=node('input');enabled.type='checkbox';enabled.id='trinket-swap-enabled';
 const enableLabel=node('label','Enable swap');enableLabel.prepend(enabled);
 const timing=node('input');timing.type='number';timing.min='0';timing.max='3600';timing.step='0.1';timing.id='trinket-swap-time';
 const timingLabel=node('label','Swap at (seconds)');timingLabel.append(timing);
 const settings=node('div',undefined,'class-options');settings.append(enableLabel,timingLabel);panel.append(settings);
 const buttons=new Map();
 const save=patch=>{try{onChange({...getBuild(),trinketSwap:{...getBuild().trinketSwap,...patch}});}finally{render();}};
 for(const slot of ['trinket1','trinket2']){
  const button=node('button');button.type='button';buttons.set(slot,button);panel.append(button);
  button.addEventListener('click',()=>openPicker(slot,{
   getBuild:()=>postSwapBuild(getBuild()),
   onEquip:(_slot,item)=>save({gear:{...getBuild().trinketSwap.gear,[slot]:{id:item.id,label:item.label}}}),
   onClear:()=>{const gear={...getBuild().trinketSwap.gear};delete gear[slot];save({gear});},
   heading:`${mode.label}: ${slot==='trinket1'?'Trinket 1':'Trinket 2'}`,
  }));
  attachTooltip(button,async()=>{const ref=getBuild().trinketSwap.gear[slot];return ref?equipmentTooltip(await inspect(ref.id),ref):{title:'Keep starting trinket',lines:['Choose a replacement, or leave this slot unchanged.']};});
 }
 panel.append(node('p','Starting trinkets are equipped in the gear panel. These replacements are equipped after the combat drop; unselected slots stay unchanged.','small muted'));
 if(getBuild().classId==='hunter')panel.append(node('p','Requires Pet: None. Enabling this option sets the pet to None.','small muted'));
 panel.append(node('p','Swap setup only. Combat simulation, combat-drop timing and trinket cooldown effects are not yet implemented.','small muted'));
 document.getElementById('class-options').after(panel);
 enabled.addEventListener('change',()=>{
  const build=getBuild();try{onChange({...build,classOptions:enabled.checked&&build.classId==='hunter'?{...build.classOptions,pet:'None'}:build.classOptions,trinketSwap:{...build.trinketSwap,enabled:enabled.checked}});}finally{render();}
 });
 timing.addEventListener('change',()=>save({atSeconds:Number(timing.value)}));
 reset.addEventListener('click',()=>{try{onChange({...getBuild(),trinketSwap:defaultTrinketSwap()});}finally{render();}});
 function render(){
  const swap=getBuild().trinketSwap;enabled.checked=swap.enabled;timing.value=swap.atSeconds;
  for(const [slot,button]of buttons){const ref=swap.gear[slot];button.textContent=`${slot==='trinket1'?'Trinket 1':'Trinket 2'}: ${ref?.label||'Keep starting trinket'}`;}
 }
 render();return {render};
}
