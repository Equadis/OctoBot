import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {requestJson,preloadGeometry} from '../docs/outfitter/service.mjs';

// The Dressing Room shows OctoWoW's converted Goblin and High Elf. These checks guard the pieces that keep a returning visitor from seeing an old
// model: every asset URL is built from one versioned base, nothing is refused up front, and the service's explicit errors reach the page.
const source=fs.readFileSync(new URL('../docs/outfitter/outfitter.mjs',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../docs/outfitter/index.html',import.meta.url),'utf8');

test('no race is refused before the appearance service is asked',()=>{
 assert.ok(!/\n\s*if\(current\.race===10\)throw/.test(source),'an unconditional High Elf refusal would hide the OctoWoW model');
 assert.ok(!/current\.race===10\)throw Error\('The Classic model library has no High Elf/.test(source),'the old "no High Elf in the Classic library" text must not be thrown for a race the service now supplies');
});

test('every asset URL comes from the single versioned base, built from the service version route',()=>{
 assert.equal((source.match(/\/api\/outfitter\/assets\//g)||[]).length,1,'only loadAssetBase may spell the plain assets URL');
 assert.match(source,/async function loadAssetBase\(\)\{/);
 assert.match(source,/getJson\(`\$\{endpoint\}\/api\/outfitter\/models-version`\)/);
 assert.match(source,/assetBase=`\$\{plain\}v\$\{version\}\/`/);
 assert.match(source,/getJson\(`\$\{assetBase\}meta\/character\/\$\{current\.race\*2-1\+current\.gender\}\.json`\)/);
 assert.match(source,/preloadGeometry\(assetBase,character\.Model\)/);
 assert.match(source,/contentPath:assetBase,/);
 assert.match(source,/getJson\(`\$\{assetBase\}meta\/charactercustomization\/\$\{chrModelId\}\.json`\)/);
 assert.match(source,/await loadAssetBase\(\);(?:await loadSkins\(\);)?renderItems\(\);/,'the base is set before the first model is built');
});

test('the version is only accepted in the shape the service issues',()=>{
 assert.match(source,/\/\^\[0-9a-f\]\{8,32\}\$\/\.test\(version\)/);
});

test('changed scripts carry new version strings so returning visitors load them',()=>{
 assert.match(html,/outfitter\.mjs\?v=20261122-skins3/);
 assert.match(source,/service\.mjs\?v=20261117-versioned1/);
});

function reply(status,body){return async()=>new Response(JSON.stringify(body),{status});}

test('the converted races report the service error instead of a Classic-library message',async()=>{
 await assert.rejects(requestJson('https://api.test/x',reply(503,{error:'models_unavailable',message:'The OctoWoW Goblin and High Elf models are not available right now.'})),/OctoWoW Goblin and High Elf models are not available/);
 await assert.rejects(requestJson('https://api.test/x',reply(404,{error:'model_file_missing'})),/missing from the OctoWoW model set/);
 await assert.rejects(preloadGeometry('https://api.test/',9000000,reply(503,{error:'models_unavailable'})),/OctoWoW Goblin and High Elf models are not available/);
});

test('the original races keep their existing error handling',async()=>{
 await assert.rejects(requestJson('https://api.test/x',reply(404,{error:'something else'})),/not available in the Classic model library/);
 await assert.rejects(requestJson('https://api.test/x',reply(404,{error:'not_found'})),/not available yet/);
 await assert.rejects(requestJson('https://api.test/x',reply(500,{})),/temporarily unavailable/);
 assert.deepEqual(await requestJson('https://api.test/x',reply(200,{Model:119940})),{Model:119940});
});
