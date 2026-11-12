/* Estimate earlier realm population from the current three-realm split.
 * These points are display-only; do not persist them as observations.
 */
(function(root){
 'use strict';
 const REALM_IDS=['nzoth','cthun','yshaarj'];
 const MAX_AGE=10*60*1000;
 function estimateRealmHistory(totalHistory,snapshots,realm,actualRows,now=Date.now()){
  if(!REALM_IDS.includes(realm)||!Array.isArray(totalHistory)||!Array.isArray(actualRows))return [];
  const counts={};
  for(const id of REALM_IDS){
   const reading=snapshots?.[id];
   const at=Date.parse(reading?.timestamp);
   if(!Number.isSafeInteger(reading?.online)||reading.online<0||
      !Number.isFinite(at)||at>now+60000||now-at>MAX_AGE)return [];
   counts[id]=reading.online;
  }
  const total=REALM_IDS.reduce((sum,id)=>sum+counts[id],0);
  if(total<=0)return [];
  const earliestActual=actualRows.length?actualRows[0].t:Infinity;
  return totalHistory
   .filter(row=>Number.isFinite(row.t)&&row.t<earliestActual&&Number.isFinite(row.value)&&row.value>=0)
   .map(row=>({t:row.t,value:row.value*counts[realm]/total}));
 }
 const api={REALM_IDS,MAX_AGE,estimateRealmHistory};
 root.RealmEstimates=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
