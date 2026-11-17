import {BUFF_STATS,normaliseBuffs} from './buffs.mjs?v=20261117-buff-audit1';
import {CONSUMABLES,CONSUMABLE_BY_ID,consumableRestriction,resolveConsumableSelection} from './consumables.mjs?v=20261117-buff-audit1';
// Match source items by exact IDs through audited aliases. Missing items and
// static raid assumptions remain reference values, never called source-verified.
const sourceItems=new Map(CONSUMABLES.filter(i=>i.buffId&&i.verified).map(i=>[i.buffId,i]));
const scoped={
 kings:{allStatsPct:10},nightfall:{targetSpellDamageTakenPct:10},arthas:{targetPhysicalFlatDamage:8},hemorrhage:{targetPhysicalDamageTakenPct:4}
};
// Spell tooltips checked against the public OctoWoW DB, 2026-11-17.
const spellSources={
 'battle-shout':{stats:{ap:232},sources:['https://octowow.st/db/?spell=25289'],duration:120,assumption:'Rank 7, no caster talent improvement.'},
 might:{stats:{ap:222},sources:['https://octowow.st/db/?spell=25291','https://octowow.st/db/?spell=20048'],duration:300,assumption:'Rank 7 base 185; assumed 20% improved by provider.'},
 kings:{stats:{allStatsPct:10},sources:['https://octowow.st/db/?spell=20217'],duration:300,assumption:'Assumes supplied by a separate paladin if Might is also selected.'},
 wild:{stats:{str:12,agi:12,sta:12,int:12,spi:12,armour:285,arcaneRes:20,fireRes:20,natureRes:20,frostRes:20,shadowRes:20},sources:['https://octowow.st/db/?spell=21850'],duration:3600,assumption:'Gift rank 2; no assumed caster talent. Resistance exclusivity beyond current choices remains unverified.'},
 air:{stats:{agi:96},sources:['https://octowow.st/db/?spell=25359','docs/sim/data/talents/shaman.json#262'],duration:120,assumption:'Rank 3 base 77, assumed 25% Enhancing Totems, floor to 96; rounding not live-verified.'},
 sunder:{stats:{targetArmour:-2250},sources:['https://octowow.st/db/?spell=11597'],duration:30,assumption:'Rank 5, five stacks of 450.'},
 expose:{stats:{targetArmour:-2550},sources:['https://octowow.st/db/?spell=11198','docs/sim/data/talents/rogue.json#147'],duration:30,assumption:'Rank 5, five combo points 1700, assumed +50% improved by provider.'},
 recklessness:{stats:{targetArmour:-640,targetAttackPower:90},sources:['https://octowow.st/db/?spell=11717'],duration:120,assumption:'Rank 4; target AP increase is not player AP.'},
 faerie:{stats:{targetArmour:-505},sources:['https://octowow.st/db/?spell=17392'],duration:40,assumption:'Feral rank 4.'}
};
const events=new Set(['windfury','flametongue','mark-death','chili','tea','flurry','quickness']);
export function buffDefinition(id){
 const item=sourceItems.get(id),base={id,name:item?.name||id,stats:{},source:item?.source||null,durationSeconds:item?.effectAudit?.durationSeconds??null};
 if(events.has(id))return {...base,status:'event',reason:item?'Imported source tooltip; timed/triggered effect requires combat simulation.':'Reference effect; timing and server behaviour unresolved.'};
 if(item){
  const a=item.effectAudit;
  return {...base,status:a.status==='prepull'?'source-prepull':'unresolved',stats:a.status==='prepull'?{...a.stats}:{},reason:a.status==='prepull'?'Imported OctoWoW tooltip; assumed active before pull, stacking and uptime unverified.':'Imported tooltip requires further review: '+a.reason};
 }
 if(spellSources[id]){const f=spellSources[id];return {...base,status:'source-spell',stats:{...f.stats},sources:f.sources,source:f.sources[0],durationSeconds:f.duration,reason:'Published tooltip values; '+f.assumption+' Assumes active encounter state, not verified uptime.'};}
 if(scoped[id])return {...base,status:'reference-scoped',stats:{...scoped[id]},reason:'Combat Gum reference value; server behaviour not independently verified.'};
 if(BUFF_STATS[id]&&Object.keys(BUFF_STATS[id]).length)return {...base,status:'reference-static',stats:{...BUFF_STATS[id]},reason:'Combat Gum reference value; spell rank, source and stacking need server confirmation.'};
 return {...base,status:'unmapped',reason:'No numerical effect mapped.'};
}
export function resolveBuffEffects(build,gear={}){
 const controls=resolveConsumableSelection({...build.controls,buffIds:normaliseBuffs(build.controls.buffIds||[])},'buffs');
 const entries=controls.buffIds.map(id=>{
  const e=buffDefinition(id);let active=['source-prepull','source-spell','reference-static','reference-scoped'].includes(e.status);
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
