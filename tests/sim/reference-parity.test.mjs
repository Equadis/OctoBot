// Parity checks of the planner's character sheet against independent references.
// Reference snapshots (retrieved 2026-11-15):
//  * Combat Gum (https://www.combatgum.app/rogue, Alpha v3.01): naked Rogue, level 60, default target, Weapon Skill Book on.
//  * WarriorSim-TurtleWoW a4aad9c ("turtle" mode of js/classes/player.js): miss, dodge, glancing, armour.
//  * WoWSims Turtle 64cfa6a, sim/core/base_stats.go: class base attack power, crit and dodge per agility.
// Expected values are written out here, not imported, so these tests compare two independent implementations.
// Tests marked `todo` record known differences that need OctoWoW evidence; they are reported but do not fail the suite.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newBuild} from '../../docs/sim/core/builds.mjs';
import {characterStats} from '../../docs/sim/core/character-stats.mjs';
import {racialPassives} from '../../docs/sim/core/class-rules.mjs';

const data = cls => JSON.parse(readFileSync(new URL(`../../docs/sim/data/talents/${cls}.json`, import.meta.url)));
const rows = (build, gear = {}) => Object.fromEntries(characterStats(build, data(build.classId), gear).groups.map(g => [g.name, Object.fromEntries(g.rows.map(r => [r.label, r.value]))]));
const pct = v => parseFloat(String(v));
const near = (actual, expected, eps, message) => assert.ok(Math.abs(actual - expected) <= eps, `${message}: expected ${expected}, got ${actual}`);

test('Combat Gum, Human Rogue 80/130/75 level 60 with Weapon Skill Book: every sheet value matches the live site', () => {
  const b = newBuild('rogue'); b.controls.buffIds = ['skill-book']; const r = rows(b);
  assert.deepEqual(r['Base Stats'], { Strength: '80', Agility: '130', Stamina: '75' });
  assert.equal(r.Melee['Wep Skill'], '305 | 305'); assert.equal(r.Melee.Power, '310'); assert.equal(r.Melee['WS Crit'], '+0.20%'); assert.equal(r.Melee['Crit Chance'], '4.68%');
  const t = r['Melee vs Target'];
  assert.deepEqual([t['Miss %'], t['Yellow Miss %'], t['Dodge %'], t['Spell Miss %'], t['Glance Dmg'], t['Crit Cap'], t['Eff. Crit'], t.Armour, t['Phys Reduced']],
    ['7.0% | 7.0%', '7.0%', '6.0% | 6.0%', '17.0%', '75% | 75%', '47.0% | 47.0%', '1.68% | 1.68%', '4211', '43.4%']);
  assert.deepEqual([r.Defence.Health, r.Defence['Parry %'], r.Defence['Dodge %'], r.Defence.Armour], ['2093', '5.0%', '9.0%', '260']);
});

test('Combat Gum race matrix (Rogue, level 60, naked): stats, power, crit and health agree for seven races', () => {
  // [race, strength, agility, stamina, power, crit %, health] read from the live site on 2026-11-15
  const observed = [['Human', 80, 130, 75, 310, 4.68, 2093], ['Orc', 83, 127, 77, 310, 4.58, 2113], ['Dwarf', 82, 126, 78, 308, 4.54, 2123], ['Gnome', 75, 133, 74, 308, 4.79, 2083],
    ['Undead', 79, 128, 76, 307, 4.61, 2103], ['Troll', 81, 132, 76, 313, 4.75, 2103], ['Night Elf', 77, 135, 74, 312, 4.86, 2083]];
  for (const [race, str, agi, sta, power, crit, health] of observed) {
    const b = newBuild('rogue'); b.race = race; b.controls.buffIds = ['skill-book']; const r = rows(b);
    assert.deepEqual([r['Base Stats'].Strength, r['Base Stats'].Agility, r['Base Stats'].Stamina, r.Melee.Power, r.Defence.Health], [String(str), String(agi), String(sta), String(power), String(health)], race);
    near(pct(r.Melee['Crit Chance']), crit, 0.011, `${race} crit`);
  }
});

