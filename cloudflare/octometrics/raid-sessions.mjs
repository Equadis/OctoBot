/**
 * Authoritative raid sessions for the OctoMetrics Worker (telemetry schema 1).
 *
 * The World Buff Tracker (services/world-buff-tracker) owns raid lifecycle: it decides when a raid
 * formed, which raid it is (#702), who is in it (as aggregate guild counts) and when it ended. This
 * module only VALIDATES what it pushes, and turns the latest pushed state into the summary view.
 * It is deliberately NOT a second raid state machine: no raid is ever created, merged, split or ended here.
 *
 * Pure functions, no I/O, so they are unit-tested against the same fixtures as the tracker.
 */
import {estimateClear,learnDurations} from './raid-intel.mjs';

export const SCHEMA=1;
export const RT_ROLE='rt',RT_ACCOUNT='bufftracker';
/** Telemetry zone id -> the head (raid-intel key) whose lair it is. */
export const ZONE_HEAD=Object.freeze({onyxia:'onyxia',bwl:'nefarian'});
/** A snapshot older than this is shown, but flagged stale. */
export const FRESH_MS=180_000;
/** Older than this, the last-known state is no longer shown as live at all. */
export const EXPIRE_MS=6*3_600_000;

const STATUS=new Set(['in_progress','leaving','ended']);
const CONFIDENCE=new Set(['confirmed','high','tentative']);
const END_REASON=new Set(['kill_confirmed','departed','disbanded','interrupted']);
const CLEAR_SOURCE=new Set(['chronicle_kill','roster_departure']);
const GUILD_KIND=new Set(['guild','guild-led','collab','pug','unknown']);
const AMBIGUITY=new Set(['overlapping_assembly','truncated_view','staggered_arrivals']);

const int=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
const str=(v,max)=>typeof v==='string'&&v.length>0&&v.length<=max;
const ts=(v,now)=>{if(typeof v!=='string')return null;const t=Date.parse(v);return Number.isFinite(t)&&t<=now+60_000&&t>=Date.UTC(2024,0,1)?t:null;};

function cleanGuild(g){
  if(!g||typeof g!=='object'||!GUILD_KIND.has(g.kind)||!str(g.label,80))return null;
  if(!int(g.rosterSize,0,500)||!int(g.known,0,500)||!int(g.unguilded,0,500))return null;
  if(!Array.isArray(g.guilds)||g.guilds.length>5)return null;
  const guilds=[];
  for(const x of g.guilds){if(!x||!str(x.name,60)||!int(x.count,1,500))return null;guilds.push({name:x.name,count:x.count});}
  return {kind:g.kind,label:g.label,rosterSize:g.rosterSize,known:g.known,unguilded:g.unguilded,guilds};
}

/** One session, or null if anything is malformed or impossible. Unknown fields are dropped. */
export function cleanSession(s,now=Date.now()){
  if(!s||typeof s!=='object'||!STATUS.has(s.status)||!CONFIDENCE.has(s.confidence)||!str(s.key,48))return null;
  if(s.id!==null&&!int(s.id,1,10_000_000))return null;
  const formedAt=ts(s.formedAt,now),lastConfirmedAt=ts(s.lastConfirmedAt,now);
  if(formedAt===null||lastConfirmedAt===null)return null;
  if(!int(s.players,0,500)||!int(s.peak,0,500)||!int(s.rosterSize,0,500))return null;
  if(typeof s.continuity!=='number'||!(s.continuity>=0&&s.continuity<=1))return null;
  const guild=cleanGuild(s.guild);if(!guild)return null;
  if(typeof s.trusted!=='boolean'||typeof s.resumed!=='boolean')return null;
  const out={id:s.id,key:s.key,status:s.status,confidence:s.confidence,formedAt:s.formedAt,lastConfirmedAt:s.lastConfirmedAt,
    players:s.players,peak:s.peak,rosterSize:s.rosterSize,continuity:s.continuity,guild,trusted:s.trusted,resumed:s.resumed};
  if(s.status==='ended'){
    const endedAt=ts(s.endedAt,now);
    // An end before the start is an impossible duration, never stored.
    if(endedAt===null||endedAt<formedAt||!END_REASON.has(s.endReason)||!CLEAR_SOURCE.has(s.clearSource))return null;
    // Only a Chronicle kill may claim a kill.
    if(s.endReason==='kill_confirmed'&&s.clearSource!=='chronicle_kill')return null;
    if(s.clearSource==='chronicle_kill'&&s.endReason!=='kill_confirmed')return null;
    out.endedAt=s.endedAt;out.endReason=s.endReason;out.clearSource=s.clearSource;
  }else if(s.endedAt!==undefined||s.endReason!==undefined)return null;
  return out;
}

