export const HISTORY_DAYS=7,HISTORY_MS=HISTORY_DAYS*86400000;
export const historyPageSize=query=>query.trim()?100:1000;
export function searchTerms(query){return String(query??"").trim().toLowerCase().split(/\s+/).filter(Boolean);}
export function matchesChat(row,query){
 const hay=[row.author,row.guild,row.message].filter(Boolean).join(" ").toLowerCase();
 return searchTerms(query).every(t=>hay.includes(t));
}
export function compareChat(a,b){return a.time-b.time||(a.id<b.id?-1:a.id>b.id?1:0);}
export function mergeChat(existing,incoming){const map=new Map(existing.map(r=>[r.id,r]));for(const r of incoming)map.set(r.id,r);return [...map.values()].sort(compareChat);}
export function cursorFor(rows){const first=rows[0];return first?{before:String(first.time),beforeId:first.id}:null;}

export function mergeHistoryWindow(existing,incoming,{query="",now=Date.now(),capacity=historyPageSize(query),preserveOlder=false,hasMore=false}={}){
 const oldest=existing[0],cutoff=now-HISTORY_MS;
 // Update known IDs before filtering, so new profile information cannot leave a stale matching row.
 const knownIds=new Set(existing.map(r=>r.id));
 const eligible=incoming.filter(r=>r.time>=cutoff&&(knownIds.has(r.id)||!oldest||compareChat(r,oldest)>=0));
 let rows=mergeChat(existing,eligible).filter(r=>r.time>=cutoff&&matchesChat(r,query));
 if(rows.length>capacity){
  if(preserveOlder)capacity=rows.length;
  else{rows=rows.slice(-capacity);hasMore=true;}
 }
 return {rows,capacity,hasMore};
}

export function historyErrorMessage(status,code){
 if(status===404||status===405)return "History API is not deployed. Live chat only.";
 if(code==="history_schema_missing")return "History database migration missing. Live chat only.";
 if(status===503)return "History database temporarily unavailable. Live chat only.";
 if(status===400)return "History request invalid. Clear the search or retry.";
 if(status)return "History unavailable (HTTP "+status+"). Live chat only.";
 return "History connection failed. Live chat only.";
}
export function liveFallback(rows,query,now=Date.now()){
 return mergeChat([],rows).filter(r=>r.time>=now-HISTORY_MS&&matchesChat(r,query)).slice(-historyPageSize(query));
}
