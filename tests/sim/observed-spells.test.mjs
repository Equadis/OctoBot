import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ROTATION_REGISTRY} from '../../docs/sim/core/rotations/registry.mjs';
import {ABILITY_DATA} from '../../docs/sim/core/rotations/ability-data.mjs';
import {OBSERVED_SPELLS,OBSERVED_PROVENANCE} from '../../docs/sim/core/rotations/observed-spells.mjs';

const json=JSON.parse(readFileSync(new URL('../../docs/sim/data/rotations/chronicle-observed-spells.json',import.meta.url),'utf8'));

test('registry exposes only reviewed, non-disputed Chronicle-observed IDs',()=>{
 const holy=ROTATION_REGISTRY.paladin.abilityRegistry['paladin:holy-strike'];
 assert.deepEqual(holy.observedSpells,[],'disputed Holy Strike 10333/10332 are not exposed');
 assert.deepEqual(ROTATION_REGISTRY.hunter.abilityRegistry['hunter:steady-shot'].observedSpells,[],'disputed Steady Shot 3668 is not exposed');
 const po=ROTATION_REGISTRY.warlock.abilityRegistry['warlock:power-overwhelming'].observedSpells;
 assert.deepEqual(po.map(x=>x.spellId),[51714]);
 assert.equal(po[0].dbName,'Power Overwhelming');
 assert.equal(ROTATION_REGISTRY.warrior.abilityRegistry['warrior:bloodthirst'].observedSpells.length,0);
});

test('wiring leaves published identities untouched: an observation never changes spellIds or candidateSpells membership',()=>{
 let checked=0;
 for(const [classId,profile] of Object.entries(ROTATION_REGISTRY))for(const ability of Object.values(profile.abilityRegistry)){
  const published=ABILITY_DATA[classId]?.[ability.id];
  for(const seen of ability.observedSpells){
   checked++;
   assert.equal(ability.spellIds.includes(seen.spellId),!!published?.spellIds?.includes(seen.spellId),`${ability.id} spellIds gained/lost ${seen.spellId}`);
   assert.equal((ability.candidateSpells??[]).some(c=>c.id===seen.spellId),!!published?.candidateSpells?.some(c=>c.id===seen.spellId),`${ability.id} candidateSpells gained/lost ${seen.spellId}`);
   assert.ok(!('rank' in seen)&&!('minLevel' in seen),`${ability.id} observation carries rank/level`);
  }
 }
 assert.equal(checked,1);
});

test('disputed identities are recorded but never exposed: Holy Strike 10333/10332 and Steady Shot 3668',()=>{
 const holy=ROTATION_REGISTRY.paladin.abilityRegistry['paladin:holy-strike'];
 assert.ok(!holy.spellIds.includes(10333)&&!(holy.candidateSpells??[]).some(c=>c.id===10333));
 assert.deepEqual(json.disputedObserved.map(c=>[c.abilityKey,c.spellId]).sort(),[['hunter:steady-shot',3668],['paladin:holy-strike',10332],['paladin:holy-strike',10333]]);
 assert.ok(json.disputedObserved.every(c=>c.review.verdict==='disputed'));
 assert.ok(json.observedCandidates.every(c=>c.review?.source?.startsWith('https://octowow.st/db/?spell=')));
});

test('registry module matches the committed evidence JSON and carries provenance',()=>{
 const fromJson={};for(const c of json.observedCandidates)(fromJson[c.abilityKey]??=[]).push(c.spellId);
 const fromModule=Object.fromEntries(Object.entries(OBSERVED_SPELLS).map(([k,v])=>[k,v.map(s=>s.spellId)]));
 for(const k of Object.keys(fromJson))assert.deepEqual(fromModule[k].sort((a,b)=>a-b),fromJson[k].sort((a,b)=>a-b));
 assert.deepEqual(Object.keys(fromModule).sort(),Object.keys(fromJson).sort());
 assert.equal(OBSERVED_PROVENANCE.clientBuild,'7272');
 assert.match(OBSERVED_PROVENANCE.reportUrl,/^https:\/\/octo\.chronicleclassic\.com\/instances\//);
});
