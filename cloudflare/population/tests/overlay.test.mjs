import test from 'node:test';
import assert from 'node:assert/strict';
import {outfitter,overlayKind,mergeHelm,resetOverlayCache} from '../src/outfitter.js';
import worker from '../src/index.js';

// The overlay serves OctoWoW's converted Goblin and Blood Elf files from a private bucket (env.MODELS); see README.md.
function fakeBucket(files) {
 const calls=[];
 return {calls,get:async key=>{calls.push(key);return files.has(key)?{body:files.get(key)}:null;}};
}
const noNetwork=async()=>{throw Error('Unexpected upstream request');};
const zamHelm=()=>({ModelFiles:{'17269':[{FileDataId:141044,Gender:0,Class:0,Race:3,ExtraData:-1},{FileDataId:141043,Gender:1,Class:0,Race:3,ExtraData:-1}]},Item:{InventoryType:1,HideGeosetMale:[{RaceId:7,GeosetGroup:1,RaceBitSelection:0},{RaceId:8,GeosetGroup:1,RaceBitSelection:0}],HideGeosetFemale:[{RaceId:8,GeosetGroup:1,RaceBitSelection:0}]},Textures:{2:141061}});
const asset=path=>new Request('https://api.test/api/outfitter/assets/'+path);

test('overlay paths are classified by validated id, never by guesswork',()=>{
 assert.equal(overlayKind('m2/9000000.m2'),'file');
 assert.equal(overlayKind('skin/9000001.skin'),'file');
 assert.equal(overlayKind('skel/9500102.skel'),'file');
 assert.equal(overlayKind('textures/9100001.webp'),'file');
 for(const p of ['meta/character/17.json','meta/character/20.json','meta/charactercustomization/18.json'])assert.equal(overlayKind(p),'meta');
 assert.equal(overlayKind('meta/armor/1/31260.json'),'helm');
 for(const p of ['m2/119940.m2','m2/8999999.m2','textures/9100001.png','meta/character/5.json','meta/character/21.json','meta/armor/3/31024.json','skin/9000001.m2','m2/9000000.skin'])assert.equal(overlayKind(p),null,p);
});

test('without a bucket the original races behave exactly as before, and the converted ones report an error instead of using Zam',async()=>{
 const urls=[];
 for(const path of ['meta/character/1.json','m2/119940.m2','meta/armor/1/31260.json']) {
  const r=await outfitter(asset(path),async url=>{urls.push(url);return new Response('{"x":1}');},{});
  assert.equal(r.status,200);
 }
 assert.deepEqual(urls,['meta/character/1.json','m2/119940.m2','meta/armor/1/31260.json'].map(p=>'https://wow.zamimg.com/modelviewer/classic/'+p));
 for(const path of ['meta/character/17.json','m2/9000000.m2']) {
  const r=await outfitter(asset(path),noNetwork,{});
  assert.equal(r.status,503,path);assert.equal((await r.json()).error,'models_unavailable');
 }
});

test('converted files come from the bucket only: found is served, missing is an explicit 404 with no upstream request',async()=>{
 const bucket=fakeBucket(new Map([['skin/9000001.skin','SKINBYTES'],['textures/9100001.webp','WEBP']]));
 const get=path=>outfitter(asset(path),noNetwork,{MODELS:bucket});
 const skin=await get('skin/9000001.skin');
 assert.equal(skin.status,200);assert.equal(await skin.text(),'SKINBYTES');
 assert.equal(skin.headers.get('content-type'),'application/octet-stream');assert.equal(skin.headers.get('access-control-allow-origin'),'*');
 assert.equal((await get('textures/9100001.webp')).headers.get('content-type'),'image/webp');
 const missing=await get('m2/9000999.m2');
 assert.equal(missing.status,404);assert.equal((await missing.json()).error,'model_file_missing');
});

test('character records come from the bucket; a missing record is a 503 and never Zam; other races never touch the bucket',async()=>{
 const bucket=fakeBucket(new Map([['meta/character/19.json','{"Model":9000100}']]));
 const upstream=[];
 const get=path=>outfitter(asset(path),async url=>{upstream.push(url);return new Response('{"Model":1}');},{MODELS:bucket});
 assert.equal(await (await get('meta/character/19.json')).text(),'{"Model":9000100}');
 const missing=await get('meta/character/17.json');
 assert.equal(missing.status,503);assert.equal((await missing.json()).error,'models_unavailable');
 assert.equal(upstream.length,0,'no request to Zam was made for a converted race');
 await get('meta/character/5.json');
 assert.equal(upstream.length,1);
 assert.ok(!bucket.calls.includes('meta/character/5.json'));
});

