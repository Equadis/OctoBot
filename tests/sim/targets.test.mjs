import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BOSS_PRESETS,RESISTANCES,applyTarget} from '../../docs/sim/core/targets.mjs';
import {newBuild,validateBuild,encodeBuild,decodeBuild} from '../../docs/sim/core/builds.mjs';
const data=JSON.parse(await readFile(new URL('../../docs/sim/data/talents/warrior.json',import.meta.url)));

test('boss and dummy presets replace complete target settings and clear encounter modifiers',()=>{
 assert.equal(BOSS_PRESETS.length,41);assert.equal(new Set(BOSS_PRESETS.map(b=>b.id)).size,41);
 const boss=applyTarget(newBuild().planning,'kruul');
 assert.equal(boss.targetLevel,63);assert.equal(boss.targetArmour,4752);assert.equal(boss.targetFireRes,75);assert.equal(boss.targetNatureRes,15);
 const vael=applyTarget(boss,'vaelastrasz');assert.equal(vael.targetEnergyPerSecond,50);
 const expert=applyTarget(vael,'expert-dummy');assert.equal(expert.targetLevel,60);assert.equal(expert.targetArmour,3000);assert.equal(expert.targetEnergyPerSecond,0);
 for(const key of Object.keys(RESISTANCES))assert.equal(expert[key],0);
 const heroic=applyTarget(expert,'heroic-dummy');assert.equal(heroic.targetLevel,63);assert.equal(heroic.targetArmour,4211);
 assert.throws(()=>applyTarget(heroic,'unknown'));
});

test('duration variation, target presets and resistances survive sharing and legacy import',()=>{
 const build={...newBuild(),planning:{...applyTarget(newBuild().planning,'gyth'),durationVary:true,durationVariation:25}};
 assert.deepEqual(decodeBuild(encodeBuild(build),data),build);
 assert.equal(build.planning.targetNatureRes,210);
 const legacy={...newBuild(),planning:{duration:90,iterations:2000,targetLevel:62,targetArmour:4000}};
 const migrated=validateBuild(legacy,data);assert.equal(migrated.planning.duration,90);assert.equal(migrated.planning.durationVary,false);assert.equal(migrated.planning.targetFireRes,0);
 for(const patch of [{durationVariation:101},{durationVary:'yes'},{targetNatureRes:-1},{targetArcaneRes:NaN},{targetPreset:'missing'}])assert.throws(()=>validateBuild({...newBuild(),planning:{...newBuild().planning,...patch}},data));
});
