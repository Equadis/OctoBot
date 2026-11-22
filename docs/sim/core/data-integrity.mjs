import {baseStatInventory} from './base-stat-audit.mjs';
import {companionEvidencePlan} from './phase-four-evidence.mjs';
import {releaseReadiness} from './combat-release-readiness.mjs';

// A capture queue is evidence debt, not a substitute for measured values.
export function buildIntegrityQueue(base=baseStatInventory(), combat=releaseReadiness()){
 const baseRows=base.combinations.flatMap(c=>[
  ...c.missingLevels.map(level=>({race:c.race,classId:c.classId,level,reason:'missing'})),
  ...c.anomalies.map(a=>({race:c.race,classId:c.classId,level:a.level,reason:'anomaly',issues:a.issues})),
  ...c.conflicts.map(a=>({race:c.race,classId:c.classId,level:a.level,reason:'source-conflict',issues:a.issues}))
 ]).sort((a,b)=>Number(b.level===60)-Number(a.level===60)||Number(b.reason==='anomaly')-Number(a.reason==='anomaly'));
 const abilities=combat.classes.flatMap(c=>c.abilities);
 const spellRows=abilities.flatMap(a=>{
  const ranks=[...a.ranks,...a.externalReferenceRanks];
  return ranks.filter(r=>r.conflicts.length||r.unknown.length).map(r=>({
   abilityId:a.id,spellId:r.spellId,rank:r.rank,source:r.source,
   conflicts:structuredClone(r.conflicts),unknown:structuredClone(r.unknown),
   status:'requires-evidence'
  }));
 });
 const identityRows=abilities.filter(a=>a.researchMechanic).map(a=>({abilityId:a.id,reason:a.researchMechanic,candidateIds:[...a.candidateIds]}));
 const byClass=combat.classes.map(c=>({classId:c.classId,
  baseCaptureRows:baseRows.filter(r=>r.classId===c.classId).length,
  conflictingAbilities:c.abilities.filter(a=>a.status==='source-conflict').length,
  spellCaptureRows:spellRows.filter(r=>r.abilityId.startsWith(c.classId+':')).length}));
 const companionRows=companionEvidencePlan();
 return {schemaVersion:2,publicReady:false,totals:{
  missingBaseRows:base.totals.missingRows,baseAnomalies:base.totals.anomalies,baseSourceConflicts:base.totals.sourceConflicts,
  referenceBaseRowsNotLiveVerified:base.totals.referenceRows-base.totals.liveVerifiedRows,
  baseCaptureRows:baseRows.length,level60BaseCaptureRows:baseRows.filter(r=>r.level===60).length,companionBaselineRows:companionRows.length,conflictingAbilities:abilities.filter(a=>a.status==='source-conflict').length,
  conflictingRankRows:spellRows.filter(r=>r.conflicts.length).length,spellCaptureRows:spellRows.length,
  identityRows:identityRows.length},byClass,baseRows,spellRows,identityRows,companionRows};
}
