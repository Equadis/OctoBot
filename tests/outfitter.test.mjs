import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyOutfit,normalise,equip,exportTmog,importTmog,encode,decode,viewerSlot,filterItems} from '../docs/outfitter/state.mjs';
test('Tmog codes preserve game inventory slots, including cloak and both hands',()=>{
 const outfit={...emptyOutfit(),gear:{1:16866,15:15138,16:19364,19:5976}};
 assert.deepEqual(importTmog(exportTmog(outfit)).gear,outfit.gear);
 assert.deepEqual(importTmog('T.O.L.').gear,{});
 for(const code of ['T.O.L.1:1;alert(1)','T.O.L.2:16866;','T.O.L.1:0;','T.O.L.1:9999999999999;','T.O.L.1:4'])assert.throws(()=>importTmog(code));
});
test('share links round trip race, body and visibility without accepting unknown fields',()=>{
 const outfit={...emptyOutfit(),race:8,gender:1,hideHead:true,gear:{1:16866}};
 assert.deepEqual(decode(encode(outfit)),outfit);
 assert.deepEqual(normalise({race:999,gender:4,gear:{1:-1,2:42,'__proto__':3}}),emptyOutfit());
 assert.throws(()=>decode('%bad'));
});
test('equipping a two-hander clears off-hand and rejects wrong slots',()=>{
 const outfit={...emptyOutfit(),gear:{17:19349}};
 assert.deepEqual(equip(outfit,16,{id:19364,slot:17}).gear,{16:19364});
 assert.deepEqual(outfit.gear,{17:19349});
 assert.throws(()=>equip(outfit,1,{id:19364,slot:17}));
 assert.equal(viewerSlot(15,{slot:16}),16);
 assert.equal(viewerSlot(16,{slot:17}),21);
 assert.equal(viewerSlot(17,{slot:14}),22);
 assert.equal(viewerSlot(5,{slot:20}),5);
});
test('browser searches name and ID, separates inventory slots, and combines filters',()=>{
 const items=[{id:1,name:'Zinc Hat',slot:1,classs:4,subclass:1,quality:1},{id:2,name:'Azure Hat',slot:1,classs:4,subclass:2,quality:3},{id:3,name:'Azure Sword',slot:13,classs:2,subclass:7,quality:3}];
 assert.deepEqual(filterItems(items,{slot:1}).map(i=>i.id),[2,1]);
 assert.deepEqual(filterItems(items,{slot:1,query:'2'}).map(i=>i.id),[2]);
 assert.equal(filterItems(items,{slot:1,query:'azure',subclass:'4:1'}).length,0);
 assert.equal(filterItems(items,{slot:1,query:'azure',quality:'3'}).length,1);
});

test('undeployed service and missing model errors have distinct readable messages',async()=>{
 const {requestJson}=await import('../docs/outfitter/service.mjs');
 await assert.rejects(requestJson('https://api.test',async()=>new Response('{"error":"not_found"}',{status:404})),/service is not available yet/);
 await assert.rejects(requestJson('https://api.test',async()=>new Response('{"error":"This appearance is not available"}',{status:404})),/Classic model library/);
 await assert.rejects(requestJson('https://api.test',async()=>new Response('upstream error',{status:502})),/temporarily unavailable/);
 assert.deepEqual(await requestJson('https://api.test',async()=>new Response('{"id":16866}')),{id:16866});
});
