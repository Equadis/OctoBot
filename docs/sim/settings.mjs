import {BOSS_PRESETS,applyTarget,targetName} from './core/targets.mjs';
const $=id=>document.getElementById(id);
const NUMERIC_FIELDS=Object.freeze({'fight-duration':'duration','fight-iterations':'iterations','fight-variation':'durationVariation','target-level':'targetLevel','target-armour':'targetArmour','target-nature-res':'targetNatureRes','target-fire-res':'targetFireRes','target-frost-res':'targetFrostRes','target-shadow-res':'targetShadowRes','target-arcane-res':'targetArcaneRes'});
export function settings({getBuild,onChange,onError}){
 const dropdown=$('boss-preset'), pending=new Map();
 for(const preset of BOSS_PRESETS){
  const option=document.createElement('option');option.value=preset.id;
  option.textContent=`${preset.name} (${preset.armour} armor)${preset.energyPerSecond?` (+${preset.energyPerSecond} energy/sec)`:''}`;dropdown.append(option);
 }
 function commit(planning){for(const timer of pending.values())clearTimeout(timer);pending.clear();try{onChange(planning);render();}catch(error){onError(error);render();}}
 function changeNumeric(id,key,strict){
  const planning={...getBuild().planning,[key]:Number($(id).value)};
  if(key.startsWith('target')){planning.targetPreset='custom';planning.targetEnergyPerSecond=0;}
  try{onChange(planning);render();}catch(error){if(strict){onError(error);render();}}
 }
 for(const [id,key] of Object.entries(NUMERIC_FIELDS)){
  $(id).addEventListener('change',()=>{clearTimeout(pending.get(id));pending.delete(id);changeNumeric(id,key,true);});
  $(id).addEventListener('input',()=>{clearTimeout(pending.get(id));pending.set(id,setTimeout(()=>{pending.delete(id);changeNumeric(id,key,false);},250));});
 }
 $('fight-vary').addEventListener('change',()=>commit({...getBuild().planning,durationVary:$('fight-vary').checked}));
 dropdown.addEventListener('change',()=>{if(dropdown.value)commit(applyTarget(getBuild().planning,dropdown.value));});
 for(const id of ['expert-dummy','heroic-dummy'])$(id).addEventListener('click',()=>commit(applyTarget(getBuild().planning,id)));
 function render(){
  const planning=getBuild().planning;
  for(const [id,key] of Object.entries(NUMERIC_FIELDS))$(id).value=planning[key];
  $('fight-vary').checked=planning.durationVary;$('fight-variation').disabled=!planning.durationVary;
  $('target-name').textContent=targetName(planning.targetPreset);
  dropdown.value=BOSS_PRESETS.some(p=>p.id===planning.targetPreset)?planning.targetPreset:'';
  for(const id of ['expert-dummy','heroic-dummy']){const selected=planning.targetPreset===id;$(id).classList.toggle('selected',selected);$(id).setAttribute('aria-pressed',String(selected));}
 }
 return {render};
}
