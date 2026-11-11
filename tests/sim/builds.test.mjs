import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { newBuild, validateBuild, encodeBuild, decodeBuild, parseItemReference } from '../../docs/sim/core/builds.mjs';
const data = JSON.parse(await readFile(new URL('../../docs/sim/data/talents/warrior.json', import.meta.url)));

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
