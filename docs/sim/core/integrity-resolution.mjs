import {buildIntegrityQueue} from './data-integrity.mjs';
import {reviewBaseEvidence} from './evidence-review.mjs';
import {reviewSpellEvidence} from './spell-evidence-review.mjs';
import {baseStatProfile} from './base-stat-audit.mjs';
import {reviewCompanionEvidence,reviewIdentityEvidence} from './phase-four-evidence.mjs';
import {reconcileGuideSources} from './guide-source-reconciliation.mjs';

// A review packet is restricted to one target server context. Candidate evidence
// is deliberately not applied to production or counted as authenticated.
export function integrityResolution({realm,phase,clientBuild,base=[],spells=[],identities=[],companions=[],inheritance=[]},queue=buildIntegrityQueue()){
 if(![realm,phase,clientBuild].every(v=>typeof v==='string'&&v.trim()))throw new Error('Explicit realm, phase and clientBuild required');
 if(![base,spells,identities,companions,inheritance].every(Array.isArray))throw new TypeError('Evidence arrays required');
 const matches=r=>r&&r.realm===realm&&r.phase===phase&&r.clientBuild===clientBuild;
 const b=reviewBaseEvidence(base.filter(matches)),s=reviewSpellEvidence(spells.filter(matches),queue);
 const identity=reviewIdentityEvidence(identities.filter(matches),queue.identityRows);
 const companion=reviewCompanionEvidence(companions.filter(matches),inheritance.filter(matches));
 const key=(...v)=>JSON.stringify(v);
 const baseBy=new Map(b.rows.map(r=>[key(...r.coordinate.slice(3)),r]));
 const baseTasks=queue.baseRows.map(r=>{
  const observation=baseBy.get(key(r.race,r.classId,r.level));
  return {...r,observation:observation||null,status:observation?.status||'no-observation'};
 });
 const queuedBaseKeys=new Set(queue.baseRows.map(r=>key(r.race,r.classId,r.level)));
 const baseReferenceReviews=b.rows.filter(r=>!queuedBaseKeys.has(key(...r.coordinate.slice(3)))).map(observation=>{
  const profile=baseStatProfile(...observation.coordinate.slice(3));
  return {observation,reference:profile.row,referenceSource:profile.source,difference:profile.row&&observation.row?observation.row.map((v,i)=>v-profile.row[i]):null};
 });
 const observationsByField=new Map();
 for(const observation of s.rows){
  const id=key(...observation.coordinate.slice(0,4));
  const rows=observationsByField.get(id)??[];
  rows.push(observation);
  observationsByField.set(id,rows);
 }
 const spellTasks=queue.spellRows.flatMap(r=>{
  const fields=[...new Set(r.conflicts.map(c=>c.field).filter(f=>typeof f==='string'&&f.trim()))];
  return fields.map(field=>{
   const observations=observationsByField.get(key(r.abilityId,r.spellId,r.rank,field))??[];
   const values=new Set(observations.map(o=>key(o.value,o.unit)));
   const status=observations.some(o=>o.status==='conflict')?'conflict':values.size>1?'condition-dependent':observations.some(o=>o.status==='corroborated-candidate')?'candidate-needs-authentication':observations.length?'single-observation':'no-observation';
   return {abilityId:r.abilityId,spellId:r.spellId,rank:r.rank,source:r.source,field,conflicts:r.conflicts.filter(c=>c.field===field),observations,status};
  });
 });
 const count=(rows,status)=>rows.filter(r=>r.status===status).length;
 return {schemaVersion:2,context:{realm,phase,clientBuild},publicReady:false,
  totals:{baseTasks:baseTasks.length,baseCandidates:count(baseTasks,'corroborated-candidate'),baseConflicts:count(baseTasks,'conflict'),
   spellFieldTasks:spellTasks.length,spellCandidates:count(spellTasks,'candidate-needs-authentication'),spellConflicts:count(spellTasks,'conflict'),
   identityBlockers:queue.identityRows.length,identityCandidates:count(identity.tasks,'candidate-needs-authentication'),companionBaselineTasks:companion.plan.length,companionBaselineCandidates:count(companion.baselines.rows,'corroborated-candidate'),inheritanceCandidates:count(companion.inheritance.rows,'corroborated-candidate'),rankUnknowns:queue.spellRows.reduce((n,r)=>n+r.unknown.length,0),authenticatedCorrections:0},
  rejected:{base:b.rejected,spells:s.rejected,identities:identity.rejected,companions:companion.baselines.rejected,inheritance:companion.inheritance.rejected,outsideContext:[base,spells,identities,companions,inheritance].flat().filter(r=>!matches(r)).length},
  baseTasks,baseReferenceReviews,spellTasks,identityTasks:identity.tasks,companion,unknownTasks:queue.spellRows.filter(r=>r.unknown.length).map(r=>({abilityId:r.abilityId,spellId:r.spellId,rank:r.rank,source:r.source,unknown:r.unknown})),guideCandidates:reconcileGuideSources(queue)};
}
