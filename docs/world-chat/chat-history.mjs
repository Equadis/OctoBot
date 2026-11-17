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
