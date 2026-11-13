// Swap configuration is not evidence that combat-drop mechanics are implemented.
export const TRINKET_SWAP_MODES=Object.freeze({
 rogue:{id:'vanish',label:'Vanish Trinket Swap'},
 hunter:{id:'petless-feign-death',label:'Petless Feign Death Trinket Swap'},
});
export function defaultTrinketSwap(){return {enabled:false,atSeconds:20,gear:{}};}
export function validateTrinketSwap(input,classId,classOptions){
 if(!TRINKET_SWAP_MODES[classId]){
  if(input!==undefined)throw new Error('Trinket swapping is only supported for Rogue and Hunter.');
  return undefined;
 }
 const result=defaultTrinketSwap();if(input===undefined)return result;
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['enabled','atSeconds','gear'].includes(k)))throw new Error('Invalid trinket swap configuration.');
 if(typeof input.enabled!=='boolean'||!Number.isFinite(input.atSeconds)||input.atSeconds<0||input.atSeconds>3600)throw new Error('Invalid trinket swap timing or enabled state.');
 if(!input.gear||typeof input.gear!=='object'||Array.isArray(input.gear))throw new Error('Invalid replacement trinkets.');
 result.enabled=input.enabled;result.atSeconds=input.atSeconds;
 for(const [slot,item] of Object.entries(input.gear)){
  if(!['trinket1','trinket2'].includes(slot)||!item||!Number.isInteger(item.id)||item.id<1||item.id>2147483647||typeof item.label!=='string'||item.label.length>80||Object.keys(item).some(k=>!['id','label'].includes(k)))throw new Error('Invalid replacement trinket.');
  result.gear[slot]={id:item.id,label:item.label};
 }
 if(result.enabled&&classId==='hunter'&&classOptions.pet!=='None')throw new Error('Petless Feign Death Trinket Swap requires Pet: None.');
 return result;
}
export function postSwapBuild(build){return {...build,gear:{...build.gear,...build.trinketSwap?.gear}};}
export function trinketSwapEngineErrors(build,engine){
 const swap=build.trinketSwap;if(!swap?.enabled)return [];
 const errors=[],mode=TRINKET_SWAP_MODES[build.classId];
 if(!Object.keys(swap.gear).length)errors.push('Choose at least one replacement trinket.');
 if(swap.atSeconds>=build.planning.duration)errors.push('Trinket swap must occur before the fight ends.');
 if(!engine?.supportedTrinketSwapModes?.includes(mode.id))errors.push(`${mode.label} is not implemented by the combat engine.`);
 return errors;
}
