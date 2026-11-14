/** Standalone Cloudflare Worker for OctoMetrics, not a replacement for the existing OctoBot Worker.
 *  Ingest, validation, CORS and retention are unchanged from the deployed version. /api/summary keeps every
 *  existing field and adds per-head (Onyxia / Nefarian) raid intelligence: see raid-intel.mjs. */
import {RAIDS,headFromYell,pairSessions,learnDurations,summariseDrops,buildHead} from "./raid-intel.mjs";
const ALLOWED_REALMS=new Set(["N'Zoth","Y'Shaarj","C'Thun"]);
const ALLOWED_TYPES=new Set(["session_online","session_offline","session_error","raid_who","server_info","world_buff_drop","zg_buff_candidate","dmf_status","dmf_sighting"]);
const ALLOWED_ACCOUNTS={
  "N'Zoth":{sw:"OBPVESW",org:"OBPVEORG",bb:"OBPVEBB"},
  "Y'Shaarj":{sw:"OBPVPSW",org:"OBPVPORG",bb:"OBPVPBB"},
  "C'Thun":{sw:"OBHCSW",org:"OBHCORG",bb:"OBHCBB"},
};
const DMF_ROLES={dmfa:{account:"OBPVEDMFA",site:"elwynn"},dmfh:{account:"OBPVEDMFH",site:"mulgore"}};
const ALLOWED_ORIGIN="https://equadis.github.io";
function cors(req){return {"Access-Control-Allow-Origin":ALLOWED_ORIGIN,"Access-Control-Allow-Methods":"GET,OPTIONS","Access-Control-Allow-Headers":"Authorization,Content-Type","Vary":"Origin"};}
function json(body,status=200,req=null){return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...(req?cors(req):{})}});}
function validRecord(x){
  if(!x||typeof x!=="object"||!ALLOWED_TYPES.has(x.type)||!ALLOWED_REALMS.has(x.realm)
    ||typeof x.time!=="string"||!Number.isFinite(Date.parse(x.time))
    ||Math.abs(Date.now()-Date.parse(x.time))>=30*60*1000)return false;
  if(x.type==="dmf_status"||x.type==="dmf_sighting"){
    const expected=DMF_ROLES[x.role];
    if(!expected||x.realm!=="N'Zoth"||x.account!==expected.account||x.site!==expected.site)return false;
    if(x.type==="dmf_status")return typeof x.connected==="boolean"&&
      (x.queries===undefined||(Number.isInteger(x.queries)&&x.queries>=0&&x.queries<=500));
    return x.confirmed===true&&x.source==="onsite"&&typeof x.npc==="string"&&
      x.npc.trim().length>0&&x.npc.length<=100;
  }
  return ["sw","org","bb"].includes(x.role)&&x.account===ALLOWED_ACCOUNTS[x.realm][x.role];
}
/** Never store entire arbitrary client JSON: project only non-secret telemetry fields. */
function sanitise(e){
  const keep=["zone","zoneName","playersListed","serverWhoOnline","listCapped","activity","activityStart","activityEnd","activityChange","observationOnly","clearConfirmed","population","source","valid","buff","faction","sender","text","confirmed","reason","fatal","site","npc","connected","queries"];
  const p={};
  for(const k of keep){
    const v=e[k];
    if(v===undefined||v===null)continue;
    if(typeof v==="string")p[k]=v.slice(0,500);
    else if(typeof v==="number"&&Number.isFinite(v))p[k]=v;
    else if(typeof v==="boolean")p[k]=v;
  }
  if(Array.isArray(e.lines))p.lines=e.lines.filter(x=>typeof x==="string").slice(0,30).map(x=>x.slice(0,250));
  return p;
}
function isFresh(iso,seconds=180){return typeof iso==="string"&&Date.now()-Date.parse(iso)<=seconds*1000&&Date.now()-Date.parse(iso)>=-30000;}
function decode(r){try{return {...r,payload:JSON.parse(r.payload_json)}}catch{return {...r,payload:{}};}}
const LEARN_TTL_MS=5*60*1000,learnedCache=new Map();
/** Completed raid sessions change slowly, so each realm/raid is recomputed at most every few minutes per isolate. */
async function learnedFor(env,realm,raid){
  const key=`${realm}:${raid.role}`,hit=learnedCache.get(key);
  if(hit&&Date.now()-hit.at<LEARN_TTL_MS)return hit.value;
  const rows=await env.DB.prepare("SELECT observed_at,payload_json FROM metric_events WHERE realm=? AND role=? AND type='raid_who' AND json_extract(payload_json,'$.activityChange') IS NOT NULL ORDER BY id DESC LIMIT 400").bind(realm,raid.role).all();
  const value=learnDurations(pairSessions(rows.results.map(decode).reverse()),raid);
  learnedCache.set(key,{at:Date.now(),value});
  return value;
}
/** Direct NPC observations plus collector health. Silence never implies Faire absence. */
async function darkmoonSummary(env,realm){
  const sites={
    elwynn:{account:"OBPVEDMFA",collectorStatus:"unknown",lastHeartbeatAt:null,lastConfirmedAt:null,npc:null,fresh:false},
    mulgore:{account:"OBPVEDMFH",collectorStatus:"unknown",lastHeartbeatAt:null,lastConfirmedAt:null,npc:null,fresh:false},
  };
  if(realm!=="N'Zoth")return {sites,latestConfirmed:null};
  const [statusRows,sightingRows]=await Promise.all([
    env.DB.prepare("SELECT account,role,observed_at,payload_json FROM metric_events WHERE realm=? AND type='dmf_status' ORDER BY id DESC LIMIT 30").bind(realm).all(),
    env.DB.prepare("SELECT account,role,observed_at,payload_json FROM metric_events WHERE realm=? AND type='dmf_sighting' ORDER BY id DESC LIMIT 30").bind(realm).all(),
  ]);
  const statuses=new Set(),sightings=new Set();
  for(const e of statusRows.results.map(decode)){
    if(statuses.has(e.role))continue;
    const known=DMF_ROLES[e.role];
    if(!known||e.account!==known.account)continue;
    statuses.add(e.role);
    const site=sites[known.site];
    site.lastHeartbeatAt=e.observed_at;
    site.collectorStatus=!isFresh(e.observed_at,180)?"stale":e.payload.connected===true?"online":"offline";
  }
  for(const e of sightingRows.results.map(decode)){
    if(sightings.has(e.role))continue;
    const known=DMF_ROLES[e.role];
    if(!known||e.account!==known.account||e.payload.site!==known.site||e.payload.confirmed!==true)continue;
    sightings.add(e.role);
    const site=sites[known.site];
    site.lastConfirmedAt=e.observed_at;
    site.npc=e.payload.npc;
    site.fresh=isFresh(e.observed_at,6*60*60);
  }
  const latest=Object.entries(sites)
    .filter(([,site])=>site.lastConfirmedAt)
    .sort((a,b)=>Date.parse(b[1].lastConfirmedAt)-Date.parse(a[1].lastConfirmedAt))[0];
  return {sites,latestConfirmed:latest?{
    site:latest[0],at:latest[1].lastConfirmedAt,npc:latest[1].npc,
    account:latest[1].account,fresh:latest[1].fresh,
  }:null};
}
async function summary(env,realm){
  // Restrict scans by (realm,type,id) index. A successful who can supply population even if
  // the custom `.server info` format has not yet been confirmed by a live capture.
  const [populationRows,raidRows,buffRows,sessionRows]=await Promise.all([
    env.DB.prepare("SELECT type,account,role,observed_at,payload_json FROM metric_events WHERE realm=? AND type IN ('server_info','raid_who') ORDER BY id DESC LIMIT 80").bind(realm).all(),
    env.DB.prepare("SELECT type,account,role,observed_at,payload_json FROM metric_events WHERE realm=? AND type='raid_who' ORDER BY id DESC LIMIT 50").bind(realm).all(),
    env.DB.prepare("SELECT type,account,role,observed_at,payload_json FROM metric_events WHERE realm=? AND type='world_buff_drop' ORDER BY id DESC LIMIT 30").bind(realm).all(),
    env.DB.prepare("SELECT type,account,role,observed_at,payload_json FROM metric_events WHERE realm=? AND type IN ('session_online','session_offline','session_error') ORDER BY id DESC LIMIT 30").bind(realm).all(),
  ]);
  const populationEvent=populationRows.results.map(decode).find(x=>isFresh(x.observed_at,180) && Number.isInteger(x.type==="server_info"?x.payload.population:x.payload.serverWhoOnline));
  const population=populationEvent?{
    online:populationEvent.type==="server_info"?populationEvent.payload.population:populationEvent.payload.serverWhoOnline,
    at:populationEvent.observed_at,source:populationEvent.type,account:populationEvent.account,
  }:null;
  const raids={},latestWho={};
  for(const e of raidRows.results.map(decode)){
    if(raids[e.role])continue;
    latestWho[e.role]=e;
    raids[e.role]={at:e.observed_at,zone:e.payload.zoneName,players:e.payload.playersListed,active:isFresh(e.observed_at,150)?e.payload.activity:null,activityStart:e.payload.activityStart,activityEnd:e.payload.activityEnd,clearConfirmed:false};
  }
  const buffs={},dropEvents=[];
  for(const e of buffRows.results.map(decode)){
    dropEvents.push(e);
    const key=`${e.payload.buff}:${e.payload.faction}`;
    if(!buffs[key])buffs[key]={at:e.observed_at,buff:e.payload.buff,faction:e.payload.faction,source:e.payload.source,head:headFromYell(e.payload.text)};
  }
  const sessions={};
  for(const e of sessionRows.results.map(decode)){
    if(sessions[e.account])continue;
    sessions[e.account]={at:e.observed_at,status:!isFresh(e.observed_at,180)?"stale":e.type==="session_online"?"online":e.type==="session_offline"?"offline":"error"};
  }
  // Per-head intelligence. Onyxia and Nefarian are tracked separately; estimates are never confirmed drops.
  const drops=summariseDrops(dropEvents),now=Date.now(),heads={};
  for(const raid of Object.values(RAIDS)){
    const who=latestWho[raid.role]||null;
    const learned=who?await learnedFor(env,realm,raid):null;
    heads[raid.head]=buildHead({raid,latestWho:who,learned,drops:drops[raid.head],now});
  }
  const darkmoon=await darkmoonSummary(env,realm);
  return {realm,population,raids,buffs,sessions,heads,unattributedDrops:drops.unknown,darkmoon};
}
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors(request)});
    if(!env.DB)return json({error:"D1 not configured"},503,request);
    if(url.pathname==="/health")return json({ok:true},200,request);
    if(request.method==="POST" && url.pathname==="/api/ingest"){
      if(!env.METRICS_PUSH_TOKEN)return json({error:"ingest secret not configured"},503,request);
      const auth=request.headers.get("authorization")||"";
      if(auth!==`Bearer ${env.METRICS_PUSH_TOKEN}`)return json({error:"unauthorised"},401,request);
      if(Number(request.headers.get("content-length")||0)>16000)return json({error:"payload too large"},413,request);
      let e;try{e=await request.json();}catch{return json({error:"invalid JSON"},400,request);}
      if(!validRecord(e))return json({error:"invalid telemetry event"},400,request);
      const payload=JSON.stringify(sanitise(e));
      if(payload.length>16000)return json({error:"payload too large"},413,request);
      await env.DB.prepare("INSERT INTO metric_events(type,realm,account,role,observed_at,payload_json) VALUES (?,?,?,?,?,?)").bind(e.type,e.realm,e.account,e.role,e.time,payload).run();
      return json({ok:true},202,request);
    }
    if(request.method==="GET"&&url.pathname==="/api/summary"){
      const realm=url.searchParams.get("realm");
      if(realm&&!ALLOWED_REALMS.has(realm))return json({error:"invalid realm"},400,request);
      const requested=realm?[realm]:[...ALLOWED_REALMS];
      const result=await Promise.all(requested.map(r=>summary(env,r)));
      return json({generated_at:new Date().toISOString(),realms:result},200,request);
    }
    return json({error:"not found"},404,request);
  },
  async scheduled(_event,env){
    // Bound data growth: metrics retain a 30-day event history. Last buff drops may be older
    // on quiet realms, so archive separately if multi-month event history becomes necessary.
    await env.DB.prepare("DELETE FROM metric_events WHERE observed_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-30 days')").run();
  }
};
