import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ENCHANTS,NEW_ITEM_IDS,enchantsForSlot,sortEquipment} from '../../docs/sim/core/equipment-options.mjs';
import {newBuild,validateBuild,encodeBuild,decodeBuild} from '../../docs/sim/core/builds.mjs';
const data=JSON.parse(await readFile(new URL('../../docs/sim/data/talents/warrior.json',import.meta.url)));

test('enchant references preserve slot and class restrictions through build sharing',()=>{
 const build={...newBuild(),gear:{head:{id:16963,label:'Head',enchantId:'enchant_head_agi'}}};
 assert.deepEqual(decodeBuild(encodeBuild(build),data),build);
 for(const enchantId of ['enchant_chest_stats','enchant_head_ap','not-an-enchant'])assert.throws(()=>validateBuild({...newBuild(),gear:{head:{id:16963,label:'Head',enchantId}}},data));
 assert.equal(enchantsForSlot('offhand','warrior',{classs:4}).length,0);
 assert.ok(enchantsForSlot('chest').some(enchant=>enchant.id==='enchant_chest_greater_stats'));
 assert.equal(new Set(ENCHANTS.map(enchant=>enchant.id)).size,ENCHANTS.length);
});

test('item sorts respect direction, patch flags and unknown attribute values',()=>{
 const flagged=[...NEW_ITEM_IDS][0];
 const items=[{id:1,name:'Alpha',level:50},{id:2,name:'Beta',level:60},{id:flagged,name:'New',level:40}];
 assert.equal(sortEquipment(items,'new','desc')[0].id,flagged);
 assert.deepEqual(sortEquipment(items,'level','asc').map(item=>item.level),[40,50,60]);
 assert.deepEqual(sortEquipment(items,'name','desc').map(item=>item.name),['New','Beta','Alpha']);
 for(const direction of ['asc','desc'])assert.equal(sortEquipment(items,'Strength',direction,{2:{attributes:{Strength:10}}})[0].id,2);
 assert.deepEqual(items.map(item=>item.level),[50,60,40]);
});

test('reference previews match official item facts and cannot supply verification masks',async()=>{
 const base=new URL('../../docs/sim/data/items/',import.meta.url);
 const reference=JSON.parse(await readFile(new URL('reference-tooltips.json',base))).items;
 const official=new Map(JSON.parse(await readFile(new URL('equipment.json',base))).map(item=>[item.id,item]));
 for(const [id,record] of Object.entries(reference)){assert.equal(record.name,official.get(Number(id)).name);assert.equal(typeof record.tooltipText,'string');assert.equal(record.classMask,undefined);assert.equal(record.raceMask,undefined);}
 assert.match(reference['22113'].tooltipText,/Moonheart Raiment/);
});
