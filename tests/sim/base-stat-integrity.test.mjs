import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BASE_STATS} from '../../docs/sim/core/base-stats.mjs';
import {CLASS_RACES} from '../../docs/sim/core/class-rules.mjs';
import {baseStatInventory,baseStatProfile} from '../../docs/sim/core/base-stat-audit.mjs';
import {buildIntegrityQueue} from '../../docs/sim/core/data-integrity.mjs';
import {prepareSimulation} from '../../docs/sim/core/simulation-readiness.mjs';
import {newBuild} from '../../docs/sim/core/builds.mjs';

const report=JSON.parse(readFileSync(new URL('../../docs/sim/data/reference/base-stat-verification.json',import.meta.url),'utf8'));
const talents=cls=>JSON.parse(readFileSync(new URL(`../../docs/sim/data/talents/${cls}.json`,import.meta.url),'utf8'));
const PRIMARY=['strength','agility','stamina','intellect','spirit'];
const keys=Object.keys(BASE_STATS);
const MISSING_COMBINATIONS=['Dwarf:mage','Dwarf:warlock','Gnome:hunter','Goblin:hunter','Goblin:mage','Goblin:rogue','Goblin:warlock','Goblin:warrior','High Elf:hunter','High Elf:mage','High Elf:paladin','High Elf:priest','High Elf:rogue','High Elf:warrior','Human:hunter','Orc:mage','Tauren:priest','Troll:warlock','Undead:hunter'];
// Rows the invariant checks flag. Both vanilla sources contain them unchanged and no OctoWoW value exists,
// so the values are pinned here: a silent substitution would fail this test.
const PINNED={
 'Human:warrior:19':[44,33,41,22,26,168,0],
 'Undead:mage:1':[19,18,21,27,21,31,100],
 'Undead:mage:2':[19,18,21,22,28,37,170],
 'Orc:rogue:19':[37,43,35,20,29],
 'Orc:rogue:20':[37,43,35,20,29],
 'Night Elf:druid:1':[null,null,null,null,null,33,17],
 'Tauren:druid:1':[null,null,null,null,null,33,17]
};
const byClass=()=>{const m={};for(const k of keys)(m[k.split(':')[1]]??=[]).push(k);return m;};
const inc=(rows,i)=>rows[i].slice(0,5).map((v,j)=>v-rows[i-1][j]);

test('structure: 40 imported combinations, 60 rows each, seven non-negative integers, all allowed by class rules',()=>{
 assert.equal(keys.length,40);
 for(const k of keys){
  const [race,cls]=k.split(':');
  assert.ok(CLASS_RACES[cls]?.includes(race),`${k} is not an allowed race/class pair`);
  assert.equal(BASE_STATS[k].length,60,k);
  for(const row of BASE_STATS[k]){assert.equal(row.length,7);assert.ok(row.every(v=>Number.isSafeInteger(v)&&v>=0),k);}
  assert.ok(BASE_STATS[k][0].slice(0,5).every(v=>v>0),`${k} level 1 primary stats must be positive`);
 }
});

test('missing records: exactly the 19 known combinations have no rows and are never filled from another race or class',()=>{
 const inv=baseStatInventory();
 const missing=inv.combinations.filter(c=>c.referenceRows===0).map(c=>c.race+':'+c.classId).sort();
 assert.deepEqual(missing,MISSING_COMBINATIONS);
 assert.equal(inv.totals.missingRows,19*60);
 assert.equal(inv.combinations.filter(c=>c.referenceRows!==0&&c.referenceRows!==60).length,0,'no partially imported combination');
 for(const k of MISSING_COMBINATIONS){
  assert.equal(BASE_STATS[k],undefined,k);
  const [race,cls]=k.split(':');
  for(const level of [1,30,60]){const p=baseStatProfile(race,cls,level);assert.equal(p.status,'missing');assert.equal(p.row,null);}
 }
});

test('race/class/level restrictions reject unsupported coordinates without substitution',()=>{
 for(const [race,cls] of [['Tauren','paladin'],['Human','druid'],['Goblin','paladin'],['Orc','druid'],['Dwarf','shaman']]){
  assert.ok(!CLASS_RACES[cls].includes(race));
  assert.equal(baseStatProfile(race,cls,30).status,'invalid');
 }
 for(const level of [0,61,1.5,-1,NaN])assert.equal(baseStatProfile('Human','warrior',level).status,'invalid');
 const races=new Set(Object.values(CLASS_RACES).flat());
 assert.equal(races.size,10);
 assert.equal(Object.values(CLASS_RACES).reduce((n,r)=>n+r.length,0),59);
});

test('class-only health and mana are identical for every imported race of a class at every level',()=>{
 for(const [cls,ks] of Object.entries(byClass()))for(let i=0;i<60;i++){
  const distinct=new Set(ks.map(k=>BASE_STATS[k][i].slice(5).join('/')));
  if(distinct.size!==1){
   // The only tolerated exception is the documented druid level-1 mana conflict between sources.
   assert.equal(cls,'druid');assert.equal(i,0);
  }
 }
});

