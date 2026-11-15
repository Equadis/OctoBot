import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {relabelOptions} from '../docs/outfitter/customization.mjs';

const options=()=>[{id:100,name:'Skin Color',order:1,choices:[{id:1}]},{id:104,name:'Facial Hair',order:5,choices:[{id:2}]}];

test('the facial hair option is called Features on Goblins and Earrings on the High Elf woman',()=>{
 for(const [model,label] of [[17,'Features'],[18,'Features'],[20,'Earrings']]) {
  const result=relabelOptions(options(),model);
  assert.equal(result.find(o=>o.id===104).name,label,String(model));
  assert.equal(result.find(o=>o.id===100).name,'Skin Color');
 }
});

test('every other body keeps the library names, and the input is never changed',()=>{
 for(const model of [1,2,16,19,21,undefined,null]) assert.equal(relabelOptions(options(),model).find(o=>o.id===104).name,'Facial Hair',String(model));
 const original=options();relabelOptions(original,17);
 assert.equal(original[1].name,'Facial Hair');
});

test('the Dressing Room applies the relabelling to what it loads, with a cache-busted import',()=>{
 const source=fs.readFileSync(new URL('../docs/outfitter/outfitter.mjs',import.meta.url),'utf8');
 assert.match(source,/relabelOptions\(visibleOptions\(await customizationCache\.get\(chrModelId\)\),chrModelId\)/);
 assert.match(source,/from '\.\/customization\.mjs\?v=[\w-]+'/);
});
