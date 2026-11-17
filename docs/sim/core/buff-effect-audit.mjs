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
 'juju-might':{stats:{ap:40},sources:['https://octowow.st/db/?spell=16329'],duration:600,assumption:'Selected active aura; does not imply availability of the item in the imported catalogue.'},
 'juju-power':{stats:{str:30},sources:['https://octowow.st/db/?item=12451','https://octowow.st/db/?spell=16323'],duration:1800,assumption:'Selected active aura.'},
 'wizard-oil-mh':{stats:{damageOnlySp:36,spellCrit:1},sources:['https://octowow.st/db/?item=20749'],duration:1800,assumption:'Weapon coating, requires level 45 and a compatible weapon.',recipientLevel:45},
 'wizard-oil-oh':{stats:{damageOnlySp:36,spellCrit:1},sources:['https://octowow.st/db/?item=20749'],duration:1800,assumption:'Weapon coating, requires level 45 and a compatible weapon; two-coating stacking not live-tested.',recipientLevel:45},
 'arthas':{stats:{targetPhysicalFlatDamage:8},sources:['https://octowow.st/db/?spell=11374'],duration:180,assumption:'Target disease assumed active, not caster avoidance or proc uptime.'},
 'annihilator':{stats:{targetArmour:-600},sources:['https://octowow.st/db/?item=12798','https://octowow.st/db/?spell=16928'],duration:45,assumption:'Three active stacks of 200; no proc uptime assumed.'},
 'nightfall':{stats:{targetSpellDamageTakenPct:15},sources:['https://octowow.st/db/?item=19169'],duration:5,assumption:'Active five-second target vulnerability, not a sustained DPS multiplier.'},
 'trueshot':{stats:{ap:100,rangedAP:100},sources:['https://octowow.st/db/?spell=20906','https://octowow.st/forum/viewtopic.php?p=13059'],duration:1800,conflict:true,assumption:'Database rank 3 flat melee and ranged AP selected for this estimate. Community patch listing describes +55 AP and +5% AP instead; live rules unresolved.'},
 'fortitude':{stats:{sta:54},sources:['https://octowow.st/db/?spell=21564'],duration:3600,assumption:'Prayer rank 2, unmodified provider.'},
 'arcane-intellect':{stats:{int:31},sources:['https://octowow.st/db/?spell=10157'],duration:1800,assumption:'Rank 5, unmodified provider.'},
 'curse-elements':{stats:{targetFireRes:-75,targetFrostRes:-75,targetFireDamageTakenPct:10,targetFrostDamageTakenPct:10},sources:['https://octowow.st/db/?spell=11722'],duration:300,assumption:'Rank 3. Multiple selected curses require separate Warlock providers.'},
 'fengus':{stats:{ap:200},sources:['https://octowow.st/db/?spell=22817'],duration:7200,assumption:'Selected world aura.'},
 'slipkik':{stats:{spellCrit:3},sources:['https://octowow.st/db/?spell=22820'],duration:7200,assumption:'Selected world aura.'},
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
const eventSources={
 flurry:{source:'https://octowow.st/db/?item=12450',durationSeconds:20,eventModifiers:{meleeHastePct:3},reason:'Tooltip gives 3% attack speed for 20 seconds; cooldown/uptime unresolved.'},
 quickness:{source:'https://octowow.st/db/?item=61181',durationSeconds:30,eventModifiers:{hastePct:5},reason:'Imported tooltip gives 5% haste for 30 seconds; cooldown/uptime unresolved.'}
};
const events=new Set(['windfury','flametongue','mark-death','chili','tea','flurry','quickness']);
export function buffDefinition(id){
 const item=sourceItems.get(id),base={id,name:item?.name||id,stats:{},source:item?.source||null,durationSeconds:item?.effectAudit?.durationSeconds??null};
 if(events.has(id))return {...base,status:'event',...(eventSources[id]||{}),reason:eventSources[id]?.reason||(item?'Imported source tooltip; timed/triggered effect requires combat simulation.':'Reference effect; timing and server behaviour unresolved.')};
 if(item){
  const a=item.effectAudit;
  return {...base,status:a.status==='prepull'?'source-prepull':'unresolved',stats:a.status==='prepull'?{...a.stats}:{},reason:a.status==='prepull'?'Imported OctoWoW tooltip; assumed active before pull, stacking and uptime unverified.':'Imported tooltip requires further review: '+a.reason};
 }
 if(spellSources[id]){const f=spellSources[id];return {...base,status:f.conflict?'source-conflict':'source-spell',stats:{...f.stats},recipientLevel:f.recipientLevel,sources:f.sources,source:f.sources[0],durationSeconds:f.duration,reason:'Published tooltip values; '+f.assumption+' Assumes active encounter state, not verified uptime.'};}
 if(scoped[id])return {...base,status:'reference-scoped',stats:{...scoped[id]},reason:'Combat Gum reference value; server behaviour not independently verified.'};
 if(BUFF_STATS[id]&&Object.keys(BUFF_STATS[id]).length)return {...base,status:'reference-static',stats:{...BUFF_STATS[id]},reason:'Combat Gum reference value; spell rank, source and stacking need server confirmation.'};
 return {...base,status:'unmapped',reason:'No numerical effect mapped.'};
}
export function resolveBuffEffects(build,gear={}){
 const controls=resolveConsumableSelection({...build.controls,buffIds:normaliseBuffs(build.controls.buffIds||[])},'buffs');
 const entries=controls.buffIds.map(id=>{
  const e=buffDefinition(id);let active=['source-prepull','source-spell','source-conflict','reference-static','reference-scoped'].includes(e.status);
  if(e.recipientLevel&&build.level<e.recipientLevel)return {...e,active:false,reason:'Requires level '+e.recipientLevel+'.'};
  const item=sourceItems.get(id);if(item&&consumableRestriction(item,build))return {...e,active:false,reason:consumableRestriction(item,build)};
  if(id.startsWith('wizard-oil-')){
   const off=id.endsWith('-oh'),slot=off?'offhand':'mainhand',weapon=gear[slot],option=off?'ohPoison':'mhPoison';
   if(!weapon||weapon.classs!==2)return {...e,active:false,reason:'Requires an actual equipped weapon in the selected hand.'};
   if(build.classId==='rogue'&&build.classOptions?.[option]&&build.classOptions[option]!=='None'||build.classId==='shaman'&&!off&&build.classOptions?.mhImbue&&build.classOptions.mhImbue!=='None')return {...e,active:false,reason:'Conflicts with selected weapon coating/imbue.'};
  }
  return {...e,active};
 });
 const consumables=controls.consumableIds.map(id=>{const i=CONSUMABLE_BY_ID.get(id);const reason=consumableRestriction(i,build);return {id,name:i?.name||String(id),...(i?.effectAudit||{status:'unverified',stats:{}}),...(reason?{status:'ineligible',stats:{},modifiers:[],reason}:{})};});
 return {ids:controls.buffIds,entries,consumables};
}
