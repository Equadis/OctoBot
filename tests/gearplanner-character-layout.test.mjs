import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../docs/'+path,import.meta.url),'utf8');

test('the desktop planner gives Character and Buffs a wider column without scaling any content',()=>{
  const css=read('sim/combat-layout.css');
  assert.match(css,/\.planner-view \.planner-grid\{grid-template-columns:minmax\(400px,1\.15fr\) minmax\(0,1\.5fr\)/);
  assert.match(css,/@media\(max-width:940px\)\{\.planner-view \.planner-grid\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(css,/\.character-controls\{display:grid;grid-template-columns:132px minmax\(0,1fr\) 58px/);
});

test('Race, name, and Level appear in the same row in that order',()=>{
  const html=read('sim/index.html');
  const row=html.match(/<div class="character-controls">([\s\S]*?)<\/div>/)?.[1];
  assert.ok(row,'character controls exist');
  assert.ok(row.indexOf('id="character-race"')<row.indexOf('id="character-name"'));
  assert.ok(row.indexOf('id="character-name"')<row.indexOf('id="character-level"'));
  assert.equal((row.match(/class="field/g)||[]).length,3);
});

test('all five character stat groups start expanded and can be independently collapsed across rerenders',()=>{
  const stats=read('sim/core/character-stats.mjs'),planner=read('sim/planner.mjs'),css=read('sim/combat-layout.css');
  for(const name of ['Base Stats','Melee','Melee vs Target','Defence','Spell']){
    assert.ok(stats.includes("group('"+name+"'"),'missing '+name+' stats');
  }
  assert.match(planner,/const collapsedStatGroups = new Set\(\)/);
  assert.match(planner,/element\('details','character-stat-group'\)/);
  assert.match(planner,/section\.open=!collapsedStatGroups\.has\(group\.name\)/);
  assert.match(planner,/element\('summary','character-stat-toggle',group\.name\)/);
  assert.match(planner,/heading\.addEventListener\('click'/);
  assert.match(css,/\.character-stat-group\[open\]>\.character-stat-toggle::before/);
});

test('world info puts genuine guilds in angle brackets, but not Pugs',()=>{
  const js=read('world-info.js');
  assert.match(js,/function raidGroupLabel\(name\)/);
  assert.match(js,/if \(!label \|\| \/\^\(pug\|unknown\)\$\/i\.test\(label\)\) return label/);
  assert.match(js,/const name = raidGroupLabel\(guild\)/);
  assert.equal((js.match(/setRaidTitle\(title, session\.id !== null/g)||[]).length,2);
});

test('guild-led PUG brackets surround the guild only',()=>{
  const js=read('world-info.js');
  const functions=js.slice(js.indexOf('  function groupLabel('),js.indexOf('  // Build raid labels'));
  const format=new Function(functions+'\nreturn raidGroupLabel;')();
  assert.equal(format('Insomnia-led PUG'),'<Insomnia>-led PUG');
  assert.equal(format('<Insomnia>-led PUG'),'<Insomnia>-led PUG');
  assert.equal(format('Insomnia'),'<Insomnia>');
  assert.equal(format('PUG'),'Pug');
  assert.equal(format('Unknown'),'Unknown');
});
