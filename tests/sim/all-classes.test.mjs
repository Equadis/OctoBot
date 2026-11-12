import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CLASS_DEFINITIONS} from '../../docs/sim/core/classes.mjs';
import {newBuild,validateBuild,encodeBuild,decodeBuild} from '../../docs/sim/core/builds.mjs';
import {listingRestriction,detailRestriction} from '../../docs/sim/core/items.mjs';
import {rotationProfile,validateRotationRows} from '../../docs/sim/core/configuration.mjs';
import {buildRecord,BUILDS_PER_CLASS,MAX_BUILD_BYTES} from '../../docs/sim/core/build-library.mjs';
test('every official class dataset and its presets round trip independently',()=>{
 let total=0;
 for(const cls of CLASS_DEFINITIONS){
  const data=JSON.parse(readFileSync(new URL(`../../docs/sim/data/talents/${cls.id}.json`,import.meta.url)));
  assert.equal(data.classId,cls.id);assert.equal(data.trees.length,3);total+=data.talents.length;
  for(const talent of data.talents){assert.equal(talent.descriptions.length,talent.maxRanks);assert.ok(talent.descriptions.every(Boolean));}
  const first=data.talents.find(t=>t.row===0&&t.requires===null);
  const build={...newBuild(cls.id),name:'同じ名前',talents:{[first.id]:1}};
  assert.deepEqual(decodeBuild(encodeBuild(build),data),build);
  for(const preset of rotationProfile(cls.id).presets){
   assert.deepEqual(validateRotationRows(preset.rows,cls.id),preset.rows);
   assert.doesNotThrow(()=>validateBuild({...build,controls:{...build.controls,rotationPreset:preset.id,rotationRows:preset.rows}},data));
  }
  assert.equal(buildRecord(build,value=>validateBuild(value,data)).classId,cls.id);
  assert.throws(()=>validateBuild({...build,classOptions:{unknown:true}},data));
  const another=CLASS_DEFINITIONS.find(c=>c.id!==cls.id);
  assert.throws(()=>validateBuild({...build,classId:another.id},data));
 }
 assert.equal(total,476);assert.equal(BUILDS_PER_CLASS,100);assert.equal(MAX_BUILD_BYTES,64000);
});
test('class masks, armour, dual wield and relic slots are class-aware',()=>{
 const wand={id:1,classs:2,subclass:19,slot:26,reqlevel:1};
 const sword={id:2,classs:2,subclass:7,slot:13,reqlevel:1};
 const detail={id:2,classMask:8,raceMask:-1,slot:13,requiredLevel:1,requirements:[],unique:false};
 assert.equal(listingRestriction(wand,newBuild('mage'),'ranged'),null);
 assert.ok(listingRestriction(wand,newBuild('warrior'),'ranged'));
 assert.equal(listingRestriction(sword,{...newBuild('rogue'),level:10},'offhand'),null);
 assert.ok(listingRestriction(sword,{...newBuild('rogue'),level:9},'offhand'));
 assert.ok(listingRestriction(sword,newBuild('mage'),'offhand'));
 assert.equal(detailRestriction(sword,detail,newBuild('rogue'),'mainhand'),null);
 assert.ok(detailRestriction(sword,detail,newBuild('warrior'),'mainhand'));
 for(const [id,subclass] of [['paladin',7],['druid',8],['shaman',9]]){
  const relic={id:3,classs:4,subclass,slot:28,reqlevel:1};
  assert.equal(listingRestriction(relic,newBuild(id),'ranged'),null);
  assert.ok(listingRestriction(relic,newBuild('mage'),'ranged'));
 }
 assert.ok(listingRestriction({id:4,classs:4,subclass:2,slot:5,reqlevel:1},newBuild('priest'),'chest'));
 assert.throws(()=>validateRotationRows([{ability:'Sinister Strike',conditions:[]}],'warrior'));
 assert.throws(()=>validateRotationRows([{ability:'Fireball',conditions:[]}],'rogue'));
});
test('profession requirements and ammunition matching survive build sharing',()=>{
 const data=JSON.parse(readFileSync(new URL('../../docs/sim/data/talents/hunter.json',import.meta.url)));
 const build={...newBuild('hunter'),skills:{Engineering:300,Fishing:1}};
 assert.deepEqual(decodeBuild(encodeBuild(build),data),build);
 assert.throws(()=>validateBuild({...build,skills:{Engineering:301}},data));
 assert.throws(()=>validateBuild({...build,skills:{Engineering:300,Tailoring:300,Alchemy:300}},data));
 const helmet={id:3,classs:4,subclass:2,slot:1,reqlevel:1};
 const detail={id:3,classMask:-1,raceMask:-1,slot:1,requiredLevel:1,requirements:['Requires Engineering (300)'],unique:false};
 assert.equal(detailRestriction(helmet,detail,build,'head'),null);
 assert.ok(detailRestriction(helmet,detail,{...build,skills:{Engineering:299}},'head'));
 const arrow={id:4,classs:6,subclass:2,slot:24,reqlevel:1};
 assert.equal(listingRestriction(arrow,{...build,gear:{ranged:{subclass:2}}},'ammo'),null);
 assert.ok(listingRestriction(arrow,{...build,gear:{ranged:{subclass:3}}},'ammo'));
 const pole={id:5,classs:2,subclass:20,slot:17,reqlevel:1};
 assert.equal(listingRestriction(pole,build,'mainhand'),null);
 assert.ok(listingRestriction(pole,{...build,skills:{}},'mainhand'));
});
