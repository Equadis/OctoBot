import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateTalents, setTalentRank, talentTotals } from '../../docs/sim/core/talents.mjs';

const data = JSON.parse(await readFile(new URL('../../docs/sim/data/talents/warrior.json', import.meta.url)));
const named = name => data.talents.find(talent => talent.name === name);
const points = entries => Object.fromEntries(entries.map(([name, rank]) => [named(name).id, rank]));

test('official snapshot contains 54 talents and complete prerequisite references', () => {
  assert.equal(data.talents.length, 54);
  assert.deepEqual(data.trees.map(tree => tree.maxPoints), [49, 55, 53]);
  assert.equal(named('Master of Arms').maxRanks, 5);
  assert.equal(named('Improved Slam').maxRanks, 2);
  assert.equal(named('Shield Slam').row, 4);
  for (const talent of data.talents) {
    assert.ok(talent.spellIds.length);
    if (talent.requires !== null) assert.ok(data.talents.some(parent =>
      parent.tree === talent.tree && parent.position === talent.requires && parent.maxRanks >= talent.requiresRanks));
  }
});

test('published custom rank parameters are retained as facts without upstream substitution', () => {
  assert.deepEqual(named('Boundless Anger').rankParameters, [[10, 20, 30]]);
  assert.deepEqual(named('Master of Arms').rankParameters[1], [1.2, 2.4, 3.6, 4.8, 6]);
});

test('unknown talents, fractional ranks, overspending and invalid levels are rejected', () => {
  assert.ok(validateTalents(data, { '999999': 1 }).length);
  assert.ok(validateTalents(data, points([['Cruelty', 0.5]])).length);
  assert.ok(validateTalents(data, points([['Cruelty', 6]])).length);
  assert.ok(validateTalents(data, points([['Cruelty', 1]]), 9).length);
  assert.ok(validateTalents(data, {}, 61).length);
  assert.deepEqual(validateTalents(data, {}, 1), []);
});

test('tier gates and prerequisites are enforced even with enough points elsewhere', () => {
  const lower = points([['Improved Heroic Strike', 3], ['Tactical Mastery', 5], ['Improved Rend', 2]]);
  assert.deepEqual(validateTalents(data, { ...lower, [named('Deep Wounds').id]: 1 }), []);
  const missingPrerequisite = { ...lower, [named('Improved Rend').id]: 0, [named('Improved Charge').id]: 2, [named('Deep Wounds').id]: 1 };
  assert.match(validateTalents(data, missingPrerequisite).join(';'), /Missing prerequisite/);
  assert.match(validateTalents(data, points([['Cruelty', 5], ['Master Strike', 1]])).join(';'), /lower-tier/);
});

test('removing required points is transactional and totals survive serialisation', () => {
  const original = points([['Improved Heroic Strike', 3], ['Tactical Mastery', 5], ['Improved Rend', 2], ['Deep Wounds', 1]]);
  const before = JSON.stringify(original);
  assert.throws(() => setTalentRank(data, original, named('Improved Rend').id, 1));
  assert.equal(JSON.stringify(original), before);
  const restored = JSON.parse(before);
  assert.deepEqual(validateTalents(data, restored), []);
  assert.deepEqual(talentTotals(data, restored), [11, 0, 0]);
  const increased = setTalentRank(data, original, named('Deep Wounds').id, 2);
  assert.equal(increased[named('Deep Wounds').id], 2);
  assert.equal(original[named('Deep Wounds').id], 1);
});
