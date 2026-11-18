import {combatAbilityInventory} from './combat-ability-audit.mjs';
import {RANK_EVIDENCE} from './combat-rank-evidence.mjs';
import {baseStatInventory} from './base-stat-audit.mjs';
import {REFERENCE_RANKS} from './combat-reference-ranks.mjs';
// Evidence coverage is not implementation coverage. No unreviewed or synthetic rank
// is promoted to public simulation by this inventory.
export function releaseReadiness(){
 const inv=combatAbilityInventory(),base=baseStatInventory();
 const classes=inv.classes.map(c=>{
  const abilities=c.rows.map(a=>{
   const ranks=RANK_EVIDENCE.filter(r=>r.abilityId===a.id).map(r=>structuredClone(r));
   const referenceRanks=REFERENCE_RANKS.filter(r=>r.abilityId===a.id),externalReferenceRanks=referenceRanks.filter(r=>r.status==='external-reference-only').map(r=>structuredClone(r.record));
   const candidateIds=[...new Set(a.candidateSpellIds||[])];
   const evidenceIds=new Set(ranks.map(r=>r.spellId));
   const availability=['hunter:counterattack','priest:power-infusion','shaman:natures-swiftness'].includes(a.id)?'removed':a.id==='hunter:trueshot-aura'?'conflicting-guide-and-archive':null;
   const executableAdapter=['hunter:auto-shot','hunter:pet-attack'].includes(a.id)?'scheduler-command':null;
   return {id:a.id,name:a.name,availability,executableAdapter,status:[...ranks,...externalReferenceRanks].some(r=>r.conflicts.length)?'source-conflict':ranks.length||externalReferenceRanks.length||a.contract?'published-partial':'unresolved',candidateIds,unreviewedCandidateIds:candidateIds.filter(id=>!evidenceIds.has(id)),guideContract:a.contract,ranks,externalReferenceRanks,referenceRankIds:referenceRanks.map(r=>r.spellId),validated:false};
  });
  const rows=base.combinations.filter(b=>b.classId===c.classId);
  return {classId:c.classId,registered:abilities.length,evidenceAbilities:abilities.filter(a=>a.status!=='unresolved').length,observedRanks:abilities.reduce((n,a)=>n+a.ranks.length,0),externalReferenceRanks:abilities.reduce((n,a)=>n+a.externalReferenceRanks.length,0),executableReferenceRanks:abilities.reduce((n,a)=>n+a.referenceRankIds.length,0),executableReferenceAbilities:abilities.filter(a=>a.referenceRankIds.length).length,executableAdapterAbilities:abilities.filter(a=>a.executableAdapter).length,conflictingAbilities:abilities.filter(a=>a.status==='source-conflict').length,validatedAbilities:0,referenceBaseRows:rows.reduce((n,b)=>n+b.referenceRows,0),missingBaseRows:rows.reduce((n,b)=>n+b.missingLevels.length,0),baseAnomalies:rows.reduce((n,b)=>n+b.anomalies.length,0),publicReady:false,abilities};
 });
 const sum=k=>classes.reduce((n,c)=>n+c[k],0);
 return {classes,totals:{classes:classes.length,registered:sum('registered'),evidenceAbilities:sum('evidenceAbilities'),observedRanks:sum('observedRanks'),externalReferenceRanks:sum('externalReferenceRanks'),executableReferenceRanks:sum('executableReferenceRanks'),executableReferenceAbilities:sum('executableReferenceAbilities'),executableAdapterAbilities:sum('executableAdapterAbilities'),executableAbilities:sum('executableReferenceAbilities')+sum('executableAdapterAbilities'),conflictingAbilities:sum('conflictingAbilities'),validatedAbilities:0,validatedClasses:0,missingBaseRows:sum('missingBaseRows'),baseAnomalies:sum('baseAnomalies')},publicReady:false};
}
let cached;
export function classReleaseReadiness(classId){cached??=releaseReadiness();const c=cached.classes.find(x=>x.classId===classId);if(!c)throw new Error('Unknown class');return structuredClone(c);}
