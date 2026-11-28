// Evidence-driven audit of all 27 talent trees (476 talents).
//
// Nothing here guesses. Each talent is probed at every rank through the same code the planner and the combat
// adapter use, and every claim in the report is something this script observed:
//   - sheet/snapshot channel: characterStats().combatSnapshot and sheet rows change with the allocation
//   - pet channel: petAudit / petContext change
//   - ability-model channel: calculateAbilityTalentEffects() values change for at least one ability profile
//   - combat hook: the combat modules read the talent by numeric ID (static source scan)
//   - tests: an existing test file names the talent or its ID (static source scan)
// The ability-model channel reaches combat through compileReferenceRank, so it counts as combat input only for
// abilities that have a compiled reference rank.
//
// Usage: node tools/sim/audit-talents.mjs --json out.json --md out.md
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {getTalentAudit} from '../../docs/sim/core/talent-audits.mjs';
import {newBuild} from '../../docs/sim/core/builds.mjs';
import {characterStats} from '../../docs/sim/core/character-stats.mjs';
import {abilityProfiles,calculateAbilityTalentEffects,ABILITY_STAT_ALIASES} from '../../docs/sim/core/talent-calculations.mjs';
import {REFERENCE_RANKS} from '../../docs/sim/core/combat-reference-ranks.mjs';
import {abilityKey} from '../../docs/sim/core/rotations/registry.mjs';
import {validateTalents} from '../../docs/sim/core/talents.mjs';
import {CLASS_OPTIONS} from '../../docs/sim/core/class-options.mjs';
import {verifyTalentInCombat} from './combat-verification.mjs';
import {classifyFinding,INTEGRATION_FIXES} from './talent-findings.mjs';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..','..');
export const CLASSES=['warrior','paladin','hunter','rogue','priest','shaman','mage','warlock','druid'];
// Stats read by calculateAbilityTalentEffects (and its aliases). Anything else is recorded but never computed there.
export const ABILITY_STATS_READ=new Set(['resistReductionPct','rangeIncreaseYards','rangeIncreasePct','threatPct','threatReductionPct','hastePct','absorbPct','damagePct','damageAndHealingPct','healingPct','periodicHealingPct','manaCostReductionPct','castSpeedPct','criticalDamagePct','castTimeReductionSeconds','cooldownReductionSeconds','cooldownReductionMinutes','hit','crit','rageCostReduction','rageEnergyCostReduction','energyCostReduction','cooldownReductionPct','globalCooldownReductionSeconds','durationIncreaseSeconds','durationPct','criticalChance','spellCostReductionPct','manaGainPct']);
const statRead=stat=>ABILITY_STATS_READ.has(stat)||ABILITY_STATS_READ.has(ABILITY_STAT_ALIASES[stat]);
// Talents whose combat behaviour is verified by a deterministic simulation test in this repository.
// Each entry names the test that proves it. Add to this list only together with such a test.
export const VERIFIED_COMBAT_HOOKS={
 '222':'tests/sim/talent-hook-verification.test.mjs (Elemental Devastation: owner landed melee crit grants the published spell hit per rank for 10 s, then expires; other events do nothing)',
 '381':'tests/sim/talent-hook-verification.test.mjs (Unleashed Fury: pet damage multiplier at every rank equals the published percentage)',
 '382':'tests/sim/talent-hook-verification.test.mjs (Bestial Discipline: pet focus per tick and special cooldown at every rank equal the published values)',
 '384':'tests/sim/talent-hook-verification.test.mjs (Ferocity: pet critical chance on eligible normal hits at every rank equals the published percentage)',
 '389':'tests/sim/talent-hook-verification.test.mjs (Spirit Bond: pet attack power and spell power from owner ranged attack power at every rank equal the published percentages)',
 '101':'tests/sim/combat-talent-triggers.test.mjs (Enrage: a landed critical hit against the owner applies the published melee damage bonus per rank for 8 s, refreshes, and expires; the class runtime calls the trigger)',
 '454':'tests/sim/talent-hook-verification.test.mjs (Illumination: compiled critical-heal mana refund at every rank equals the published percentage of the spell mana cost)',
 '245':'tests/sim/talent-hook-verification.test.mjs (Improved Water Shield: mana every 5 s and regeneration bonus per charge at every rank equal the published values, with the shield active only)',
 '248':'tests/sim/talent-hook-verification.test.mjs (Undertow: Healing Wave and Lesser Healing Wave restore a charge with the published chance, or consume one at maximum charges)',
 '255':'tests/sim/talent-hook-verification.test.mjs (Stable Shields: charges and cooldown between activations at every rank for every shield)',
 '276':'tests/sim/combat-talent-triggers.test.mjs (Primal Fury: Bear Form melee crit Rage chance via the trigger framework and Cat Form combo point chance in the compiled Claw and Rake, at every rank)',
 '280':'tests/sim/combat-talent-triggers.test.mjs (Ancient Brutality: Bear Form dodge Rage per second for 5 s with a 9 s internal cooldown via the trigger framework, and Cat bleed tick Energy in the compiled Rake and Rip, at every rank)',
 '308':'tests/sim/talent-hook-verification.test.mjs (Natural Shapeshifter: Powershift mana cost reduction at every rank; Powershift is the only shapeshift the engine casts)',
 '272':'tests/sim/talent-hook-verification.test.mjs (Open Wounds: compiled Rip damage multiplier and Claw per-owned-bleed bonus at every rank equal the published percentages)',
 '462':'tests/sim/talent-hook-verification.test.mjs (Redoubt: hit-triggered block chance, bonus, 10 s duration and 5 block charges at every rank equal the published values)',
 '468':'tests/sim/talent-hook-verification.test.mjs (Shield Specialization: block value factor, mana-on-block chance, 2% maximum mana and 5 s internal cooldown at every rank equal the published values)',
 '474':'tests/sim/talent-hook-verification.test.mjs (Reckoning: extra attack chance after a block at every rank equals the published percentage; only blocks trigger it)',
 '30':'tests/sim/talent-hook-verification.test.mjs (Shatter: compiled non-physical damage gains the published frozen-target critical chance at every rank)'
};
// Gear and form variants. Weapon, shield and form talents only act when the matching equipment or form is present,
// so each talent is probed against every variant and compared with that variant's own baseline.
const weapon=subclass=>({id:1,classs:2,subclass,speed:2,attributes:{},tooltipText:'10 - 20 Damage\nSpeed 2.00'});
const shield={id:2,classs:4,subclass:6,attributes:{},tooltipText:''};
export const VARIANTS=[
 {name:'naked',gear:{}},
 {name:'one-handed sword',gear:{mainhand:weapon(7)}},
 {name:'two-handed sword',gear:{mainhand:weapon(8)}},
 {name:'one-handed axe',gear:{mainhand:weapon(0)}},
 {name:'two-handed axe',gear:{mainhand:weapon(1)}},
 {name:'mace',gear:{mainhand:weapon(4)}},
 {name:'dagger',gear:{mainhand:weapon(15)}},
 {name:'fist weapon',gear:{mainhand:weapon(13)}},
 {name:'polearm',gear:{mainhand:weapon(6)}},
 {name:'dual wield axe and sword',gear:{mainhand:weapon(0),offhand:weapon(7)}},
 {name:'sword and shield',gear:{mainhand:weapon(7),offhand:shield}}
];
// Class-option variants are generated from CLASS_OPTIONS so no stance, seal, aura, aspect, form, armour, imbue, curse or
// scenario toggle gated on a planner option is missed. Each non-default choice is probed on its own; counts use their maximum.
const COUNT_OPTIONS=new Set(['activeBleeds','afflictionEffects','comboPoints','soulShards']);
export function variantsFor(classId){
 const out=VARIANTS.map(v=>({...v}));
 for(const o of CLASS_OPTIONS[classId]){
  if(o.values){
   const values=['pet'].includes(o.key)?o.values.filter(x=>x!=='None').slice(0,1):o.values.slice(1);
   for(const value of values)out.push({name:`option ${o.key}=${value}`,gear:{},classOptions:{[o.key]:value}});
  }else if(COUNT_OPTIONS.has(o.key)&&o.max>o.value)out.push({name:`option ${o.key}=${o.max}`,gear:{},classOptions:{[o.key]:o.max}});
 }
 return out;
}
const SAMPLE={damage:1000,healing:1000,manaCost:200,energyCost:40,rageCost:15,castSeconds:3,cooldownSeconds:60,gcdSeconds:1.5,durationSeconds:12,rangeYards:30,threat:100,attackInterval:2,critPct:10,missPct:8,resistPct:10,criticalBonus:50,absorb:100};
const round=v=>typeof v==='number'?Math.round(v*1e6)/1e6:v;

