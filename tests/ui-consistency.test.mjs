import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {layout,buildChart} from '../docs/auction-house/chart.mjs';
import {validate,DEFAULTS} from '../docs/auction-house/filters.mjs';
import {parseSnapshotQuery} from '../docs/auction-house/snapshot-query.mjs';

const read=p=>readFileSync(new URL('../docs/'+p,import.meta.url),'utf8');
const theme=read('site-theme.css'),ah=read('auction-house/auction.js'),ahHtml=read('auction-house/index.html');

test('one expand/collapse control: heading text is the button, triangle on its right, down open and right closed',()=>{
 assert.match(theme,/\.collapse-toggle::after,\.collapse-arrow\{content:'▾';flex:none;font-size:12px/);
 assert.match(theme,/\.collapse-toggle\[aria-expanded=false\]::after,details:not\(\[open\]\)>summary\.collapse-toggle::after\{content:'▸'\}/);
 assert.match(read('sim/combat-layout.css'),/\.panel-toggle::after\{content:'▾';font-size:12px;color:#a0b1c8\}/,'the Gear Planner arrow is the reference');
 assert.match(ahHtml,/<h2 id="fav-title"><button id="fav-collapse" type="button" class="collapse-toggle"[^>]*>Favorite items/);
 assert.doesNotMatch(ah,/textContent=hide\?'Show':'Hide'/);
 assert.match(ah,/el\('summary',title,'collapse-toggle'\)/);
 const chat=read('world-chat/index.html');
 assert.match(chat,/toggle\.className='collapse-toggle chat-section-toggle'/);assert.match(chat,/toggle\.append\(\.\.\.title\.childNodes\);title\.append\(toggle\)/);
 assert.match(read('world-chat/world-chat.js'),/header\.append\(icon,label,arrow,node\("span","lfg-group-count"/);
});
test('compact labels reuse the Auction House scrolling name effect and only animate when they overflow',()=>{
 for(const file of ['sim/item-picker.mjs','outfitter/outfitter.mjs','sim/configuration.mjs','sim/planner.mjs'])assert.match(read(file),/ah-name-clip/,file);
 assert.match(read('sim/item-picker.mjs'),/clip\('span',item\.name,`q\$\{item\.quality\}`\)/);
 assert.match(read('sim/item-picker.mjs'),/clip\('div',shortStats\(/);
 assert.match(read('sim/planner.mjs'),/slot-enchant ah-name-clip/);
 assert.match(read('scrolling-names.mjs'),/classList\.toggle\('ah-scroll-name',overflow>2\)/,'only overflowing text is flagged');
 assert.match(theme,/@media\(prefers-reduced-motion:reduce\)\{\.ah-name-clip\.ah-scroll-name \.ah-name-text\{animation:none\}\}/);
});
test('talent tree titles are 4pt larger',()=>{
 assert.match(read('sim/combat-layout.css'),/\.planner-view \.tree-heading h3\{font-size:calc\(11px \+ 4pt\)\}/);
});
test('Auction House: seller by name or GUID, Load More in pages of 20, listings open by default',()=>{
 assert.match(ahHtml,/<label class="ah-field">Seller<input id="owner" autocomplete="off" maxlength="24" placeholder="Username or GUID">/);
 assert.doesNotMatch(ahHtml,/inputmode="numeric" placeholder="Numeric GUID"/);
 for(const ok of ['Bob','bobby','1234567890'])assert.equal(validate({...DEFAULTS,owner:ok}).owner,undefined,ok);
 for(const bad of ['Bob_1','a b','%','x'.repeat(25)])assert.ok(validate({...DEFAULTS,owner:bad}).owner,bad);
 assert.equal(parseSnapshotQuery(new URLSearchParams('owner=Bob')).error,undefined);
 assert.equal(parseSnapshotQuery(new URLSearchParams('owner=Bob')).listingFiltered,true,'name searches use the API path');
 assert.match(ah,/const LISTING_PAGE=20/);assert.match(ah,/const hist=section\('Price history',true\)/);assert.match(ah,/const auctions=section\('Auction listings \('\+count\(total\)/);
 assert.match(ah,/Load More/);assert.match(ah,/if\(loading\|\|!hasMore\)return/,'no overlapping requests');assert.match(ah,/seen\.has\(r\.auction_id\)/,'no duplicates');
 assert.match(ah,/listParams\.set\('limit',String\(LISTING_PAGE\)\)/);
});
test('price history points carry their real day and price and a themed tooltip shows them',()=>{
 const days=[{day:'2026-11-01',representative_unit:1000},{day:'2026-11-02',representative_unit:1250},{day:'2026-11-03',representative_unit:900}];
 assert.equal(layout(days).points.length,3);
 assert.match(read('auction-house/chart.mjs'),/'data-day':p\.day,'data-value':p\.value/);
 assert.doesNotMatch(read('auction-house/chart.mjs'),/el\('title'/,'no slow native tooltips');
 assert.match(ah,/function wireChartTooltip\(svg\)/);assert.match(ah,/moneyNode\(Number\(dot\.dataset\.value\)\)/);assert.match(ah,/formatDay\(dot\.dataset\.day\)/);
 assert.match(ah,/svg\.addEventListener\('pointerdown',onPointer\)/,'touch works');
 assert.match(read('auction-house/auction.css'),/\.ah-chart-dot\.active\{/);
});
test('American English in user-facing text',()=>{
 for(const [file,phrase] of [['auction-house/index.html','Favorite items'],['sim/core/items.mjs','Plate armor requires level 40.'],['sim/core/character-stats.mjs',"group('Defense'"],['index.html','customize your character'],['world-info/index.html','Boss color key']])assert.ok(read(file).includes(phrase),file+': '+phrase);
 assert.match(read('auction-house/index.html'),/lang="en-US"/);
});
