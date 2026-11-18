import {BASE_STATS} from './base-stats.mjs';
import {CLASS_RACES} from './class-rules.mjs';
import {baseStatInventory,BASE_STAT_SOURCE} from './base-stat-audit.mjs';
// Class-only resource fields are reference candidates, never complete rows.
export function reconcileBaseReferences(table=BASE_STATS,races=CLASS_RACES,inventory=baseStatInventory()){
 const resourceCandidates=[], resourceConflicts=[], anomalyCandidates=[];
 for(const [classId,allowed] of Object.entries(races)){
  for(let level=1;level<=60;level++){
   const observed=allowed.flatMap(race=>{
    const row=table[race+':'+classId]?.[level-1];
    return Array.isArray(row)&&row.length===7&&row.every(v=>Number.isSafeInteger(v)&&v>=0)?[{race,values:row.slice(5)}]:[];
   });
   const distinct=new Set(observed.map(o=>JSON.stringify(o.values)));
   if(distinct.size>1)resourceConflicts.push({classId,level,observed});
   if(distinct.size!==1||observed.length<2)continue;
   for(const race of allowed.filter(r=>!table[r+':'+classId]?.[level-1])){
    resourceCandidates.push({race,classId,level,baseHealth:observed[0].values[0],baseMana:observed[0].values[1],supportingRaces:observed.map(o=>o.race),source:BASE_STAT_SOURCE,status:'class-reference-only',liveVerified:false});
   }
  }
 }
 for(const c of inventory.combinations){
  for(const a of c.anomalies){
   const current=table[c.race+':'+c.classId]?.[a.level-1];
   const compare=Object.entries(table).filter(([key])=>key.endsWith(':'+c.classId)&&key!==c.race+':'+c.classId).map(([key,rows])=>({race:key.split(':')[0],previous:rows[a.level-2]||null,current:rows[a.level-1]||null,next:rows[a.level]||null}));
   anomalyCandidates.push({race:c.race,classId:c.classId,level:a.level,current,previous:table[c.race+':'+c.classId]?.[a.level-2]||null,next:table[c.race+':'+c.classId]?.[a.level]||null,compare,issues:a.issues,status:'requires-independent-evidence'});
  }
 }
 return {source:BASE_STAT_SOURCE,resourceCandidates,resourceConflicts,anomalyCandidates,totals:{partialRows:resourceCandidates.length,referenceFields:resourceCandidates.length*2,resourceConflicts:resourceConflicts.length,anomalies:anomalyCandidates.length},publicReady:false};
}
