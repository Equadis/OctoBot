// Pure helpers shared by the UI and its regression tests.
export function elapsedLabel(time,now=Date.now()){
 const seconds=Math.max(0,Math.floor((now-Number(time))/1000));
 return Math.floor(seconds/60)+"m "+String(seconds%60).padStart(2,"0")+"s ago";
}
export function showOlderButton({more,error},scrollTop){
 return Boolean(error||more&&scrollTop<=2);
}
export const playerKey=name=>String(name??"").trim().toLowerCase();
const words=/@?[\p{L}\p{N}_]+(?:-[\p{L}\p{N}_]+)*/gu;
export function mentionParts(text,known){
 const source=String(text??""),parts=[];let cursor=0;
 for(const m of source.matchAll(words)){
  const value=m[0],key=playerKey(value.replace(/^@/,""));
  if(!known.has(key)&&!/^@[\p{L}][\p{L}\p{N}_-]*$/u.test(value))continue;
  if(m.index>0&&/[\p{L}\p{N}_@]/u.test(source[m.index-1]))continue;
  if(m.index>cursor)parts.push({text:source.slice(cursor,m.index)});
  parts.push({text:value,player:key});cursor=m.index+value.length;
 }
 if(cursor<source.length)parts.push({text:source.slice(cursor)});
 return parts;
}
export function rowInFocus(author,mentions,focused){
 return !focused||playerKey(author)===focused||mentions.includes(focused);
}
// The Auction House opens on this exact item (by ID, not by name) in the realm the chat is showing.
export function itemAuctionHref(id,realm=""){
 if(!Number.isSafeInteger(id)||id<=0||id>2147483647)return null;
 const params=new URLSearchParams();
 if(realm&&["N'Zoth","Y'Shaarj","C'Thun"].includes(realm))params.set("realm",realm);
 params.set("q",String(id));params.set("open",String(id));
 return "../auction-house/?"+params.toString();
}
export function itemDatabaseHref(id){
 if(!Number.isSafeInteger(id)||id<=0||id>2147483647)return null;
 return "https://octowow.st/db/?item="+id;
}
export function auctionSearchFromURL(url){
 const query=new URL(url).searchParams.get("q")??"";
 return query.trim().slice(0,80);
}
// Date separators are derived from message times, in UTC like the timestamps, and are never stored with the messages.
export const dayKey=row=>new Date(row.time).toISOString().slice(0,10);
export const dayLabel=key=>new Date(key+"T00:00:00Z").toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"});
// True for each row that begins a new calendar day in the order the rows are shown (and for the first row of the list).
export const startsDay=rows=>rows.map((row,i)=>i===0||dayKey(rows[i-1])!==dayKey(row));

