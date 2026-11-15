import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// High Elf has no model in Zam's library. The Dressing Room must try the appearance service first, so a service that also serves OctoWoW's own
// models (see cloudflare/population/README.md) gives a 3D preview, and only a service without them shows the explanation.
const source=fs.readFileSync(new URL('../docs/outfitter/outfitter.mjs',import.meta.url),'utf8');

test('High Elf is not refused before the appearance service is asked',()=>{
 assert.ok(!/\n\s*if\(current\.race===10\)throw/.test(source),'an unconditional High Elf refusal would hide the OctoWoW model');
 assert.match(source,/meta\/character\/\$\{current\.race\*2-1\+current\.gender\}\.json`\)\.catch\(error=>\{if\(current\.race===10\)throw Error\('The Classic model library has no High Elf/);
});

test('the page loads a cache-busted script so the change reaches returning visitors',()=>{
 const html=fs.readFileSync(new URL('../docs/outfitter/index.html',import.meta.url),'utf8');
 assert.match(html,/outfitter\.mjs\?v=20261117-models1/);
});
