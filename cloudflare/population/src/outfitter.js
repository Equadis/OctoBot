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
const ITEM_RECORD=/^meta\/(?:armor\/\d+|item)\/\d+\.json$/;
function typeFor(path) {return path.endsWith('.json')?'application/json':path.endsWith('.webp')?'image/webp':path.endsWith('.png')?'image/png':'application/octet-stream';}
async function fromBucket(bucket,path,cache) {
 const object=await bucket.get(path);
 return object?new Response(object.body,{headers:{...HEADERS,'content-type':typeFor(path),'cache-control':cache}}):null;
}
// ---- Versioned URLs and cache lifetimes ------------------------------------------------------------------------------
// The converted files change when the model set is rebuilt, but their URLs (and the character ids 17 to 20, which used to be Zam's Goblin) do
// not, so a browser that cached an old answer would keep it for as long as the old lifetime said. The bucket therefore holds version.json,
// the site asks /api/outfitter/models-version for it and puts it in every asset URL (/assets/v<version>/meta/...). A URL that names the build
// being served may be cached for good; one that names any other build is answered but never cached; unversioned URLs (old pages) get a short
// lifetime for everything the overlay can change.
const IMMUTABLE='public, max-age=31536000, immutable',SHORT='public, max-age=60',ZAM_LONG='public, max-age=604800';
const UNAVAILABLE='The OctoWoW Goblin and High Elf models are not available right now.';
export function assetRequest(pathname) {
 let value=pathname.replace(/^\/api\/outfitter\/assets\//,''),version=null;
 const match=value.match(/^v([0-9a-f]{8,32})\//);
 if(match){version=match[1];value=value.slice(match[0].length);}
 const asset=assetPath(value);
 return asset?{path:asset,version}:null;
}
let versionCache={bucket:null,value:null,at:0};
async function currentVersion(bucket) {
 if(versionCache.bucket===bucket&&Date.now()-versionCache.at<30000)return versionCache.value;
 let value=null;
 try {const object=await bucket.get('version.json');if(object){const data=await new Response(object.body).json();if(typeof data?.version==='string'&&/^[0-9a-f]{8,32}$/.test(data.version))value=data.version;}} catch {value=null;}
 versionCache={bucket,value,at:Date.now()};
 return value;
}
// helms.json maps a Classic helm display id to {"race:gender": model file id} for the races Zam has no helm models for.
let helmCache={table:null,at:0};
export function resetOverlayCache() {helmCache={table:null,at:0};versionCache={bucket:null,value:null,at:0};}
async function helmTable(bucket) {
 if(Date.now()-helmCache.at<600000)return helmCache.table;
 let table=null;
 try {const object=await bucket.get('helms.json');if(object){const value=await new Response(object.body).json();if(value&&typeof value==='object'&&!Array.isArray(value))table=value;}} catch {table=null;}
 helmCache={table,at:Date.now()};
 return table;
}
// Adds the client's Goblin and Blood Elf helm models to Zam's item data and replaces Zam's hide rules for those two races with the client's own.
// entry is {models: {"race:gender": file id}, hide: {"race:gender": [geoset groups]}}; the older flat models map is still accepted (it hides nothing).
// Zam's rows must be replaced, not kept or copied from another race: a row hides the geosets 100 x group to 100 x group + 99, and on the converted
// Goblin group 1 is the head itself, so Zam's "hide facial hair" rule for a hood deleted the whole head and left the eyes floating.
export function mergeHelm(item,entry) {
 const modelMap=entry&&typeof entry==='object'&&entry.models&&typeof entry.models==='object'?entry.models:entry;
 const hide=entry&&typeof entry==='object'&&entry.hide&&typeof entry.hide==='object'?entry.hide:{};
 const entries=Object.entries(modelMap||{}).filter(([key,id])=>/^\d+:[01]$/.test(key)&&Number.isSafeInteger(id)&&id>=OVERLAY_FIRST_ID);
 if(!entries.length||!item||typeof item!=='object'||!item.ModelFiles||typeof item.ModelFiles!=='object')return item;
 const races=new Set(entries.map(([key])=>key));
 for(const list of Object.values(item.ModelFiles)) {
  if(!Array.isArray(list))continue;
  const kept=list.filter(entry=>!races.has(`${entry.Race}:${entry.Gender}`));
  kept.push(...entries.map(([key,id])=>({FileDataId:id,Gender:Number(key.split(':')[1]),Class:0,Race:Number(key.split(':')[0]),ExtraData:-1})));
  list.splice(0,list.length,...kept);
 }
 const raceIds=new Set(entries.map(([key])=>Number(key.split(':')[0])));
 if(item.Item&&typeof item.Item==='object') {
  for(const [field,gender] of [['HideGeosetMale',0],['HideGeosetFemale',1]]) {
   if(!Array.isArray(item.Item[field]))continue;
   const rows=item.Item[field].filter(row=>!raceIds.has(row.RaceId));
   for(const race of raceIds) {
    const groups=hide[`${race}:${gender}`];
    if(Array.isArray(groups))for(const group of groups)if(Number.isInteger(group)&&group>=0&&group<52)rows.push({RaceId:race,GeosetGroup:group,RaceBitSelection:0});
   }
   item.Item[field]=rows;
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
  if(url.pathname==='/api/outfitter/models-version') {
   const version=env&&env.MODELS?await currentVersion(env.MODELS):null;
   return new Response(JSON.stringify({version}),{headers:{...HEADERS,'content-type':'application/json','cache-control':SHORT}});
  }
  const asset=assetRequest(url.pathname);
  if(!asset)return json({error:'not_found'},404);
  const {path,version}=asset,bucket=env&&env.MODELS,kind=overlayKind(path);
  const current=bucket?await currentVersion(bucket):null;
  // Only a versioned URL naming the build being served is cached for good; any other version is served but not cached.
  const cache=version?(current&&version===current?IMMUTABLE:'no-store'):kind?SHORT:ZAM_LONG;
  if(kind==='file'||kind==='meta') {
   // The Goblin and High Elf come only from the converted set. They never fall back to Zam's models, which would show the wrong character.
   if(!bucket)return json({error:'models_unavailable',message:UNAVAILABLE},503);
   const own=await fromBucket(bucket,path,cache);
   if(own)return own;
   return kind==='file'?json({error:'model_file_missing',message:'This file is not in the OctoWoW model set.'},404):json({error:'models_unavailable',message:UNAVAILABLE},503);
  }
  const response=await fetcher(ASSET_BASE+path,{redirect:'manual',signal:AbortSignal.timeout(20000),cf:{cacheTtl:604800,cacheEverything:true}});
  if(!response.ok) {
   // OctoWoW's own looks have no record in Zam's library. A complete record built from the client may sit in the bucket under the same path
   // (helms, body armour and weapons: meta/armor/<slot>/<id>.json and meta/item/<id>.json).
   if(bucket&&ITEM_RECORD.test(path)&&(response.status===404||response.status===403)) {const own=await fromBucket(bucket,path,cache);if(own)return own;}
   return json({error:'This appearance is not available in the Classic model library.'},response.status===404||response.status===403?404:502);
  }
  if(kind==='helm'&&bucket) {
   const models=(await helmTable(bucket))?.[path.match(/(\d+)\.json$/)[1]];
   if(models) {
    const text=await response.text();
    const headers={...HEADERS,'content-type':'application/json','cache-control':cache};
    if(text.length<=2000000) {
     try {return new Response(JSON.stringify(mergeHelm(JSON.parse(text),models)),{headers});} catch {return new Response(text,{headers});}
    }
   }
  }
  return new Response(response.body,{headers:{...HEADERS,'content-type':typeFor(path),'cache-control':cache}});
 } catch(error) {return json({error:error.message||'Appearance service unavailable.'},502);}
}
