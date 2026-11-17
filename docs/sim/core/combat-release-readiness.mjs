import {combatAbilityInventory} from './combat-ability-audit.mjs';
import {RANK_EVIDENCE} from './combat-rank-evidence.mjs';
import {baseStatInventory} from './base-stat-audit.mjs';
// Evidence coverage is not implementation coverage. No unreviewed or synthetic rank
// is promoted to public simulation by this inventory.
export function releaseReadiness(){
 const inv=combatAbilityInventory(),base=baseStatInventory();
 const classes=inv.classes.map(c=>{
  const abilities=c.rows.map(a=>{
   const ranks=RANK_EVIDENCE.filter(r=>r.abilityId===a.id).map(r=>structuredClone(r));
   const candidateIds=[...new Set(a.candidateSpellIds||[])];
   const evidenceIds=new Set(ranks.map(r=>r.spellId));
   return {id:a.id,name:a.name,status:ranks.some(r=>r.conflicts.length)?'source-conflict':ranks.length||a.contract?'published-partial':'unresolved',candidateIds,unreviewedCandidateIds:candidateIds.filter(id=>!evidenceIds.has(id)),guideContract:a.contract,ranks,validated:false};
  });
  const rows=base.combinations.filter(b=>b.classId===c.classId);
  return {classId:c.classId,registered:abilities.length,evidenceAbilities:abilities.filter(a=>a.status!=='unresolved').length,observedRanks:abilities.reduce((n,a)=>n+a.ranks.length,0),conflictingAbilities:abilities.filter(a=>a.status==='source-conflict').length,validatedAbilities:0,referenceBaseRows:rows.reduce((n,b)=>n+b.referenceRows,0),missingBaseRows:rows.reduce((n,b)=>n+b.missingLevels.length,0),baseAnomalies:rows.reduce((n,b)=>n+b.anomalies.length,0),publicReady:false,abilities};
 });
 const sum=k=>classes.reduce((n,c)=>n+c[k],0);
 return {classes,totals:{classes:classes.length,registered:sum('registered'),evidenceAbilities:sum('evidenceAbilities'),observedRanks:sum('observedRanks'),conflictingAbilities:sum('conflictingAbilities'),validatedAbilities:0,validatedClasses:0,missingBaseRows:sum('missingBaseRows'),baseAnomalies:sum('baseAnomalies')},publicReady:false};
}
let cached;
export function classReleaseReadiness(classId){cached??=releaseReadiness();const c=cached.classes.find(x=>x.classId===classId);if(!c)throw new Error('Unknown class');return structuredClone(c);}
