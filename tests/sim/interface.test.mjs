import test from 'node:test';
import assert from 'node:assert/strict';
import { CLASSES, SLOT_ICONS, iconUrl, plannerView, rememberPlannerView, rememberedPlannerView, rememberClass, LAST_CLASS_KEY, PLANNER_VIEW_KEY } from '../../docs/sim/core/interface.mjs';

test('all nine classes expose the shared planner', () => {
  assert.equal(CLASSES.length, 9);
  assert.equal(CLASSES.filter(cls=>cls.available).length,9);
  assert.equal(new Set(CLASSES.map(cls => cls.id)).size, 9);
});

test('class landing preserves existing shared-build and section links', () => {
  const base = 'https://equadis.github.io/OctoBot/sim/';
  assert.equal(plannerView(base), 'classes');
  assert.equal(plannerView(`${base}?class=warrior`), 'warrior');
  assert.equal(plannerView(`${base}#build=example`), 'warrior');
  assert.equal(plannerView(`${base}#talents`), 'warrior');
  for(const cls of CLASSES)assert.equal(plannerView(`${base}?class=${cls.id}`),cls.id);
  assert.equal(plannerView(`${base}?class=unknown`),'classes');
});

test('all equipment slots have safe icon identifiers', () => {
  assert.equal(Object.keys(SLOT_ICONS).length, 21);
  for (const name of Object.values(SLOT_ICONS)) assert.match(iconUrl(name), /^https:\/\/wow\.zamimg\.com\/images\/wow\/icons\/large\/[a-z0-9_]+\.jpg$/);
  assert.throws(() => iconUrl('../other-host'));
});


test('screen preference survives tab navigation without changing any class draft', () => {
  const base='https://equadis.github.io/OctoBot/sim/';
  const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
  for(const cls of CLASSES)values.set(`octosim.planner.draft.${cls.id}.v2`,JSON.stringify({classId:cls.id,gear:{head:{id:123}},talents:{example:3},controls:{consumables:['example']}}));
  const drafts=[...values.entries()];
  for(const cls of CLASSES){
    rememberPlannerView(plannerView(`${base}?class=${cls.id}`),storage);
    assert.equal(plannerView(base,rememberedPlannerView(storage)),cls.id);
    rememberPlannerView(plannerView(`${base}?classes`,rememberedPlannerView(storage)),storage);
    assert.equal(plannerView(base,rememberedPlannerView(storage)),'classes');
    assert.equal(values.get(LAST_CLASS_KEY),cls.id);
    // Explicit routes (including shared links) still override the saved screen.
    for(const next of CLASSES)assert.equal(plannerView(`${base}?class=${next.id}`,rememberedPlannerView(storage)),next.id);
    assert.equal(plannerView(`${base}#build=example`,rememberedPlannerView(storage)),'warrior');
  }
  for(const [key,value] of drafts)assert.equal(values.get(key),value);
});

test('screen preference migrates existing users and tolerates unavailable storage', () => {
  const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
  rememberClass('hunter',storage);
  assert.equal(rememberedPlannerView(storage),'hunter');
  rememberPlannerView('classes',storage);
  rememberPlannerView('unknown',storage);
  assert.equal(rememberedPlannerView(storage),'classes');
  values.set(PLANNER_VIEW_KEY,'invalid');
  assert.equal(rememberedPlannerView(storage),'hunter');
  const blocked={getItem(){throw Error();},setItem(){throw Error();}};
  assert.equal(rememberedPlannerView(blocked),null);
  assert.doesNotThrow(()=>rememberPlannerView('classes',blocked));
});
