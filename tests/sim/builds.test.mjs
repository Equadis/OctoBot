import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { newBuild, validateBuild, encodeBuild, decodeBuild, parseItemReference } from '../../docs/sim/core/builds.mjs';
const data = JSON.parse(await readFile(new URL('../../docs/sim/data/talents/warrior.json', import.meta.url)));
import {BUILDS_PER_CLASS,BUILD_LIMIT_MESSAGE,defaultSaveName} from '../../docs/sim/core/build-library.mjs';

test('build names are independent of character names and have a fallback',()=>{
 assert.equal(defaultSaveName(' Combat Swords ','Human','rogue',60),'Combat Swords');
 assert.equal(defaultSaveName('','Human','rogue',60),'Human Rogue – Level 60');
 assert.equal(defaultSaveName('   ','Orc','warrior',42),'Orc Warrior – Level 42');
 assert.equal(defaultSaveName('X'.repeat(90),'Orc','warrior',60).length,80);
});
test('ten builds per class, with an inline limit message and no saved build counters',async()=>{
 assert.equal(BUILDS_PER_CLASS,10);
 assert.equal(BUILD_LIMIT_MESSAGE,'You cannot save any more builds for this class.');
 const html=await readFile(new URL('../../docs/sim/index.html',import.meta.url),'utf8');
 const planner=await readFile(new URL('../../docs/sim/planner.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(html,/id="(?:save-build-count|saved-build-count)"/);
 assert.match(html,/<div class="save-actions"><button type="submit">Save<\/button><span id="save-error" class="error"/);
 assert.ok(planner.includes("defaultSaveName($('build-name').value, build.race, classId, build.level)"));
 assert.doesNotMatch(planner,/\d+ \/ \$\{BUILDS_PER_CLASS\}/);
});


test('Unicode build names, talents and equipment survive a shared link', () => {
  const build = { ...newBuild(), name: 'テスト build', talents: { 56: 1 }, gear: { mainhand: { id: 12345, label: 'Reference' } } };
  assert.deepEqual(decodeBuild(encodeBuild(build), data), build);
});

test('imports reject unsupported classes, unknown slots, illegal talents and malformed links', () => {
  for (const build of [
    { ...newBuild(), classId: 'rogue' },
    { ...newBuild(), gear: { unknown: { id: 123, label: '' } } },
    { ...newBuild(), talents: { 56: 4 } },
    { ...newBuild(), gear: { head: { id: -1, label: '' } } },
  ]) assert.throws(() => validateBuild(build, data));
  for (const encoded of ['a'.repeat(12001), '<script>', 'not-json']) assert.throws(() => decodeBuild(encoded, data));
});

test('equipment references accept only IDs or official HTTPS database item links', () => {
  assert.equal(parseItemReference(' 12345 '), 12345);
  assert.equal(parseItemReference('https://octowow.st/db/?item=12345'), 12345);
  for (const value of ['javascript:alert(1)', 'https://example.com/db/?item=123', 'https://octowow.st/db/?spell=123', '0', '1.5']) {
    assert.throws(() => parseItemReference(value));
  }
});

test('legacy character metadata is ignored but gender and secondary skills survive',()=>{const value=validateBuild({...newBuild(),characterName:'Old Name',gender:'female',skills:{Cooking:100,Survival:50,Gardening:25}},data);assert.equal(value.characterName,undefined);assert.equal(value.gender,'female');assert.deepEqual(value.skills,{Cooking:100,Survival:50,Gardening:25});});
