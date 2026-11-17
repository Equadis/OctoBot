import {BUFF_STATS,normaliseBuffs} from './buffs.mjs?v=20261117-buff-audit1';
import {CONSUMABLES,CONSUMABLE_BY_ID,consumableRestriction,resolveConsumableSelection} from './consumables.mjs?v=20261117-buff-audit1';
// Match source items by exact IDs through audited aliases. Missing items and
// static raid assumptions remain reference values, never called source-verified.
const sourceItems=new Map(CONSUMABLES.filter(i=>i.buffId&&i.verified).map(i=>[i.buffId,i]));
const scoped={
 kings:{allStatsPct:10},nightfall:{targetSpellDamageTakenPct:10},arthas:{targetPhysicalFlatDamage:8},hemorrhage:{targetPhysicalDamageTakenPct:4}
};
const events=new Set(['windfury','flametongue','mark-death','chili','tea','flurry','quickness']);
export function buffDefinition(id){
 const item=sourceItems.get(id),base={id,name:item?.name||id,stats:{},source:item?.source||null,durationSeconds:item?.effectAudit?.durationSeconds??null};
 if(events.has(id))return {...base,status:'event',reason:item?'Imported source tooltip; timed/triggered effect requires combat simulation.':'Reference effect; timing and server behaviour unresolved.'};
 if(item){
  const a=item.effectAudit;
  return {...base,status:a.status==='prepull'?'source-prepull':'unresolved',stats:a.status==='prepull'?{...a.stats}:{},reason:a.status==='prepull'?'Imported OctoWoW tooltip; assumed active before pull, stacking and uptime unverified.':'Imported tooltip requires further review: '+a.reason};
 }
 if(scoped[id])return {...base,status:'reference-scoped',stats:{...scoped[id]},reason:'Combat Gum reference value; server behaviour not independently verified.'};
 if(BUFF_STATS[id]&&Object.keys(BUFF_STATS[id]).length)return {...base,status:'reference-static',stats:{...BUFF_STATS[id]},reason:'Combat Gum reference value; spell rank, source and stacking need server confirmation.'};
 return {...base,status:'unmapped',reason:'No numerical effect mapped.'};
}
export function resolveBuffEffects(build,gear={}){
 const controls=resolveConsumableSelection({...build.controls,buffIds:normaliseBuffs(build.controls.buffIds||[])},'buffs');
 const entries=controls.buffIds.map(id=>{
  const e=buffDefinition(id);let active=['source-prepull','reference-static','reference-scoped'].includes(e.status);
  const item=sourceItems.get(id);if(item&&consumableRestriction(item,build))return {...e,active:false,reason:consumableRestriction(item,build)};
  if(id.startsWith('wizard-oil-')){
   const off=id.endsWith('-oh'),slot=off?'offhand':'mainhand',weapon=gear[slot],option=off?'ohPoison':'mhPoison';
   if(!weapon||weapon.classs!==2)return {...e,active:false,reason:'Requires an actual equipped weapon in the selected hand.'};
   if(build.classId==='rogue'&&build.classOptions?.[option]&&build.classOptions[option]!=='None'||build.classId==='shaman'&&!off&&build.classOptions?.mhImbue&&build.classOptions.mhImbue!=='None')return {...e,active:false,reason:'Conflicts with selected weapon coating/imbue.'};
  }
  return {...e,active};
 });
 const consumables=controls.consumableIds.map(id=>{const i=CONSUMABLE_BY_ID.get(id);const reason=consumableRestriction(i,build);return {id,name:i?.name||String(id),...(i?.effectAudit||{status:'unverified',stats:{}}),...(reason?{status:'ineligible',stats:{},reason}:{})};});
 return {ids:controls.buffIds,entries,consumables};
}