/** A `raid_sessions` snapshot -> the stored payload, or null. */
export function validateRaidSessions(e,now=Date.now()){
  if(!e||e.type!=='raid_sessions'||e.schema!==SCHEMA||!(e.zone in ZONE_HEAD)||e.role!==RT_ROLE||e.account!==RT_ACCOUNT)return null;
  if(!str(e.eventId,120)||typeof e.seq!=='number'||!Number.isFinite(e.seq)||e.seq<=0)return null;
  if(!e.thresholds||!int(e.thresholds.formAt,1,100)||!int(e.thresholds.floor,1,100))return null;
  const lair=e.lair;
  if(!lair||!int(lair.present,0,500)||typeof lair.complete!=='boolean'||!int(lair.unassigned,0,500))return null;
  let ambiguity=null;
  if(lair.ambiguity!==null&&lair.ambiguity!==undefined){
    const a=lair.ambiguity;
    if(!AMBIGUITY.has(a.kind)||!int(a.players,0,500)||!str(a.reason,200))return null;
    ambiguity={kind:a.kind,players:a.players,reason:a.reason};
  }
  if(!Array.isArray(e.sessions)||e.sessions.length>12)return null;
  const sessions=[];
  for(const s of e.sessions){const c=cleanSession(s,now);if(!c)return null;sessions.push(c);}
  return {schema:SCHEMA,eventId:e.eventId,seq:e.seq,zone:e.zone,thresholds:{formAt:e.thresholds.formAt,floor:e.thresholds.floor},
    lair:{present:lair.present,complete:lair.complete,unassigned:lair.unassigned,ambiguity},sessions};
}

/** A `raid_session_ended` event -> the stored payload, or null. */
export function validateRaidSessionEnded(e,now=Date.now()){
  if(!e||e.type!=='raid_session_ended'||e.schema!==SCHEMA||!(e.zone in ZONE_HEAD)||e.role!==RT_ROLE||e.account!==RT_ACCOUNT)return null;
  if(!str(e.eventId,160))return null;
  const session=cleanSession(e.session,now);
  if(!session||session.status!=='ended')return null;
  const duration=Date.parse(session.endedAt)-Date.parse(session.formedAt);
  if(e.durationMs!==duration)return null; // the stated duration must match the boundaries exactly
  return {schema:SCHEMA,eventId:e.eventId,zone:e.zone,durationMs:duration,session};
}

const parse=r=>{try{return {...r,payload:JSON.parse(r.payload_json)};}catch{return {...r,payload:null};}};

/** The newest valid snapshot per zone from stored rows (any order). Rows of other shapes are ignored. */
export function latestSnapshots(rows,now=Date.now()){
  const out={};
  for(const row of rows.map(parse)){
    const p=row.payload;
    if(!p||p.schema!==SCHEMA||!(p.zone in ZONE_HEAD)||!Array.isArray(p.sessions)||typeof p.seq!=='number')continue;
    const prev=out[p.zone];
    if(!prev||p.seq>prev.payload.seq)out[p.zone]={observedAt:row.observed_at,payload:p};
  }
  return out;
}

/** Ended-session events for a zone, one per session key (a resumed raid's latest end wins). */
export function endedEvents(rows,zone){
  const byKey=new Map();
  for(const row of rows.map(parse)){
    const p=row.payload;
    if(!p||p.schema!==SCHEMA||p.zone!==zone||!p.session||p.session.status!=='ended')continue;
    const prev=byKey.get(p.session.key);
    if(!prev||Date.parse(p.session.endedAt)>Date.parse(prev.session.endedAt))byKey.set(p.session.key,p);
  }
  return [...byKey.values()].sort((a,b)=>Date.parse(b.session.endedAt)-Date.parse(a.session.endedAt));
}

