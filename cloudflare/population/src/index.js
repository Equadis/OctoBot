/**
 * OctoBot minute-by-minute population recorder.
 * Deployed to Cloudflare Workers with D1. No GitHub token required.
 * Public endpoints serve only population aggregates, never player identifiers.
 */
const CENSUS_URL='https://octowow.st/player-census';
const REALMS=['nzoth','yshaarj','cthun'];
const MAX_PAGE=10000;
export function parseOnline(page){
 const match=page.match(/Players\s+online\s+now:\s*<b[^>]*>\s*([\d,\s]+)\s*<\/b>/i);
 if(!match)throw Error('Official census counter not found');
 const value=Number(match[1].replace(/[,\s]/g,''));
 if(!Number.isSafeInteger(value)||value<0)throw Error('Invalid official census counter');
 return value;
}
function json(data,status=200){
 return new Response(JSON.stringify(data),{
  status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',
   'access-control-allow-origin':'*','access-control-allow-methods':'GET, OPTIONS',
   'x-content-type-options':'nosniff'}
 });
}
async function collect(env){
 if(!env.DB)throw Error('D1 binding missing');
 // The official counter is the source; never infer a count from a failed fetch.
 const response=await fetch(CENSUS_URL+'?t='+Date.now(),{
  headers:{'Accept':'text/html','Cache-Control':'no-cache'},
  cf:{cacheTtl:0}
 });
 if(!response.ok)throw Error('Official census HTTP '+response.status);
 const body=await response.text();
 if(body.length>2_000_000)throw Error('Unexpectedly large census page');
 const online=parseOnline(body),timestamp=Date.now();
 await env.DB.prepare(
  'INSERT OR IGNORE INTO readings (realm,timestamp_ms,online,source) VALUES (?,?,?,?)'
 ).bind('nzoth',timestamp,online,'official census').run();
 return {timestamp:new Date(timestamp).toISOString(),online,realm:'nzoth'};
}
const worker={
 async scheduled(controller,env,ctx){
  ctx.waitUntil(collect(env).catch(e=>console.error('Population collection failed:',e)));
 },
 async fetch(request,env){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET, OPTIONS'}});
  if(request.method!=='GET')return json({error:'method_not_allowed'},405);
  const url=new URL(request.url);
  try{
   if(url.pathname==='/api/latest'){
    const {results}=await env.DB.prepare(
     'SELECT r.realm,r.timestamp_ms,r.online,r.source FROM readings r INNER JOIN (SELECT realm,MAX(timestamp_ms) AS latest FROM readings GROUP BY realm) q ON r.realm=q.realm AND r.timestamp_ms=q.latest'
    ).all();
    const data={};
    for(const row of results||[])data[row.realm]={timestamp:new Date(row.timestamp_ms).toISOString(),online:row.online,source:row.source};
    return json(data);
   }
   if(url.pathname==='/api/history'){
    const realm=url.searchParams.get('realm')||'nzoth';
    if(!REALMS.includes(realm))return json({error:'invalid_realm'},400);
    const since=Number(url.searchParams.get('since')||'0');
    if(!Number.isSafeInteger(since)||since<0)return json({error:'invalid_since'},400);
    const {results}=await env.DB.prepare(
     'SELECT timestamp_ms,online FROM readings WHERE realm=? AND timestamp_ms>? ORDER BY timestamp_ms ASC LIMIT ?'
    ).bind(realm,since,MAX_PAGE+1).all();
    const all=results||[],has_more=all.length>MAX_PAGE,rows=all.slice(0,MAX_PAGE);
    return json({realm,readings:rows.map(r=>({timestamp:new Date(r.timestamp_ms).toISOString(),online:r.online})),has_more});
   }
   if(url.pathname==='/api/health'){
    const row=await env.DB.prepare('SELECT MAX(timestamp_ms) AS last FROM readings').first();
    return json({status:row?.last?'ok':'no_observations',last_observation:row?.last?new Date(row.last).toISOString():null,
      collector:'cloudflare-cron-every-minute',source:'official census'});
   }
   return json({error:'not_found'},404);
  }catch(e){console.error('Population request failed:',e);return json({error:'backend_unavailable'},503);}
 }
};
export default worker;
