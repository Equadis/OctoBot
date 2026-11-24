import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {itemAuctionHref,itemDatabaseHref} from '../docs/world-chat/chat-interactions.mjs';

const read=p=>readFileSync(new URL('../docs/'+p,import.meta.url),'utf8');
const theme=read('site-theme.css');

test('the (i) icon is one shared muted grey style, with no gold variants left',()=>{
 assert.match(theme,/\.info-i\{[^}]*color:var\(--muted\)/);
 assert.match(theme,/\.info-i:hover,\.info-i:focus-visible\{border-color:#c0ccda;color:#e5e9ef/);
 for(const page of ['outfitter/outfitter.css','world-info.css'])assert.doesNotMatch(read(page),/\.info-i[^{]*\{[^}]*(#f4d65c|#9d8a35|#c9ae33)/,page);
});
test('Gear Planner: plain toolbar labels, no BETA tag, shared Under Construction banner on both views',()=>{
 const html=read('sim/index.html');
 assert.doesNotMatch(html,/BETA|release-beta/);
 assert.match(html,/<h1>Gear Planner &amp; DPS Simulator\s*<\/h1>/);
 for(const label of ['Save','Load','Share','Export','Import'])assert.match(html,new RegExp(`>${label}</button>`));
 assert.doesNotMatch(html,/>(Save|Load|Share|Export|Import) Build<\/button>/);
 const banner=html.match(/<div class="site-construction-banner"[^>]*>[\s\S]*?<\/div>/)[0];
 assert.equal(banner,read('guides/index.html').match(/<div class="site-construction-banner"[^>]*>[\s\S]*?<\/div>/)[0],'the exact banner markup used by Guides');
 assert.ok(html.indexOf('data-current="sim"')<html.indexOf('site-construction-banner')&&html.indexOf('site-construction-banner')<html.indexOf('id="class-selection"')&&html.indexOf('id="class-selection"')<html.indexOf('app-toolbar'));
});
test('item links use the item ID: Auction House in the same tab with the realm, database in a new tab',()=>{
 assert.equal(itemAuctionHref(19019,"N'Zoth"),"../auction-house/?realm=N%27Zoth&q=19019&open=19019");
 assert.equal(itemAuctionHref(19019),"../auction-house/?q=19019&open=19019");
 assert.equal(itemAuctionHref(19019,'Nowhere'),"../auction-house/?q=19019&open=19019","unknown realms are not passed on");
 assert.equal(itemAuctionHref(-1),null);assert.equal(itemAuctionHref('x'),null);
 assert.equal(itemDatabaseHref(19019),'https://octowow.st/db/?item=19019');
 const popup=read('world-chat/item-popup.mjs');
 assert.match(popup,/if\(external\)\{a\.target="_blank";a\.rel="noopener noreferrer";\}/);
 assert.match(popup,/a\.addEventListener\("click",e=>e\.stopPropagation\(\)\)/);
});
test('Hardcore Death Log no longer says All realms',()=>{
 assert.match(read('world-chat/index.html'),/<h2>Hardcore Death Log<\/h2>/);
});
test('Gear Planner and Dressing Room share one blue "DB ↗" link, and Dressing Room rows are fully clickable',()=>{
 assert.match(theme,/\.ext-db-link\{[^}]*color:#7ebbf0;font-size:10px/);
 assert.match(read('sim/item-picker.mjs'),/node\('a','DB ↗','item-db-link ext-db-link'\)/);
 assert.match(read('outfitter/outfitter.mjs'),/link\.className='ext-db-link'[^;]*;link\.target='_blank';link\.rel='noopener noreferrer';link\.textContent='DB ↗'/);
 assert.doesNotMatch(read('outfitter/outfitter.css'),/\.result a\{color:var\(--gold\)\}/);
 const code=read('outfitter/outfitter.mjs');
 assert.match(code,/row\.addEventListener\('click',event=>\{if\(event\.target\.closest\('a,\.info-i,button'\)\)return;button\.click\(\);\}\)/,'nested links and info icons keep their own action');
});

import {dayKey,dayLabel,startsDay} from '../docs/world-chat/chat-interactions.mjs';
test('World Chat date separators come from message times: one per UTC day, none duplicated',()=>{
 const at=iso=>({time:iso});
 const rows=[at('2026-11-23T23:59:58Z'),at('2026-11-23T23:59:59Z'),at('2026-11-24T00:00:01Z'),at('2026-11-24T10:00:00Z'),at('2026-11-25T00:00:00Z')];
 assert.deepEqual(startsDay(rows),[true,false,true,false,true]);
 assert.deepEqual(startsDay([]),[]);
 assert.deepEqual(startsDay(rows.slice(1,3)),[true,true],'loading older rows or filtering recomputes the boundaries');
 assert.equal(dayKey(rows[2]),'2026-11-24');
 assert.equal(dayLabel('2026-11-24'),'24 November 2026');
 assert.equal(dayLabel('2026-03-05'),'5 March 2026');
 const chat=readFileSync(new URL('../docs/world-chat/world-chat.js',import.meta.url),'utf8');
 assert.match(chat,/if\(starts\[i\]\)next\.append\(daySeparator\(dayKey\(row\)\)\)/);
 assert.match(chat,/focusSignature\(row\)\+\(starts\[i\]\?"\|day:"\+dayKey\(row\):""\)/,'a row whose day boundary changes is redrawn');
 assert.match(readFileSync(new URL('../docs/world-chat/world-chat.css',import.meta.url),'utf8'),/\.chat-day::before,\.chat-day::after\{content:"";flex:1;height:1px;background:var\(--line\)\}/);
});
