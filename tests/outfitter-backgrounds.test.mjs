import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BACKGROUNDS,findBackground} from '../docs/outfitter/backgrounds.mjs';

test('backgrounds cover exactly the nine classes and ten races',()=>{
  const classes=BACKGROUNDS.filter(b=>b.group==='Classes').map(b=>b.label).sort();
  const races=BACKGROUNDS.filter(b=>b.group==='Races').map(b=>b.label).sort();
  assert.deepEqual(classes,['Druid','Hunter','Mage','Paladin','Priest','Rogue','Shaman','Warlock','Warrior']);
  assert.deepEqual(races,['Dwarf','Gnome','Goblin','High Elf','Human','Night Elf','Orc','Tauren','Troll','Undead']);
  assert.equal(BACKGROUNDS.length,19);
});

test('races and classes outside the project are excluded; High Elf uses the blood elf image',()=>{
  const all=JSON.stringify(BACKGROUNDS).toLowerCase();
  for(const excluded of ['draenei','pandaren','worgen','death_knight','demon_hunter','monk'])assert.ok(!all.includes(excluded),excluded);
  assert.match(findBackground('race-highelf').url,/blood_elf/);
  assert.equal(findBackground('race-highelf').label,'High Elf');
});

test('ids are unique and every image URL is an https Wowpedia image',()=>{
  assert.equal(new Set(BACKGROUNDS.map(b=>b.id)).size,BACKGROUNDS.length);
  for(const background of BACKGROUNDS){
    const url=new URL(background.url);
    assert.equal(url.protocol,'https:');assert.equal(url.hostname,'static.wikia.nocookie.net');
    assert.match(url.pathname,/^\/wowpedia\/images\/[0-9a-f]\/[0-9a-f]{2}\/Dressing_room_%28[a-z_]+%29\.png$/);
  }
  assert.equal(findBackground('nope'),null);
});

test('the page offers a background selector, credits the source, and does not store backgrounds in shared outfits',()=>{
  const html=readFileSync(new URL('../docs/outfitter/index.html',import.meta.url),'utf8');
  const state=readFileSync(new URL('../docs/outfitter/state.mjs',import.meta.url),'utf8');
  assert.ok(html.includes('id="backdrop"'));
  assert.match(html,/Wowpedia/);
  assert.ok(!/backdrop|background/i.test(state)); // outfit codes and links are unchanged
});
