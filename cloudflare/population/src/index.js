import {collectStatus,statusLatest,statusHistory,cleanOldStatus} from './status.js';
/**
 * OctoBot minute-by-minute population recorder.
 * Deployed to Cloudflare Workers with D1. No GitHub token required.
 * Public endpoints serve only population aggregates, never player identifiers.
 */
const CENSUS_URL='https://octowow.st/player-census';
const REALMS=['all','nzoth','yshaarj','cthun'];
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
   'access-control-allow-origin':'*','access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'Content-Type',
   'x-content-type-options':'nosniff'}
 });
}
async function collectOne(env,realm,source,format){
 const url=new URL(source);
 if(url.protocol!=='https:')throw Error('Unsecured realm source: '+realm);
 const response=await fetch(url.href,{headers:{'Accept':format==='html'?'text/html':'application/json','Cache-Control':'no-cache'},cf:{cacheTtl:0}});
 if(!response.ok)throw Error('Population HTTP '+response.status+' for '+realm);
 const body=await response.text();
 if(body.length>2000000)throw Error('Unexpectedly large census response');
 let online;
 if(format==='html')online=parseOnline(body);
 else {
  online=JSON.parse(body)?.online;
  if(!Number.isSafeInteger(online)||online<0)throw Error('Invalid verified feed: '+realm);
 }
 const timestamp=Date.now();
 await env.DB.prepare('INSERT OR IGNORE INTO readings (realm,timestamp_ms,online,source) VALUES (?,?,?,?)')
  .bind(realm,timestamp,online,format==='html'?'official census':'verified realm feed').run();
 return {timestamp:new Date(timestamp).toISOString(),online,realm};
}
export async function collect(env){
 if(!env.DB)throw Error('D1 binding missing');
 const feeds=[['all',CENSUS_URL+'?t='+Date.now(),'html']];
 for(const [realm,key] of [['nzoth','POPULATION_NZOTH_URL'],['yshaarj','POPULATION_YSHAARJ_URL'],['cthun','POPULATION_CTHUN_URL']]){
  if(typeof env[key]==='string'&&env[key].trim())feeds.push([realm,env[key].trim(),'json']);
 }
 const settled=await Promise.allSettled(feeds.map(([id,url,format])=>collectOne(env,id,url,format)));
 for(let i=0;i<settled.length;i++){
  if(settled[i].status==='rejected')console.error('Population source failed: '+feeds[i][0],settled[i].reason);
 }
 if(settled.every(x=>x.status==='rejected'))throw Error('All realm sources failed');
 return settled.filter(x=>x.status==='fulfilled').map(x=>x.value);
}
const worker={
 async scheduled(controller,env,ctx){
  ctx.waitUntil(collect(env).catch(e=>console.error('Population collection failed:',e)));
  ctx.waitUntil(collectStatus(env).catch(e=>console.error('Status collection failed:',e)));
  // Retain 90 days of recorded checks without filling missing minutes.
  const scheduledTime=Number(controller?.scheduledTime||Date.now());
  if(new Date(scheduledTime).getUTCHours()===3&&new Date(scheduledTime).getUTCMinutes()===0)
    ctx.waitUntil(cleanOldStatus(env).catch(e=>console.error('Status retention cleanup failed:',e)));
  // Expired anonymous viewer sessions need not accumulate indefinitely in D1.
  ctx.waitUntil(
   env.DB.prepare('DELETE FROM viewer_presence WHERE last_seen_ms<?')
    .bind(Date.now()-3600000).run()
    .catch(e=>console.error('Viewer session cleanup failed:',e))
  );
 },
 async fetch(request,env){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'Content-Type'}});
  const url=new URL(request.url);
  if(url.pathname==='/api/presence/heartbeat'&&request.method!=='POST')return json({error:'method_not_allowed'},405);
  if(url.pathname!=='/api/presence/heartbeat'&&request.method!=='GET')return json({error:'method_not_allowed'},405);
  try{
   if(url.pathname==='/api/presence/heartbeat'){
    if(Number(request.headers.get('content-length')||0)>1024)return json({error:'request_too_large'},413);
    const body=await request.json(),id=body?.session_id;
    if(typeof id!=='string'||!(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))return json({error:'invalid_session'},400);
    const time=Date.now();
    await env.DB.prepare("INSERT INTO viewer_presence(session_id,page,last_seen_ms) VALUES (?, 'population', ?) ON CONFLICT(session_id,page) DO UPDATE SET last_seen_ms=excluded.last_seen_ms").bind(id,time).run();
    const row=await env.DB.prepare("SELECT COUNT(*) AS viewers FROM viewer_presence WHERE page='population' AND last_seen_ms>=?").bind(time-90000).first();
    return json({viewers:row?.viewers??0,window_seconds:90});
   }
   if(url.pathname==='/api/presence/count'){
    const row=await env.DB.prepare("SELECT COUNT(*) AS viewers FROM viewer_presence WHERE page='population' AND last_seen_ms>=?").bind(Date.now()-90000).first();
    return json({viewers:row?.viewers??0,window_seconds:90});
   }
   if(url.pathname==='/api/status/latest')return json(await statusLatest(env));
   if(url.pathname==='/api/status/history'){
    const since=Number(url.searchParams.get('since')||Date.now()-90*86400000);
    if(!Number.isSafeInteger(since)||since<0)return json({error:'invalid_since'},400);
    return json(await statusHistory(env,since));
   }
   if(url.pathname==='/api/status/health'){
    const data=await statusLatest(env);
    const time=Date.parse(data.sample?.timestamp);
    return json({status:Number.isFinite(time)&&Date.now()-time<180000?'ok':'stale',
      last_observation:data.sample?.timestamp||null,collector:'cloudflare-cron-every-minute'});
   }
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
