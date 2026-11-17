import {handleRaidRoute,pruneRaidState} from "./raid-state.mjs";
import {auctionRoute,auctionCleanup} from "./auction.mjs";
import {worldChatRoute,worldChatCleanup} from "./world-chat.mjs";
/** Standalone Cloudflare Worker for OctoMetrics, not a replacement for the existing OctoBot Worker.
 *  Ingest, validation, CORS and retention are unchanged from the deployed version. /api/summary keeps every
 *  existing field and adds per-head (Onyxia / Nefarian) raid intelligence: see raid-intel.mjs. */
import {RAIDS,headFromYell,pairSessions,learnDurations,summariseDrops,buildHead,newestConfirmed,isConfirmedDrop,unconfirmedReason,headOf,isSameAnnouncement,RALLY_BUFF,WARCHIEF_BUFF,KNOWN_BUFFS} from "./raid-intel.mjs";
import {listenerStatus} from "./listener-status.mjs";
import {ZONE_HEAD,RT_ROLE,RT_ACCOUNT,validateRaidSessions,validateRaidSessionEnded,latestSnapshots,endedEvents,learnAuthoritative,buildAuthoritative,authoritativeClear} from "./raid-sessions.mjs";
const ALLOWED_REALMS=new Set(["N'Zoth","Y'Shaarj","C'Thun"]);
const ALLOWED_TYPES=new Set(["session_online","session_offline","session_error","raid_who","server_info","world_buff_drop","zg_buff_candidate","dmf_status","dmf_sighting","listener_health","raid_sessions","raid_session_ended"]);
const ALLOWED_ACCOUNTS={
  "N'Zoth":{sw:"OBPVESW",org:"OBPVEORG",bb:"OBPVEBB"},
  "Y'Shaarj":{sw:"OBPVPSW",org:"OBPVPORG",bb:"OBPVPBB"},
  "C'Thun":{sw:"OBHCSW",org:"OBHCORG",bb:"OBHCBB"},
};
const DMF_ROLES={dmfa:{account:"OBPVEDMFA",site:"elwynn"},dmfh:{account:"OBPVEDMFH",site:"mulgore"}};
const ALLOWED_ORIGIN="https://equadis.github.io";
function cors(req){return {"Access-Control-Allow-Origin":ALLOWED_ORIGIN,"Access-Control-Allow-Methods":"GET,OPTIONS","Access-Control-Allow-Headers":"Authorization,Content-Type","Vary":"Origin"};}
function json(body,status=200,req=null){return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...(req?cors(req):{})}});}
// The listener for each role stands in one capital and can only hear that faction's announcements.
const ROLE_FACTION={sw:"alliance",org:"horde"};
/** Validates one telemetry event and says WHY when it is refused, so a rejected drop can be diagnosed from the response and the log. */
function validateRecord(x){
  const no=(reason,detail={})=>({ok:false,reason,...detail});
  if(!x||typeof x!=="object")return no("not_an_object");
  if(!ALLOWED_TYPES.has(x.type))return no("unknown_type");
  if(!ALLOWED_REALMS.has(x.realm))return no("unknown_realm");
  if(typeof x.time!=="string"||!Number.isFinite(Date.parse(x.time)))return no("invalid_time");
  const skew=Date.now()-Date.parse(x.time);
  if(Math.abs(skew)>=30*60*1000)return no(skew>0?"event_too_old":"event_in_future",{skewMs:skew});
  if(x.type==="raid_sessions"||x.type==="raid_session_ended")return x.role===RT_ROLE&&x.account===RT_ACCOUNT?{ok:true}:no("account_role_mismatch");
  if(x.type==="dmf_status"||x.type==="dmf_sighting"){
    const expected=DMF_ROLES[x.role];
    if(!expected||x.realm!=="N'Zoth"||x.account!==expected.account||x.site!==expected.site)return no("account_role_mismatch");
    if(x.type==="dmf_status")return typeof x.connected==="boolean"&&
      (x.queries===undefined||(Number.isInteger(x.queries)&&x.queries>=0&&x.queries<=500))?{ok:true}:no("invalid_status");
    return x.confirmed===true&&x.source==="onsite"&&typeof x.npc==="string"&&
      x.npc.trim().length>0&&x.npc.length<=100?{ok:true}:no("invalid_sighting");
  }
  if(!["sw","org","bb"].includes(x.role)||x.account!==ALLOWED_ACCOUNTS[x.realm][x.role])return no("account_role_mismatch");
  if(x.type==="listener_health")return typeof x.connected==="boolean"?{ok:true}:no("invalid_health");
  if(x.type==="world_buff_drop"){
    // A confirmed drop needs evidence: an announcement heard by the listener of the faction it names, for a buff the collector knows.
    if(x.source!=="npc_yell")return no("source_not_npc_yell");
    if(x.faction!=="alliance"&&x.faction!=="horde")return no("unknown_faction");
    if(!KNOWN_BUFFS.includes(x.buff))return no("unknown_buff");
    if(ROLE_FACTION[x.role]!==x.faction)return no("faction_does_not_match_listener");
    if(typeof x.text!=="string"||!x.text.trim()||x.text.length>1200)return no("invalid_text");
    if(x.head!==undefined&&x.head!==null&&x.head!=="onyxia"&&x.head!=="nefarian")return no("invalid_head");
    if(x.eventId!==undefined&&!/^[0-9a-f]{8,64}$/i.test(String(x.eventId)))return no("invalid_event_id");
  }
  return {ok:true};
}
/** One bounded structured line per drop-pipeline decision (Workers logs). Never includes the bearer token or any credential. */
function trace(stage,fields){console.log(JSON.stringify({scope:"octometrics",stage,at:new Date().toISOString(),...fields}));}
/** Never store entire arbitrary client JSON: project only non-secret telemetry fields. */
function sanitise(e){
  const keep=["zone","zoneName","playersListed","serverWhoOnline","listCapped","activity","activityStart","activityEnd","activityChange","observationOnly","clearConfirmed","population","source","valid","buff","faction","sender","text","confirmed","reason","fatal","site","npc","connected","queries","head","eventId","connectedSince","disconnectedAt","lastYellAt","yellsHeard","lastMatchedAt","lastMatchedFaction","lastMatchedHead","lastDropQueuedAt","dropsSuppressed","lastIngestOkAt","lastIngestError","lastIngestErrorAt","ingestQueued","ingestRejected","heartbeatAt"];
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
  const [populationRows,raidRows,buffRows,sessionRows,snapshotRows,endedRows,healthRows,revisionRows]=await Promise.all([
    env.DB.prepare("SELECT type,account,role,observed_at,payload_json FROM metric_events WHERE realm=? AND type IN ('server_info','raid_who') ORDER BY id DESC LIMIT 80").bind(realm).all(),
    env.DB.prepare("SELECT type,account,role,observed_at,payload_json FROM metric_events WHERE realm=? AND type='raid_who' ORDER BY id DESC LIMIT 50").bind(realm).all(),
    env.DB.prepare("SELECT id,type,account,role,observed_at,received_at,payload_json FROM metric_events WHERE realm=? AND type='world_buff_drop' ORDER BY id DESC LIMIT 200").bind(realm).all(),
    env.DB.prepare("SELECT type,account,role,observed_at,payload_json FROM metric_events WHERE realm=? AND type IN ('session_online','session_offline','session_error') ORDER BY id DESC LIMIT 30").bind(realm).all(),
    Promise.all(Object.keys(ZONE_HEAD).map(zone=>env.DB.prepare("SELECT observed_at,payload_json FROM metric_events WHERE realm=? AND type='raid_sessions' AND json_extract(payload_json,'$.zone')=? ORDER BY json_extract(payload_json,'$.seq') DESC LIMIT 1").bind(realm,zone).all())).then(rows=>({results:rows.flatMap(r=>r.results)})),
    Promise.all(Object.keys(ZONE_HEAD).map(zone=>env.DB.prepare("SELECT observed_at,payload_json FROM metric_events WHERE realm=? AND type='raid_session_ended' AND json_extract(payload_json,'$.zone')=? ORDER BY id DESC LIMIT 300").bind(realm,zone).all())).then(rows=>({results:rows.flatMap(r=>r.results)})),
    env.DB.prepare("SELECT account,role,observed_at,payload_json FROM metric_events WHERE realm=? AND type='listener_health' ORDER BY id DESC LIMIT 12").bind(realm).all(),
    Promise.all(Object.keys(ZONE_HEAD).map(zone=>env.DB.prepare("SELECT observed_at,payload_json FROM metric_events WHERE realm=? AND type='raid_session_revision' AND json_extract(payload_json,'$.zone')=? ORDER BY id DESC LIMIT 1000").bind(realm,zone).all())).then(rows=>({results:rows.flatMap(r=>r.results)})),
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
  const now0=Date.now(),buffs={},dropEvents=buffRows.results.map(decode);
  // The newest CONFIRMED drop per buff and faction, chosen by observed time (never by insert order), under one contract with the website.
  for(const [key,e] of newestConfirmed(dropEvents,x=>`${x.payload.buff}:${x.payload.faction}`,now0))
    buffs[key]={at:e.observed_at,buff:e.payload.buff,faction:e.payload.faction,source:e.payload.source,confirmed:true,head:headOf(e.payload),eventId:e.payload.eventId??null,receivedAt:e.received_at??null};
  // Rallying Cry is what BOTH heads give a faction, so the last drop per faction counts Onyxia and Nefarian alike; the head stays separate.
  const lastDrops={alliance:null,horde:null};
  for(const [faction,e] of newestConfirmed(dropEvents.filter(x=>x.payload.buff===RALLY_BUFF),x=>x.payload.faction,now0))
    lastDrops[faction]={at:e.observed_at,buff:RALLY_BUFF,head:headOf(e.payload),source:e.payload.source,confirmed:true,receivedAt:e.received_at??null};
  const unconfirmed=dropEvents.map(x=>({at:x.observed_at,reason:unconfirmedReason(x,now0)})).filter(x=>x.reason);
  const dropDiagnostics={stored:dropEvents.length,confirmed:dropEvents.length-unconfirmed.length,unconfirmed:unconfirmed.slice(0,5),lastReceivedAt:dropEvents.reduce((m,x)=>!m||Date.parse(x.received_at)>Date.parse(m)?x.received_at:m,null)};
  const sessions={};
  for(const e of sessionRows.results.map(decode)){
    if(sessions[e.account])continue;
    sessions[e.account]={at:e.observed_at,status:!isFresh(e.observed_at,180)?"stale":e.type==="session_online"?"online":e.type==="session_offline"?"offline":"error"};
  }
  // Per-head intelligence. Onyxia and Nefarian are tracked separately; estimates are never confirmed drops.
  const drops=summariseDrops(dropEvents,now0),now=now0,heads={};
  for(const raid of Object.values(RAIDS)){
    const who=latestWho[raid.role]||null;
    // The legacy collector's headcount "activity sessions" merge back-to-back raids, so they never teach an estimate and never provide a start time:
    // until the Bufftracker reports, the estimate is LEARNING (no data), not a misleading countdown or OVERDUE.
    const head=buildHead({raid,latestWho:who,learned:null,drops:drops[raid.head],now});
    head.raid=head.raid?{...head.raid,activityStart:null}:head.raid;
    head.clear={...head.clear,source:"legacy_headcount"};
    const zone=Object.keys(ZONE_HEAD).find(z=>ZONE_HEAD[z]===raid.head);
    const snapshot=latestSnapshots(snapshotRows.results,now)[zone]||null;
    if(snapshot){
      // The tracker's own lifecycle is authoritative. Never fall back to the merged headcount estimate once it has reported.
      const reconciled=endedEvents(endedRows.results,zone,snapshot,revisionRows.results);
      const authLearned=learnAuthoritative(reconciled,raid);
      const auth=buildAuthoritative({snapshot,endedRows:reconciled,learned:authLearned,raid,now});
      head.authoritative=auth;head.sessions=auth.sessions;
      head.learned=authLearned?{samples:authLearned.samples,medianMs:authLearned.medianMs===null?null:Math.round(authLearned.medianMs),p25Ms:authLearned.p25Ms===null?null:Math.round(authLearned.p25Ms),p75Ms:authLearned.p75Ms===null?null:Math.round(authLearned.p75Ms),confidence:authLearned.confidence,source:"authoritative"}:null;
      head.clear=authoritativeClear(auth,authLearned,now);
    }else{
      head.authoritative=null;head.sessions=[];
    }
    heads[raid.head]=head;
  }
  const darkmoon=await darkmoonSummary(env,realm);
  // Listener health per capital: separate facts (heartbeat, last yell heard, last publication) instead of "logged in means working".
  const healthByRole={},sessionByAccount=sessions,storedByRole={};
  for(const e of healthRows.results.map(decode))if(!healthByRole[e.role])healthByRole[e.role]=e;
  for(const e of dropEvents)if(isConfirmedDrop(e,now0)&&(!storedByRole[e.role]||Date.parse(e.observed_at)>Date.parse(storedByRole[e.role])))storedByRole[e.role]=e.observed_at;
  const listeners={};
  for(const role of ["sw","org"])listeners[role]=listenerStatus({role,account:ALLOWED_ACCOUNTS[realm][role],health:healthByRole[role]||null,session:sessionByAccount[ALLOWED_ACCOUNTS[realm][role]]||null,lastStoredDropAt:storedByRole[role]||null,now:now0});
  const latestAny=[populationRows.results[0],raidRows.results[0]].filter(Boolean).map(x=>Date.parse(x.observed_at)).filter(Number.isFinite).sort((p,q)=>q-p)[0];
  const monitoring={lastEventAt:Number.isFinite(latestAny)?new Date(latestAny).toISOString():null,collectorFresh:Number.isFinite(latestAny)&&now0-latestAny<=180000};
  return {realm,population,raids,buffs,lastDrops,dropDiagnostics,listeners,monitoring,sessions,heads,unattributedDrops:drops.unknown,darkmoon};
}
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors(request)});
    if(!env.DB)return json({error:"D1 not configured"},503,request);
    if(url.pathname.startsWith("/api/raid/")){
      if(!env.METRICS_PUSH_TOKEN)return json({error:"ingest secret not configured"},503,request);
      if(request.headers.get("authorization")!==`Bearer ${env.METRICS_PUSH_TOKEN}`)return json({error:"unauthorised"},401,request);
      return handleRaidRoute(request,url,env,(body,status)=>json(body,status,request));
    }
    const chat=await worldChatRoute(request,env);
    if(chat)return chat;
    const auction=await auctionRoute(request,env);
    if(auction)return auction;
    if(url.pathname==="/health")return json({ok:true},200,request);
    if(request.method==="POST" && url.pathname==="/api/ingest"){
      if(!env.METRICS_PUSH_TOKEN)return json({error:"ingest secret not configured"},503,request);
      const auth=request.headers.get("authorization")||"";
      if(auth!==`Bearer ${env.METRICS_PUSH_TOKEN}`)return json({error:"unauthorised"},401,request);
      if(Number(request.headers.get("content-length")||0)>16000)return json({error:"payload too large"},413,request);
      let e;try{e=await request.json();}catch{return json({error:"invalid JSON"},400,request);}
      const check=validateRecord(e);
      if(!check.ok){
        if(e&&(e.type==="world_buff_drop"||e.type==="listener_health"))trace("ingest_rejected",{reason:check.reason,type:e.type,realm:e.realm,account:e.account,role:e.role,faction:e.faction,buff:e.buff,observedAt:e.time,eventId:e.eventId});
        return json({error:"invalid telemetry event",reason:check.reason},400,request);
      }
      if(e.type==="raid_sessions"||e.type==="raid_session_ended"){
        const clean=e.type==="raid_sessions"?validateRaidSessions(e):validateRaidSessionEnded(e);
        if(!clean)return json({error:"invalid raid telemetry"},400,request);
        // Duplicate / out-of-order handling without a migration: compare with the newest stored events of this type.
        const recent=await env.DB.prepare("SELECT observed_at,payload_json FROM metric_events WHERE realm=? AND type=? ORDER BY id DESC LIMIT 60").bind(e.realm,e.type).all();
        for(const r of recent.results){
          let old;try{old=JSON.parse(r.payload_json);}catch{continue;}
          if(old&&old.eventId===clean.eventId)return json({ok:true,duplicate:true},200,request);
          if(e.type==="raid_sessions"&&old&&old.zone===clean.zone&&typeof old.seq==="number"&&old.seq>=clean.seq)return json({ok:true,superseded:true},409,request);
        }
        const insert=env.DB.prepare("INSERT INTO metric_events(type,realm,account,role,observed_at,payload_json) VALUES (?,?,?,?,?,?)").bind(e.type,e.realm,e.account,e.role,e.time,JSON.stringify(clean));
        // Snapshot and lifecycle revisions commit in one D1 transaction. The internal event type is
        // not accepted from external clients. Repeated snapshots do not duplicate revisions.
        const revisions=e.type==="raid_sessions"?clean.sessions.filter(s=>s.status==="ended"||s.resumed===true).map(s=>{
          const revision=s.status==="ended"?(s.confirmedAt||s.endedAt):(s.resumedAt||s.lastConfirmedAt);
          const eventId=[clean.zone,s.key,s.status==="ended"?"end":"resume",revision].join("|");
          const payload={schema:clean.schema,zone:clean.zone,eventId,session:s,...(s.status==="ended"?{durationMs:Date.parse(s.endedAt)-Date.parse(s.formedAt)}:{})};
          return env.DB.prepare("INSERT INTO metric_events(type,realm,account,role,observed_at,payload_json) SELECT ?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM metric_events WHERE realm=? AND type='raid_session_revision' AND json_extract(payload_json,'$.eventId')=?)").bind("raid_session_revision",e.realm,e.account,e.role,e.time,JSON.stringify(payload),e.realm,eventId);
        }):[];
        if(revisions.length)await env.DB.batch([insert,...revisions]);else await insert.run();
        return json({ok:true},202,request);
      }
      const clean=sanitise(e);
      const payload=JSON.stringify(clean);
      if(payload.length>16000)return json({error:"payload too large"},413,request);
      if(e.type==="world_buff_drop"){
        // Retry safety: a collector re-sends an event whose response it never saw. The same announcement is stored once, and the caller is told so.
        const recent=await env.DB.prepare("SELECT id,role,observed_at,payload_json FROM metric_events WHERE realm=? AND type='world_buff_drop' ORDER BY id DESC LIMIT 40").bind(e.realm).all();
        const incoming={observed_at:e.time,role:e.role,payload:clean};
        const same=recent.results.map(decode).find(row=>isSameAnnouncement(row,incoming));
        if(same){
          trace("ingest_duplicate",{realm:e.realm,faction:e.faction,buff:e.buff,head:headOf(clean),role:e.role,eventId:e.eventId,storedId:same.id,observedAt:e.time});
          return json({ok:true,duplicate:true,id:same.id,eventId:e.eventId??null},200,request);
        }
      }
      const result=await env.DB.prepare("INSERT INTO metric_events(type,realm,account,role,observed_at,payload_json) VALUES (?,?,?,?,?,?)").bind(e.type,e.realm,e.account,e.role,e.time,payload).run();
      const id=result&&result.meta&&result.meta.last_row_id;
      if(e.type==="world_buff_drop")trace("ingest_stored",{realm:e.realm,faction:e.faction,buff:e.buff,head:headOf(clean),role:e.role,eventId:e.eventId,id,observedAt:e.time});
      return json({ok:true,...(e.eventId?{eventId:e.eventId}:{}),...(id?{id}:{})},202,request);
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
    // Raid snapshots are superseded every couple of minutes: keep 3 days. Ended sessions (the training data) keep the full 30.
    await env.DB.prepare("DELETE FROM metric_events WHERE type='raid_sessions' AND observed_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 days') AND id NOT IN (SELECT id FROM (SELECT id,ROW_NUMBER() OVER (PARTITION BY realm,json_extract(payload_json,'$.zone') ORDER BY json_extract(payload_json,'$.seq') DESC,id DESC) AS rn FROM metric_events WHERE type='raid_sessions') WHERE rn=1)").run();
    // Listener health is one row per listener per minute and only the latest matters: keep two days.
    await env.DB.prepare("DELETE FROM metric_events WHERE type='listener_health' AND observed_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-2 days')").run();
    await env.DB.prepare("DELETE FROM metric_events WHERE type NOT IN ('raid_sessions','raid_session_ended','raid_session_revision') AND observed_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-30 days')").run();
    await pruneRaidState(env.DB);
    await auctionCleanup(env);
    await worldChatCleanup(env);
  }
};
