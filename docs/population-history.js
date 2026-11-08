/* Read actual Cloudflare D1 population observations independently of GitHub.
 * GitHub publishes sparse snapshots; using its latest timestamp as a Worker
 * cursor discards real minute readings before that timestamp.
 */
(function(root){
  'use strict';
  const DAY=86400000,RETENTION_MS=90*DAY,MAX_PAGES=60;
  function createHistoryReader({fetchPage,normalise,clock=()=>Date.now()}){
    const workerRows=new Map(),cursors=new Map();
    const combine=(archived,extra)=>normalise([...archived,...extra].map(row=>({
      timestamp:new Date(row.t).toISOString(),online:row.value
    })));
    return async function readWorkerHistory(realm,archived){
      const previous=workerRows.get(realm)||[];
      let since=cursors.has(realm)?cursors.get(realm):Math.max(0,clock()-RETENTION_MS);
      const collected=[];
      let completed=false;
      try{
        for(let page=0;page<MAX_PAGES;page++){
          const response=await fetchPage(realm,since);
          if(!response||!Array.isArray(response.readings))
            throw Error('Invalid Worker population history response');
          const batch=normalise(response.readings);
          collected.push(...batch.filter(row=>row.t>since));
          const next=batch.length?batch[batch.length-1].t:since;
          if(!response.has_more){
            since=Math.max(since,next);
            completed=true;break;
          }
          if(!batch.length||next<=since)
            throw Error('Worker population history pagination stalled');
          since=next;
        }
        if(!completed)throw Error('Worker population history exceeds page limit');
        const merged=combine(previous,collected);
        workerRows.set(realm,merged);
        cursors.set(realm,since);
        return combine(archived,merged);
      }catch(error){
        // Retain all previously retrieved real readings during an outage.
        console.warn('Cloudflare population history unavailable; retaining recorded samples',error);
        return combine(archived,previous);
      }
    };
  }
  const api={createHistoryReader};
  root.PopulationHistory=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
