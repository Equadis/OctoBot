import test from 'node:test';import assert from 'node:assert/strict';
import {compileConsumableUses} from '../../docs/sim/core/combat-consumable-runtime.mjs';
const build={classId:'mage',race:'Human',level:60,controls:{consumableIds:[13444,13446],buffIds:[]},skills:{}};
const use={itemId:13444,atMs:[0],count:1,cooldownMs:120000,sharedCooldownMs:120000,acknowledgeCooldownUnverified:true};
test('selected restoration consumables compile source ranges and shared cooldown',()=>{const [r]=compileConsumableUses(build,[use]);assert.deepEqual(r.effect,{kind:'resource',resource:'mana',min:1350,max:2251});assert.equal(r.sharedGroup,'potion');assert.equal(compileConsumableUses(build,[{...use,itemId:13446}])[0].effect.kind,'heal');assert.throws(()=>compileConsumableUses(build,[{...use,count:0}]));assert.throws(()=>compileConsumableUses(build,[{...use,acknowledgeCooldownUnverified:false}]));});
test('tea requires selected Rogue alias',()=>{const r=compileConsumableUses({classId:'rogue',race:'Human',level:60,controls:{buffIds:['tea']}},[{...use,itemId:7676}]);assert.equal(r[0].effect.min,100);assert.throws(()=>compileConsumableUses(build,[{...use,itemId:7676}]));});
