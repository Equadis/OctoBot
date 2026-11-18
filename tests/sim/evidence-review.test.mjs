import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewBaseEvidence} from '../../docs/sim/core/evidence-review.mjs';
const a={race:'Goblin',classId:'rogue',level:60,row:[1,2,3,4,5,6,0],realm:'test',phase:'test',clientBuild:'test',captureId:'a',observerId:'a',method:'verified-base-extraction',rawEvidence:'a',naked:true,unbuffed:true,talentNeutral:true};
const b={...a,captureId:'b',observerId:'b',rawEvidence:'b'};
test('observations require corroboration and never mark public ready',()=>{
 assert.equal(reviewBaseEvidence([a]).rows[0].status,'single-observation');
 assert.equal(reviewBaseEvidence([a,b]).rows[0].status,'corroborated-candidate');
 assert.equal(reviewBaseEvidence([a,{...b,observerId:'a'}]).rows[0].status,'single-observation');
 assert.equal(reviewBaseEvidence([a,{...b,row:[2,2,3,4,5,6,0]}]).rows[0].status,'conflict');
 assert.equal(reviewBaseEvidence([a,b]).publicReady,false);
});
test('invalid or contaminated observations are rejected, phases stay separate',()=>{
 assert.equal(reviewBaseEvidence([{...a,naked:false},{...a,level:61},{...a,row:[1]},{...a,method:'displayed-max-health'}]).rejected.length,4);
 assert.equal(reviewBaseEvidence([a,{...b,phase:'other'}]).rows.length,2);
});

test('independence requires one pair distinct on every evidence dimension',()=>{
 const c={...a,captureId:'b',rawEvidence:'a'};
 const d={...a,observerId:'b',captureId:'a',rawEvidence:'a'};
 const e={...a,observerId:'a',captureId:'a',rawEvidence:'b'};
 assert.equal(reviewBaseEvidence([c,d,e,a]).rows[0].status,'single-observation');
});
