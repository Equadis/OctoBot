import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {statTone,enchantSummary} from '../../docs/sim/core/presentation.mjs';
import {CLASSES,plannerView,rememberClass,rememberedClass,LAST_CLASS_KEY} from '../../docs/sim/core/interface.mjs';
import {ENCHANTS} from '../../docs/sim/core/equipment-options.mjs';
const base='https://equadis.github.io/OctoBot/sim/';
test('reference stat colour categories are presentation-only and group-aware',()=>{
 for(const [group,label,value,tone] of [
  ['Base Stats','Strength','80','normal'],['Melee','Damage','207-245 | 103-114','normal'],['Melee','WS Crit','+0.20%','positive'],['Melee','WS Crit','-0.20%','negative'],['Melee','Armor Pen','0','muted'],['Melee','Hit Rating','0%','normal'],['Melee vs Target','Miss %','7.0% | 7.0%','negative'],['Melee vs Target','Glance Dmg','75% | 75%','warning'],['Melee vs Target','Eff. Crit','1.68% | 1.68%','positive'],['Melee vs Target','Armour','4211','negative'],['Defence','Armour','260','normal'],['Spell','Spell Crit','0.00%','normal'],['Spell','Fortune','0%','muted'],['Base Stats','Strength','—','muted']])assert.equal(statTone(group,label,value),tone,`${group}: ${label}`);
});
test('enchant display retains all bonuses and schools without mutating source names',()=>{
 const snapshot=JSON.stringify(ENCHANTS);
 assert.equal(enchantSummary({name:'Brilliant Opal Gemstone (+6 Agi)'}),'+6 Agi');
 assert.equal(enchantSummary({name:"Death's Embrace (+28 AP, +1% Dodge)"}),'+28 AP, +1% Dodge');
 assert.equal(enchantSummary({name:'Spell Power (MH) (+30 SP)'}),'+30 SP');
 assert.equal(enchantSummary({name:'Enchant Gloves - Shadow Power (+20 SP)'}),'+20 Shadow SP');
 assert.equal(enchantSummary({name:'+15 Agility (OH)'}),'+15 Agility');
 assert.equal(enchantSummary({name:'Enchant Chest - Greater Stats (+4 All)'}),'+4 All Stats');
 assert.equal(enchantSummary({name:'Crusader (MH)'}),'On-hit effect');
 assert.equal(enchantSummary(null),'No enchant');
 for(const enchant of ENCHANTS)assert.ok(enchantSummary(enchant));
 assert.equal(JSON.stringify(ENCHANTS),snapshot);
});
test('each class survives navigation and explicit URLs override the remembered class',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
 assert.equal(rememberedClass(storage),null);assert.equal(plannerView(base,rememberedClass(storage)),'classes');
 for(const cls of CLASSES){rememberClass(cls.id,storage);assert.equal(rememberedClass(storage),cls.id);assert.equal(plannerView(base,rememberedClass(storage)),cls.id);assert.equal(plannerView(`${base}?classes`,cls.id),'classes');for(const explicit of CLASSES)assert.equal(plannerView(`${base}?class=${explicit.id}`,cls.id),explicit.id);assert.equal(plannerView(`${base}#build=legacy`,cls.id),'warrior');}
 rememberClass('bad',storage);assert.equal(rememberedClass(storage),CLASSES.at(-1).id);values.set(LAST_CLASS_KEY,'bad');assert.equal(rememberedClass(storage),null);
 const blocked={getItem(){throw Error();},setItem(){throw Error();}};assert.equal(rememberedClass(blocked),null);assert.doesNotThrow(()=>rememberClass('mage',blocked));
});
test('footer keeps credits and external links use safe new tabs',()=>{
 const html=readFileSync(new URL('../../docs/sim/index.html',import.meta.url),'utf8');const footer=html.match(/<footer>([\s\S]*?)<\/footer>/)[1];
 for(const link of footer.matchAll(/<a ([^>]+)>/g)){assert.match(link[1],/target="_blank"/);assert.match(link[1],/rel="noopener noreferrer"/);}
 for(const address of ['https://github.com/Equadis/OctoBot','https://thrunk112.github.io/WarriorSim-TurtleWoW/turtle.html','https://www.combatgum.app/','https://github.com/isfir/wowsims-turtle','https://github.com/Barwaat/huntersim2-twow'])assert.ok(footer.includes(address));
 assert.match(footer,/Based on forks of/);assert.match(html,/class="all-classes" href="\?classes"/);
});
