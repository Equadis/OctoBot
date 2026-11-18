import test from 'node:test';
import assert from 'node:assert/strict';
import {integrityResolution} from '../../docs/sim/core/integrity-resolution.mjs';
const context={realm:'test',phase:'test',clientBuild:'test'};
const queue={baseRows:[{race:'Goblin',classId:'rogue',level:60,reason:'missing'}],spellRows:[{abilityId:'mage:fireball',spellId:10151,rank:11,source:'db',conflicts:[{field:'manaCost',database:395}],unknown:['coefficient']}],identityRows:[{abilityId:'paladin:holy-strike'}]};
const b={...context,race:'Goblin',classId:'rogue',level:60,row:[1,2,3,4,5,6,0],captureId:'a',observerId:'a',method:'verified-base-extraction',rawEvidence:'a',naked:true,unbuffed:true,talentNeutral:true};
const s={...context,abilityId:'mage:fireball',spellId:10151,rank:11,field:'manaCost',value:275,unit:'mana',conditions:'neutral',captureId:'a',observerId:'a',rawEvidence:'a',method:'controlled-exact-observation',learnedIdentityConfirmed:true};
const second=r=>({...r,captureId:'b',observerId:'b',rawEvidence:'b'});
test('integrity packet retains outstanding tasks and never authenticates synthetic evidence',()=>{
 const p=integrityResolution({...context,base:[b,second(b)],spells:[s,second(s)]},queue);
 assert.equal(p.totals.baseCandidates,1);assert.equal(p.totals.spellCandidates,1);
 assert.equal(p.totals.authenticatedCorrections,0);assert.equal(p.totals.identityBlockers,1);
 assert.equal(p.totals.rankUnknowns,1);assert.equal(p.publicReady,false);
});
test('context mismatch and disagreements remain visible',()=>{
 const p=integrityResolution({...context,base:[b,{...second(b),realm:'other'}],spells:[s,{...second(s),value:395}]},queue);
 assert.equal(p.rejected.outsideContext,1);assert.equal(p.totals.baseCandidates,0);assert.equal(p.totals.spellConflicts,1);
 assert.throws(()=>integrityResolution({realm:'test'},queue));
});
