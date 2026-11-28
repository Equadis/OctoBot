import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultClassOptions,validateClassOptions} from '../../docs/sim/core/class-options.mjs';
import {enchantStats,activeEnchantStats,characterStats} from '../../docs/sim/core/character-stats.mjs';
import {newBuild} from '../../docs/sim/core/builds.mjs';
test('source values survive phase locks but current sheet cannot receive unavailable enchant stats',()=>{
 assert.deepEqual(enchantStats('enchant_back_agi7'),{agi:7});
 assert.deepEqual(activeEnchantStats('enchant_back_agi7'),{});
 assert.deepEqual(activeEnchantStats('enchant_shoulder_resilience'),{});
 assert.deepEqual(activeEnchantStats('enchant_feet_stamina7'),{sta:7});
 const b=newBuild('warrior');b.gear.back={id:1,label:'Cloak',enchantId:'enchant_back_agi7'};
 const g={back:{id:1,classs:4,subclass:1,attributes:{Agility:5}}};
 const agility=x=>characterStats(x,null,g).groups.find(x=>x.name==='Base Stats').rows.find(x=>x.label==='Agility').value;
 const before=agility(b);delete b.gear.back.enchantId;assert.equal(agility(b),before);
});
test('class-specific scenario controls coexist with existing companion and general options',()=>{
 assert.equal(defaultClassOptions('rogue').attackPosition,'Unspecified');
 assert.equal(validateClassOptions({attackPosition:'Behind'},'rogue').attackPosition,'Behind');
 assert.equal(validateClassOptions({righteousFury:'On'},'paladin').righteousFury,'On');
 assert.equal(validateClassOptions({activeBleeds:3},'druid').activeBleeds,3);
 assert.equal(validateClassOptions({afflictionEffects:4},'warlock').afflictionEffects,4);
 assert.equal(defaultClassOptions('hunter').observedRangedAP,-1);
 assert.equal(defaultClassOptions('hunter').petHappiness,'Unknown');
 assert.throws(()=>validateClassOptions({attackPosition:'Behind'},'mage'),/Invalid class option/);
});