function flatten(value,prefix='',out={}){
 if(Array.isArray(value)){value.forEach((v,i)=>flatten(v,`${prefix}[${i}]`,out));return out;}
 if(value&&typeof value==='object'){for(const k of Object.keys(value))flatten(value[k],prefix?`${prefix}.${k}`:k,out);return out;}
 if(typeof value==='number'||typeof value==='string'||typeof value==='boolean')out[prefix]=round(value);
 return out;
}
function changedPaths(base,next){
 const paths=[];
 for(const k of new Set([...Object.keys(base),...Object.keys(next)]))if(base[k]!==next[k])paths.push(k);
 return paths.sort();
}
const dataFor=c=>JSON.parse(readFileSync(join(ROOT,'docs/sim/data/talents',c+'.json'),'utf8'));
const sources=(dir,re)=>readdirSync(join(ROOT,dir)).filter(f=>re.test(f)).sort().map(f=>[dir+'/'+f,readFileSync(join(ROOT,dir,f),'utf8')]);

function scanHooks(id){
 const a=new RegExp(`talents\\??\\.?\\[\\s*['"\`]?${id}['"\`]?\\s*\\]`),b=new RegExp(`hunterRank\\(build,\\s*${id}\\b`);
 // A declarative spec in combat-talent-triggers.mjs names its talent as `talentId:<id>`.
 const c=new RegExp(`\\btalentId\\s*:\\s*${id}\\b`);
 return COMBAT_SOURCES.filter(([,text])=>a.test(text)||b.test(text)||c.test(text)).map(([f])=>f);
}
function scanTests(name,id){
 const quoted=[`'${name}'`,`"${name}"`,`\`${name}\``,name.replace(/'/g,'’')];
 const idRe=new RegExp(`(?:\\[\\s*['"]?${id}['"]?\\s*\\]|[{,]\\s*['"]?${id}['"]?\\s*:)`);
 return TEST_SOURCES.filter(([,text])=>quoted.some(q=>text.includes(q))||idRe.test(text)).map(([f])=>f);
}
let COMBAT_SOURCES=[],TEST_SOURCES=[];

function legalityChecks(d,t){
 const issues=[],notes=[];
 if(t.spellIds.length!==t.maxRanks)issues.push('spellIds length differs from maxRanks');
 for(const p of t.rankParameters||[])if(p.length!==t.maxRanks)issues.push('rankParameters length differs from maxRanks');
 if(t.descriptions.length!==t.maxRanks)issues.push('descriptions length differs from maxRanks');
 if(t.requires!==null){
  const parent=d.talents.find(x=>x.tree===t.tree&&x.position===t.requires);
  if(!parent)issues.push('prerequisite position does not exist in the tree');
  else if(t.requiresRanks>parent.maxRanks||t.requiresRanks<1)issues.push('prerequisite rank outside the parent range');
  else if(parent.row>=t.row)notes.push('prerequisite-in-same-or-higher-tier');
  // A prerequisite chain must end; a cycle would make the talent impossible to allocate.
  const seen=new Set([t.id]);let cur=parent;
  while(cur){if(seen.has(cur.id)){issues.push('prerequisite chain contains a cycle');break;}seen.add(cur.id);cur=cur.requires===null?null:d.talents.find(x=>x.tree===cur.tree&&x.position===cur.requires);}
 }
 return {issues,notes};
}

export function buildTalentAudit(){
 COMBAT_SOURCES=[...sources('docs/sim/core',/^combat-.*\.mjs$/),...sources('docs/sim/core',/^pet-audit\.mjs$/)];
 TEST_SOURCES=sources('tests/sim',/\.test\.mjs$/).filter(([f])=>!/talent-audit\.test\.mjs$/.test(f));
 const compiled={};for(const r of REFERENCE_RANKS)(compiled[r.classId]??=new Set()).add(r.abilityId);
 const rows=[],unknownHookIds=new Set();
 const allIds=new Set();
 for(const c of CLASSES){
  const d=dataFor(c),audit=getTalentAudit(c),profiles=abilityProfiles(c);
  for(const t of d.talents)allIds.add(String(t.id));
  const variants=variantsFor(c);
  const probe=(talents,v)=>{const b=newBuild(c);b.level=60;b.talents=talents;if(v.classOptions)b.classOptions={...b.classOptions,...v.classOptions};return characterStats(b,d,v.gear);};
  const snapOf=cs=>flatten(cs.combatSnapshot);
  const rowsOf=cs=>flatten(Object.fromEntries(cs.groups.map(g=>[g.name,Object.fromEntries(g.rows.map(x=>[x.label,x.value]))])));
  const petOf=cs=>flatten({a:cs.petAudit,b:cs.petContext});
  const bases=variants.map(v=>{const cs=probe({},v);return {snap:snapOf(cs),rows:rowsOf(cs),pet:petOf(cs)};});
  const base0=probe({},variants[0]);
  const baseValues=profiles.map(p=>flatten(calculateAbilityTalentEffects(base0.talentAudit,p,SAMPLE).values));
  const tags=new Set(profiles.flatMap(p=>p.tags));
  const tree=i=>d.trees[i].name;
  for(const t of d.talents){
   const id=String(t.id),cov=audit.coverage[id],rules=audit.rules[id];
   const snapPaths=new Set(),rowPaths=new Set(),petPaths=new Set(),abilityHits=new Map(),observedVariants=new Set();
   const magnitudes=variants.map(()=>[]),pathDeltas=variants.map(()=>[]);
   for(let r=1;r<=t.maxRanks;r++){
    variants.forEach((v,vi)=>{
     const cs=probe({[id]:r},v),snap=snapOf(cs),sheet=rowsOf(cs),pet=petOf(cs);
     const sp=changedPaths(bases[vi].snap,snap),rp=changedPaths(bases[vi].rows,sheet),pp=changedPaths(bases[vi].pet,pet);
     if(sp.length||rp.length||pp.length)observedVariants.add(v.name);
     sp.forEach(p=>snapPaths.add(p));rp.forEach(p=>rowPaths.add(p));pp.forEach(p=>petPaths.add(p));
     // Percent-of-stat talents are measured on the primary stat itself: derived values (mana, crit) round again.
     const used=sp.some(p=>p.startsWith('primary.'))?sp.filter(p=>p.startsWith('primary.')):sp;
     // A talent that only changes the companion (pet) is measured on the pet paths instead, against the same published parameter.
     const petOnly=!sp.length&&pp.length;
     const numeric=(from,to,paths)=>paths.filter(p=>typeof to[p]==='number'&&typeof from[p]==='number');
     if(petOnly){const np=numeric(bases[vi].pet,pet,pp);pathDeltas[vi].push(Object.fromEntries(np.map(p=>[p,Math.abs(pet[p]-bases[vi].pet[p])])));magnitudes[vi].push(np.reduce((n,p)=>n+Math.abs(pet[p]-bases[vi].pet[p]),0));}
     else{
     pathDeltas[vi].push(Object.fromEntries(used.filter(p=>typeof snap[p]==='number'&&typeof bases[vi].snap[p]==='number').map(p=>[p,Math.abs(snap[p]-bases[vi].snap[p])])));
     magnitudes[vi].push(used.reduce((n,p)=>n+(typeof snap[p]==='number'&&typeof bases[vi].snap[p]==='number'?Math.abs(snap[p]-bases[vi].snap[p]):0),0));}
     if(vi===0)profiles.forEach((p,i)=>{
      const ch=changedPaths(baseValues[i],flatten(calculateAbilityTalentEffects(cs.talentAudit,p,SAMPLE).values));
      if(ch.length){const e=abilityHits.get(p.name)??new Set();ch.forEach(x=>e.add(x));abilityHits.set(p.name,e);}
     });
    });
   }
   // Rank scaling: effect magnitude must grow in proportion to the published per-rank parameter.
   // Integer rounding of percent-of-stat talents is tolerated to within one unit and reported as such.
   let scaling='not-applicable';
   let bestVariant=0;magnitudes.forEach((m,i)=>{if((m[m.length-1]||0)>(magnitudes[bestVariant][magnitudes[bestVariant].length-1]||0))bestVariant=i;});
   const deltas=magnitudes[bestVariant];
   const param=(t.rankParameters||[])[0];
   if(deltas.some(x=>x!==0)){
    const monotonic=deltas.every((x,i)=>i===0||x>=deltas[i-1]-1e-9);
    const positive=param&&param.every(x=>typeof x==='number'&&x>0)&&deltas.every(x=>x>0);
    if(!monotonic)scaling='non-monotonic';
    else if((t.rankParameters||[]).length>1)scaling='multiple-published-parameters';
    else if(positive&&rules.length&&rules.every(r=>r.kind==='percent')&&(t.rankParameters||[]).length===1){
     // Percent-of-stat talent: each primary stat must equal floor(base * percent), within one unit of integer rounding.
     const paths=Object.keys(pathDeltas[bestVariant][t.maxRanks-1]);
     const exact=paths.every(p=>pathDeltas[bestVariant].every((o,i)=>Math.abs((o[p]||0)-bases[bestVariant].snap[p]*param[i]/100)<1e-6));
     const rounded=paths.every(p=>pathDeltas[bestVariant].every((o,i)=>Math.abs((o[p]||0)-bases[bestVariant].snap[p]*param[i]/100)<1+1e-9));
     scaling=exact?'proportional-to-published-parameter':rounded?'proportional-within-rounding':'differs-from-published-parameter';
    }else if(positive){
     const want=param.map(x=>x/param[0]);
     scaling=deltas.every((x,i)=>Math.abs(x/deltas[0]-want[i])<1e-6)?'proportional-to-published-parameter':deltas.every((x,i)=>Math.abs(x-deltas[0]*want[i])<=1+1e-9)?'proportional-within-rounding':'differs-from-published-parameter';
    }else scaling='changes-without-single-numeric-parameter';
   }
   const hookFiles=scanHooks(id);
   // A pending rule describes an event-driven mechanic; an unattached or never-computed rule is a stat the planner calculator ignores. Each counts as applied
   // only when VERIFIED_COMBAT_HOOKS names a deterministic combat test for this talent, and the test must cover every part of the description.
   const hookVerified=Boolean(VERIFIED_COMBAT_HOOKS[id])&&hookFiles.length>0;
   const ruleStates=rules.map(rule=>{
    const scopes=Array.isArray(rule.scope)?rule.scope:rule.scope?[rule.scope]:[];
    let state;
    if(rule.kind==='pending')state=hookVerified?'applied-combat-hook':'pending';
    else if(['scoped','spell'].includes(rule.kind)){
     const attaches=scopes.some(s=>tags.has(s));
     state=!attaches?'unattached-scope':!statRead(rule.stat)?'recorded-not-computed':'applied-ability-model';
    }else state=(snapPaths.size||rowPaths.size||petPaths.size)?'applied-sheet':'not-observed';
    // The planner's ability calculator may not read a stat that a combat module reads directly (e.g. shield charges). For talents
    // in VERIFIED_COMBAT_HOOKS the named test covers that module, so those rules count as applied too.
    if(hookVerified&&['unattached-scope','recorded-not-computed'].includes(state))state='applied-combat-hook';
    return {kind:rule.kind,stat:rule.stat??null,scope:scopes.length?scopes:null,note:rule.kind==='pending'?rule.note:undefined,state};
   });
   const findings=ruleStates.map((st,i)=>({st,rule:rules[i]})).filter(x=>['recorded-not-computed','unattached-scope'].includes(x.st.state)).map(x=>({stat:x.st.stat,scope:x.st.scope,state:x.st.state,...classifyFinding(c,t.id,x.rule)}));
   const testFiles=scanTests(t.name,id);
   const affected=[...abilityHits.entries()].map(([name,s])=>({ability:name,compiledRank:compiled[c]?.has(abilityKey(c,name))??false,changedValues:[...s].sort()})).sort((a,b)=>a.ability.localeCompare(b.ability));
   const compiledAffected=affected.filter(a=>a.compiledRank).map(a=>a.ability);
   const reachesCombat=snapPaths.size>0||compiledAffected.length>0||hookFiles.length>0;
   const applied=ruleStates.filter(s=>s.state.startsWith('applied')).length;
   const unapplied=ruleStates.length-applied;
   const flags=[];
   if(ruleStates.some(s=>s.state==='pending'))flags.push('pending-rule');
   if(ruleStates.some(s=>s.state==='unattached-scope'))flags.push('unattached-scope');
   if(ruleStates.some(s=>s.state==='recorded-not-computed'))flags.push('recorded-not-computed');
   if(ruleStates.some(s=>s.state==='not-observed'))flags.push('rule-effect-not-observed');
   if(cov.status==='sheet'&&!(snapPaths.size||rowPaths.size||petPaths.size))flags.push('claims-sheet-but-not-observed');
   if(cov.status==='proc-or-conditional')flags.push('conditional-not-modelled');
   if(applied>0&&!reachesCombat)flags.push(ruleStates.some(s=>s.state==='applied-sheet')?'sheet-only':'planner-estimate-only');
   if(!hookFiles.length)flags.push('no-combat-hook');
   if(scaling==='differs-from-published-parameter')flags.push('scaling-differs-from-parameter');
   if(scaling==='non-monotonic')flags.push('scaling-non-monotonic');
   if(t.spellIds.some(x=>x>=40000))flags.push('custom-id-range');
   const disputed=/conflict|disput|differs from|unverified source/i.test(cov.note+' '+ruleStates.map(s=>s.note||'').join(' '));
   if(disputed)flags.push('disputed-hint');
   const {issues,notes}=legalityChecks(d,t);
   issues.forEach(x=>flags.push('data-issue: '+x));notes.forEach(x=>flags.push(x));
   const cv=verifyTalentInCombat(c,t,audit);
   if(cv.status==='mismatch')flags.push('combat-result-differs-from-rule');
   findings.filter(f=>f.disposition==='unclassified').forEach(()=>flags.push('unclassified-finding'));
   let classification;
   if(applied===0&&!hookFiles.length)classification='missing';
   else if(applied===0)classification='implemented-unverified';
   else if(unapplied>0)classification='partial';
   else if(snapPaths.size>0&&cov.status==='sheet'&&['proportional-to-published-parameter','proportional-within-rounding'].includes(scaling))classification='verified-functioning';
   else if(snapPaths.size===0&&petPaths.size>0&&ruleStates.every(x=>x.state==='applied-sheet')&&['proportional-to-published-parameter','proportional-within-rounding'].includes(scaling))classification='verified-functioning';
   else classification='implemented-unverified';
   if(VERIFIED_COMBAT_HOOKS[id]&&unapplied===0&&hookFiles.length)classification='verified-functioning';
   // Compiled-combat comparison: every rule is applied and the compiled action changed by exactly the published amount at every rank.
   if(cv.status==='confirmed'&&unapplied===0&&applied>0)classification='verified-functioning';
   if(cv.status==='mismatch')classification='conflicting-or-disputed';
   rows.push({
    classId:c,tree:tree(t.tree),treeIndex:t.tree,id:t.id,name:t.name,spellIds:t.spellIds,maxRanks:t.maxRanks,
    tier:t.row,column:t.column,pointsRequiredInTree:t.row*5,
    prerequisite:t.requires===null?null:{position:t.requires,name:d.talents.find(x=>x.tree===t.tree&&x.position===t.requires)?.name??null,ranks:t.requiresRanks},
    plannerCoverage:{status:cov.status,note:cov.note},
    rules:ruleStates,
    observed:{snapshotPaths:[...snapPaths].sort(),sheetRows:[...rowPaths].sort(),petPaths:[...petPaths].sort(),affectedAbilities:affected,rankScaling:scaling,variants:[...observedVariants]},
    combatHookFiles:hookFiles,existingTestFiles:testFiles,
    verifiedCombatTest:VERIFIED_COMBAT_HOOKS[id]??null,
    combatVerification:{status:cv.status,reason:cv.reason??null,fieldsChecked:cv.statsChecked,abilitiesChecked:[...new Set(cv.abilities.filter(a=>a.checks).map(a=>a.ability))]},
    findings,
    reachesCombatInput:reachesCombat,
    classification,disputedHint:disputed,flags
   });
  }
 }
 for(const [,text] of COMBAT_SOURCES){
  for(const m of text.matchAll(/talents\??\.?\[\s*['"`]?(\d{2,3})['"`]?\s*\]/g))if(!allIds.has(m[1]))unknownHookIds.add(m[1]);
 }
 return {rows,unknownHookIds:[...unknownHookIds].sort((a,b)=>a-b)};
}

export function summarise(rows){
 const classes={};
 for(const r of rows){
  const c=classes[r.classId]??={talents:0,trees:new Set(),byClassification:{},byFlag:{},reachesCombat:0,withHook:0,pendingTalents:0};
  c.talents++;c.trees.add(r.tree);c.byClassification[r.classification]=(c.byClassification[r.classification]||0)+1;
  for(const f of r.flags.filter(x=>!x.startsWith('data-issue')))c.byFlag[f]=(c.byFlag[f]||0)+1;
  if(r.reachesCombatInput)c.reachesCombat++;if(r.combatHookFiles.length)c.withHook++;if(r.flags.includes('pending-rule'))c.pendingTalents++;
 }
 for(const c of Object.values(classes))c.trees=[...c.trees];
 return classes;
}

export function summariseFindings(rows){
 const byState={},byDisposition={},byDimension={};let total=0;
 for(const r of rows)for(const f of r.findings){
  total++;byState[f.state]=(byState[f.state]||0)+1;byDisposition[f.disposition]=(byDisposition[f.disposition]||0)+1;byDimension[f.dimension]=(byDimension[f.dimension]||0)+1;
 }
 const sort=o=>Object.fromEntries(Object.entries(o).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])));
 return {total,byState:sort(byState),byDisposition:sort(byDisposition),byDimension:sort(byDimension),
  combatVerification:rows.reduce((o,r)=>{o[r.combatVerification.status]=(o[r.combatVerification.status]||0)+1;return o;},{})};
}

const LABEL={'conflicting-or-disputed':'Conflicting or disputed','verified-functioning':'Verified and functioning','implemented-unverified':'Implemented but unverified','partial':'Partially implemented','missing':'Missing implementation'};
export function markdown(report){
 const {rows,summary,unknownHookIds}=report,out=[];
 const total=k=>rows.filter(r=>r.classification===k).length;
 out.push('# Talent audit: 27 trees, 476 talents','',
  'Generated by `tools/sim/audit-talents.mjs`. Every statement is something the tool observed by running the planner and combat-adapter code; nothing is inferred from names or descriptions. OctoWoW is the target ruleset, so vanilla behaviour is never assumed: a talent is only counted as functioning if its effect and per-rank scaling are observed in this repository\'s code.','',
  '## How a talent reaches combat','',
  '1. **Sheet and snapshot.** `characterStats()` applies passive stat talents; `combatSnapshot` is the input every compiled combat scenario starts from.',
  '2. **Ability model.** Scoped talents (damage %, cost, cooldown, cast time and so on) change `calculateAbilityTalentEffects()` values; `compileReferenceRank()` applies them to a rank only if that ability has a compiled reference rank.',
  '3. **Combat hooks.** About ninety talents are read by numeric ID inside the combat modules (Elemental Devastation, companion talents, hunter ranged talents and others).','',
  'UI support (the allocation editor, rank text, prerequisites) is separate and covered by tests of `validateTalents`. It does not imply any combat effect.','',
  '## Classification rules','',
  '| Class | Meaning |','|---|---|',
  '| Verified and functioning | Every rule is applied, the effect scales in proportion to the published per-rank parameter, and it reaches combat input (sheet/snapshot), or a deterministic combat test is named in the report. A rule declared pending (an event-driven mechanic) counts as applied only for talents listed in `VERIFIED_COMBAT_HOOKS`, whose named test sweeps every rank against the published `rankParameters`. Pet-only talents are measured on the pet paths against the same parameter. This is consistency with the talent data, not a comparison with OctoWoW |',
  '| Implemented but unverified | An effect or hook exists, but numerics are not verified against the published parameters or it only reaches the ability estimates |',
  '| Partially implemented | Some rules are applied and others are pending, unattached to any ability, recorded but never computed, or not observed |',
  '| Missing implementation | No rule has an observable effect and no combat hook exists |',
  '| Conflicting or disputed | The compiled combat action changed by an amount that differs from the published rule |','',
  'A talent whose rules are all ability-scoped is also compiled with and without the talent at every rank (`tools/sim/combat-verification.mjs`); if every compared field (cast time, cost, cooldown, damage or healing multiplier, crit chance, crit multiplier, miss chance, Life Tap mana factor) changes by exactly the published amount, it is counted as verified.','',
  '## Totals','','| Classification | Talents |','|---|---|',
  ...Object.entries(LABEL).map(([k,v])=>`| ${v} | ${total(k)} |`),
  `| Total | ${rows.length} |`,'',
  `${rows.filter(r=>r.disputedHint).length} talents carry a disputed-source hint; ${rows.filter(r=>r.flags.some(f=>f.startsWith('data-issue'))).length} have a data-structure issue; ${rows.filter(r=>r.flags.includes('custom-id-range')).length} use spell IDs in the custom range (40000 and above); ${rows.filter(r=>r.reachesCombatInput).length} reach combat input.`,'',
  '## Per-class coverage','',
  '| Class | Talents | Verified | Unverified | Partial | Missing | Reach combat input | Hard-wired combat hooks | Talents with pending rules |','|---|---|---|---|---|---|---|---|---|');
 for(const c of CLASSES){const s=summary[c],b=s.byClassification;out.push(`| ${c} | ${s.talents} | ${b['verified-functioning']||0} | ${b['implemented-unverified']||0} | ${b.partial||0} | ${b.missing||0} | ${s.reachesCombat} | ${s.withHook} | ${s.pendingTalents} |`);}
 out.push('','## Integrity flags (talents affected)','','| Flag | Talents | Meaning |','|---|---|---|');
 const meaning={'pending-rule':'A rule is declared pending in the audit data: the mechanic is not implemented','unattached-scope':'The rule\'s scope matches no ability profile, so it can never be applied','recorded-not-computed':'The stat is recorded but never read by the ability calculator','rule-effect-not-observed':'A sheet-type rule produced no observable change','claims-sheet-but-not-observed':'Planner coverage says "sheet" but no output changes','conditional-not-modelled':'Planner coverage says proc or conditional: not modelled','sheet-only':'Changes sheet rows or pet data but no combat snapshot field, hook or compiled ability','planner-estimate-only':'Applied in ability estimates only for abilities with no compiled combat rank','prerequisite-in-same-or-higher-tier':'The prerequisite sits in the same or a higher tier than the talent (an OctoWoW layout feature; acyclic and enforced by validateTalents)','scaling-non-monotonic':'Observed effect does not grow with rank','no-combat-hook':'No combat module reads this talent by ID','scaling-differs-from-parameter':'Observed scaling differs from the published per-rank parameter','custom-id-range':'Spell IDs in the custom OctoWoW range: no vanilla reference','disputed-hint':'Notes mention a conflict or disputed source'};
 const flagCount={};for(const r of rows)for(const f of r.flags)if(!f.startsWith('data-issue'))flagCount[f]=(flagCount[f]||0)+1;
 for(const [f,m] of Object.entries(meaning))out.push(`| ${f} | ${flagCount[f]||0} | ${m} |`);
  const fs=report.findingSummary;
 out.push('','## Unapplied rules: disposition','',`${fs.total} rules are recorded but not applied by the ability calculator (${Object.entries(fs.byState).map(([k,v])=>k+' '+v).join(', ')}). Each has a recorded disposition in \`tools/sim/talent-findings.mjs\`; none is approximated.`,'','| Disposition | Rules |','|---|---|',...Object.entries(fs.byDisposition).map(([k,v])=>`| ${k} | ${v} |`),'','| Dimension | Rules |','|---|---|',...Object.entries(fs.byDimension).map(([k,v])=>`| ${k} | ${v} |`));
 out.push('','## Integration defects fixed','');
 for(const f of report.integrationFixes)out.push(`- **${f.name}** (${f.classId} ${f.talentId}): ${f.defect} Fix: ${f.fix} Test: \`${f.test}\`.`);
 if(unknownHookIds.length)out.push('',`Combat code reads talent IDs that match no talent: ${unknownHookIds.join(', ')}.`);
 out.push('','## Verified combat behaviour (deterministic tests)','');
 for(const [id,why] of Object.entries(VERIFIED_COMBAT_HOOKS))out.push(`- Talent ${id}: ${why}`);
 for(const c of CLASSES){
  out.push('',`## ${c[0].toUpperCase()+c.slice(1)}`);
  for(const tree of [...new Set(rows.filter(r=>r.classId===c).map(r=>r.tree))]){
   out.push('',`### ${tree}`,'','| Talent (ID, ranks) | Tier / prerequisite | Planner | Channels observed | Classification | Flags |','|---|---|---|---|---|---|');
   for(const r of rows.filter(x=>x.classId===c&&x.tree===tree)){
    const ch=[r.observed.snapshotPaths.length?'snapshot':'',r.observed.sheetRows.length?'sheet':'',r.observed.petPaths.length?'pet':'',r.observed.affectedAbilities.length?`ability x${r.observed.affectedAbilities.length}`:'',r.combatHookFiles.length?'hook':''].filter(Boolean).join(', ')||'none';
    const pre=r.prerequisite?`T${r.tier}, needs ${r.prerequisite.name} ${r.prerequisite.ranks}`:`T${r.tier}`;
    out.push(`| ${r.name} (${r.id}, ${r.maxRanks}) | ${pre} | ${r.plannerCoverage.status} | ${ch} | ${LABEL[r.classification]} | ${r.flags.filter(f=>!f.startsWith('data-issue')).join(', ')||'-'} |`);
   }
  }
 }
 return out.join('\n')+'\n';
}

export function buildReport(){
 const {rows,unknownHookIds}=buildTalentAudit();
 return {schema:'octosim-talent-audit-v1',talentCount:rows.length,treeCount:new Set(rows.map(r=>r.classId+':'+r.treeIndex)).size,
  note:'Observed evidence only. UI support is separate from combat implementation; see TALENT-AUDIT.md.',
  summary:summarise(rows),findingSummary:summariseFindings(rows),integrationFixes:INTEGRATION_FIXES,unknownHookIds,rows};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const args=process.argv.slice(2),get=k=>{const i=args.indexOf(k);return i>=0?args[i+1]:null;};
 const report=buildReport();
 if(get('--json'))writeFileSync(get('--json'),JSON.stringify(report,null,1)+'\n');
 if(get('--md'))writeFileSync(get('--md'),markdown(report));
 const t=k=>report.rows.filter(r=>r.classification===k).length;
 console.log(JSON.stringify({talents:report.talentCount,trees:report.treeCount,verified:t('verified-functioning'),unverified:t('implemented-unverified'),partial:t('partial'),missing:t('missing')}));
}
