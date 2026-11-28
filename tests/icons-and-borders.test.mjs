import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buffIcon,optionIcon,optionHasIcons,professionIcon,consumableIcon} from '../docs/sim/core/icons.mjs';
import {BUFF_OPTIONS} from '../docs/sim/core/configuration.mjs';
import {CLASS_OPTIONS} from '../docs/sim/core/class-options.mjs';
import {CONSUMABLES} from '../docs/sim/core/consumables.mjs';

const read=p=>readFileSync(new URL('../docs/'+p,import.meta.url),'utf8');
const css=read('sim/combat-layout.css'),room=read('outfitter/outfitter.css');
const validIcon=name=>/^[a-z0-9_]+$/.test(name);

test('item list and preview use the standard button border, the preview on #182333, and the sort arrow is unboxed',()=>{
 assert.match(css,/\.planner-view #item-selector \.item-results\{border:1px solid var\(--line\);border-radius:4px\}/);
 assert.match(css,/\.planner-view \.gear-preview\{border:1px solid var\(--line\);border-radius:4px;background:var\(--bg-control\);padding:12px\}/);
 assert.match(css,/#item-selector #item-direction\{border:0;background:transparent;box-shadow:none/);
 assert.match(read('site-theme.css'),/--bg-control:#182333/);
 assert.match(room,/\.browser \.results\{border:1px solid var\(--line\);border-radius:4px\}/);
 assert.match(read('sim/item-picker.mjs'),/\$\('item-direction'\)\.addEventListener\('click'/,'the toggle still works');
});
test('every raid buff, debuff and consumable entry has a valid icon or fails gracefully',()=>{
 // Entries whose icon is not yet identified render a blank slot of the same size. New entries must not join this list silently.
 const NO_ICON_YET=new Set(['flurry','wind-serpent','corrosive-poison','fengus','slipkik',...BUFF_OPTIONS.filter(option=>option.id.startsWith('mastery-')).map(option=>option.id)]);
 const missing=BUFF_OPTIONS.filter(option=>!buffIcon(option)&&!NO_ICON_YET.has(option.id)).map(option=>option.id);
 assert.deepEqual(missing,[],'entries without a known icon that are not on the known list');
 for(const option of BUFF_OPTIONS){const icon=buffIcon(option);if(icon)assert.match(icon,/^[a-z0-9_]+$/,option.id);}
 assert.equal(buffIcon({id:'battle-shout',name:'Battle Shout'}),'ability_warrior_battleshout');
 assert.equal(buffIcon({id:'mongoose',name:'Elixir of the Mongoose'}),'inv_potion_32','consumable buffs reuse the item icon');
 assert.equal(buffIcon({id:'nope',name:'Nothing'}),null);
 assert.ok(CONSUMABLES.filter(item=>consumableIcon(item)).length>CONSUMABLES.length*0.9,'the All Consumables list has icons from the item data');
});
test('seals, auras, stances, forms, poisons, pets and professions have icons; None has none',()=>{
 for(const option of Object.values(CLASS_OPTIONS).flat().filter(o=>o.values&&optionHasIcons(o.key))){
  for(const value of option.values){const icon=optionIcon(option.key,value);if(icon)assert.match(icon,/^[a-z0-9_]+$/,option.key+':'+value);}
 }
 for(const [key,value] of [['seal','Seal of Command'],['aura','Devotion Aura'],['stance','Berserker'],['form','Cat'],['mhPoison','Instant Poison VI'],['pet','Imp'],['aspect','Aspect of the Hawk']])assert.ok(optionIcon(key,value),key+':'+value);
 assert.equal(optionIcon('seal','None'),null);assert.equal(optionIcon('mhPoison','None'),null);
 assert.ok(professionIcon('Alchemy')&&professionIcon('First Aid'));assert.equal(professionIcon('Unknown'),null);
});
test('rows and dropdowns render the icons through shared code',()=>{
 const config=read('sim/configuration.mjs'),planner=read('sim/planner.mjs'),picker=read('sim/race-picker.mjs');
 assert.match(config,/const nameCell=\(text,icon\)=>/);assert.match(config,/nameCell\(option\.name,buffIcon\(option\)\)/);assert.match(config,/nameCell\(item\.name,consumableIcon\(item\)\)/);
 assert.match(config,/row-icon blank/,'a missing icon keeps a blank slot of the same size');
 assert.match(planner,/setupIconSelect\(document,input,\{label:option\.label,iconFor:/);
 assert.match(planner,/professionPickers\.push\(setupIconSelect/);
 assert.match(picker,/export const setupIconSelect=/);assert.match(picker,/iconFor=race=>raceIconUrl\(race,'male'\)/,'the race dropdown is the same component');
 assert.match(css,/\.row-icon\{display:inline-block;width:16px;height:16px;flex:none;/);
 assert.match(css,/\.row-icon\.blank\{visibility:hidden\}/);
});
