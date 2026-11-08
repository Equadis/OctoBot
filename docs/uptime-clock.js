/* Uptime is extrapolated from a real in-game reading, not from poll freshness.
 * Only repeated explicit official-realm offline observations interrupt it.
 * Missing/stale/unknown checks and shared TCP failures cannot prove a restart.
 */
(function(root){
 'use strict';
 const OFFLINE_CONFIRMATION_MS=15*60000;
 function referenceFor(realm,references){
  if(!references||typeof references!=='object')return null;
  // All Realms has no verified combined uptime. Display a clearly labelled
  // N'Zoth-based uptime instead of hiding the last real in-game reference.
  const sourceRealm=realm==='all'?'nzoth':realm;
  return {sourceRealm,reference:references[sourceRealm]||null};
 }
 function confirmedOffline(samples,realm,observedAt,now=Date.now()){
  if(!Array.isArray(samples)||!Number.isFinite(observedAt))return null;
  const unique=new Map();
  for(const row of samples){
   const t=Date.parse(row?.timestamp);
   if(!Number.isFinite(t)||t<=observedAt||t>now+60000)continue;
   // A source outage or unknown official realm state cannot establish downtime.
   const state=row?.website==='available'?row?.realms?.[realm]:null;
   // Deduplicate matching timestamps from GitHub and Cloudflare.
   if(state==='offline'||state==='online'||state==='unknown')
    unique.set(t,state);
  }
  let previous=null;
  for(const [time,state] of [...unique].sort((a,b)=>a[0]-b[0])){
   if(state!=='offline'){previous=null;continue;}
   if(previous!==null&&time>previous&&time-previous<=OFFLINE_CONFIRMATION_MS)
    return {first:previous,confirmed:time};
   previous=time;
  }
  return null;
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
  const totalSeconds=elapsed+Math.floor((now-anchor)/1000);
  return {kind:'running',sourceRealm,seconds:totalSeconds,anchor,estimated:true};
 }
 function format(seconds){
  if(!Number.isSafeInteger(seconds)||seconds<0)return 'NO DATA';
  const d=Math.floor(seconds/86400),h=Math.floor(seconds%86400/3600);
  const m=Math.floor(seconds%3600/60),s=seconds%60;
  return d+'D '+h+'H '+m+'M '+s+'S';
 }
 const api={referenceFor,confirmedOffline,compute,format};
 root.OctoBotUptime=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
