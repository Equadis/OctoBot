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

test('all seven scopes are ranged-only, level-aware and persist through build links',()=>{
 const gun={id:1,classs:2,subclass:3,slot:26};
 assert.equal(enchantsForSlot('ranged','hunter',gun,60).length,7);
 for(const subclass of [2,3,18])assert.equal(enchantsForSlot('ranged','rogue',{...gun,subclass},60).length,7);
 for(const subclass of [16,19])assert.deepEqual(enchantsForSlot('ranged','rogue',{...gun,subclass},60),[]);
 assert.deepEqual(enchantsForSlot('ranged','paladin',{classs:4,subclass:7,slot:28},60),[]);
 assert.deepEqual(enchantsForSlot('ranged','mage',gun,60),[]);
 assert.equal(enchantsForSlot('ranged','hunter',gun,49).length,5);
 const b=newBuild();b.gear.ranged={id:1,label:'Gun',enchantId:'scope_18283'};
 assert.deepEqual(decodeBuild(encodeBuild(b),data),b);
 b.level=49;assert.throws(()=>validateBuild(b,data),/Invalid enchant/);
});

test('imported ranged scopes are checked against actual weapon metadata before simulation',async()=>{
 const {equipmentErrors}=await import('../../docs/sim/core/items.mjs');
 const {prepareSimulation}=await import('../../docs/sim/core/simulation-readiness.mjs');
 const b=newBuild();b.gear.ranged={id:1,label:'Ranged weapon',enchantId:'scope_33146'};
 const item={id:1,classs:2,subclass:16,slot:25,reqlevel:1,requiredLevel:1,classMask:-1,raceMask:-1,requirements:[],unique:false};
 assert.match(equipmentErrors(b,()=>item).map(e=>e.reason).join(' '),/Enhancement is incompatible/);
 item.subclass=3;item.slot=26;
 assert.deepEqual(equipmentErrors(b,()=>item),[]);
 assert.throws(()=>prepareSimulation(b,data,{lookup:()=>item}),/Scope .*not implemented by the combat engine/);
});
