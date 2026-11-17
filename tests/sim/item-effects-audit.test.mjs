import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {classifyEquipmentEffect,equipmentItemAudit,equipmentSetAudit,parseItemSet,weaponSkillBonus} from '../../docs/sim/core/item-effects.mjs';
import {combineScopedEquipment,applyScopedEquipment} from '../../docs/sim/core/equipment-scopes.mjs';
import {characterStats,enchantStats} from '../../docs/sim/core/character-stats.mjs';import {newBuild} from '../../docs/sim/core/builds.mjs';import {ENCHANTS,validEnchant} from '../../docs/sim/core/equipment-options.mjs';
const root=new URL('../../docs/sim/data/',import.meta.url),load=n=>JSON.parse(fs.readFileSync(new URL(n,root),'utf8'));
const eq=load('items/equipment.json'),details={...load('items/details-supplement.json'),...load('items/details.json')};
const item=id=>({...eq.find(x=>x.id===id),...details[id]});
const stat=(raw,expected)=>assert.deepEqual(classifyEquipmentEffect(raw),{status:'passive',stats:expected});
test('real equipment records: all items have finite, explicitly classified effects; no Use or Chance on hit contributes',()=>{
 let lines=0;for(const listing of eq){if(!details[listing.id])continue;const a=equipmentItemAudit(item(listing.id));for(const e of a.effects){lines++;assert.ok(['passive','scoped','conditional','unmapped','event','empty'].includes(e.status));assert.ok(Object.values(e.stats).every(Number.isFinite));if(/^(Use:|Chance on hit:)/i.test(e.raw)){assert.equal(e.status,'event');assert.deepEqual(e.stats,{});}}assert.ok(Object.values(a.stats).every(Number.isFinite));}assert.ok(lines>5000);
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

test('crafted set bonuses require profession rank, while ordinary item stats do not',()=>{
 const gear={chest:item(19682),legs:item(19683),feet:item(19684)};
 const b=newBuild('mage');
 assert.equal(equipmentSetAudit(gear,b).stats.spellCrit,undefined);
 assert.equal(equipmentSetAudit(gear,{...b,skills:{Tailoring:299}}).stats.spellCrit,undefined);
 assert.equal(equipmentSetAudit(gear,{...b,skills:{Tailoring:300}}).stats.spellCrit,2);
 assert.equal(equipmentItemAudit(gear.chest,b).stats.spellHit,1);
});
test('the twin Hakkari blades have the same name but unique IDs and give the bonus only when both are equipped',()=>{
 const a=item(19865),b=item(19866);
 assert.ok(parseItemSet(a));assert.equal(parseItemSet(a).key,parseItemSet(b).key);
 assert.deepEqual(equipmentSetAudit({mainhand:a}).stats,{});
 assert.deepEqual(equipmentSetAudit({mainhand:a,offhand:a}).stats,{});
 assert.equal(equipmentSetAudit({mainhand:a,offhand:b}).stats['weaponSkill:7'],6);
});
test('damage-only and healing-only vectors do not cross-inflate each other',()=>{
 const b=newBuild('mage'),a=sheet(b,{chest:{effects:['Equip: Increases your spell damage by up to 120 and your healing by up to 300.','Equip: Increases damage and healing done by magical spells and effects by up to 10.']}});
 assert.equal(a.Spell['Spell Power'],'130');assert.equal(a.Spell['Healing Power'],'310');
});

test('all catalogue enhancements have explicit finite vectors or unresolved event status',()=>{
 assert.equal(new Set(ENCHANTS.map(e=>e.id)).size,ENCHANTS.length);
 for(const e of ENCHANTS){assert.ok(['passive','event'].includes(e.effectStatus),e.id);assert.ok(e.verification);assert.equal(Object.keys(e.effects).length>0,e.effectStatus==='passive',e.id);assert.ok(Object.values(e.effects).every(Number.isFinite),e.id);}
 assert.deepEqual(enchantStats('enchant_head_sp'),{sp:8});assert.deepEqual(enchantStats('enchant_legs_sp'),{sp:8});
 assert.deepEqual(enchantStats('enchant_head_priest_zg'),{sta:10,mp5:4,healingPower:24});assert.deepEqual(enchantStats('enchant_shoulder_resilience'),{healingPower:31,mp5:5});assert.deepEqual(enchantStats('enchant_mh_5wd'),{weaponDamage:5});
 assert.equal(validEnchant('enchant_head_priest_zg','head','priest',null,59),false);
 assert.equal(validEnchant('enchant_head_priest_zg','head','mage',null,60),false);
 assert.equal(validEnchant('enchant_head_priest_zg','head','priest',null,60),true);
 assert.equal(validEnchant('enchant_head_priest_zg','legs','priest',null,60),false);
});
test('actual item effects retain scoped ability and target modifiers, never apply them to the global stats',()=>{
 const a=equipmentItemAudit(item(867));assert.equal(a.stats.ap,undefined);
 const target=a.effects.find(e=>e.status==='scoped');assert.ok(target);
 assert.equal(combineScopedEquipment([target],{classOptions:{targetCreature:'Unspecified'}})[0].active,false);
 assert.equal(combineScopedEquipment([target],{classOptions:{targetCreature:'Undead'}})[0].amount,30);
 assert.equal(combineScopedEquipment([target],{classOptions:{targetCreature:'Undead'}})[0].active,true);
 assert.equal(combineScopedEquipment([target],{classOptions:{targetCreature:'Beast'}})[0].active,false);
});
test('scoped set cooldowns and damage combine only at an applicable ability, with unknown baselines null',()=>{
 const inputs=['(4) Set: Reduces the cooldown of your Gouge ability by 1 sec.','(5) Set: 15% increased damage to your Eviscerate ability.'].map(x=>classifyEquipmentEffect(x.replace(/^\(\d+\) Set: /,'')));
 const r=combineScopedEquipment(inputs);assert.equal(r.length,2);
 assert.equal(applyScopedEquipment(r,'Gouge',{cooldownSeconds:10}).cooldownSeconds,9);
 assert.equal(applyScopedEquipment(r,'Gouge',{}).cooldownSeconds,null);
 assert.ok(Math.abs(applyScopedEquipment(r,'Eviscerate',{damage:200}).damage-230)<1e-8);
 assert.equal(applyScopedEquipment(r,'Sinister Strike',{damage:200}).damage,200);
});
test('event gates and pet context do not manufacture permanent bonuses',()=>{
 const leech=classifyEquipmentEffect('Equip: 1% of damage dealt is returned as healing.');assert.equal(leech.status,'scoped');
 const event=classifyEquipmentEffect('Equip: When struck in combat has a chance of freezing the attacker in place for 3 sec.');assert.equal(event.status,'event');assert.deepEqual(event.stats,{});
 const p=classifyEquipmentEffect("Equip: Increases your pet's damage by 3%, maximum health by 5% and critical strike chance by 2%.");
 assert.equal(p.status,'scoped');assert.deepEqual(combineScopedEquipment([p],{classOptions:{pet:'None'}}).map(x=>x.active),[false,false,false]);assert.deepEqual(combineScopedEquipment([p],{classOptions:{pet:'Cat'}}).map(x=>x.amount),[3,5,2]);
});
