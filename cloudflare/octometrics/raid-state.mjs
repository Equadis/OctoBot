/**
 * Restored from the production collector's original cloudflare/raid-state.mjs
 * (recovered over read-only Railway SSH). The existing D1 tables and API contract
 * are deliberately unchanged. All routes require METRICS_PUSH_TOKEN in worker.mjs.
 */
export const RAID_ZONES=Object.freeze(["onyxia","bwl"]);
const MAX_STATE_BYTES=120_000;
const PSEUDONYM=/^[0-9a-f]{16}$/;
const REQUEST_ID=/^[a-z0-9:_-]{8,96}$/;
const SCHEMA=[
 "CREATE TABLE IF NOT EXISTS raid_number_floor(zone TEXT PRIMARY KEY, floor INTEGER NOT NULL, seeded_at TEXT NOT NULL)",
 "CREATE TABLE IF NOT EXISTS raid_numbers(request_id TEXT PRIMARY KEY, zone TEXT NOT NULL, n INTEGER NOT NULL, granted_at TEXT NOT NULL, UNIQUE(zone,n))",
 "CREATE TABLE IF NOT EXISTS raid_tracker_state(zone TEXT PRIMARY KEY, state_json TEXT NOT NULL, saved_at TEXT NOT NULL)"
];
const ready=new WeakSet();
export async function ensureRaidSchema(db){
 if(ready.has(db))return;
 await db.batch(SCHEMA.map(sql=>db.prepare(sql)));
 ready.add(db);
}
const isZone=z=>RAID_ZONES.includes(z);
const int=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
export function validateTrackerState(body,now=Date.now()){
 if(!body||typeof body!=="object"||!isZone(body.zone))return null;
 const s=body.state;
 if(!s||typeof s!=="object"||s.v!==1||!Array.isArray(s.slots)||s.slots.length>4)return null;
 const slots=[],seen=new Set();
 for(const slot of s.slots){
  if(!slot||!int(slot.slot,0,3)||seen.has(slot.slot)||!slot.state||typeof slot.state!=="object")return null;
  seen.add(slot.slot);
  const st=slot.state;
  if(!int(st.formedAt,Date.UTC(2024,0,1),now+60_000)||!(st.number===null||int(st.number,1,10_000_000)))return null;
  if(!int(st.peak,0,500)||!(st.belowSince===null||int(st.belowSince,Date.UTC(2024,0,1),now+60_000)))return null;
  if(!Array.isArray(st.roster)||st.roster.length>200||!st.roster.every(id=>typeof id==="string"&&PSEUDONYM.test(id)))return null;
  slots.push({slot:slot.slot,state:{formedAt:st.formedAt,number:st.number,roster:st.roster,peak:st.peak,belowSince:st.belowSince}});
 }
 const lockouts={};
 if(s.lockouts!==undefined){
  if(!s.lockouts||typeof s.lockouts!=="object"||Array.isArray(s.lockouts))return null;
  const entries=Object.entries(s.lockouts);
  if(entries.length>1000)return null;
  for(const [id,at] of entries){
   if(!PSEUDONYM.test(id)||!int(at,Date.UTC(2024,0,1),now+60_000))return null;
   lockouts[id]=at;
  }
 }
 return {zone:body.zone,state:{v:1,slots,lockouts}};
}
/** Caller has authenticated. A request ID is allocated once, with separate zone sequences. */
export async function handleRaidRoute(request,url,env,reply){
 if(!url.pathname.startsWith("/api/raid/"))return null;
 await ensureRaidSchema(env.DB);
 const nowIso=new Date().toISOString();
 const read=async()=>{try{return await request.json();}catch{return null;}};
 if(request.method==="POST"&&url.pathname==="/api/raid/seed"){
  const b=await read();
  if(!b||!isZone(b.zone)||!int(b.floor,0,10_000_000))return reply({error:"invalid seed"},400);
  await env.DB.prepare("INSERT INTO raid_number_floor(zone,floor,seeded_at) VALUES (?,?,?) ON CONFLICT(zone) DO UPDATE SET floor=MAX(floor,excluded.floor)").bind(b.zone,b.floor,nowIso).run();
  const row=await env.DB.prepare("SELECT floor FROM raid_number_floor WHERE zone=?").bind(b.zone).first();
  return reply({ok:true,zone:b.zone,floor:row.floor},200);
 }
 if(request.method==="POST"&&url.pathname==="/api/raid/number"){
  const b=await read();
  if(!b||!isZone(b.zone)||typeof b.requestId!=="string"||!REQUEST_ID.test(b.requestId))return reply({error:"invalid request"},400);
  const grant=async()=>env.DB.prepare("SELECT zone,n FROM raid_numbers WHERE request_id=?").bind(b.requestId).first();
  const grantedReply=(row,replayed)=>row.zone!==b.zone?reply({error:"request_zone_conflict"},409):reply({ok:true,zone:b.zone,n:row.n,...(replayed?{replayed:true}:{})},200);
  for(let attempt=0;attempt<4;attempt++){
   const have=await grant();
   if(have)return grantedReply(have,true);
   try{
    await env.DB.prepare("INSERT INTO raid_numbers(request_id,zone,n,granted_at) SELECT ?1,?2,MAX(COALESCE((SELECT MAX(n) FROM raid_numbers WHERE zone=?2),0),(SELECT floor FROM raid_number_floor WHERE zone=?2))+1,?3 WHERE EXISTS (SELECT 1 FROM raid_number_floor WHERE zone=?2) AND NOT EXISTS (SELECT 1 FROM raid_numbers WHERE request_id=?1)").bind(b.requestId,b.zone,nowIso).run();
   }catch(error){if(/UNIQUE|constraint/i.test(String(error)))continue;throw error;}
   const granted=await grant();
   if(granted)return grantedReply(granted,false);
   const seeded=await env.DB.prepare("SELECT floor FROM raid_number_floor WHERE zone=?").bind(b.zone).first();
   if(!seeded)return reply({error:"counter_not_seeded",zone:b.zone},409);
  }
  return reply({error:"busy"},503);
 }
 if(url.pathname==="/api/raid/state"){
  if(request.method==="GET"){
   const zone=url.searchParams.get("zone");
   if(!isZone(zone))return reply({error:"invalid zone"},400);
   const row=await env.DB.prepare("SELECT state_json,saved_at FROM raid_tracker_state WHERE zone=?").bind(zone).first();
   if(!row)return reply({error:"no state"},404);
   return reply({zone,savedAt:row.saved_at,state:JSON.parse(row.state_json)},200);
  }
  if(request.method==="PUT"){
   if(Number(request.headers.get("content-length")||0)>MAX_STATE_BYTES)return reply({error:"payload too large"},413);
   const clean=validateTrackerState(await read());
   if(!clean)return reply({error:"invalid state"},400);
   const json=JSON.stringify(clean.state);
   if(json.length>MAX_STATE_BYTES)return reply({error:"payload too large"},413);
   await env.DB.prepare("INSERT INTO raid_tracker_state(zone,state_json,saved_at) VALUES (?,?,?) ON CONFLICT(zone) DO UPDATE SET state_json=excluded.state_json,saved_at=excluded.saved_at").bind(clean.zone,json,nowIso).run();
   return reply({ok:true},200);
  }
 }
 return reply({error:"not found"},404);
}
export async function pruneRaidState(db){
 try{
  await ensureRaidSchema(db);
  await db.prepare("DELETE FROM raid_tracker_state WHERE saved_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-7 days')").run();
 }catch{/* never block other retention jobs */}
}
