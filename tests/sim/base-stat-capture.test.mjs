import test from 'node:test';import assert from 'node:assert/strict';
import {parseCapture,captureReview,extractCaptureLines} from '../../tools/sim/base-stat-captures.mjs';
import {racialEventAudit} from '../../docs/sim/core/racial-event-audit.mjs';
// Synthetic test records, NOT actual OctoWoW observations.
const record='OCTOSTAT1|Goblin|ROGUE|60|77,132,75,35,52|77,132,75,35,52|0,0,0,0,0|0,0,0,0,0|2093|100|3|clean';
test('capture intake preserves anonymous observations without inventing missing rows',()=>{
 const c=parseCapture(record);assert.equal(c.classId,'rogue');assert.equal(c.race,'Goblin');assert.equal(c.powerType,3);
 const report=captureReview([record,record]);assert.equal(report.candidateRows,1);assert.equal(report.promotedRows,0);assert.equal(report.candidates[0].referenceStatus,'missing');assert.equal(report.candidates[0].observations.length,1);
 assert.deepEqual(extractCaptureLines('OctoStatCaptures = {\n  "'+record+'",\n}'),[record]);
});
test('conflicting and invalid captures cannot enter a verified stat table',()=>{
 const diff=record.replace('|2093|','|2100|');const report=captureReview([record,diff,record.replace('|60|','|61|'),record.replace('|3|clean','|0|clean')]);
 assert.equal(report.conflictingRows,1);assert.equal(report.rejected.length,2);assert.equal(report.promotedRows,0);
 assert.throws(()=>parseCapture(record.replace('Goblin|ROGUE','Goblin|PALADIN')));
 assert.throws(()=>parseCapture(record.replace('|clean','|dirty')));
});
test('source-backed racial events remain conditional and do not alter sheet or imply implementation',()=>{
 const orc=racialEventAudit('Orc')[0];assert.equal(orc.modifiers.baseMeleeAttackPowerPct,25);assert.equal(orc.healingPenaltySeconds,25);
 const troll=racialEventAudit('Troll')[0];assert.equal(troll.targetCreatureType,'Beast');assert.equal(troll.modifiers.damageDealtPct,5);
 assert.equal(racialEventAudit('High Elf')[0].modifiers.energy,50);assert.equal(racialEventAudit('Tauren')[0].cooldownSeconds,150);
 assert.equal(racialEventAudit('Goblin')[0].disablesAttacks,true);
 for(const race of ['Orc','Troll','Tauren','High Elf','Goblin'])assert.ok(racialEventAudit(race).every(x=>!x.appliedToSheet&&x.status==='source-backed-not-simulated'));
});