test('attack table matches the Turtle-mode formulas of WarriorSim-TurtleWoW across weapon skill, hit and target level', () => {
  // Reference (js/classes/player.js, mode "turtle"): miss = 5 + max(diff * 0.2, 0) - hit; dodge = 5 + diff * 0.1;
  // glance chance = 10 + (defense - min(level * 5, skill)) * 2; glance damage = mean of 0.9 - 0.023 * diff and 1.0 - 0.017 * diff.
  for (const targetLevel of [60, 61, 62, 63]) for (const skillBook of [false, true]) for (const hit of [0, 3, 6, 9]) {
    const b = newBuild('rogue'); b.planning.targetLevel = targetLevel; b.controls.buffIds = skillBook ? ['skill-book'] : [];
    const gear = { mainhand: { id: 1, name: 'Test', classs: 2, subclass: 15, speed: 2, effects: hit ? [`Equip: Improves your chance to hit by ${hit}%.`] : [], tooltipText: '10 - 20 Damage\nSpeed 2.00' } };
    b.gear.mainhand = { id: 1, label: 'Test' };
    const skill = 300 + (skillBook ? 5 : 0), defense = targetLevel * 5, diff = Math.max(0, defense - skill);
    const t = rows(b, gear)['Melee vs Target'];
    const miss = Math.max(0, 5 + diff * 0.2 - hit), dodge = 5 + diff * 0.1, glance = Math.min(40, 10 + Math.max(0, defense - Math.min(300, skill)) * 2);
    const glanceDamage = (Math.max(Math.min(0.9 - 0.023 * diff, 0.9), 0.01) + Math.max(Math.min(1.0 - 0.017 * diff, 1.0), 0.2)) / 2 * 100;
    const label = `level ${targetLevel}, skill ${skill}, hit ${hit}`;
    near(pct(t['Miss %'].split('|')[0]), miss, 0.06, `miss, ${label}`);
    near(pct(t['Dodge %'].split('|')[0]), dodge, 0.06, `dodge, ${label}`);
    near(pct(t['Glance Dmg'].split('|')[0]), glanceDamage, 0.6, `glance damage, ${label}`);
    near(pct(t['Crit Cap'].split('|')[0]), Math.max(0, 100 - miss - dodge - glance), 0.11, `crit cap, ${label}`);
  }
});

test('armour mitigation is armour / (armour + 400 + 85 * level), as in Combat Gum, WarriorSim Turtle and WoWSims Turtle', () => {
  for (const armour of [0, 1000, 3402, 4211, 5980]) {
    const b = newBuild('rogue'); b.planning.targetArmour = armour;
    near(pct(rows(b)['Melee vs Target']['Phys Reduced']), 100 * armour / (armour + 400 + 85 * 60), 0.06, `armour ${armour}`);
  }
});

test('class coefficients match WoWSims Turtle base_stats.go: attack power, crit per agility, dodge per agility and base crit', () => {
  const apFlat = { warrior: 60 * 3 - 20, paladin: 60 * 3 - 20, hunter: 60 * 2 - 20, rogue: 60 * 2 - 20, shaman: 60 * 2 - 20, priest: -10, mage: -10, warlock: -10 };
  const apPerStr = { warrior: 2, paladin: 2, hunter: 1, rogue: 1, shaman: 2, priest: 1, mage: 1, warlock: 1 };
  const apPerAgi = { warrior: 0, paladin: 0, hunter: 0, rogue: 1, shaman: 0, priest: 0, mage: 0, warlock: 0 };
  const critAgi = { warrior: .05, paladin: .0506, hunter: .0189, rogue: .0345, priest: .05, shaman: .0508, mage: .0514, warlock: .05 };
  const dodgeAgi = { warrior: .05, paladin: .0506, hunter: .0378, rogue: .069, priest: .05, shaman: .0508, mage: .0514, warlock: .05 };
  const baseCrit = { warrior: 0, paladin: .7, hunter: 0, rogue: 0, priest: 3, shaman: 1.7, mage: 3.2, warlock: 2 };
  for (const cls of Object.keys(apFlat)) {
    const b = newBuild(cls); const r = rows(b); const str = +r['Base Stats'].Strength, agi = +r['Base Stats'].Agility;
    assert.equal(+r.Melee.Power, Math.round(apFlat[cls] + str * apPerStr[cls] + agi * apPerAgi[cls]), `${cls} attack power`);
    const stance = cls === 'warrior' && b.classOptions.stance === 'Berserker' ? 3 : 0;
    near(pct(r.Melee['Crit Chance'].split('|')[0]), baseCrit[cls] + agi * critAgi[cls] + stance, 0.011, `${cls} crit`);
    near(pct(r.Defence['Dodge %']), baseCrit[cls] + agi * dodgeAgi[cls] + (racialPassives(b.race).dodge || 0), 0.06, `${cls} dodge`);
  }
});

// ---- Known differences. Each needs OctoWoW evidence before either side is changed. ----

test('Night Elf racial: Combat Gum shows +1% haste and no dodge bonus; the planner shows +1% dodge and no haste', { todo: 'unresolved: needs the OctoWoW Night Elf racial text' }, () => {
  const b = newBuild('rogue'); b.race = 'Night Elf'; b.controls.buffIds = ['skill-book']; const r = rows(b);
  assert.equal(r.Melee.Haste, '1.0%'); assert.equal(r.Defence['Dodge %'], '9.3%');
});

test('Goblin and High Elf base stats: Combat Gum shows numbers, the planner shows NO DATA until verified', { todo: 'Combat Gum: Goblin Rogue 77/132/75, High Elf Rogue 77/135/73; no verified OctoWoW table' }, () => {
  for (const race of ['Goblin', 'High Elf']) { const b = newBuild('rogue'); b.race = race; assert.match(rows(b)['Base Stats'].Strength, /^\d+$/, race); }
});

test('class base stats: the Vanilla (cmangos) table differs from WoWSims Turtle for Mage and Priest health and mana', { todo: 'Mage health 1360 vs 1370, mana 1273 vs 1213; Priest health 1387 vs 1397, mana 1436 vs 1376; several spirit and intellect values differ by 2 to 6' }, () => {
  const b = newBuild('mage'); b.race = 'Human'; assert.equal(rows(b).Defence.Health, '1370');
});
