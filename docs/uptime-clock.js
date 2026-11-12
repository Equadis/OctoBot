/* The uptime estimate is tied to a real in-game reading.
 * NO DATA is a visibility gap, not an outage or an opportunity to reset the timer.
 * Only consecutive, explicit official-realm DOWN observations invalidate the anchor.
 */
(function(root){
 'use strict';
 const OFFLINE_CONFIRMATION_MS=15*60000;
 const MONITOR_STALE_MS=10*60000;

 function referenceFor(realm,references){
  if(!references||typeof references!=='object')return null;
  // All Realms has no combined uptime reference; label the N'Zoth reading.
  const sourceRealm=realm==='all'?'nzoth':realm;
  return {sourceRealm,reference:references[sourceRealm]||null};
 }
 function realmState(row,realm){
  if(row?.website!=='available')return 'unknown';
  const state=row?.realms?.[realm];
  return state==='online'||state==='offline'?state:'unknown';
 }
 function observations(samples,realm,observedAt,now){
  if(!Array.isArray(samples))return [];
  const unique=new Map();
  for(const row of samples){
   const t=Date.parse(row?.timestamp);
   if(!Number.isFinite(t)||t<=observedAt||t>now+60000)continue;
   const state=realmState(row,realm);
   // Conflicting sources for the same timestamp cannot establish downtime.
   if(unique.has(t)&&unique.get(t)!==state)unique.set(t,'unknown');
   else if(!unique.has(t))unique.set(t,state);
  }
  return [...unique].sort((a,b)=>a[0]-b[0]);
 }
 function confirmedOffline(samples,realm,observedAt,now=Date.now()){
  if(!Number.isFinite(observedAt))return null;
  let previous=null;
  for(const [time,state] of observations(samples,realm,observedAt,now)){
   // Unknown observations *break* confirmation: do not bridge a NO DATA gap.
   if(state!=='offline'){previous=null;continue;}
   if(previous!==null&&time>previous&&time-previous<=OFFLINE_CONFIRMATION_MS)
    return {first:previous,confirmed:time};
   previous=time;
  }
  return null;
 }
 function monitorStatus(samples,realm,observedAt,now=Date.now()){
  const last=observations(samples,realm,observedAt,now).at(-1);
  if(!last)return {kind:'unobserved'};
  const [timestamp,state]=last;
  if(now-timestamp>MONITOR_STALE_MS)return {kind:'unknown',reason:'stale',timestamp};
  if(state==='online')return {kind:'online',timestamp};
  if(state==='offline')return {kind:'uncertain',reason:'offline report awaiting confirmation',timestamp};
  return {kind:'unknown',reason:'monitoring gap',timestamp};
 }
 function compute(realm,references,now,confirmedIncident=null){
  const selected=referenceFor(realm,references);
  if(!selected)return {kind:'unknown'};
  const {sourceRealm,reference}=selected;
  const anchor=Date.parse(reference?.observed_at);
  const elapsed=reference?.elapsed_seconds;
  if(!Number.isFinite(anchor)||anchor>now||!Number.isInteger(elapsed)||elapsed<0)
   return {kind:'unknown',sourceRealm};
  const interruption=confirmedIncident?.confirmed>anchor?confirmedIncident:null;
  if(interruption)return {kind:'interrupted',sourceRealm,interruption};
  // Always include elapsed wall-clock time, including all NO DATA intervals.
  const totalSeconds=elapsed+Math.floor((now-anchor)/1000);
  return {kind:'running',sourceRealm,seconds:totalSeconds,anchor,estimated:true};
 }
 function format(seconds){
  if(!Number.isSafeInteger(seconds)||seconds<0)return 'NO DATA';
  const d=Math.floor(seconds/86400),h=Math.floor(seconds%86400/3600);
  const m=Math.floor(seconds%3600/60),s=seconds%60;
  return d+'D '+h+'H '+m+'M '+s+'S';
 }
 const api={referenceFor,realmState,confirmedOffline,monitorStatus,compute,format};
 root.OctoBotUptime=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
