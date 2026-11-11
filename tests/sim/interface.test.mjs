import test from 'node:test';
import assert from 'node:assert/strict';
import { CLASSES, SLOT_ICONS, iconUrl, plannerView } from '../../docs/sim/core/interface.mjs';

test('class selection distinguishes planning support from future classes', () => {
  assert.equal(CLASSES.length, 9);
  assert.deepEqual(CLASSES.filter(cls => cls.available).map(cls => cls.id), ['warrior']);
  assert.equal(new Set(CLASSES.map(cls => cls.id)).size, 9);
});

test('class landing preserves existing shared-build and section links', () => {
  const base = 'https://equadis.github.io/OctoBot/sim/';
  assert.equal(plannerView(base), 'classes');
  assert.equal(plannerView(`${base}?class=warrior`), 'warrior');
  assert.equal(plannerView(`${base}#build=example`), 'warrior');
  assert.equal(plannerView(`${base}#talents`), 'warrior');
  assert.equal(plannerView(`${base}?class=rogue`), 'classes');
});

test('all equipment slots have safe icon identifiers', () => {
  assert.equal(Object.keys(SLOT_ICONS).length, 17);
  for (const name of Object.values(SLOT_ICONS)) assert.match(iconUrl(name), /^https:\/\/wow\.zamimg\.com\/images\/wow\/icons\/large\/[a-z0-9_]+\.jpg$/);
  assert.throws(() => iconUrl('../other-host'));
});
