import test from 'node:test';
import assert from 'node:assert/strict';
import {BASE_STATS} from '../../docs/sim/core/base-stats.mjs';
import {baseStatInventory,baseStatProfile,racialAttributeEstimate} from '../../docs/sim/core/base-stat-audit.mjs';
import {newBuild} from '../../docs/sim/core/builds.mjs';
import {characterStats} from '../../docs/sim/core/character-stats.mjs';

test('inventory covers every supported race/class/level and never fabricates missing rows',()=>{
 const audit=baseStatInventory();
 assert.deepEqual(audit.totals,{combinations:59,referenceCombinations:40,missingCombinations:19,referenceRows:2400,missingRows:1140,anomalies:5,sourceConflicts:2,liveVerifiedRows:0});
 for(const c of audit.combinations)for(let level=1;level<=60;level++){
  const p=baseStatProfile(c.race,c.classId,level),raw=BASE_STATS[c.race+':'+c.classId]?.[level-1];
  assert.deepEqual(p.row,raw||null);if(!raw)assert.equal(p.status,'missing');
 }
 assert.equal(baseStatProfile('Goblin','rogue',60).status,'missing');
 assert.equal(baseStatProfile('Human','warrior',19).status,'reference-anomaly');
 assert.equal(baseStatProfile('Undead','mage',1).status,'reference-anomaly');
 assert.equal(baseStatProfile('Undead','mage',2).status,'reference-anomaly');
 assert.equal(baseStatProfile('Orc','rogue',19).status,'reference-anomaly');
 assert.equal(baseStatProfile('Orc','rogue',20).status,'reference-anomaly');
 assert.equal(baseStatProfile('Night Elf','druid',1).status,'reference-conflict');
 assert.equal(baseStatProfile('Tauren','druid',1).status,'reference-conflict');
 assert.equal(baseStatProfile('Human','mage',61).status,'invalid');
 assert.equal(baseStatProfile('Goblin','paladin',60).status,'invalid');
});
test('racials embedded in reference base stats apply only to external increments',()=>{
 assert.equal(racialAttributeEstimate(133,133,1.05,true),133);
 assert.equal(racialAttributeEstimate(153,133,1.05,true),154);
 assert.equal(racialAttributeEstimate(171,131,1.05,true),173);
 assert.equal(racialAttributeEstimate(100,100,1.02,false),102);
 assert.equal(racialAttributeEstimate(null,null,1.05,true),null);
});
test('missing race/class data stays unavailable with gear or buffs',()=>{
 const b=newBuild('rogue');b.race='Goblin';b.controls.buffIds=['kings','fortitude'];
 const r=characterStats(b,{talents:[]},{chest:{attributes:{Stamina:40},effects:[]}});
 assert.equal(r.baseAudit.status,'missing');
 const groups=Object.fromEntries(r.groups.map(x=>[x.name,Object.fromEntries(x.rows.map(y=>[y.label,y.value]))]));
 assert.equal(groups['Base Stats'].Stamina,'—');assert.equal(groups.Defense.Health,'—');assert.equal(groups['Base Stat Audit']['Source status'],'missing');
});
