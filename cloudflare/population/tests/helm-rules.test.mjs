import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeHelm,outfitter,resetOverlayCache} from '../src/outfitter.js';

// Regression tests for "equipping a hood makes the Goblin's head disappear". The viewer hides the geosets 100 x group to 100 x group + 99 for every
// hide row matching the race, and on the converted Goblin group 1 (geosets 100 to 199) is the head, so Zam's rule for a hood ("hide facial hair 1,
// 2 and 3") removed the whole head and left the eyes floating.
const zamHood=()=>({ModelFiles:{'1':[{FileDataId:1,Gender:0,Class:0,Race:1,ExtraData:-1}]},Item:{
 HideGeosetMale:[1,2,3,4,5,6,7,8,9].flatMap(race=>[1,2,3].map(group=>({RaceId:race,GeosetGroup:group,RaceBitSelection:0}))),
 HideGeosetFemale:[1,2,3,4,5,6,7,8,9].flatMap(race=>[1,2,3].map(group=>({RaceId:race,GeosetGroup:group,RaceBitSelection:0})))}});
const groups=(item,field,race)=>item.Item[field].filter(r=>r.RaceId===race).map(r=>r.GeosetGroup).sort((a,b)=>a-b);

test("Zam's hood rule that hides group 1 never reaches the converted Goblin: only the client's rule applies",()=>{
 const merged=mergeHelm(zamHood(),{models:{'9:0':9500000,'9:1':9500020},hide:{'9:0':[3],'9:1':[3]}});
 for(const field of ['HideGeosetMale','HideGeosetFemale']) {
  assert.deepEqual(groups(merged,field,9),[3],field);
  assert.ok(!groups(merged,field,9).includes(1),'the Goblin head (group 1) must stay visible under a hood');
 }
});

test('an older table without hide rules hides nothing for the converted races, rather than falling back to Zam rules or another race',()=>{
 const merged=mergeHelm(zamHood(),{'9:0':9500000,'10:1':9500060});
 assert.deepEqual(groups(merged,'HideGeosetMale',9),[]);
 assert.deepEqual(groups(merged,'HideGeosetFemale',10),[]);
 assert.deepEqual(groups(merged,'HideGeosetMale',8),[1,2,3],'original races keep their rows');
});

test('only races that have a converted model are touched, and the original eight races keep every Zam row',()=>{
 const before=zamHood();
 const merged=mergeHelm(zamHood(),{models:{'10:0':9500040},hide:{'10:0':[0,1],'9:0':[3]}});
 for(const race of [1,2,3,4,5,6,7,8,9]) for(const field of ['HideGeosetMale','HideGeosetFemale'])
  assert.deepEqual(groups(merged,field,race),groups(before,field,race),`race ${race} ${field}`);
 assert.deepEqual(groups(merged,'HideGeosetMale',10),[0,1]);
});

test('hide groups are validated: only whole numbers from 0 to 51 become rows',()=>{
 const merged=mergeHelm(zamHood(),{models:{'9:0':9500000},hide:{'9:0':[3,'1',-1,52,1.5,null,0]}});
 assert.deepEqual(groups(merged,'HideGeosetMale',9),[0,3]);
});

test('the Worker route applies the table entry to the helm data it serves, repeatedly and without accumulating rows',async()=>{
 resetOverlayCache();
 const bucket={get:async key=>key==='helms.json'?{body:JSON.stringify({'15372':{models:{'9:0':9500000},hide:{'9:0':[3]}}})}:null};
 const zam=async()=>new Response(JSON.stringify(zamHood()));
 for(let round=0;round<3;round++) {
  const r=await outfitter(new Request('https://api.test/api/outfitter/assets/meta/armor/1/15372.json'),zam,{MODELS:bucket});
  const item=await r.json();
  assert.deepEqual(groups(item,'HideGeosetMale',9),[3],`round ${round}`);
  assert.equal(item.ModelFiles['1'].filter(e=>e.Race===9).length,1);
 }
 resetOverlayCache();
});
