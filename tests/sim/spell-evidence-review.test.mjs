import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewSpellEvidence} from '../../docs/sim/core/spell-evidence-review.mjs';
const q={spellRows:[{abilityId:'mage:fireball',spellId:10151,rank:11,conflicts:[{field:'manaCost'}]}]};
const a={abilityId:'mage:fireball',spellId:10151,rank:11,field:'manaCost',value:275,unit:'mana',realm:'test',phase:'test',clientBuild:'test',conditions:'neutral',captureId:'a',observerId:'a',rawEvidence:'a',method:'controlled-exact-observation',learnedIdentityConfirmed:true};
const b={...a,captureId:'b',observerId:'b',rawEvidence:'b'};
test('rank conflict observations are field and context specific',()=>{
 assert.equal(reviewSpellEvidence([a,b],q).rows[0].status,'corroborated-candidate');
 assert.equal(reviewSpellEvidence([a,{...b,value:395}],q).rows[0].status,'conflict');
 assert.equal(reviewSpellEvidence([a,{...b,conditions:'buffed'}],q).rows.length,2);
 assert.equal(reviewSpellEvidence([a,{...b,rawEvidence:'a'}],q).rows[0].status,'single-observation');
 assert.equal(reviewSpellEvidence([a,b],q).publicReady,false);
});
test('unsupported evidence or unresolved identity is rejected',()=>{
 assert.equal(reviewSpellEvidence([{...a,field:'other'},{...a,spellId:1},{...a,learnedIdentityConfirmed:false},{...a,value:NaN}],q).rejected.length,4);
});
