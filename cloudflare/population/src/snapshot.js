import {statusLatest} from './status.js';
/**
 * One small public object for launchers (EqUpdater): the latest population readings and the latest
 * service-health sample, with their own timestamps, so a client can decide for itself what is stale.
 *
 * Read-only and additive: it uses the same two reads the existing /api/latest and /api/status/latest
 * endpoints do, changes no table, adds no binding, cron, bucket or secret, and exposes the same
 * aggregates (never a player identifier). Shape:
 *   {schema:1, source:'cloudflare-minute', cadence_s:60,
 *    population:{<realm>:{timestamp,online,source}},   // exactly /api/latest
 *    status:{timestamp,website,realms,tcp,auth,latency_ms,source_error} | null}  // exactly /api/status/latest .sample
 *
 * Cost: a Worker invocation is billed per request wherever it is answered, and workers.dev cannot cache
 * Worker output at the edge, so the saving is in the work per request, not in the count:
 *   - one request replaces the two a launcher would otherwise make;
 *   - a conditional request (If-None-Match) that is still current is answered 304 from memory;
 *   - within an isolate the two D1 reads are done at most once per MEMO_MS however many requests arrive.
 */
const MEMO_MS=15000;
let memo=null;
export function resetSnapshotMemo(){memo=null;}
async function populationLatest(env){
 const {results}=await env.DB.prepare(
  'SELECT r.realm,r.timestamp_ms,r.online,r.source FROM readings r INNER JOIN (SELECT realm,MAX(timestamp_ms) AS latest FROM readings GROUP BY realm) q ON r.realm=q.realm AND r.timestamp_ms=q.latest'
 ).all();
 const data={};
 for(const row of results||[])data[row.realm]={timestamp:new Date(row.timestamp_ms).toISOString(),online:row.online,source:row.source};
 return data;
}
export async function buildSnapshot(env){
 const [population,status]=await Promise.all([populationLatest(env),statusLatest(env)]);
 const stamps=[...Object.values(population).map(p=>Date.parse(p.timestamp)),Date.parse(status.sample?.timestamp)]
  .filter(Number.isFinite);
 const version=stamps.length?Math.max(...stamps):0;
 return {version,snapshot:{schema:1,source:'cloudflare-minute',cadence_s:60,population,status:status.sample||null}};
}
function matches(header,etag){
 if(!header)return false;
 const strip=v=>v.trim().replace(/^W\//,'');
 return header.split(',').some(v=>v.trim()==='*'||strip(v)===strip(etag));
}
export async function snapshotResponse(request,env,now=Date.now()){
 if(!memo||now-memo.at>=MEMO_MS||now<memo.at){
  const {version,snapshot}=await buildSnapshot(env);
  memo={at:now,etag:'W/"'+version+'"',body:JSON.stringify(snapshot)};
 }
 const headers={'content-type':'application/json; charset=utf-8',
  'cache-control':'public, max-age=30, stale-while-revalidate=60',etag:memo.etag,
  'access-control-allow-origin':'*','access-control-expose-headers':'ETag','x-content-type-options':'nosniff'};
 if(matches(request.headers.get('if-none-match'),memo.etag))return new Response(null,{status:304,headers});
 return new Response(memo.body,{status:200,headers});
}
