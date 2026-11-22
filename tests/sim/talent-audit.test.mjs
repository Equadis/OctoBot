import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CLASSES,buildReport,summarise} from '../../tools/sim/audit-talents.mjs';
import {legalAllocation,allocationErrors} from './helpers/talent-allocation.mjs';
import {shadowBoltRun,warlockTalents} from './helpers/warlock-shadow-bolt.mjs';

const load=c=>JSON.parse(readFileSync(new URL(`../../docs/sim/data/talents/${c}.json`,import.meta.url),'utf8'));
const committed=JSON.parse(readFileSync(new URL('../../docs/sim/data/talents/audit-report.json',import.meta.url),'utf8'));
const data=Object.fromEntries(CLASSES.map(c=>[c,load(c)]));
const CLASSIFICATIONS=['verified-functioning','implemented-unverified','partial','missing','conflicting-or-disputed'];

test('inventory: nine classes, 27 trees, every talent has a complete, well-formed record',()=>{
 assert.equal(CLASSES.length,9);
 let total=0;
 for(const c of CLASSES){
  const d=data[c];
  assert.equal(d.trees.length,3,c);
  const ids=new Set(),positions=new Set();
  for(const t of d.talents){
   total++;
   assert.ok(!ids.has(t.id),`${c} duplicate id ${t.id}`);ids.add(t.id);
   const key=t.tree+':'+t.position;assert.ok(!positions.has(key),`${c} duplicate position ${key}`);positions.add(key);
   assert.ok(t.name&&Number.isInteger(t.maxRanks)&&t.maxRanks>=1,`${c} ${t.id}`);
   assert.equal(t.spellIds.length,t.maxRanks,`${c} ${t.name} needs one spell id per rank`);
   assert.ok(t.row>=0&&t.row<=6&&t.column>=0&&t.column<=3,`${c} ${t.name} grid position`);
   assert.ok(t.tree>=0&&t.tree<3);
   if(t.requires!==null){
    const parent=d.talents.find(x=>x.tree===t.tree&&x.position===t.requires);
    assert.ok(parent,`${c} ${t.name} prerequisite position ${t.requires} does not exist in its own tree`);
    assert.ok(t.requiresRanks>=1&&t.requiresRanks<=parent.maxRanks,`${c} ${t.name} requires more ranks than the parent has`);
   }
  }
 }
 assert.equal(total,476);
 assert.equal(committed.talentCount,476);
 assert.equal(committed.treeCount,27);
});

test('prerequisites and tier gates: every talent has a legal allocation, and removing a gate point or parent rank is rejected',()=>{
 let checked=0;
 for(const c of CLASSES){
  const d=data[c];
  for(const t of d.talents){
   const alloc=legalAllocation(d,t);
   assert.deepEqual(allocationErrors(d,alloc),[],`${c} ${t.name} legal allocation rejected`);
   assert.equal(alloc[t.id],t.maxRanks);
   const below=d.talents.filter(x=>x.tree===t.tree&&x.row<t.row&&alloc[x.id]&&x.id!==undefined&&!isAncestor(d,x,t,alloc));
   if(t.row>0){
    // Remove one point that pays for the tier gate and is not the parent chain.
    const spare=below[0];
    if(spare){
     const less={...alloc,[spare.id]:alloc[spare.id]-1};if(!less[spare.id])delete less[spare.id];
     assert.ok(allocationErrors(d,less).length>0,`${c} ${t.name} accepted with an unpaid tier gate`);
    }
   }
   if(t.requires!==null){
    const parent=d.talents.find(x=>x.tree===t.tree&&x.position===t.requires);
    const low={...alloc,[parent.id]:t.requiresRanks-1};if(!low[parent.id])delete low[parent.id];
    assert.ok(allocationErrors(d,low).length>0,`${c} ${t.name} accepted with parent below ${t.requiresRanks} ranks`);
   }
   checked++;
  }
 }
 assert.equal(checked,476);
});
function isAncestor(d,x,t,alloc){
 let cur=t;
 while(cur.requires!==null){cur=d.talents.find(y=>y.tree===cur.tree&&y.position===cur.requires);if(cur.id===x.id)return true;}
 return false;
}