test('progression invariants: every deviation is a documented, flagged row with pinned source values',()=>{
 const decreases=[],stalled=[];
 for(const [cls,ks] of Object.entries(byClass()))for(const k of ks)for(let i=1;i<60;i++){
  const d=inc(BASE_STATS[k],i);
  if(d.some(v=>v<0))decreases.push(`${k}:${i+1}`);
  const others=ks.filter(o=>o!==k).map(o=>inc(BASE_STATS[o],i));
  if(d.every(v=>v===0)&&others.filter(o=>o.some(v=>v>0)).length>=2)stalled.push(`${k}:${i+1}`);
 }
 assert.deepEqual(decreases,['Undead:mage:2']);
 assert.deepEqual(stalled.sort(),['Human:warrior:19','Orc:rogue:19','Orc:rogue:20']);
 for(const id of [...decreases,...stalled])assert.equal(baseStatProfile(...(([r,c,l])=>[r,c,Number(l)])(id.split(':'))).status,'reference-anomaly',id);
 for(const [id,expected] of Object.entries(PINNED)){
  const [race,cls,level]=id.split(':');
  const row=BASE_STATS[race+':'+cls][Number(level)-1];
  expected.forEach((v,j)=>{if(v!==null)assert.equal(row[j],v,`${id} field ${j} changed`);});
 }
});

test('flagged rows are preserved and surfaced: five anomalies, two source conflicts, none corrected',()=>{
 const inv=baseStatInventory();
 assert.equal(inv.totals.anomalies,5);
 assert.equal(inv.totals.sourceConflicts,2);
 const flagged=inv.combinations.flatMap(c=>c.anomalies.map(a=>`${c.race}:${c.classId}:${a.level}`)).sort();
 assert.deepEqual(flagged,['Human:warrior:19','Orc:rogue:19','Orc:rogue:20','Undead:mage:1','Undead:mage:2']);
 const conflicts=inv.combinations.flatMap(c=>c.conflicts.map(a=>`${c.race}:${c.classId}:${a.level}`)).sort();
 assert.deepEqual(conflicts,['Night Elf:druid:1','Tauren:druid:1']);
 for(const id of conflicts){const [r,c,l]=id.split(':');const p=baseStatProfile(r,c,Number(l));assert.equal(p.status,'reference-conflict');assert.ok(p.row&&p.issues.length===1);}
 const q=buildIntegrityQueue(inv);
 assert.equal(q.baseRows.filter(r=>r.reason==='source-conflict').length,2);
 assert.equal(q.baseRows.filter(r=>r.reason==='anomaly').length,5);
 assert.equal(q.baseRows.filter(r=>r.reason==='missing').length,1140);
});

test('simulation is blocked for flagged, conflicting and missing base rows but not for adjacent verified rows',()=>{
 const build=(cls,race,level)=>{const b=newBuild(cls);b.race=race;b.level=level;return b;};
 const blocked=/missing, anomalous or disputed between sources/;
 for(const [cls,race,level] of [['rogue','Orc',19],['rogue','Orc',20],['druid','Tauren',1],['druid','Night Elf',1],['rogue','Goblin',60]])
  assert.throws(()=>prepareSimulation(build(cls,race,level),talents(cls)),blocked,`${race} ${cls} ${level}`);
 for(const [cls,race,level] of [['rogue','Orc',18],['rogue','Orc',21],['druid','Tauren',2]])
  assert.throws(()=>prepareSimulation(build(cls,race,level),talents(cls)),e=>!blocked.test(e.message),`${race} ${cls} ${level} should not be blocked by base stats`);
});

test('verification report agrees with the live data and never claims a correction',()=>{
 const inv=baseStatInventory();
 const s=report.statusCounts;
 assert.equal(s.corrected,0);
 assert.equal(s.totalRows,59*60);
 assert.equal(s.verifiedInBothSources+s.disputed+s.unresolvedMissing+s.corrected,s.totalRows);
 assert.equal(s.unresolvedMissing,inv.totals.missingRows);
 assert.equal(s.disputed,inv.totals.anomalies+inv.totals.sourceConflicts);
 assert.equal(report.importFidelity.rowsCompared,2400);
 assert.equal(report.importFidelity.mismatchesAgainstCmangos,0);
 assert.equal(report.crossSource.primaryMismatchesAgainstMangosZero,0);
 assert.deepEqual(report.unresolvedMissingCombinations.combinations,MISSING_COMBINATIONS);
 assert.deepEqual(report.crossSource.classHealthManaDisagreements.map(c=>`${c.key}:${c.level}`).sort(),['Night Elf:druid:1','Tauren:druid:1']);
 for(const c of report.candidatesNotApplied){
  assert.equal(c.applied,false);
  const live=BASE_STATS[`${c.race}:${c.classId}`][c.level-1].slice(0,5);
  assert.deepEqual(c.currentPrimary,live,'report current values must equal the live data');
  assert.notDeepEqual(c.candidatePrimary,live);
 }
 const q=buildIntegrityQueue(inv);
 assert.match(report.outOfScope[0],new RegExp(`${q.totals.conflictingAbilities} abilities`));
 assert.match(report.outOfScope[0],new RegExp(`${q.totals.conflictingRankRows} rank rows`));
 assert.equal(report.sources[0].sha256,'229660cdd6d108d822a491a70a59bdfb6141e61a60ac488d126bee3780e5e5fa','source hash must match the hash recorded in base-stats.mjs');
});
