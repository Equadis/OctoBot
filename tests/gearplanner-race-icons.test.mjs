import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {raceIconUrl,updateRaceIcons,RACE_ICON_BASE} from '../docs/sim/race-icons.mjs';
import {CLASS_RACES} from '../docs/sim/core/class-rules.mjs';
const docs=new URL('../docs/',import.meta.url);
const read=p=>readFileSync(new URL(p,docs),'utf8');

function fakeDoc(){
  const els={'race-icons':{hidden:false},'race-icon-male':{},'race-icon-female':{}};
  return {els,getElementById:id=>els[id]??null};
}

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

test('both portraits follow the selected race and are hidden for an unknown one',()=>{
  const d=fakeDoc();
  updateRaceIcons(d,'Troll');
  assert.equal(d.els['race-icon-male'].src,'../outfitter/races/troll_male.png');
  assert.equal(d.els['race-icon-female'].src,'../outfitter/races/troll_female.png');
  assert.equal(d.els['race-icon-female'].alt,'Troll female');
  assert.equal(d.els['race-icons'].hidden,false);
  updateRaceIcons(d,'Nonsense');
  assert.equal(d.els['race-icons'].hidden,true);
  updateRaceIcons({getElementById:()=>null},'Human');          // a page without the portraits must not throw
});

test('the portraits sit left of the Race selector, and the planner keeps them in step with it',()=>{
  const html=read('sim/index.html'),js=read('sim/planner.mjs');
  const controls=html.match(/<div class="character-controls">[\s\S]*?<label class="field">Race<select id="character-race">/)[0];
  assert.ok(controls.includes('id="race-icon-male"')&&controls.includes('id="race-icon-female"'),'both icons come before the Race label');
  assert.match(js,/import \{updateRaceIcons\} from '\.\/race-icons\.mjs/);
  assert.match(js,/\$\('character-race'\)\.addEventListener\('change', \(\) => updateRaceIcons/);
  assert.match(js,/\$\('character-race'\)\.value = build\.race;\s*updateRaceIcons/,'a restored build updates them too');
  assert.match(read('sim/combat-layout.css'),/\.character-controls\{display:grid;grid-template-columns:auto 1fr 80px/);
});

test('the section is called GearPlanner everywhere users see it',()=>{
  assert.match(read('site-nav.js'),/text: 'GearPlanner \(WIP\)'/);
  assert.match(read('sim/index.html'),/<title>OctoBot · GearPlanner \(WIP\)<\/title>/);
  assert.match(read('sim/index.html'),/<h1>GearPlanner \(WIP\)<\/h1>/);
  assert.match(read('index.html'),/home-card-title">GearPlanner <em>WIP<\/em>/);
  for(const p of ['site-nav.js','sim/index.html','index.html'])assert.doesNotMatch(read(p),/Gear Planner (?:&amp;|&) DPS Sim/,p);
});
