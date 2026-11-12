import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CLASS_DEFINITIONS} from '../../docs/sim/core/classes.mjs';
import {CLASS_RACES,RACE_MASKS,slotAllowed,racialPassives} from '../../docs/sim/core/class-rules.mjs';
import {newBuild,validateBuild,restoreLegacyBuild} from '../../docs/sim/core/builds.mjs';
import {validateTalents,maximiseTalent,minimiseTalent} from '../../docs/sim/core/talents.mjs';
import {listingRestriction,equipmentErrors} from '../../docs/sim/core/items.mjs';
import {CONSUMABLE_BY_ID,consumableRestriction,selectConsumable,consumablePassiveStats,resolveConsumableSelection} from '../../docs/sim/core/consumables.mjs';
import {prepareSimulation} from '../../docs/sim/core/simulation-readiness.mjs';
const data=id=>JSON.parse(readFileSync(new URL(`../../docs/sim/data/talents/${id}.json`,import.meta.url)));
for(const cls of CLASS_DEFINITIONS){
 test(`${cls.name}: every race is checked in saved-state validation`,()=>{
  for(const race of Object.keys(RACE_MASKS)){const build={...newBuild(cls.id),race};if(CLASS_RACES[cls.id].includes(race))assert.equal(validateBuild(build,data(cls.id)).race,race);else assert.throws(()=>validateBuild(build,data(cls.id)),/Invalid race/);}
  for(const slot of ['ammo','quiver']){const build={...newBuild(cls.id),gear:{[slot]:{id:1,label:'Legacy'}}};assert.equal(slotAllowed(cls.id,slot),cls.id==='hunter');if(cls.id!=='hunter'){assert.throws(()=>validateBuild(build,data(cls.id)),/slot/);assert.deepEqual(restoreLegacyBuild(build,data(cls.id)).build.gear,{});assert.ok(build.gear[slot]);}}
 });
 test(`${cls.name}: repeated talent shortcuts preserve a legal full tree`,()=>{
  const tree=data(cls.id);let ranks={};
  for(let round=0;round<3;round++)for(const talent of tree.talents){ranks=maximiseTalent(tree,ranks,talent.id,60);assert.deepEqual(validateTalents(tree,ranks,60),[]);}
  for(const talent of [...tree.talents].reverse()){ranks=minimiseTalent(tree,ranks,talent.id,60);assert.deepEqual(validateTalents(tree,ranks,60),[]);}
  assert.deepEqual(ranks,{});
  const first=tree.talents.find(t=>t.row===0&&t.requires===null&&t.maxRanks>1);assert.equal(maximiseTalent(tree,{},first.id,10)[first.id],1);
 });
 test(`${cls.name}: simulation cannot silently ignore missing engines`,()=>assert.throws(()=>prepareSimulation(newBuild(cls.id),data(cls.id)),/combat engine is not implemented/));
}
test('talent removal retains combined tier and prerequisite requirements',()=>{
 const tree={trees:[{index:0}],talents:[{id:1,name:'A',tree:0,position:0,row:0,maxRanks:5,requires:null},{id:2,name:'B',tree:0,position:1,row:0,maxRanks:5,requires:null},{id:3,name:'C',tree:0,position:4,row:1,maxRanks:1,requires:0,requiresRanks:2}]};
 assert.equal(minimiseTalent(tree,{1:5,2:2,3:1},1)[1],3);assert.equal(minimiseTalent(tree,{1:5,2:5,3:1},1)[1],2);assert.equal(minimiseTalent(tree,{1:5,2:5},1)[1],undefined);
});
test('wrong weapons, inaccessible metadata and ammo mismatches cannot enter calculations',()=>{
 const wand={id:1,classs:2,subclass:19,slot:26,reqlevel:1};assert.ok(listingRestriction(wand,newBuild('rogue'),'ranged'));assert.equal(listingRestriction(wand,newBuild('mage'),'ranged'),null);
 assert.ok(equipmentErrors({...newBuild('mage'),gear:{head:{id:999,label:'Unknown'}}},()=>null).length);
 const arrow={id:2,classs:6,subclass:2,slot:24,reqlevel:1};assert.ok(listingRestriction(arrow,newBuild('hunter'),'ammo'));assert.ok(listingRestriction(arrow,{...newBuild('hunter'),gear:{ranged:{id:3,subclass:3}}},'ammo'));assert.equal(listingRestriction(arrow,{...newBuild('hunter'),gear:{ranged:{id:3,subclass:2}}},'ammo'),null);
});
test('consumable eligibility follows source class masks, resources and levels',()=>{
 const mana=CONSUMABLE_BY_ID.get(13444),rage=CONSUMABLE_BY_ID.get(13442);assert.ok(mana.verified&&rage.verified);
 for(const cls of CLASS_DEFINITIONS){assert.equal(Boolean(consumableRestriction(mana,newBuild(cls.id))),['warrior','rogue'].includes(cls.id));assert.equal(Boolean(consumableRestriction(rage,newBuild(cls.id))),!['warrior','druid'].includes(cls.id));}
 assert.ok(consumableRestriction(mana,{...newBuild('mage'),level:48}));assert.deepEqual(consumablePassiveStats(rage),{});
 assert.deepEqual(selectConsumable([13442],13444),[13444]);
});
test('new and shared flasks cannot be stacked through imports or controls',()=>{
 const build=newBuild('mage');build.controls.buffIds=['supreme-power'];build.controls.consumableIds=[13511];assert.throws(()=>validateBuild(build,data('mage')),/conflicts/);assert.deepEqual(resolveConsumableSelection(build.controls).buffIds,[]);
 assert.deepEqual(consumablePassiveStats(CONSUMABLE_BY_ID.get(13511)),{mana:2000});assert.equal(consumablePassiveStats(CONSUMABLE_BY_ID.get(20007)).mp5,12);
});
test('custom racial facts use current dedicated OctoWoW pages',()=>{assert.equal(racialPassives('Goblin').meleeSkills[15],3);assert.equal(racialPassives('High Elf').agilityMultiplier,1.02);assert.equal(racialPassives('Night Elf').dodge,1);});
