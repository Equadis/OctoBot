// Fixed-origin, read-only proxy. Never accepts upstream URLs, credentials or cookies.
const ASSET_BASE='https://wow.zamimg.com/modelviewer/classic/';
const HEADERS={'access-control-allow-origin':'*','x-content-type-options':'nosniff'};
function json(value,status=200){return new Response(JSON.stringify(value),{status,headers:{...HEADERS,'content-type':'application/json','cache-control':status===200?'public, max-age=86400':'no-store'}});}
export function parseDisplayId(html) {
 const match=html.match(/Display\s+ID:\s*(\d+)/i);
 const id=Number(match?.[1]);
 if(!Number.isSafeInteger(id)||id<1||id>10000000)throw Error('Item appearance not found in the OctoWoW database.');
 return id;
}
// OctoWoW's database uses its own display IDs, which are mostly absent from the Classic model
// library. Wowhead Classic's item XML names the Classic appearance for original items.
export function parseClassicDisplayId(xml,itemId) {
 if(!xml.includes(`<item id="${itemId}"`))return null;
 const id=Number(xml.match(/<icon\s+displayId="(\d+)"/)?.[1]);
 return Number.isSafeInteger(id)&&id>0&&id<=10000000?id:null;
}
async function classicDisplayId(id,fetcher) {
 try {
  let url=`https://www.wowhead.com/classic/item=${id}&xml`,response;
  for(let hop=0;hop<2;hop++) {
   response=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(8000),headers:{Accept:'application/xml'},cf:{cacheTtl:604800,cacheEverything:true}});
   const location=response.status>=300&&response.status<400?response.headers.get('location'):null;
   if(!location)break;
   const next=new URL(location,url);
   // Follow only within Wowhead, never to an arbitrary destination.
   if(next.protocol!=='https:'||!/^(?:www|classic)\.wowhead\.com$/.test(next.hostname))return null;
   url=next.href;
  }
  if(!response?.ok)return null;
  const text=await response.text();
  return text.length>2000000?null:parseClassicDisplayId(text,id);
 } catch {return null;}
}
export function assetPath(path) {
 const value=path.replace(/^\/api\/outfitter\/assets\//,'');
 // Only model data and textures; no scripts, HTML, redirects or arbitrary paths.
 return /^(?:meta\/(?:character|charactercustomization|item|itemvisual)\/\d+\.json|meta\/armor\/\d+\/\d+\.json|(?:m2\/\d+\.m2|skin\/\d+\.skin|skel\/\d+\.skel|anim\/\d+\.anim|phys\/\d+\.phys|bone\/\d+\.bone)|textures\/\d+\.(?:webp|png))$/.test(value)?value:null;
}
// ---- Overlay: OctoWoW's own Goblin and Blood Elf models --------------------------------------------------------------
// Zam's Classic library has no Blood Elf, an unlike-the-client Goblin, and no helm models for either. When a private R2 bucket is bound
// as env.MODELS (see README.md), these paths come from it instead; with no bucket every request behaves exactly as before. The bucket
// is only ever read by exact key built from a validated path: it is never listed, never public and never accepts uploads from here.
const OVERLAY_FIRST_ID=9000000,OVERLAY_CHARACTER_IDS=new Set(['17','18','19','20']);
export function overlayKind(path) {
 const file=path.match(/^(?:m2\/(\d+)\.m2|skin\/(\d+)\.skin|skel\/(\d+)\.skel|textures\/(\d+)\.webp)$/);
 if(file)return Number(file[1]||file[2]||file[3]||file[4])>=OVERLAY_FIRST_ID?'file':null;
 const meta=path.match(/^meta\/(?:character|charactercustomization)\/(\d+)\.json$/);
 if(meta)return OVERLAY_CHARACTER_IDS.has(meta[1])?'meta':null;
 return /^meta\/armor\/1\/\d+\.json$/.test(path)?'helm':null;
}
function typeFor(path) {return path.endsWith('.json')?'application/json':path.endsWith('.webp')?'image/webp':path.endsWith('.png')?'image/png':'application/octet-stream';}
async function fromBucket(bucket,path) {
 const object=await bucket.get(path);
 return object?new Response(object.body,{headers:{...HEADERS,'content-type':typeFor(path),'cache-control':'public, max-age=3600'}}):null;
}
// helms.json maps a Classic helm display id to {"race:gender": model file id} for the races Zam has no helm models for.
let helmCache={table:null,at:0};
export function resetOverlayCache() {helmCache={table:null,at:0};}
async function helmTable(bucket) {
 if(Date.now()-helmCache.at<600000)return helmCache.table;
 let table=null;
 try {const object=await bucket.get('helms.json');if(object){const value=await new Response(object.body).json();if(value&&typeof value==='object'&&!Array.isArray(value))table=value;}} catch {table=null;}
 helmCache={table,at:Date.now()};
 return table;
}
// Adds the client's Goblin and Blood Elf helm models to Zam's item data, and the same hair-hiding rows Zam gives its last race.
export function mergeHelm(item,models) {
 const entries=Object.entries(models||{}).filter(([key,id])=>/^\d+:[01]$/.test(key)&&Number.isSafeInteger(id)&&id>=OVERLAY_FIRST_ID);
 if(!entries.length||!item||typeof item!=='object'||!item.ModelFiles||typeof item.ModelFiles!=='object')return item;
 const races=new Set(entries.map(([key])=>key));
 for(const list of Object.values(item.ModelFiles)) {
  if(!Array.isArray(list))continue;
  const kept=list.filter(entry=>!races.has(`${entry.Race}:${entry.Gender}`));
  kept.push(...entries.map(([key,id])=>({FileDataId:id,Gender:Number(key.split(':')[1]),Class:0,Race:Number(key.split(':')[0]),ExtraData:-1})));
  list.splice(0,list.length,...kept);
 }
 for(const field of ['HideGeosetMale','HideGeosetFemale']) {
  const rows=item.Item&&Array.isArray(item.Item[field])?item.Item[field]:null;
  if(!rows)continue;
  for(const race of new Set(entries.map(([key])=>Number(key.split(':')[0])))) {
   if(!rows.some(row=>row.RaceId===race))rows.push(...rows.filter(row=>row.RaceId===8).map(row=>({...row,RaceId:race})));
  }
 }
 return item;
}
export async function outfitter(request,fetcher=fetch,env={}) {
 const url=new URL(request.url);
 if(request.method!=='GET')return json({error:'method_not_allowed'},405);
 try {
  const item=url.pathname.match(/^\/api\/outfitter\/item\/([1-9]\d{0,6})$/);
  if(item) {
   const id=Number(item[1]);if(id>1000000)return json({error:'invalid_item'},400);
   const response=await fetcher(`https://octowow.st/db/?item=${id}`,{redirect:'manual',signal:AbortSignal.timeout(15000),headers:{Accept:'text/html'},cf:{cacheTtl:86400,cacheEverything:true}});
   if(!response.ok)return json({error:'Item database unavailable.'},502);
   const html=await response.text();if(html.length>2000000)throw Error('Item page too large.');
   const octoDisplayId=parseDisplayId(html),classic=await classicDisplayId(id,fetcher);
   // The client uses the first candidate whose model files exist in the Classic library.
   const candidates=[...new Set([classic,octoDisplayId].filter(Boolean))];
   return json({id,displayId:candidates[0],candidates,source:`https://octowow.st/db/?item=${id}`});
  }
  const path=assetPath(url.pathname);
  if(!path)return json({error:'not_found'},404);
  const bucket=env&&env.MODELS,kind=bucket?overlayKind(path):null;
  if(kind==='file'||kind==='meta') {
   const own=await fromBucket(bucket,path);
   if(own)return own;
   // Converted files exist only in the bucket; the character records fall back to Zam's until they are uploaded.
   if(kind==='file')return json({error:'This appearance is not available in the OctoWoW model set.'},404);
  }
  const response=await fetcher(ASSET_BASE+path,{redirect:'manual',signal:AbortSignal.timeout(20000),cf:{cacheTtl:604800,cacheEverything:true}});
  if(!response.ok)return json({error:'This appearance is not available in the Classic model library.'},response.status===404||response.status===403?404:502);
  if(kind==='helm') {
   const models=(await helmTable(bucket))?.[path.match(/(\d+)\.json$/)[1]];
   if(models) {
    const text=await response.text();
    if(text.length<=2000000) {
     try {return new Response(JSON.stringify(mergeHelm(JSON.parse(text),models)),{headers:{...HEADERS,'content-type':'application/json','cache-control':'public, max-age=3600'}});} catch {return new Response(text,{headers:{...HEADERS,'content-type':'application/json','cache-control':'public, max-age=3600'}});}
    }
   }
  }
  return new Response(response.body,{headers:{...HEADERS,'content-type':typeFor(path),'cache-control':'public, max-age=604800'}});
 } catch(error) {return json({error:error.message||'Appearance service unavailable.'},502);}
}
