import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newBuild,validateBuild,encodeBuild,decodeBuild} from '../../docs/sim/core/builds.mjs';
import {filterItems,normaliseItemSearch,listingRestriction,detailRestriction,equipmentTotals} from '../../docs/sim/core/items.mjs';
const build=newBuild();
const axe={id:1,name:'Axe',classs:2,subclass:0,slot:13,reqlevel:20,quality:3,level:25};
const detail={id:1,classMask:-1,raceMask:-1,slot:13,requiredLevel:20,requirements:[],unique:false};

test('equipment filters exclude wrong slots, untrained level gates and unusable types',()=>{
 const items=[axe,{...axe,id:2,name:'Wand',subclass:19,slot:26},{...axe,id:3,name:'Plate',classs:4,subclass:4,slot:1,reqlevel:1}];
 assert.deepEqual(filterItems(items,{build,slot:'mainhand'}).map(x=>x.id),[1]);
 assert.equal(filterItems(items,{build:{...build,level:19},slot:'mainhand'}).length,0);
 assert.match(listingRestriction(items[2],{...build,level:39},'head'),/Plate/);
 assert.equal(listingRestriction(items[2],{...build,level:40},'head'),null);
 assert.match(listingRestriction({...axe,reqlevel:1},{...build,level:19},'offhand'),/Dual wield/);
 assert.equal(filterItems([axe],{build,slot:'mainhand',search:'https://octowow.st/db/?item=1',quality:'3'}).length,1);
 assert.equal(filterItems([axe],{build,slot:'mainhand',quality:'4'}).length,0);
});

test('source masks, conditional requirements, uniqueness and weapon conflicts gate equipment',()=>{
 assert.equal(detailRestriction(axe,detail,build,'mainhand'),null);
 assert.match(detailRestriction(axe,null,build,'mainhand'),/could not be verified/);
 assert.match(detailRestriction(axe,{...detail,classMask:8},build,'mainhand'),/another class/);
 assert.match(detailRestriction(axe,{...detail,raceMask:2},build,'mainhand'),/another race/);
 assert.match(detailRestriction(axe,{...detail,requirements:['Requires Engineering (300)']},build,'mainhand'),/Additional requirement/);
 assert.match(detailRestriction(axe,{...detail,slot:21},build,'offhand'),/different equipment slot/);
 assert.match(detailRestriction(axe,{...detail,unique:true},{...build,gear:{mainhand:{id:1}}},'offhand'),/unique/);
 assert.match(detailRestriction(axe,detail,{...build,gear:{mainhand:{id:2,twoHanded:true}}},'offhand'),/two-handed/);
 assert.deepEqual(equipmentTotals({head:{attributes:{Strength:17}},chest:{attributes:{Strength:20,Stamina:10}}}),{Strength:37,Stamina:10});
});


test('reputation and specialisation requirements are shown, not used to hide otherwise valid gear',()=>{
 const item={id:61010,name:'Wing of the Time-Lord',classs:4,subclass:1,slot:16,reqlevel:0,quality:4,level:65};
 const back={id:item.id,classMask:-1,raceMask:-1,slot:16,requiredLevel:0,
   requirements:['Requires  - Exalted'],unique:true};
 const paladin=newBuild('paladin');
 assert.equal(listingRestriction(item,paladin,'back'),null);
 assert.equal(detailRestriction(item,back,paladin,'back'),null);
 for(const requirement of ['Requires Silvermoon Remnant - Revered','Requires Goldsmith',
   'Requires Gnomish Engineer','Requires Dragonscale Leatherworking']){
  assert.equal(detailRestriction(item,{...back,requirements:[requirement]},paladin,'back'),null,requirement);
 }
 // Actual level, class, race and numeric profession requirements stay enforced.
 assert.match(detailRestriction(item,{...back,requiredLevel:61},paladin,'back'),/Requires level 61/);
 assert.match(detailRestriction(item,{...back,classMask:8},paladin,'back'),/another class/);
 assert.match(detailRestriction(item,{...back,raceMask:2},paladin,'back'),/another race/);
 assert.match(detailRestriction(item,{...back,requirements:['Requires Engineering (300)']},paladin,'back'),/Additional requirement/);
});
test('gear search recognises hyphenation and accidental duplicate words',()=>{
 const paladin=newBuild('paladin');
 const item={id:61010,name:'Wing of the Time-Lord',classs:4,subclass:1,slot:16,reqlevel:0,quality:4,level:65};
 assert.equal(normaliseItemSearch('Wing of the the Time-Lord'),'wing of the time lord');
 for(const query of ['Wing of the Time-Lord','wing of the time lord','Wing of the the Time Lord',
   'https://octowow.st/db/?item=61010','61010']){
  assert.deepEqual(filterItems([item],{build:paladin,slot:'back',search:query}).map(x=>x.id),[61010],query);
 }
 assert.deepEqual(filterItems([item],{build:paladin,slot:'head',search:'time lord'}),[]);
});
test('Dressing Room and Gear Planner catalogues contain the same equippable item IDs',async()=>{
 const url=new URL('../../docs/sim/data/items/',import.meta.url);
 const [catalogue,equipment,details]=await Promise.all(['catalogue.json','equipment.json','details.json']
  .map(name=>readFile(new URL(name,url),'utf8').then(JSON.parse)));
 const equipped=new Set(equipment.map(item=>item.id));
 const dressable=catalogue.filter(item=>[2,4,6,11].includes(item.classs)&&item.slot>0);
 assert.deepEqual([...equipped].sort((a,b)=>a-b),dressable.map(item=>item.id).sort((a,b)=>a-b));
 const wing=equipment.find(item=>item.id===61010);
 assert.ok(wing,'Wing of the Time-Lord is in the Gear Planner catalogue');
 assert.equal(wing.name,'Wing of the Time-Lord');
 assert.equal(details['61010'].slot,16);
 assert.equal(detailRestriction(wing,details['61010'],newBuild('paladin'),'back'),null);
 // The source requirement continues to be visible in the Gear Planner tooltip.
 assert.ok(details['61010'].tooltipText.includes('Exalted'));
});
test('planning settings round trip and legacy builds gain safe defaults',async()=>{
 const data=JSON.parse(await readFile(new URL('../../docs/sim/data/talents/warrior.json',import.meta.url)));
 const configured={...build,planning:{...build.planning,buffs:'Raid notes',rotation:'Priority',iterations:2000}};
 assert.deepEqual(decodeBuild(encodeBuild(configured),data),configured);
 const legacy={...build};delete legacy.planning;
 // Saved builds that predate target presets stay 'custom' (same numbers as the heroic dummy); only new builds default to it.
 assert.deepEqual(validateBuild(legacy,data).planning,{...build.planning,targetPreset:'custom'});
 assert.equal(build.planning.targetPreset,'heroic-dummy');
 for(const setting of [{iterations:0},{duration:Infinity},{targetLevel:71},{buffs:'x'.repeat(2001)}])assert.throws(()=>validateBuild({...build,planning:{...build.planning,...setting}},data));
});

test('snapshot IDs and equipment slots are unique and provenance remains explicitly partial',async()=>{
 const base=new URL('../../docs/sim/data/items/',import.meta.url);
 const items=JSON.parse(await readFile(new URL('equipment.json',base)));
 const manifest=JSON.parse(await readFile(new URL('catalogue-manifest.json',base)));
 assert.equal(items.length,manifest.equipmentCount);
 assert.equal(new Set(items.map(x=>x.id)).size,items.length);
 assert.equal(manifest.complete,false);
 assert.ok(items.every(x=>Number.isInteger(x.id)&&x.name&&x.slot>0));
});
