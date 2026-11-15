import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
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

// ---- Model fallback helpers (approximate previews for items missing from the Classic library)
import {buildNameIndex,sameNameItems,buildIconIndex,sameIconItems} from '../docs/outfitter/state.mjs';
const catalogue=[
  {id:47282,name:'Felheart Leggings',slot:7,classs:4,subclass:1,icon:'inv_pants_09'},
  {id:70752,name:'Felheart Leggings',slot:7,classs:4,subclass:1,icon:'inv_pants_09'},
  {id:16810,name:'Felheart Pants',slot:7,classs:4,subclass:1,icon:'inv_pants_09'},
  {id:9000,name:'Felheart Leggings',slot:7,classs:4,subclass:2,icon:'inv_pants_09'}, // different armour type
  {id:9001,name:'felheart leggings',slot:8,classs:4,subclass:1,icon:'inv_pants_09'}, // different slot
  {id:100,name:'Plain Pants',slot:7,classs:4,subclass:1,icon:'inv_pants_01'},
];
test('same-name matches need the same slot and armour type, ignore case, and exclude the item itself',()=>{
  const index=buildNameIndex(catalogue);
  assert.deepEqual(sameNameItems(index,catalogue[0]).map(i=>i.id),[70752]);
  assert.deepEqual(sameNameItems(index,catalogue[5]),[]);
  assert.equal(sameNameItems(index,{...catalogue[0],id:1,name:'FELHEART leggings'}).length,2);
});
test('same-icon matches come lowest item ID first, within the same slot and armour type, and are capped',()=>{
  const index=buildIconIndex(catalogue);
  assert.deepEqual(sameIconItems(index,catalogue[0]).map(i=>i.id),[16810,70752]);
  assert.deepEqual(sameIconItems(index,catalogue[5]),[]);
  assert.deepEqual(sameIconItems(index,{id:5,slot:7,classs:4,subclass:1,icon:'inv_pants_09'},1).map(i=>i.id),[16810]);
  assert.deepEqual(sameIconItems(index,{id:5,slot:7,classs:4,subclass:1}),[]); // no icon, no match
});

test('the race picker lists all ten races, including Goblin and High Elf, each with an icon for both bodies',()=>{
  const state=readFileSync(new URL('../docs/outfitter/state.mjs',import.meta.url),'utf8');
  for(const name of ['Goblin','High Elf'])assert.ok(state.includes(`'${name}'`),name);
  for(const key of ['goblin','highelf'])for(const body of ['male','female'])assert.ok(existsSync(new URL(`../docs/outfitter/races/${key}_${body}.png`,import.meta.url)),`${key}_${body}`);
});

test('uploading a background photo opens a crop with the viewer shape before it is used',()=>{
  const html=readFileSync(new URL('../docs/outfitter/index.html',import.meta.url),'utf8');
  const script=readFileSync(new URL('../docs/outfitter/outfitter.mjs',import.meta.url),'utf8');
  assert.match(html,/<dialog id="crop-dialog"/);
  assert.match(html,/id="crop-zoom"/);
  assert.match(script,/openPhotoCrop\(bitmap\)/);
  assert.match(script,/Photo not changed/);   // cancelling leaves the background alone
});
