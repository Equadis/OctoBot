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

test('Phase 4 evidence preserves identity, rank, context and independent capture requirements',()=>{
 const hunter='hunter:trueshot-aura',paladin='paladin:holy-strike';
 const q={...queue,identityRows:[{abilityId:hunter},{abilityId:paladin}]};
 const first={...context,abilityId:hunter,spellName:'Trueshot Aura',rank:1,spellId:60000,characterLevel:60,learned:true,method:'learned-cast-identity',idSource:'client-spell-link',captureId:'a',observerId:'a',rawEvidence:'a'};
 const holy={...first,abilityId:paladin,spellName:'Holy Strike',spellId:60001,captureId:'holy',rawEvidence:'holy'};
 const result=integrityResolution({...context,identities:[first,second(first),holy,{...holy,rank:2},{...holy,rank:3,spellId:679},{...holy,rank:0},{...first,clientBuild:'other'}]},q);
 assert.equal(result.identityTasks[0].status,'candidate-needs-authentication');
 assert.equal(result.identityTasks[1].status,'conflict');
 assert.deepEqual(result.identityTasks[1].ranks.slice(0,4).map(r=>r.status),['conflict','conflict','conflict','no-observation']);
 assert.equal(result.totals.identityBlockers,2);
 assert.equal(result.rejected.identities.length,1);
 assert.equal(result.rejected.outsideContext,1);
 assert.equal(result.totals.authenticatedCorrections,0);
});

test('paired companion observations retain controlled owner values and do not promote runtime inputs',()=>{
 const meta={...context,classId:'hunter',pet:'Cat',level:60,ownerLevel:60,conditions:'same pet training and owner talents',captureId:'a',observerId:'a',rawEvidence:'a'};
 const pet={...meta,method:'clean-companion-observation',ownerUnbuffed:true,companionUnbuffed:true,trainingRecorded:true,stats:{maxHealth:1000,attackPower:140,spellPower:0}};
 const pair={...meta,method:'controlled-companion-stat-pair',oneVariableChanged:true,ownerStat:'rangedAP',petStat:'attackPower',ownerBefore:400,ownerAfter:500,petBefore:140,petAfter:165};
 const p=integrityResolution({...context,companions:[pet,second(pet),{...pet,pet:'Imp'}],inheritance:[pair,second(pair),{...pair,ownerAfter:400}]},queue);
 assert.equal(p.totals.companionBaselineCandidates,1);
 assert.equal(p.totals.inheritanceCandidates,1);
 assert.deepEqual(p.companion.inheritance.rows[0].values,[25]);
 assert.equal(p.rejected.companions.length,1);
 assert.equal(p.rejected.inheritance.length,1);
 assert.equal(p.publicReady,false);
});

test('rank conflicts cannot be resolved by pooling differing condition groups or units',()=>{
 const altered={...s,conditions:'different context',value:395};
 const p=integrityResolution({...context,spells:[s,second(s),altered,second(altered),{...s,unit:'ms'}]},queue);
 assert.equal(p.spellTasks[0].status,'condition-dependent');
 assert.equal(p.rejected.spells.length,1);
 assert.equal(p.totals.spellCandidates,0);
});

test('a second learned Trueshot rank is retained as conflicting identity evidence',()=>{
 const abilityId='hunter:trueshot-aura';
 const row={...context,abilityId,spellName:'Trueshot Aura',rank:2,spellId:20905,characterLevel:60,learned:true,method:'learned-cast-identity',idSource:'client-spell-link',captureId:'a',observerId:'a',rawEvidence:'a'};
 const p=integrityResolution({...context,identities:[row]},{...queue,identityRows:[{abilityId}]});
 assert.equal(p.identityTasks[0].status,'conflict');
 assert.deepEqual(p.identityTasks[0].unexpectedRanks[0].values,[20905]);
 assert.equal(p.rejected.identities.length,0);
 assert.equal(p.totals.authenticatedCorrections,0);
});
