import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../docs/'+p,import.meta.url),'utf8');
const sim=read('sim/index.html'),room=read('outfitter/index.html'),theme=read('site-theme.css'),css=read('sim/combat-layout.css'),picker=read('sim/item-picker.mjs'),planner=read('sim/planner.mjs');

test('the Gear Planner has a horizontal toolbar in the specified order and no sidebar',()=>{
 const toolbar=sim.match(/<div class="app-toolbar"[\s\S]*?<\/div>\s*<div class="app-toolbar-status">[\s\S]*?<\/div>\s*<\/div>/)[0];
 const labels=[...toolbar.matchAll(/<(?:a|button)[^>]*>([^<]+)<\/(?:a|button)>/g)].map(m=>m[1]);
 assert.deepEqual(labels,['← All classes','Save','Load','Share','Export','Import','Reset all']);
 assert.match(toolbar,/<div class="app-toolbar-status"><p id="feedback" role="status" aria-live="polite"><\/p><button id="reset-all" class="reset-all"/,'status and Reset all sit on the right');
 assert.ok(sim.indexOf('data-current="sim"')<sim.indexOf('app-toolbar')&&sim.indexOf('app-toolbar')<sim.indexOf('id="equipment"'),'between the tabs and the Character section');
 assert.doesNotMatch(sim,/rail-brand|OctoSim|class="actions"|planner-topbar|planner-actions-status/);
 assert.doesNotMatch(css,/\.rail-brand|\.section-links|\.planner-view \.actions|\.planner-view \.toolbar|planner-actions-status|calc\(100vw - 3[23]0px\)/,'no leftover rail rules or reserved width');
 assert.doesNotMatch(planner,/rail-brand/);
});
test('the Dressing Room uses the same toolbar with Save, Share, Export, Import, status and Reset all',()=>{
 const toolbar=room.match(/<div class="app-toolbar"[\s\S]*?<button id="reset"[^>]*>Reset all<\/button><\/div><\/div>/)[0];
 const ids=[...toolbar.matchAll(/<button id="([a-z-]+)"/g)].map(m=>m[1]);
 assert.deepEqual(ids,['save','share','export','import','reset']);
 assert.match(toolbar,/<p id="feedback" role="status" aria-live="polite">/);
 assert.ok(room.indexOf('data-current="outfitter"')<room.indexOf('app-toolbar')&&room.indexOf('app-toolbar')<room.indexOf('class="workspace"'));
 assert.doesNotMatch(room,/outfit-actions|planner-topbar/,'old button homes are gone');
 assert.equal((room.match(/id="save"/g)||[]).length,1);
 const code=read('outfitter/outfitter.mjs');
 assert.match(code,/\$\('export'\)\.onclick/);assert.match(code,/\$\('import'\)\.onclick=\(\)=>\{\$\('outfit-code'\)\.value=''/);
 assert.match(code,/\$\('share'\)\.onclick=\(\)=>\{\$\('share-name'\)\.value=''/,'the named Share dialog is unchanged');
});
test('both pages share one toolbar stylesheet with the global button colour and destructive Reset all',()=>{
 assert.match(theme,/\.app-toolbar\{display:flex;flex-wrap:wrap;[^}]*justify-content:space-between/);
 assert.match(theme,/\.app-toolbar button,\.app-toolbar a\.app-btn\{[^}]*min-height:34px;[^}]*background:var\(--bg-control\)/);
 assert.match(theme,/\.app-toolbar \.reset-all\{[^}]*color:#ff746c;border-color:#88413b;background:#352326\}/);
 assert.match(theme,/\.app-toolbar-status\{[^}]*margin-left:auto/);
 assert.match(theme,/@media\(max-width:560px\)\{\.app-toolbar-status\{flex-basis:100%/,'wraps on narrow screens');
});
test('hovering an equipped item drives the right-hand preview and nothing else',()=>{
 assert.match(planner,/button\.addEventListener\(start, \(\) => picker\?\.hoverEquipped\(slot\)\)/);
 assert.match(planner,/button\.addEventListener\(end, \(\) => picker\?\.endHover\(\)\)/);
 assert.doesNotMatch(planner,/equipmentTooltip/,'the floating item tooltip is gone from equipment slots');
 const hover=picker.slice(picker.indexOf('function hoverEquipped'),picker.indexOf('function endHover'));
 assert.doesNotMatch(hover,/slot=|selectItem|onEquip|\.value=/,'hover never changes the slot, filters or build');
 assert.match(hover,/paintHovered\(\)/);
 assert.match(picker.slice(picker.indexOf('function endHover')),/paintPreview\(previewed/,'leaving restores the previous preview');
 assert.match(picker,/const id=hovered\?hovering\.enchantId:\$\('item-enchant'\)\.value,slotKey=hovered\?hovering\.slot:slot/,'the equipped enchant is shown');
 assert.match(picker,/if\(!hovering\)paintPreview/,'a slow detail load cannot overwrite the hovered item');
});
test('class cards fade #182333 from the top edge to clear by about 31% of the height, beneath the text, icon and border',()=>{
 assert.match(css,/--art-overlay:linear-gradient\(180deg,rgb\(24,35,51\) 0%,.*?rgba\(24,35,51,0\) 33%\),linear-gradient/);
 assert.match(css,/\.art-card::after\{content:"";position:absolute;inset:0;z-index:-1;/,'overlay layer is behind the content');
 assert.match(css,/\.art-card::before\{[^}]*z-index:-2/,'artwork is behind the overlay');
});