test('rank budget: a build cannot spend more than level-9 points, nor exceed a talent maximum',()=>{
 const d=data.warlock;
 const t=d.talents.find(x=>x.tree===0&&x.row===0&&x.maxRanks>=2);
 assert.ok(allocationErrors(d,{[t.id]:t.maxRanks+1}).length>0);
 assert.ok(allocationErrors(d,{[t.id]:t.maxRanks},9).length>0,'level 9 grants no talent points');
});

test('committed audit report matches the live data and the audit tool (drift check)',{timeout:120000},()=>{
 const live=JSON.parse(JSON.stringify(buildReport()));
 assert.equal(live.talentCount,committed.talentCount);
 assert.deepEqual(live.summary,committed.summary);
 assert.deepEqual(live.rows,committed.rows);
 assert.deepEqual(live.unknownHookIds,committed.unknownHookIds);
});

test('report classification invariants: every talent classified once and every claim is backed by rule states',()=>{
 const ids=new Set();
 for(const r of committed.rows){
  const key=r.classId+':'+r.id;assert.ok(!ids.has(key),key);ids.add(key);
  assert.ok(CLASSIFICATIONS.includes(r.classification),`${key} ${r.classification}`);
  const live=data[r.classId].talents.find(t=>t.id===r.id);
  assert.ok(live,`${key} not in data`);
  assert.equal(r.name,live.name);assert.equal(r.maxRanks,live.maxRanks);assert.deepEqual(r.spellIds,live.spellIds);
  const applied=r.rules.filter(s=>s.state.startsWith('applied')).length;
  const unapplied=r.rules.length-applied;
  const hooked=r.combatHookFiles.length>0;
  if(r.classification==='missing'){assert.equal(applied,0,key);assert.ok(!hooked,key);}
  if(r.classification==='verified-functioning')assert.equal(unapplied,0,`${key} verified with unapplied rules`);
  if(r.classification==='partial'){assert.ok(applied>0&&unapplied>0,key);}
  // Flags must be derivable from the rule states (no silent gaps).
  assert.equal(r.flags.includes('pending-rule'),r.rules.some(s=>s.state==='pending'),key);
  assert.equal(r.flags.includes('unattached-scope'),r.rules.some(s=>s.state==='unattached-scope'),key);
  assert.equal(r.flags.includes('recorded-not-computed'),r.rules.some(s=>s.state==='recorded-not-computed'),key);
  assert.equal(r.flags.includes('no-combat-hook'),!hooked,key);
  assert.equal(r.flags.includes('custom-id-range'),r.spellIds.some(x=>x>=40000),key);
  assert.ok(!r.flags.some(f=>f.startsWith('data-issue')),`${key} has a data-structure issue: ${r.flags.filter(f=>f.startsWith('data-issue'))}`);
  assert.ok(!r.flags.includes('scaling-non-monotonic'),`${key} effect shrinks as ranks rise`);
  assert.ok(!r.flags.includes('scaling-differs-from-parameter'),`${key} effect does not follow its published rank parameter`);
 }
 assert.equal(committed.rows.length,476);
});

test('per-class coverage report: counts add up and agree with the rows',()=>{
 for(const c of CLASSES){
  const s=committed.summary[c];
  const rows=committed.rows.filter(r=>r.classId===c);
  assert.equal(s.talents,rows.length);
  assert.equal(s.trees.length,3);
  assert.equal(Object.values(s.byClassification).reduce((a,b)=>a+b,0),rows.length,c);
  assert.equal(s.pendingTalents,rows.filter(r=>r.flags.includes('pending-rule')).length,c);
  assert.equal(s.reachesCombat,rows.filter(r=>r.reachesCombatInput).length,c);
  assert.equal(s.withHook,rows.filter(r=>r.combatHookFiles.length).length,c);
 }
 assert.deepEqual(summarise(committed.rows),committed.summary);
});

