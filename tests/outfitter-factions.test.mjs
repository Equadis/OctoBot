import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RACES} from '../docs/outfitter/state.mjs';
test('race picker groups all races once, Alliance first, without changing Body controls',()=>{
 const source=readFileSync(new URL('../docs/outfitter/outfitter.mjs',import.meta.url),'utf8');
 const groups=[...source.matchAll(/\['(Alliance|Horde)',\[([\d,]+)\]\]/g)].map(m=>[m[1],m[2].split(',').map(Number)]);
 assert.deepEqual(groups,[['Alliance',[1,3,4,7,10]],['Horde',[2,5,6,8,9]]]);
 assert.deepEqual(groups.flatMap(g=>g[1]).sort((a,b)=>a-b),RACES.map(r=>r[0]).sort((a,b)=>a-b));
 assert.match(source,/buttons\.append\(button\)/);assert.match(source,/function renderBodies\(\)/);
});
