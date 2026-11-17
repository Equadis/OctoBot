import test from 'node:test';import assert from 'node:assert/strict';
import {newBuild} from '../../docs/sim/core/builds.mjs';
import {CLASS_OPTIONS,validateClassOptions} from '../../docs/sim/core/class-options.mjs';
import {petProfile} from '../../docs/sim/core/pet-audit.mjs';
import {HUNTER_FAMILIES,DEMON_TYPES,petAbilityCandidates,reviewLearnedRanks,trainingInventory,familyEvidence} from '../../docs/sim/core/pet-training-audit.mjs';
const names=(family,level)=>petAbilityCandidates('hunter',family,level).map(a=>a.name);
test('all reference and historical custom families share the planner catalogue',()=>{
 assert.equal(HUNTER_FAMILIES.length,19);assert.equal(DEMON_TYPES.length,7);
 assert.deepEqual(CLASS_OPTIONS.hunter.find(o=>o.key==='pet').values,['None',...HUNTER_FAMILIES]);
 for(const family of HUNTER_FAMILIES){const b=newBuild('hunter');b.classOptions=validateClassOptions({...b.classOptions,pet:family},'hunter');assert.equal(petProfile(b,{talents:[]}).active,true);assert.equal(familyEvidence(family).liveVerified,false);}
 assert.equal(familyEvidence('Fox').status,'historical-custom-reference');
});
test('family ability filters and training levels distinguish eligible candidates from learned ranks',()=>{
 assert.ok(names('Cat',60).includes('Claw'));assert.ok(!names('Wolf',60).includes('Claw'));
 assert.ok(names('Wind Serpent',60).includes('Lightning Breath'));assert.ok(!names('Serpent',60).includes('Lightning Breath'));
 assert.ok(names('Serpent',60).includes('Poison Spit'));
 const bite=l=>petAbilityCandidates('hunter','Cat',l).find(a=>a.name==='Bite');
 assert.equal(bite(55).maxCandidateRank,7);assert.equal(bite(56).maxCandidateRank,8);
 assert.equal(bite(60).knownRank,null);assert.equal(bite(60).simulationReady,false);
 assert.equal(petAbilityCandidates('hunter','Cat',0).length,0);
});
test('official guide costs override only stated fields; historical coefficients cannot produce DPS',()=>{
 const find=(family,name)=>petAbilityCandidates('hunter',family,60).find(a=>a.name===name);
 assert.equal(find('Wolf','Furious Howl').focus,50);assert.equal(find('Scorpid','Scorpid Poison').cooldownSeconds,3);
 assert.equal(find('Gorilla','Thunderstomp').cooldownSeconds,40);assert.equal(find('Turtle','Shell Shield').cooldownSeconds,60);
 assert.equal(find('Owl','Screech').cooldownSeconds,5);assert.equal(find('Cat','Growl').focus,10);
 assert.equal(find('Wind Serpent','Lightning Breath').historicalCoefficient.perHit,.5);assert.ok(find('Wind Serpent','Lightning Breath').conflict);
 assert.equal(find('Wind Serpent','Lightning Breath').simulationReady,false);
});
test('explicit learned rank review flags duplicates and reference deviations without certifying game behaviour',()=>{
 const review=reviewLearnedRanks('hunter','Cat',24,[{name:'Bite',rank:5},{name:'Bite',rank:3},{name:'Lightning Breath',rank:1}]);
 assert.equal(review.errors.length,1);assert.equal(review.warnings.length,2);assert.equal(review.simulationReady,false);
 assert.equal(reviewLearnedRanks('warlock','Imp',60,[{name:'Firebolt',rank:7}]).warnings.length,1);
 const report=trainingInventory();assert.equal(report.verifiedOctoRankRows,0);assert.equal(report.guideResourceRules,6);
});
