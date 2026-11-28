export const HISTORY_DAYS=7,HISTORY_MS=HISTORY_DAYS*86400000;
export const historyPageSize=query=>query.trim()?100:1000;
export function searchTerms(query){
 const tokens=String(query??"").trim().toLowerCase().match(/(?:from|item|has|mentions|in):"[^"]*"|[^\s]+/g)||[];
 const terms=[];
 for(let i=0;i<tokens.length;i++){
  const token=tokens[i],tag=/^(from|item|has|mentions|in):(.*)$/.exec(token);
  if(!tag){terms.push({kind:"text",value:token});continue;}
  let value=tag[2],quoted=value.startsWith('"')&&value.endsWith('"')&&value.length>=2;
  if(quoted)value=value.slice(1,-1);
  else if(tag[1]==="item"&&!/^\d+$/.test(value)){
   while(i+1<tokens.length&&!/^(from|item|has|mentions|in):/.test(tokens[i+1]))value+=" "+tokens[++i];
  }
  value=value.trim();
  terms.push({kind:tag[1],value});
 }
 return terms;
}
export const SEARCH_OPTIONS=[
 {token:"from:",label:"From",description:"Messages from a player"},
 {token:"mentions:",label:"Mentions",description:"Messages mentioning a player"},
 {token:"has:mentions",label:"Has mentions",description:"Messages with an explicit @mention"},
 {token:"has:item",label:"Has item",description:"Messages containing an item link"},
 {token:"has:link",label:"Has link",description:"Messages containing a web link"},
 {token:"item:",label:"Item",description:"Search by item name or ID"},
 {token:"in:",label:"Guild",description:"Messages from a guild"}
];
const wordTokens=text=>String(text??"").toLowerCase().match(/@[\p{L}][\p{L}\p{N}_-]*|[\p{L}\p{N}_]+(?:-[\p{L}\p{N}_]+)*/gu)||[];
export function matchesChat(row,query){
 const hay=[row.author,row.guild,row.message].filter(Boolean).join(" ").toLowerCase();
 const parts=Array.isArray(row.parts)?row.parts.filter(p=>Number.isSafeInteger(p?.itemId)&&p.itemId>0):[];
 return searchTerms(query).every(({kind,value})=>!value?false:kind==="from"?String(row.author??"").toLowerCase()===value:kind==="in"?String(row.guild??"").toLowerCase()===value:kind==="mentions"?wordTokens(row.message).some(word=>word.replace(/^@/,"")===value.replace(/^@/,"")):kind==="has"?(value==="mentions"?wordTokens(row.message).some(word=>word.startsWith("@")):value==="item"?parts.length>0:value==="link"?/(?:https?:\/\/|www\.|discord\.gg\/)/i.test(row.message??""):false):kind==="item"?(/^\d+$/.test(value)?parts.some(p=>p.itemId===Number(value)):parts.some(p=>String(p.text??"").toLowerCase().includes(value))):hay.includes(value));
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