test('helm item data gains Goblin and Blood Elf models and hair-hiding rows, replacing nothing else',()=>{
 const item=mergeHelm(zamHelm(),{'9:0':9500000,'9:1':9500020,'10:0':9500040,'10:1':9500060});
 const files=item.ModelFiles['17269'];
 assert.equal(files.length,6);
 assert.deepEqual(files.filter(e=>e.Race===3).map(e=>e.FileDataId).sort(),[141043,141044]);
 assert.deepEqual(files.filter(e=>e.Race===10).map(e=>[e.Gender,e.FileDataId]).sort(),[[0,9500040],[1,9500060]]);
 assert.deepEqual(item.Item.HideGeosetMale.filter(r=>r.RaceId===9||r.RaceId===10).map(r=>r.RaceId).sort(),[10,9]);
 assert.equal(item.Item.HideGeosetFemale.filter(r=>r.RaceId===10).length,1);
 assert.equal(item.Textures[2],141061);
});

test('helm merge replaces an existing entry for the same race and ignores ids outside the overlay range or malformed keys',()=>{
 const item=zamHelm();item.ModelFiles['17269'].push({FileDataId:111,Gender:0,Class:0,Race:9,ExtraData:-1});
 mergeHelm(item,{'9:0':9500000,'9:7':9500001,'abc':9500002,'10:0':5});
 const files=item.ModelFiles['17269'];
 assert.deepEqual(files.filter(e=>e.Race===9).map(e=>e.FileDataId),[9500000]);
 assert.equal(files.filter(e=>e.Race===10).length,0);
 assert.deepEqual(mergeHelm(zamHelm(),{}),zamHelm());
 assert.equal(mergeHelm(null,{'9:0':9500000}),null);
 assert.deepEqual(mergeHelm({ModelFiles:null},{'9:0':9500000}),{ModelFiles:null});
});

test('helm requests merge the bucket table into the upstream data, cache the table, and pass other helms through untouched',async()=>{
 resetOverlayCache();
 const bucket=fakeBucket(new Map([['helms.json',JSON.stringify({'31260':{'9:0':9500000,'10:1':9500060}})]]));
 const upstream=[];
 const get=id=>outfitter(asset(`meta/armor/1/${id}.json`),async url=>{upstream.push(url);return new Response(JSON.stringify(zamHelm()));},{MODELS:bucket});
 const merged=await (await get(31260)).json();
 assert.deepEqual(merged.ModelFiles['17269'].filter(e=>e.Race>=9).map(e=>e.FileDataId).sort(),[9500000,9500060]);
 const other=await (await get(99999)).json();
 assert.equal(other.ModelFiles['17269'].length,2);
 assert.equal(bucket.calls.filter(k=>k==='helms.json').length,1,'the table is loaded once, not per request');
 assert.equal(upstream.length,2);
 resetOverlayCache();
});

test('a broken or missing helm table never breaks Zam helms',async()=>{
 for(const files of [new Map(),new Map([['helms.json','not json']]),new Map([['helms.json','[1,2]']])]) {
  resetOverlayCache();
  const r=await outfitter(asset('meta/armor/1/31260.json'),async()=>new Response(JSON.stringify(zamHelm())),{MODELS:fakeBucket(files)});
  assert.equal(r.status,200);assert.equal((await r.json()).ModelFiles['17269'].length,2);
 }
 resetOverlayCache();
 const failing={get:async()=>{throw Error('bucket down');}};
 const r=await outfitter(asset('meta/armor/1/31260.json'),async()=>new Response(JSON.stringify(zamHelm())),{MODELS:failing});
 assert.equal(r.status,200);
 resetOverlayCache();
});

test('the worker passes its bindings to the appearance route',async()=>{
 const bucket=fakeBucket(new Map([['m2/9000000.m2','MODEL']]));
 const r=await worker.fetch(new Request('https://api.test/api/outfitter/assets/m2/9000000.m2'),{MODELS:bucket});
 assert.equal(await r.text(),'MODEL');
});
