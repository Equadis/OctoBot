(function(root){
 'use strict';
 const OFFLINE_CONFIRMATION_MS=15*60000;
 const MONITOR_STALE_MS=10*60000;

 function realmStatus(samples,realm,reference,now){
  const observedAt=Date.parse(reference?.observed_at);
  const elapsed=reference?.elapsed_seconds;
  const hasReference=Number.isFinite(observedAt)&&observedAt<=now&&
   Number.isSafeInteger(elapsed)&&elapsed>=0;
  let startedAt=hasReference?observedAt-elapsed*1000:null;
  let checkedAt=hasReference?observedAt:null;
  let previousOffline=null,state=hasReference?'online':'unknown',offline=false;

  for(const [time,row] of samples){
   if(time>(now+60000)||(hasReference&&time<=observedAt))continue;
   checkedAt=time;
   state=row.website==='available'?row.realms?.[realm]:'unknown';
   if(state==='offline'){
    if(previousOffline!==null&&time-previousOffline<=OFFLINE_CONFIRMATION_MS){
     startedAt=null;
     offline=true;
    }
    previousOffline=time;
   }else{
    previousOffline=null;
    if(state==='online'){
     startedAt??=time;
     offline=false;
    }
   }
  }
  return {startedAt,checkedAt,state,offline};
 }

 function summarize(clockByRealm,realm,now){
  const clocks=realm==='all'?Object.values(clockByRealm):[clockByRealm[realm]];
  if(clocks.some(clock=>clock?.offline))return {kind:'offline'};
  if(!clocks.length||clocks.some(clock=>clock?.startedAt==null))return {kind:'unknown'};
  const latestStart=Math.max(...clocks.map(clock=>clock.startedAt));
  const stale=clocks.some(clock=>clock.state!=='online'||now-clock.checkedAt>MONITOR_STALE_MS);
  return {kind:'running',seconds:Math.max(0,Math.floor((now-latestStart)/1000)),stale};
 }

 function mergeStatus(old,row,realms){
  if(row.website!=='available')return old||row;
  if(old?.website!=='available')return row;
  const merged={...old.realms};
  for(const realm of realms){
   const previous=old.realms?.[realm],next=row.realms?.[realm];
   if(next!=='online'&&next!=='offline')continue;
   if(previous==='conflict')continue;
   merged[realm]=(previous==='online'||previous==='offline')&&previous!==next
    ?'conflict':next;
  }
  return {...old,realms:merged};
 }

 function format(seconds){
  const d=Math.floor(seconds/86400),h=Math.floor(seconds%86400/3600);
  const m=Math.floor(seconds%3600/60),s=seconds%60;
  return d+'D '+h+'H '+m+'M '+s+'S';
 }

 const api={realmStatus,summarize,mergeStatus,format};
 root.OctoBotUptime=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
