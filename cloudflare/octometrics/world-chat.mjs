import {cleanText,listingKinds} from "./world-chat-classify.mjs";
const REALMS=new Set(["N'Zoth","Y'Shaarj","C'Thun"]);
const SOURCES={"N'Zoth":"OBPVESW","Y'Shaarj":"OBPVPSW","C'Thun":"OBHCSW"};
const TTL=300000, HISTORY=1800000;
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Access-Control-Allow-Origin":"https://equadis.github.io","Vary":"Origin"}});
const publicLine=r=>({id:r.id,author:r.author,message:r.message,gm:!!r.gm,time:r.observed_ms});
export function validLine(line,now){
  if(!line||typeof line!=="object"||typeof line.id!=="string"||!/^[a-f0-9-]{36}$/i.test(line.id)||
    typeof line.authorKey!=="string"||!/^[0-9]{1,20}$/.test(line.authorKey)||line.authorKey==="0"||
    typeof line.author!=="string"||line.author.length>80||typeof line.message!=="string"||line.message.length>1200||
    typeof line.gm!=="boolean"||!Number.isSafeInteger(line.time)||line.time<now-120000||line.time>now+5000)return null;
  const message=cleanText(line.message),author=cleanText(line.author);
  if(!message||!author)return null;
  return {...line,author,message};
}
export async function worldChatRoute(request,env){
  const url=new URL(request.url);
  if(url.pathname!=="/api/world-chat"&&url.pathname!=="/api/world-chat/ingest")return null;
  const now=Date.now(), db=env.DB;
  if(url.pathname.endsWith("/ingest")&&request.method==="POST"){
    if(!env.METRICS_PUSH_TOKEN)return reply({error:"ingest unavailable"},503);
    if(request.headers.get("authorization")!=="Bearer "+env.METRICS_PUSH_TOKEN)return reply({error:"unauthorised"},401);
    let payload;try{const raw=await request.text();if(raw.length>64000)return reply({error:"payload too large"},413);payload=JSON.parse(raw);}catch{return reply({error:"invalid JSON"},400);}
    if(!payload||!REALMS.has(payload.realm)||payload.account!==SOURCES[payload.realm]||payload.channel!=="world"||
       !Array.isArray(payload.messages)||payload.messages.length>25)return reply({error:"invalid public channel batch"},400);
    const statements=[];
    for(const raw of payload.messages){
      const l=validLine(raw,now);if(!l)return reply({error:"invalid public chat message"},400);
      statements.push(db.prepare("INSERT OR IGNORE INTO world_chat_messages(realm,id,observed_ms,author_key,author,message,gm) VALUES(?,?,?,?,?,?,?)").bind(payload.realm,l.id,l.time,l.authorKey,l.author,l.message,Number(l.gm)));
      if(!l.gm)for(const {kind,tag} of listingKinds(l.message)){
        statements.push(db.prepare("INSERT INTO world_chat_listings(realm,kind,author_key,tag,author,message,observed_ms) VALUES(?,?,?,?,?,?,?) ON CONFLICT(realm,kind,author_key,tag) DO UPDATE SET author=excluded.author,message=excluded.message,observed_ms=excluded.observed_ms WHERE excluded.observed_ms>world_chat_listings.observed_ms").bind(payload.realm,kind,l.authorKey,tag,l.author,l.message,l.time));
      }
    }
    // Heartbeat is sent only after a valid World packet was seen on this connection.
    statements.push(db.prepare("INSERT INTO world_chat_heartbeat(realm,observed_ms) VALUES(?,?) ON CONFLICT(realm) DO UPDATE SET observed_ms=MAX(observed_ms,excluded.observed_ms)").bind(payload.realm,now));
    await db.batch(statements);
    return reply({ok:true},202);
  }
  if(url.pathname==="/api/world-chat"&&request.method==="GET"){
    const realm=url.searchParams.get("realm")||"N'Zoth";
    if(!REALMS.has(realm))return reply({error:"invalid realm"},400);
    const [world,gm,lfg,wtb,wts,heartbeat]=await db.batch([
      db.prepare("SELECT id,author,message,gm,observed_ms FROM world_chat_messages WHERE realm=? AND gm=0 AND observed_ms>? ORDER BY observed_ms DESC,id DESC LIMIT 150").bind(realm,now-HISTORY),
      db.prepare("SELECT id,author,message,gm,observed_ms FROM world_chat_messages WHERE realm=? AND gm=1 AND observed_ms>? ORDER BY observed_ms DESC,id DESC LIMIT 100").bind(realm,now-HISTORY),
      ...["lfg","wtb","wts"].map(kind=>db.prepare("SELECT tag,author,message,observed_ms FROM world_chat_listings WHERE realm=? AND kind=? AND observed_ms>? ORDER BY observed_ms DESC LIMIT 300").bind(realm,kind,now-TTL)),
      db.prepare("SELECT observed_ms FROM world_chat_heartbeat WHERE realm=?").bind(realm)
    ]);
    const last=heartbeat.results[0]?.observed_ms??null;
    const listings=r=>r.results.map(x=>({tag:x.tag,author:x.author,message:x.message,time:x.observed_ms,expiresAt:x.observed_ms+TTL}));
    return reply({realm,generatedAt:now,lastCollectorAt:last,status:last===null?"waiting":now-last>45000?"stale":"live",world:world.results.map(publicLine).reverse(),gm:gm.results.map(publicLine).reverse(),lfg:listings(lfg),wtb:listings(wtb),wts:listings(wts)});
  }
  return reply({error:"method not allowed"},405);
}
export async function worldChatCleanup(env){
  await env.DB.batch([
    env.DB.prepare("DELETE FROM world_chat_messages WHERE observed_ms<?").bind(Date.now()-86400000),
    env.DB.prepare("DELETE FROM world_chat_listings WHERE observed_ms<?").bind(Date.now()-TTL)
  ]);
}
