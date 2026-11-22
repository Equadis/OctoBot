import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ROTATION_REGISTRY} from '../../docs/sim/core/rotations/registry.mjs';
import {ABILITY_DATA} from '../../docs/sim/core/rotations/ability-data.mjs';
import {OBSERVED_SPELLS,OBSERVED_PROVENANCE} from '../../docs/sim/core/rotations/observed-spells.mjs';

const json=JSON.parse(readFileSync(new URL('../../docs/sim/data/rotations/chronicle-observed-spells.json',import.meta.url),'utf8'));

test('registry exposes Chronicle-observed spell IDs per ability as read-only evidence',()=>{
 const holy=ROTATION_REGISTRY.paladin.abilityRegistry['paladin:holy-strike'];
 assert.deepEqual(holy.observedSpells.map(s=>s.spellId).sort((a,b)=>a-b),[10332,10333]);
 assert.equal(holy.observedSpells.find(s=>s.spellId===10333).hits,905);
 assert.equal(ROTATION_REGISTRY.hunter.abilityRegistry['hunter:steady-shot'].observedSpells[0].spellId,3668);
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
 assert.equal(checked,4);
});

test('Holy Strike and Steady Shot IDs are observed but still absent from published identities',()=>{
 const holy=ROTATION_REGISTRY.paladin.abilityRegistry['paladin:holy-strike'],steady=ROTATION_REGISTRY.hunter.abilityRegistry['hunter:steady-shot'];
 assert.ok(!holy.spellIds.includes(10333)&&!(holy.candidateSpells??[]).some(c=>c.id===10333));
 assert.ok(!steady.spellIds.includes(3668)&&!(steady.candidateSpells??[]).some(c=>c.id===3668));
});

test('registry module matches the committed evidence JSON and carries provenance',()=>{
 const fromJson={};for(const c of json.observedCandidates)(fromJson[c.abilityKey]??=[]).push(c.spellId);
 const fromModule=Object.fromEntries(Object.entries(OBSERVED_SPELLS).map(([k,v])=>[k,v.map(s=>s.spellId)]));
 for(const k of Object.keys(fromJson))assert.deepEqual(fromModule[k].sort((a,b)=>a-b),fromJson[k].sort((a,b)=>a-b));
 assert.deepEqual(Object.keys(fromModule).sort(),Object.keys(fromJson).sort());
 assert.equal(OBSERVED_PROVENANCE.clientBuild,'7272');
 assert.match(OBSERVED_PROVENANCE.reportUrl,/^https:\/\/octo\.chronicleclassic\.com\/instances\//);
});
