import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {raceIconUrl,RACE_ICON_BASE} from '../docs/sim/race-icons.mjs';
import {CLASS_RACES} from '../docs/sim/core/class-rules.mjs';
const docs=new URL('../docs/',import.meta.url);
const read=p=>readFileSync(new URL(p,docs),'utf8');

test('every race a class can pick has a male and a female portrait file',()=>{
  const races=new Set(Object.values(CLASS_RACES).flat());
  assert.ok(races.size>=8);
  for(const race of races)for(const sex of ['male','female']){
    const url=raceIconUrl(race,sex);
    assert.ok(url,`${race} ${sex} has a mapping`);
    assert.ok(existsSync(fileURLToPath(new URL('sim/'+url,docs))),`${url} exists next to the Gear Planner`);
  }
});

test('unknown races and sexes get no icon rather than a wrong one',()=>{
  assert.equal(raceIconUrl('Murloc','male'),null);
  assert.equal(raceIconUrl('Human','other'),null);
  assert.equal(raceIconUrl('Night Elf','female'),RACE_ICON_BASE+'nightelf_female.png');
});

test('Race, character name and Level share a row without an extra portrait column',()=>{
  const html=read('sim/index.html'),css=read('sim/combat-layout.css');
  assert.match(html,/<div class="character-controls"><label class="field">Race<select id="character-race">/);
  assert.doesNotMatch(html,/race-icon/);
  assert.match(html, /id="character-race"[\s\S]*id="build-name"[\s\S]*id="character-level"/,'the build name sits between race and level');
  assert.match(css,/\.character-controls\{display:grid;grid-template-columns:132px minmax\(0,1fr\) 58px;gap:14px;align-items:end\}/,'the name takes available width while Race and Level retain their sizes');
});

test('the race dropdown shows one portrait to the left of every race, like the Dressing Room background picker',()=>{
  const picker=read('sim/race-picker.mjs'),js=read('sim/planner.mjs'),css=read('sim/combat-layout.css');
  assert.match(picker,/for\(const sex of \['male'\]\)/,'one portrait per race');
  assert.match(picker,/frag\.append\(portraits\(doc,race,iconFor\),label\)/,'portraits come before the race name');
  assert.match(picker,/role="listbox"|setAttribute\('role','listbox'\)/);
  assert.match(picker,/e\.key==='Escape'/);
  assert.match(picker,/select\.addEventListener\('change',sync\)/,'the hidden select stays the source of truth');
  assert.match(js,/racePicker = setupRacePicker\(document, \$\('character-race'\), undefined, \{ iconFor: race => raceIconUrl\(race, build\?\.gender \|\| 'male'\) \}\)/);
  assert.match(js,/\$\('character-race'\)\.value = build\.race;\s*racePicker\?\.sync\(\)/,'a restored build refreshes the dropdown');
  for(const cls of ['.rp-native','.rp-button','.rp-list','.rp-option','.rp-faces'])assert.ok(css.includes(cls),cls);
});

test('the section is called Gear Planner (two words, no WIP) in the navigation and on the home page; only the page title says Gear Planner & DPS Simulator',()=>{
  assert.match(read('site-nav.js'),/text: 'Gear Planner' \}/);
  assert.match(read('sim/index.html'),/<title>OctoBot · Gear Planner &amp; DPS Simulator<\/title>/);
  assert.match(read('sim/index.html'),/<h1>Gear Planner &amp; DPS Simulator<\/h1>/);
  assert.match(read('index.html'),/home-card-title">Gear Planner<\/span>/);
  for(const p of ['site-nav.js','index.html']){
    assert.doesNotMatch(read(p),/DPS Sim/,p+' keeps the short name');
  }
  for(const p of ['site-nav.js','sim/index.html','index.html']){
    assert.doesNotMatch(read(p),/GearPlanner|DPS Sim(?!ulator)/,p);
  }
});
