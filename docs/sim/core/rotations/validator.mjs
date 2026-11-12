import {CLASS_OPTIONS} from '../class-options.mjs?v=20261112-rotations1';
import {TALENT_REFERENCES} from './talent-references.mjs?v=20261112-rotations1';
import {rotationProfileData,abilityKey,COMMON_METRICS} from './registry.mjs?v=20261112-rotations1';
import {CONDITION_DEFINITIONS,CONDITION_OPERATORS} from './conditions.mjs?v=20261112-rotations1';
export function metricsForClass(classId){const p=rotationProfileData(classId);const predicted=p.resources.filter(r=>['rage','energy','mana'].includes(r)).map(r=>'predicted'+r[0].toUpperCase()+r.slice(1));return Object.fromEntries([...p.resources,...predicted,...COMMON_METRICS.filter(key=>!(['petAlive','petEngaged','petInRange','petHealthSafe'].includes(key)&&!['hunter','warlock'].includes(classId))&&!(key==='stanceIs'&&classId!=='warrior')&&!(key==='formIs'&&!['druid','priest'].includes(classId))&&!(key==='safePowershift'&&classId!=='druid'))].map(key=>[key,CONDITION_DEFINITIONS[key].label]));}
export function validateRows(rows,classId='warrior'){
 const profile=rotationProfileData(classId),metrics=metricsForClass(classId);
 if(!Array.isArray(rows)||rows.length>30)throw new Error('A rotation can contain at most 30 abilities.');
 return rows.map(row=>{
  if(!row||!profile.abilities.includes(row.ability)||!Array.isArray(row.conditions)||row.conditions.length>6)throw new Error('Invalid rotation ability or conditions.');
  const id=abilityKey(classId,row.ability);if(row.abilityId!==undefined&&row.abilityId!==id)throw new Error('Rotation ability ID does not match this class and ability.');
  if(row.target!==undefined&&!['primary','cycle','ally','self','pet'].includes(row.target))throw new Error('Invalid rotation target.');
  return {ability:row.ability,...(row.abilityId!==undefined?{abilityId:id}:{}),...(row.target!==undefined?{target:row.target}:{}),conditions:row.conditions.map(c=>{
   if(!c||!Object.hasOwn(metrics,c.metric)||!CONDITION_OPERATORS.includes(c.operator)||!Number.isFinite(c.value)||c.value<0||c.value>10000||typeof c.aura!=='string'||c.aura.length>80)throw new Error('Invalid rotation condition.');
   const def=CONDITION_DEFINITIONS[c.metric];if(def.subject&&c.metric!=='auraDuration'&&!c.aura.trim())throw new Error(`Choose the ${def.subject} for ${def.label}.`);
   if(def.kind==='boolean'&&(c.operator!=='='||![0,1].includes(c.value)))throw new Error('Boolean conditions must equal 0 or 1.');
   if(def.subject==='ability'&&!profile.abilityRegistry[abilityKey(classId,c.aura)])throw new Error('The condition references an unknown class ability.');
   if(def.subject==='talent'&&!TALENT_REFERENCES[classId].some(t=>t.name.replaceAll('’',"'")===c.aura.replaceAll('’',"'")))throw new Error('Unknown class talent condition.');
   if(c.metric==='classOption'){const at=c.aura.indexOf('='),option=CLASS_OPTIONS[classId].find(o=>o.key===c.aura.slice(0,at)),value=c.aura.slice(at+1);if(at<1||!option||(option.values?!option.values.includes(value):!Number.isFinite(Number(value))||Number(value)<option.min||Number(value)>option.max))throw new Error('Unknown class option condition.');}
   return {metric:c.metric,operator:c.operator,value:c.value,aura:c.aura};
  })};
 });
}
export function presetCompatibility(preset,build,{talents=null,lookup=()=>null,knownAbilityIds=null,verifiedSetBonuses=[],role=preset.role}={}){
 const missing=[],unresolved=[...(preset.requirements?.unresolved||[]),...(preset.requirements?.position?[`Requires ${preset.requirements.position}-target positional access.`]:[])],requirements=preset.requirements||{};
 if(preset.classId!==build.classId)missing.push('Different character class.');
 if(role!==preset.role&&preset.id!=='custom')missing.push(`Requires ${preset.role} mode.`);
 const mh=build.gear.mainhand?lookup(build.gear.mainhand.id):null,oh=build.gear.offhand?lookup(build.gear.offhand.id):null,ranged=build.gear.ranged?lookup(build.gear.ranged.id):null;
 const weapon=requirements.weapon;
 if(weapon){const ok=weapon==='two-hand'?mh?.slot===17:weapon==='dual-wield'?mh?.classs===2&&mh.slot!==17&&oh?.classs===2&&oh.slot!==17:weapon==='shield'?oh?.classs===4&&oh?.subclass===6:weapon==='dagger'?mh?.subclass===15:weapon==='ranged'?ranged?.classs===2&&[2,3,18].includes(ranged.subclass):weapon==='melee'?mh?.classs===2: false;if(!ok)missing.push(`Requires ${weapon} equipment.`);}
 if(requirements.minLevel&&build.level<requirements.minLevel)missing.push(`Requires level ${requirements.minLevel}.`);
 for(const field of ['form','stance'])if(requirements[field]&&build.classOptions[field]!==requirements[field])missing.push(`Requires ${requirements[field]} ${field}.`);
 if(requirements.pet&&(build.classOptions.pet==='None'||!build.classOptions.pet||requirements.pet!=='active'&&build.classOptions.pet!==requirements.pet))missing.push(`Requires ${requirements.pet==='active'?'an active pet':requirements.pet}.`);
 for(const [key,value] of Object.entries(requirements.options||{}))if(build.classOptions[key]!==value)missing.push(`Requires ${key}: ${value}.`);
 for(const req of requirements.talents||[]){const name=typeof req==='string'?req:req.name,rank=typeof req==='string'?1:req.rank;const talent=(talents?.talents||TALENT_REFERENCES[build.classId]).find(t=>t.name.replaceAll('’',"'")===name.replaceAll('’',"'"));if(!talent){unresolved.push(`Talent metadata unresolved: ${name}.`);missing.push(`Requires an unavailable or unverified talent: ${name}.`);}else if((build.talents[talent.id]||0)<rank)missing.push(`Requires ${name} (${rank}+ points).`);}
 if(requirements.setBonus&&!verifiedSetBonuses.includes(requirements.setBonus)){missing.push(`Requires a verified equipped ${requirements.setBonus} bonus.`);unresolved.push(`Verify equipped set bonus: ${requirements.setBonus}.`);}
 const abilityFacts=rotationProfileData(build.classId).abilityRegistry;
 for(const row of preset.rows){const id=abilityKey(build.classId,row.ability),ability=abilityFacts[id];if(ability?.minLevel&&build.level<ability.minLevel)missing.push(`${row.ability} requires level ${ability.minLevel}.`);if(knownAbilityIds&&!knownAbilityIds.includes(id))missing.push(`Ability not learned: ${row.ability}.`);if(!ability?.spellIds?.length&&ability?.verification!=='requires-adapter')missing.push(`Published player ability identity unresolved: ${row.ability}.`);if(!ability?.rankAvailabilityVerified&&ability?.verification!=='requires-adapter')unresolved.push(`Learned rank availability unresolved: ${row.ability}.`);}
 return {compatible:missing.length===0,missing:[...new Set(missing)],unresolved:[...new Set(unresolved)],simulationAvailable:false};
}
