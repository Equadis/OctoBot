import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {classifyEquipmentEffect,equipmentItemAudit,equipmentSetAudit,parseItemSet,weaponSkillBonus} from '../../docs/sim/core/item-effects.mjs';
import {characterStats,enchantStats} from '../../docs/sim/core/character-stats.mjs';import {newBuild} from '../../docs/sim/core/builds.mjs';import {ENCHANTS} from '../../docs/sim/core/equipment-options.mjs';
const root=new URL('../../docs/sim/data/',import.meta.url),load=n=>JSON.parse(fs.readFileSync(new URL(n,root),'utf8'));
const eq=load('items/equipment.json'),details={...load('items/details-supplement.json'),...load('items/details.json')};
const item=id=>({...eq.find(x=>x.id===id),...details[id]});
const stat=(raw,expected)=>assert.deepEqual(classifyEquipmentEffect(raw),{status:'passive',stats:expected});
test('real equipment records: all items have finite, explicitly classified effects; no Use or Chance on hit contributes',()=>{
 let lines=0;for(const listing of eq){if(!details[listing.id])continue;const a=equipmentItemAudit(item(listing.id));for(const e of a.effects){lines++;assert.ok(['passive','conditional','unmapped','event','empty'].includes(e.status));assert.ok(Object.values(e.stats).every(Number.isFinite));if(/^(Use:|Chance on hit:)/i.test(e.raw)){assert.equal(e.status,'event');assert.deepEqual(e.stats,{});}}assert.ok(Object.values(a.stats).every(Number.isFinite));}assert.ok(lines>5000);
});
test('reference vectors cover healing-only, damage schools, ranged-only, negative attributes, penetration and weapon skills',()=>{
 stat('Equip: Increases healing done by spells and effects by up to 24.',{healingPower:24});
 stat('Equip: Increases damage done by Holy spells and effects by up to 69.',{holySp:69});
 stat('Equip: Increases ranged attack speed by 10%.',{rangedHaste:10});
 stat('Equip: +14 ranged Attack Power.',{rangedAP:14});
 stat('Equip: Improves your chance to get a critical strike with spells and attacks by 1%.',{crit:1,spellCrit:1});
 stat("Equip: Your attacks ignore 20 of the target's armor.",{armorPen:20});
 stat('Equip: Increased Two-handed Swords +8.',{'weaponSkill:8':8});
 stat('Equip: Restores 3 health every 4 sec.',{hp5:3.75});
 assert.deepEqual(equipmentItemAudit({attributes:{Strength:4},tooltipText:'Example\n+4 Strength\n-5 Spirit\n(2) Set: +8 Stamina.'}).stats,{str:4,spi:-5});
 assert.equal(weaponSkillBonus({'weaponSkill:8':8},{classs:2,subclass:7}),0);
});
test('adversarial use, conditional and composite strings are not treated as a partial permanent bonus',()=>{
 for(const raw of ['Use: Increases your attack power by 200.','Equip: +30 Attack Power when fighting Undead.','Equip: Improves your chance to get a critical strike with spells by 2% when casting Fireball.','Equip: Improves spell critical strike chance by 1% and increases Shadow damage dealt by damage over time effects by 1%.','Equip: Decreases the magical resistances of your spell targets by 20 for 10 sec.'])assert.notEqual(classifyEquipmentEffect(raw).status,'passive',raw);
 const f={effects:['Equip: +28 Attack Power in Cat, Bear, Dire Bear, and Moonkin forms only.']};
 assert.deepEqual(equipmentItemAudit(f,newBuild('warrior')).stats,{});
 const b=newBuild('druid');b.classOptions.form='Cat';assert.deepEqual(equipmentItemAudit(f,b).stats,{ap:28});
});
test('real Fang set bonuses apply once at exact thresholds, not once for each item',()=>{
 const member=item(6473),s=parseItemSet(member);assert.equal(s.name,'Embrace of the Viper');
 const pieces=s.members.map(name=>{const id=eq.find(x=>x.name===name&&parseItemSet(item(x.id))?.key===s.key)?.id;assert.ok(id,name);return item(id);});
 const gear=n=>Object.fromEntries(pieces.slice(0,n).map((x,i)=>[String(i),x]));
 assert.deepEqual(equipmentSetAudit(gear(1)).stats,{});
 assert.equal(equipmentSetAudit(gear(2)).stats.natureSp,7);
 assert.equal(equipmentSetAudit(gear(3)).stats['weaponSkill:10'],2);
 assert.equal(equipmentSetAudit(gear(4)).stats.healingPower,11);
 assert.equal(equipmentSetAudit(gear(5)).stats.int,10);
 assert.equal(equipmentSetAudit({...gear(2),duplicate:pieces[0]}).stats.natureSp,7);
 const conflicting={...pieces[1],tooltipText:pieces[1].tooltipText.replace('up to 7.','up to 900.')};
 assert.deepEqual(equipmentSetAudit({a:pieces[0],b:conflicting}).stats,{});
});
test('all listed enhancement descriptions have finite values; ranged and school scope do not pass into melee or general SP',()=>{
 for(const e of ENCHANTS)assert.ok(Object.values(enchantStats(e.id)).every(Number.isFinite),e.id);
 assert.deepEqual(enchantStats('scope_18283'),{rangedHit:3});
 assert.deepEqual(enchantStats('enchant_hands_shadow_power'),{shadowSp:20});
 assert.deepEqual(enchantStats('enchant_chest_greater_stats'),{str:4,agi:4,sta:4,int:4,spi:4});
});
const sheet=(b,g)=>Object.fromEntries(characterStats(b,load('talents/'+b.classId+'.json'),g).groups.map(x=>[x.name,Object.fromEntries(x.rows.map(r=>[r.label,r.value]))]));
test('healing power, scope stats and quiver haste remain separate from generic spell power and melee',()=>{
 const b=newBuild('hunter'),g={ranged:{classs:2,subclass:2,attributes:{}},quiver:{classs:11,subclass:2,effects:['Equip: Increases ranged attack speed by 10%.']},chest:{attributes:{},effects:['Equip: Increases healing done by spells and effects by up to 24.']}};
 b.gear.ranged={id:10,label:'Bow',enchantId:'scope_18283'};
 const a=sheet(b,g);assert.equal(a.Melee['Haste'],'0.0%');assert.equal(a.Melee['Hit Rating'],'0%');assert.equal(a.Spell['Spell Power'],'0');assert.equal(a.Spell['Healing Power'],'24');assert.equal(a['Ranged Equipment Contributions']['Ranged-only Hit Bonus'],'3.0%');assert.equal(a['Ranged Equipment Contributions']['Ranged-only Haste'],'10.0%');
});
