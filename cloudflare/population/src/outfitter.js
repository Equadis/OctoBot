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
export function assetPath(path) {
 const value=path.replace(/^\/api\/outfitter\/assets\//,'');
 // Only model data and textures; no scripts, HTML, redirects or arbitrary paths.
 return /^(?:meta\/(?:character|charactercustomization|item|itemvisual)\/\d+\.json|meta\/armor\/\d+\/\d+\.json|(?:mo3|bone)\/\d+\.(?:mo3|bone)|textures\/\d+\.(?:webp|png))$/.test(value)?value:null;
}
export async function outfitter(request,fetcher=fetch) {
 const url=new URL(request.url);
 if(request.method!=='GET')return json({error:'method_not_allowed'},405);
 try {
  const item=url.pathname.match(/^\/api\/outfitter\/item\/([1-9]\d{0,6})$/);
  if(item) {
   const id=Number(item[1]);if(id>1000000)return json({error:'invalid_item'},400);
   const response=await fetcher(`https://octowow.st/db/?item=${id}`,{redirect:'manual',signal:AbortSignal.timeout(15000),headers:{Accept:'text/html'},cf:{cacheTtl:86400,cacheEverything:true}});
   if(!response.ok)return json({error:'Item database unavailable.'},502);
   const html=await response.text();if(html.length>2000000)throw Error('Item page too large.');
   return json({id,displayId:parseDisplayId(html),source:`https://octowow.st/db/?item=${id}`});
  }
  const path=assetPath(url.pathname);
  if(!path)return json({error:'not_found'},404);
  const response=await fetcher(ASSET_BASE+path,{redirect:'manual',signal:AbortSignal.timeout(20000),cf:{cacheTtl:604800,cacheEverything:true}});
  if(!response.ok)return json({error:'This appearance is not available in the Classic model library.'},response.status===404||response.status===403?404:502);
  const type=path.endsWith('.json')?'application/json':path.endsWith('.webp')?'image/webp':path.endsWith('.png')?'image/png':'application/octet-stream';
  return new Response(response.body,{headers:{...HEADERS,'content-type':type,'cache-control':'public, max-age=604800'}});
 } catch(error) {return json({error:error.message||'Appearance service unavailable.'},502);}
}
