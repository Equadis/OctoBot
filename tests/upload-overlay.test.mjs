import test from 'node:test';
import assert from 'node:assert/strict';
import {plan,contentType} from '../tools/models/upload_overlay.mjs';

const manifest={files:{'m2/9000000.m2':{bytes:10,sha256:'a'},'textures/9100000.webp':{bytes:20,sha256:'b'},'meta/character/17.json':{bytes:5,sha256:'c'},'helms.json':{bytes:7,sha256:'d'}}};

test('a first run uploads everything; a rerun uploads only what is new or changed',()=>{
 assert.equal(plan(manifest).length,4);
 assert.deepEqual(plan(manifest,{'m2/9000000.m2':'a','helms.json':'d'}).map(f=>f.key),['textures/9100000.webp','meta/character/17.json']);
 assert.deepEqual(plan(manifest,{'m2/9000000.m2':'OLD','textures/9100000.webp':'b','meta/character/17.json':'c','helms.json':'d'}).map(f=>f.key),['m2/9000000.m2']);
});

test('keys that could escape the folder or break the command line are never uploaded',()=>{
 const bad={files:{'../secret.txt':{bytes:1,sha256:'x'},'a b.m2':{bytes:1,sha256:'y'},'m2/$(x).m2':{bytes:1,sha256:'z'},'m2/ok.m2':{bytes:1,sha256:'w'}}};
 assert.deepEqual(plan(bad).map(f=>f.key),['m2/ok.m2']);
});

test('content types match what the Worker serves',()=>{
 assert.equal(contentType('meta/character/17.json'),'application/json');
 assert.equal(contentType('textures/1.webp'),'image/webp');
 assert.equal(contentType('skel/1.skel'),'application/octet-stream');
});

test('version.json is always uploaded last, so a build goes live only when all of its files are in place',()=>{
 const withVersion={files:{'version.json':{bytes:1,sha256:'v'},'m2/9000000.m2':{bytes:10,sha256:'a'},'meta/character/17.json':{bytes:5,sha256:'c'}}};
 const keys=plan(withVersion).map(f=>f.key);
 assert.equal(keys.at(-1),'version.json');assert.equal(keys.length,3);
 assert.deepEqual(plan(withVersion,{'m2/9000000.m2':'a','meta/character/17.json':'c'}).map(f=>f.key),['version.json']);
});
