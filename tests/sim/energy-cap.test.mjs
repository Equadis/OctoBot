import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newBuild,validateBuild} from '../../docs/sim/core/builds.mjs';
import {characterStats} from '../../docs/sim/core/character-stats.mjs';
import {maxEnergy} from '../../docs/sim/core/resources.mjs';
import {CLASS_OPTIONS} from '../../docs/sim/core/class-options.mjs';
import {legalAllocation} from './helpers/talent-allocation.mjs';
const data=c=>JSON.parse(readFileSync(new URL('../../docs/sim/data/talents/'+c+'.json',import.meta.url)));
const snapshotEnergy=(b,d)=>characterStats(b,d,{}).combatSnapshot.maxEnergy;

test('Rogue maximum energy follows Vigor ranks from the talent data: 100, 105, 110, and the combat snapshot agrees',()=>{
  const d=data('rogue'),vigor=d.talents.find(t=>t.name==='Vigor');
  assert.ok(vigor);
  for(const [rank,expected] of [[0,100],[1,105],[2,110]]){
    const b=newBuild('rogue');if(rank)b.talents=legalAllocation(d,vigor,rank);
    assert.equal(maxEnergy('rogue',d,b.talents),expected);
    assert.equal(snapshotEnergy(b,d),expected,'snapshot uses the same single source');
  }
});
test('Druid maximum energy is 100 whatever the talents: no druid talent in the data raises it',()=>{
  const d=data('druid');
  const energyTalents=d.talents.filter(t=>/maximum energy|max(imum)? energy/i.test(JSON.stringify(t)));
  assert.deepEqual(energyTalents.map(t=>t.name),[],'if this fails, a druid max-energy talent exists and resources.mjs must handle it');
  const b=newBuild('druid');
  for(const t of d.talents.slice(0,5))b.talents[t.id]=1;
  assert.equal(maxEnergy('druid',d,b.talents),100);
  assert.equal(snapshotEnergy(newBuild('druid'),d),100);
});
test('classes without an energy bar report no energy pool',()=>{
  for(const c of ['warrior','paladin','hunter','priest','shaman','mage','warlock'])assert.equal(snapshotEnergy(newBuild(c),data(c)),0,c);
});
test('Starting Energy cannot exceed the class cap through validateBuild, and a legacy over-cap value is clamped, not rejected',()=>{
  const rogue=data('rogue'),vigor=rogue.talents.find(t=>t.name==='Vigor');
  let b=newBuild('rogue');b.classOptions.startingEnergy=110;
  assert.equal(validateBuild(b,rogue).classOptions.startingEnergy,100,'no Vigor: clamps to 100');
  b.talents=legalAllocation(rogue,vigor,2);assert.equal(validateBuild(b,rogue).classOptions.startingEnergy,110);
  const druid=data('druid');b=newBuild('druid');b.classOptions.startingEnergy=110;
  assert.equal(validateBuild(b,druid).classOptions.startingEnergy,100,'druid always clamps to 100');
});
test('the option ceiling is only a loose bound for old saves; the effective cap is the class and talent cap',()=>{
  const ceiling=c=>CLASS_OPTIONS[c].find(o=>o.key==='startingEnergy').max;
  assert.equal(ceiling('rogue'),110);assert.equal(ceiling('druid'),110);
  assert.equal(maxEnergy('druid',data('druid'),{}),100,'druid effective cap');
});
