import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {newBuild} from '../../docs/sim/core/builds.mjs';
import {characterStats} from '../../docs/sim/core/character-stats.mjs';
import {petProfile} from '../../docs/sim/core/pet-audit.mjs';
import {petContextAudit,HAPPINESS_VALUES} from '../../docs/sim/core/pet-context-audit.mjs';
import {classifyEquipmentEffect, equipmentSetAudit} from '../../docs/sim/core/item-effects.mjs';
import {combineScopedEquipment} from '../../docs/sim/core/equipment-scopes.mjs';
const details=JSON.parse(fs.readFileSync(new URL('../../docs/sim/data/items/details.json',import.meta.url)));
const item=id=>({...details[id],id});
const effect=(raw,source)=>({...classifyEquipmentEffect(raw),source});
const amount=(p,stat)=>p.equipment.find(e=>e.stat===stat)?.amount;
test('equipped passive pet damage lines stack as contributions, never fabricate a total multiplier',()=>{
 const b=newBuild('hunter');b.classOptions.pet='Cat';
 const scoped=combineScopedEquipment([effect("Equip: Increases your pet's damage by 3%, maximum health by 5% and critical strike chance by 2%.",'Breastplate'),effect('Equip: Increases damage dealt by your pet by 3%.','Boots'),effect("Increases your pet's damage by 3%.",'Set')],b);
 const p=petContextAudit(b,petProfile(b),scoped);
 assert.equal(amount(p,'damagePct'),9);assert.equal(amount(p,'healthPct'),5);assert.equal(amount(p,'critPct'),2);assert.equal(p.damageMultiplier,null);assert.ok(p.equipment.every(e=>e.active));
});
test('real item tooltip fixtures flow into pet context without player-stat leakage',()=>{
 const b=newBuild('hunter');b.classOptions.pet='Cat';const gear={chest:item(60784),feet:item(22061),hands:item(22015)};
 const p=characterStats(b,{talents:[]},gear);
 assert.equal(amount(p.petContext,'damagePct'),6);assert.equal(amount(p.petContext,'critPct'),4);assert.equal(amount(p.petContext,'healthPct'),5);
 b.classOptions.pet='None';assert.ok(characterStats(b,{talents:[]},gear).petContext.equipment.every(e=>!e.active));
 b.classOptions.pet='Cat';b.level=9;b.classOptions.petLevel=9;const invalid=characterStats(b,{talents:[]},gear);assert.ok(invalid.equipmentAudit.scoped.filter(e=>e.scope==='Pet').every(e=>!e.active));
});
test('set threshold contributions apply once to the companion, never to every member',()=>{
 const b=newBuild('hunter');b.classOptions.pet='Wolf';
 const gear={a:item(21401),b:item(21402),c:item(21403)};
 const p=characterStats(b,{talents:[]},gear);
 assert.equal(equipmentSetAudit(gear,b).active.filter(x=>/pet's damage/i.test(x.effect)).length,1);
 assert.equal(amount(p.petContext,'damagePct'),3);
 assert.equal(amount(characterStats(b,{talents:[]},{a:gear.a,b:gear.b}).petContext,'damagePct'),undefined);
});
test('happiness is a Hunter-only reference scenario; avoidance and buffs remain unresolved',()=>{
 const b=newBuild('hunter');b.classOptions.pet='Cat';b.classOptions.petHappiness='Happy';b.controls.buffIds=['fortitude','kings','mongoose'];
 const p=characterStats(b,{talents:[]}).petContext;
 assert.equal(p.happiness.referenceDamageMultiplier,1.25);assert.equal(HAPPINESS_VALUES.Unhappy,.75);assert.equal(HAPPINESS_VALUES.Content,1);assert.equal(p.happiness.appliedToDamage,false);
 assert.equal(p.avoidance.applied,false);assert.equal(p.avoidance.status,'unresolved');
 assert.deepEqual(p.directBuffs.applied,[]);assert.ok(p.directBuffs.candidates.some(e=>e.id==='fortitude'));assert.ok(!p.directBuffs.candidates.some(e=>e.id==='mongoose'));
 const w=newBuild('warlock');w.classOptions.pet='Imp';assert.equal(characterStats(w,{talents:[]}).petContext.happiness,null);
});
test('Black Book is an equipped activated spell, not a permanent increase',()=>{
 const b=newBuild('warlock');b.classOptions.pet='Imp';const p=characterStats(b,{talents:[]},{trinket1:item(19337)}).petContext;
 assert.equal(p.events[0].damagePct,100);assert.equal(p.events[0].durationSeconds,30);assert.equal(amount(p,'damagePct'),undefined);
 b.classOptions.pet='None';assert.equal(characterStats(b,{talents:[]},{trinket1:item(19337)}).petContext.events.length,0);
});
