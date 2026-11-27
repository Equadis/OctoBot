import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SORT_OPTIONS} from '../docs/sim/core/equipment-options.mjs';
import {measureScrollingNames} from '../docs/scrolling-names.mjs';

const read=p=>readFileSync(new URL('../docs/'+p,import.meta.url),'utf8');
const html=read('sim/index.html'),css=read('sim/combat-layout.css'),config=read('sim/configuration.mjs'),picker=read('sim/item-picker.mjs'),planner=read('sim/planner.mjs');

test('the item selector sits beside the character and preview in three equal columns, with no modal dialog',()=>{
 assert.doesNotMatch(html,/<dialog id="item-dialog"/);
 assert.ok(html.indexOf('gear-character')<html.indexOf('id="item-selector"')&&html.indexOf('id="item-selector"')<html.indexOf('id="item-preview"'));
 assert.match(css,/\.planner-view \.gear-workspace\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:1199px\)[\s\S]*?\.gear-character\{grid-column:1\/-1\}/,'narrower screens stack the character above the selector and preview');
 assert.match(css,/@media\(max-width:760px\)[\s\S]*?\.gear-workspace\{grid-template-columns:minmax\(0,1fr\)\}/);
});
test('search, quality and sorting share a row of equal-height controls',()=>{
 const form=html.slice(html.indexOf('<form id="item-form"'),html.indexOf('</form>',html.indexOf('<form id="item-form"')));
 const labels=[...form.matchAll(/<label class="field">([^<]+)</g)].map(match=>match[1]);
 assert.deepEqual(labels,['Search','Quality','Sort by']);
 assert.match(form,/placeholder="Item name or ID"/);
 assert.match(form,/<option value="">All qualities<\/option>/);
 assert.match(css,/\.item-filter-grid\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/\.item-filter-grid input,\.planner-view \.item-filter-grid select\{[^}]*height:34px/);
 assert.deepEqual(SORT_OPTIONS[0],['new','New Items']);
});
test('the enchant control is part of the preview header and survives preview updates',()=>{
 const start=html.indexOf('class="item-preview-top"'),end=html.indexOf('id="item-preview-details"');
 assert.ok(start>html.indexOf('id="item-preview"')&&end>start);
 assert.match(html.slice(start,end),/id="item-preview-summary"[\s\S]*id="item-enchant"/);
 assert.match(picker,/\$\('item-preview-summary'\)\.replaceChildren\(header\)/);
});
test('hover panning uses the actual overflow at a constant speed and stops flagging names that fit',()=>{
 const classes=new Set(), properties=new Map();
 let textWidth=136;
 const label={
  firstElementChild:{getBoundingClientRect:()=>({width:textWidth})},
  closest:()=>true,
  getBoundingClientRect:()=>({width:100}),
  classList:{toggle:(name,on)=>on?classes.add(name):classes.delete(name)},
  style:{setProperty:(name,value)=>properties.set(name,value)},
 };
 const root={querySelectorAll:()=>[label]};
 measureScrollingNames(root);
 assert.ok(classes.has('hover-scroll-name'));
 assert.equal(properties.get('--name-distance'),'36px');
 const duration=parseFloat(properties.get('--name-duration'));
 textWidth=172;
 measureScrollingNames(root);
 assert.equal(properties.get('--name-distance'),'72px');
 assert.equal(parseFloat(properties.get('--name-duration')),2*duration);
 textWidth=100;
 measureScrollingNames(root);
 assert.equal(classes.has('hover-scroll-name'),false);
 assert.match(css,/\.ah-name-clip\{[^}]*text-overflow:ellipsis/);
 assert.match(css,/\.hover-scroll-name:hover>\.ah-name-text\{animation:planner-name-pan var\(--name-duration\) linear forwards/);
});
test('the count is left and the sort arrow right, descending by default, and the list scrolls on its own',()=>{
 assert.match(html,/class="item-count-row"><span id="item-count"[^>]*><\/span><button id="item-direction"[^>]*>▼<\/button>/);
 assert.match(picker,/direction='desc'/);
 assert.match(css,/\.item-count-row\{display:flex;[^}]*justify-content:space-between/);
 assert.match(css,/#item-selector \.item-results\{[^}]*overflow-y:auto/);
 assert.match(css,/\.gear-selector,\.planner-view \.gear-preview\{[^}]*height:min\(780px/,'fixed height keeps the list scroll from moving the other columns');
});
test('the preview shows the selected enchant without changing item data',()=>{
 assert.match(picker,/Enchanted: \$\{enchant\.name/);
 assert.match(picker,/function previewEnchant\(item\)/);
 assert.match(picker,/\$\('item-enchant'\)\.addEventListener\('change',\(\)=>\{[^}]*repaintPreview\(\)/);
 assert.doesNotMatch(picker.slice(picker.indexOf('function paintPreview'),picker.indexOf('async function previewItem')),/details\[[^\]]+\]\s*=/,'the preview never writes to item data');
 assert.match(planner,/openItem\(startSlot,/);assert.match(planner,/: 'head';/,'a slot is always selected so the selector is never empty');
});
test('Buffs & Debuffs start expanded and the tall panel cannot stretch the gaps between the others',()=>{
 assert.doesNotMatch(planner,/starts minimised/);
 assert.match(config,/open:\['raid','target'\]\.includes\(group\.id\)/,'Raid Buffs and Target Debuffs open by default');
 assert.match(css,/grid-template-rows:repeat\(6,auto\) 1fr/);
 assert.match(css,/"buffs \."/);
});
test('consumables are one line, named All Consumables, grey only the name when blocked and explain why',()=>{
 assert.match(config,/'All Consumables'/);assert.doesNotMatch(config,/Class Consumables/);
 assert.match(config,/title:'Does not stack with:',lines:conflicts\.map/);
 assert.match(config,/aria-disabled/,'the box stays at full opacity and hoverable');
 assert.match(css,/\.buff-row\.conflicted \.buff-name\{color:/);
 assert.match(css,/\.buff-row:has\(input:disabled\):not\(\.conflicted\)\{opacity:\.45/,'only restricted rows dim; conflicts never fade the row');
 assert.match(css,/grid-template-columns:13px minmax\(0,calc\(50% - 13px\)\) minmax\(0,1fr\)/,'names take at most half the width');
 assert.match(config,/ah-name-clip/);assert.match(read('site-theme.css'),/@keyframes ah-name-pan/);
 assert.match(read('auction-house/auction.js'),/scrolling-names\.mjs/,'the Auction House uses the same helper');
});

const stripMarkup=value=>value;
test('stat signs never read "+-"',async()=>{
 const {fixSigns}=await import('../docs/sim/core/signs.mjs');
 assert.equal(fixSigns('+-20 Shadow Resistance'),'-20 Shadow Resistance');
 assert.equal(fixSigns('+7 Fire Resistance\n+ -5 Stamina'),'+7 Fire Resistance\n-5 Stamina');
 assert.equal(stripMarkup(fixSigns('+15 Agility')),'+15 Agility');
 assert.match(picker,/const signed=value=>`\$\{Number\(value\)<0\?'-':'\+'\}/);
});
test('shirt and tabard, trinket enchants and the em-dashed None are gone, and no talent text sits in the class panel',()=>{
 assert.doesNotMatch(html,/Appearance<\/summary>|slots-appearance/);
 assert.match(planner,/\['shirt', 'tabard'\]\.includes\(slot\)\) continue/);
 assert.match(planner,/const enchantable=!\['trinket1','trinket2'\]\.includes\(slot\)/);
 assert.match(picker,/\.hidden=slot==='trinket1'\|\|slot==='trinket2'/);
 assert.doesNotMatch(html+picker,/— None —/);
 assert.doesNotMatch(html,/id="talent-split"|id="points-left"|id="equipment-count"/);
 assert.doesNotMatch(planner,/talent-split|slots planned/);
 assert.match(html,/class="character-summary">[\s\S]*?id="gear-stats"[\s\S]*?<\/div>\s*<div id="slots-right"/,'stats sit inside the central class panel');
});
test('the selector and preview are flat, with no nested dark panels or heavy borders',()=>{
 assert.match(css,/\.gear-selector,\.planner-view \.gear-preview\{border:0;background:transparent/);
 assert.match(css,/#item-selector \.item-results\{background:transparent;border:0/);
 assert.match(css,/\.gear-preview \.item-full-tooltip\{background:transparent;border:0/);
 assert.match(read('sim/tooltip.mjs'),/tooltipText/,'equipped-slot hover shows the full item tooltip');
});
