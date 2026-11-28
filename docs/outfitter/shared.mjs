// Recently shared outfits: a separate collection from Saved outfits, newest first.
import {normalise,encode} from './state.mjs?v=20261116-races1';
export const SHARED_LIMIT=30;
// Two shares of the same equipment, race, body and look count as one outfit.
export const outfitKey=outfit=>encode(outfit);
export function sanitiseShared(value){
 if(!Array.isArray(value))return [];
 const seen=new Set(),result=[];
 for(const entry of value){
  if(!entry||typeof entry.name!=='string'||!entry.name.trim()||entry.name.length>80||typeof entry.url!=='string'||!/^https?:\/\/[^\s]+#outfit=/.test(entry.url)||entry.url.length>9000)continue;
  const sharedAt=Number(entry.sharedAt);if(!Number.isFinite(sharedAt)||sharedAt<=0)continue;
  let outfit;try{outfit=normalise(entry.outfit);}catch{continue;}
  const key=outfitKey(outfit);if(seen.has(key))continue;seen.add(key);
  result.push({name:entry.name.trim(),outfit,url:entry.url,sharedAt,...(typeof entry.snapshot==='string'&&entry.snapshot.startsWith('data:image/')?{snapshot:entry.snapshot}:{})});
 }
 return result.sort((a,b)=>b.sharedAt-a.sharedAt).slice(0,SHARED_LIMIT);
}
// Re-sharing an identical outfit updates its entry (name, link, time) and moves it to the top rather than adding a duplicate.
export function addShared(list,{name,outfit,url,snapshot},now=Date.now()){
 const key=outfitKey(outfit),entry={name:name.trim(),outfit:structuredClone(normalise(outfit)),url,sharedAt:now,...(snapshot?{snapshot}:{})};
 return [entry,...list.filter(other=>outfitKey(other.outfit)!==key)].slice(0,SHARED_LIMIT);
}
export function removeShared(list,entry){return list.filter(other=>other!==entry&&!(other.sharedAt===entry.sharedAt&&outfitKey(other.outfit)===outfitKey(entry.outfit)));}
export function sharedAgo(timestamp,now=Date.now()){
 const seconds=Math.max(0,Math.round((now-timestamp)/1000));
 if(seconds<60)return 'just now';
 const minutes=Math.round(seconds/60);if(minutes<60)return `${minutes} min ago`;
 const hours=Math.round(minutes/60);if(hours<24)return `${hours} h ago`;
 const days=Math.round(hours/24);return `${days} ${days===1?'day':'days'} ago`;
}