/**
 * Training data: only sessions the tracker marked trusted (complete evidence, no ambiguity, high-confidence
 * identity) that ended by a proven kill or a sustained roster departure. Disbanded, interrupted, tentative or
 * ambiguous sessions never train an estimate.
 */
export function trainingDurations(ended){
  return ended.filter(p=>p.session.trusted===true&&(p.session.endReason==='kill_confirmed'||p.session.endReason==='departed')).map(p=>({durationMs:p.durationMs}));
}
export function learnAuthoritative(ended,raid){return learnDurations(trainingDurations(ended),raid);}

/** Wire form of a live session for the website. `elapsedMs` is as of `now` and never negative. */
function liveView(s,{now,fresh,learned,raid}){
  const startedAt=Date.parse(s.formedAt);
  const elapsedMs=Math.max(0,now-startedAt);
  let estimate;
  if(s.status==='leaving')estimate={status:'leaving',confirmed:false,samples:learned?.samples??0};
  else if(!fresh)estimate={status:'stale',confirmed:false,samples:learned?.samples??0};
  else estimate=estimateClear({active:true,startedAt,now,learned});
  return {id:s.id,key:s.key,status:s.status,confidence:s.confidence,
    // Roster-cohort inference: /who has no instance id, so identity is never "verified".
    identity:s.confidence==='confirmed'?'confirmed':'inferred',
    startedAt:s.formedAt,elapsedMs,lastConfirmedAt:s.lastConfirmedAt,players:s.players,peak:s.peak,
    continuity:s.continuity,guild:s.guild,resumed:s.resumed,estimate,
    source:'bufftracker'};
}

/**
 * The authoritative block for one lair, or null if the tracker has never reported for it.
 * Missing or late telemetry degrades to `stale`, then `expired`; it never turns into "no raid" or "cleared".
 */
export function buildAuthoritative({snapshot,endedRows,learned,raid,now}){
  if(!snapshot)return null;
  const observedMs=Date.parse(snapshot.observedAt);
  const ageMs=Math.max(0,now-observedMs);
  const fresh=ageMs<=FRESH_MS,expired=ageMs>EXPIRE_MS;
  const p=snapshot.payload;
  const live=expired?[]:p.sessions.filter(s=>s.status!=='ended').map(s=>liveView(s,{now,fresh,learned,raid}));
  const lastEnded=endedRows[0]||null;
  return {
    source:'bufftracker',schema:SCHEMA,observedAt:snapshot.observedAt,ageMs,fresh,stale:!fresh,expired,
    thresholds:p.thresholds,
    lair:{present:p.lair.present,complete:p.lair.complete,unassigned:p.lair.unassigned,ambiguity:p.lair.ambiguity},
    sessions:live,
    lastFinished:lastEnded?{at:lastEnded.session.endedAt,id:lastEnded.session.id,durationMs:lastEnded.durationMs,
      endReason:lastEnded.session.endReason,clearSource:lastEnded.session.clearSource,
      killConfirmed:lastEnded.session.clearSource==='chronicle_kill',trusted:lastEnded.session.trusted}:null,
  };
}

/**
 * The head-level estimated clear from the authoritative block: the oldest high-confidence live session
 * drives it. Learned from authoritative sessions only (so it is LEARNING until enough trusted raids exist).
 */
export function authoritativeClear(auth,learned,now){
  const base={confirmed:false,basis:'median of past tracked raid sessions',source:'authoritative',samples:learned?.samples??0,minSamples:5,confidence:learned?.confidence??'none'};
  if(!auth)return null;
  if(auth.expired)return {...base,status:'stale'};
  const live=auth.sessions.filter(s=>s.status!=='ended');
  if(!live.length)return auth.fresh?{...base,status:'idle'}:{...base,status:'stale'};
  const pick=[...live].sort((a,b)=>(a.confidence==='tentative')-(b.confidence==='tentative')||Date.parse(a.startedAt)-Date.parse(b.startedAt))[0];
  const e=pick.estimate;
  return {...base,...e,sessionId:pick.id,sessionKey:pick.key,source:'authoritative',samples:learned?.samples??0};
}
