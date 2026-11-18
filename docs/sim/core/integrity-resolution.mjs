import {buildIntegrityQueue} from './data-integrity.mjs';
import {reviewBaseEvidence} from './evidence-review.mjs';
import {reviewSpellEvidence} from './spell-evidence-review.mjs';
import {reconcileGuideSources} from './guide-source-reconciliation.mjs';

// A review packet is restricted to one target server context. Candidate evidence
// is deliberately not applied to production or counted as authenticated.
export function integrityResolution({realm,phase,clientBuild,base=[],spells=[]},queue=buildIntegrityQueue()){
 if(![realm,phase,clientBuild].every(v=>typeof v==='string'&&v.trim()))throw new Error('Explicit realm, phase and clientBuild required');
 if(!Array.isArray(base)||!Array.isArray(spells))throw new TypeError('Evidence arrays required');
 const matches=r=>r&&r.realm===realm&&r.phase===phase&&r.clientBuild===clientBuild;
 const b=reviewBaseEvidence(base.filter(matches)),s=reviewSpellEvidence(spells.filter(matches),queue);
 const key=(...v)=>JSON.stringify(v);
 const baseBy=new Map(b.rows.map(r=>[key(...r.coordinate.slice(3)),r]));
 const baseTasks=queue.baseRows.map(r=>{
  const observation=baseBy.get(key(r.race,r.classId,r.level));
  return {...r,observation:observation||null,status:observation?.status||'no-observation'};
 });
 const spellTasks=queue.spellRows.flatMap(r=>{
  const fields=[...new Set(r.conflicts.map(c=>c.field).filter(f=>typeof f==='string'&&f.trim()))];
  return fields.map(field=>{
   const observations=s.rows.filter(o=>o.coordinate[0]===r.abilityId&&o.coordinate[1]===r.spellId&&o.coordinate[2]===r.rank&&o.coordinate[3]===field);
   const status=observations.some(o=>o.status==='conflict')?'conflict':observations.some(o=>o.status==='corroborated-candidate')?'candidate-needs-authentication':observations.length?'single-observation':'no-observation';
   return {abilityId:r.abilityId,spellId:r.spellId,rank:r.rank,source:r.source,field,conflicts:r.conflicts.filter(c=>c.field===field),observations,status};
  });
 });
 const count=(rows,status)=>rows.filter(r=>r.status===status).length;
 return {schemaVersion:1,context:{realm,phase,clientBuild},publicReady:false,
  totals:{baseTasks:baseTasks.length,baseCandidates:count(baseTasks,'corroborated-candidate'),baseConflicts:count(baseTasks,'conflict'),
   spellFieldTasks:spellTasks.length,spellCandidates:count(spellTasks,'candidate-needs-authentication'),spellConflicts:count(spellTasks,'conflict'),
   identityBlockers:queue.identityRows.length,rankUnknowns:queue.spellRows.reduce((n,r)=>n+r.unknown.length,0),authenticatedCorrections:0},
  rejected:{base:b.rejected,spells:s.rejected,outsideContext:base.length+spells.length-base.filter(matches).length-spells.filter(matches).length},
  baseTasks,spellTasks,identityTasks:queue.identityRows,unknownTasks:queue.spellRows.filter(r=>r.unknown.length).map(r=>({abilityId:r.abilityId,spellId:r.spellId,rank:r.rank,source:r.source,unknown:r.unknown})),guideCandidates:reconcileGuideSources(queue)};
}