test('talents that the sheet does not apply are never presented as verified (UI support is not combat support)',()=>{
 for(const r of committed.rows){
  if(r.plannerCoverage.status!=='sheet')assert.notEqual(r.classification,'verified-functioning',`${r.classId}:${r.name} is conditional or partial in the planner`);
  if(r.flags.includes('sheet-only')||r.flags.includes('planner-estimate-only'))assert.ok(!r.reachesCombatInput,r.name);
 }
});

test('verified talents reach the combat input with effect proportional to the published per-rank parameter',()=>{
 const verified=committed.rows.filter(r=>r.classification==='verified-functioning');
 assert.ok(verified.length>=10);
 for(const r of verified){
  assert.ok(r.observed.snapshotPaths.length>0,r.name);
  if(!r.verifiedCombatTest)assert.ok(['proportional-to-published-parameter','proportional-within-rounding'].includes(r.observed.rankScaling),`${r.name} ${r.observed.rankScaling}`);
 }
});

const first=(r,type)=>r.exampleEvents.filter(e=>e.type===type);
const castDone=r=>first(r,'cast-complete')[0].time;
const firstDamage=r=>first(r,'damage')[0].raw;

test('combat outcome: Bane shortens the simulated Shadow Bolt cast by 0.1 s per rank',()=>{
 const bane=warlockTalents.talents.find(t=>t.name==='Bane');
 assert.equal(bane.maxRanks,5);
 const base=castDone(shadowBoltRun({}));
 assert.equal(base,3000);
 for(let rank=1;rank<=5;rank++){
  const talents=legalAllocation(warlockTalents,bane,rank);
  assert.equal(castDone(shadowBoltRun(talents)),3000-100*rank,`Bane rank ${rank}`);
 }
});

test('combat outcome: Shadow Mastery raises Shadow Bolt damage by exactly 2% per rank',()=>{
 const sm=warlockTalents.talents.find(t=>t.name==='Shadow Mastery');
 const base=firstDamage(shadowBoltRun({}));
 for(let rank=1;rank<=sm.maxRanks;rank++){
  const dmg=firstDamage(shadowBoltRun(legalAllocation(warlockTalents,sm,rank)));
  assert.ok(Math.abs(dmg/base-(1+0.02*rank))<1e-9,`Shadow Mastery rank ${rank}: ${dmg/base}`);
 }
});

test('combat outcome: Devastation changes critical outcomes and mean DPS, and is deterministic for a fixed seed',()=>{
 const dev=warlockTalents.talents.find(t=>t.name==='Devastation');
 const base=shadowBoltRun({},{iterations:200});
 const a=shadowBoltRun(legalAllocation(warlockTalents,dev),{iterations:200});
 const b=shadowBoltRun(legalAllocation(warlockTalents,dev),{iterations:200});
 assert.equal(a.allStatistics.dps.mean,b.allStatistics.dps.mean,'same seed must reproduce the same result');
 assert.ok(a.allStatistics.dps.mean>base.allStatistics.dps.mean,'extra critical chance must raise mean DPS');
});

test('combat outcome: talents the audit flags as missing do not move the simulated Shadow Bolt',()=>{
 const missing=committed.rows.filter(r=>r.classId==='warlock'&&r.classification==='missing'&&r.maxRanks>=1);
 assert.ok(missing.length>0);
 const baseline=shadowBoltRun({});
 for(const r of missing.slice(0,6)){
  const t=warlockTalents.talents.find(x=>x.id===r.id);
  const run=shadowBoltRun(legalAllocation(warlockTalents,t));
  assert.equal(run.allStatistics.dps.mean,baseline.allStatistics.dps.mean,`${r.name} is classified missing yet changes combat; reclassify it`);
 }
});
