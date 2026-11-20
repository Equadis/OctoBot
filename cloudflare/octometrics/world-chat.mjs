import {cleanText,listingKinds} from "./world-chat-classify.mjs";
import {publicChatMessage} from "../../docs/world-chat/chat-links.mjs";
import {HISTORY_MS,historyPageSize,matchesChat,searchTerms} from "../../docs/world-chat/chat-history.mjs";
import {analyseRecruitment,classInfo} from "../../docs/world-chat/lfg-catalog.mjs";
const REALMS=new Set(["N'Zoth","Y'Shaarj","C'Thun"]);
const SOURCES={"N'Zoth":["OBPVESW","OBPVEDMFA","OBPVEDMFH"],"Y'Shaarj":["OBPVPSW"],"C'Thun":["OBHCSW"]};
// Keep a short receipt ledger to pair observations one-to-one across independent listeners.
const DEDUPE_MS=3000, RECEIPT_TTL=300000;
const receiptSchema=db=>[
 db.prepare("CREATE TABLE IF NOT EXISTS world_chat_receipts (realm TEXT NOT NULL,id TEXT NOT NULL,source TEXT NOT NULL,canonical_id TEXT NOT NULL,observed_ms INTEGER NOT NULL,PRIMARY KEY(realm,id))").bind(),
 db.prepare("CREATE INDEX IF NOT EXISTS world_chat_receipt_match ON world_chat_receipts(realm,canonical_id,source)").bind(),
 db.prepare("CREATE INDEX IF NOT EXISTS world_chat_receipt_expiry ON world_chat_receipts(observed_ms)").bind()
];
const TTL=300000, HISTORY=1800000; // Live poll only; archive retention is separate.
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Access-Control-Allow-Origin":"https://equadis.github.io","Vary":"Origin"}});
const publicLine=r=>({id:r.id,author:r.author,guild:r.guild??null,level:r.level??null,classId:r.class_id??null,...publicChatMessage(r.message),gm:!!r.gm,time:r.observed_ms});
export function validLine(line,now){
  if(!line||typeof line!=="object"||typeof line.id!=="string"||!/^[a-f0-9-]{36}$/i.test(line.id)||
    typeof line.authorKey!=="string"||!/^[0-9]{1,20}$/.test(line.authorKey)||line.authorKey==="0"||
    typeof line.author!=="string"||line.author.length>80||typeof line.message!=="string"||line.message.length>1200||
    typeof line.gm!=="boolean"||!Number.isSafeInteger(line.time)||line.time<now-120000||line.time>now+5000)return null;
  const storedMessage=line.message.replace(/[\u0000-\u001f\u007f]/g," ").trim();
  const {message}=publicChatMessage(storedMessage),author=cleanText(line.author);
  if(!message.trim()||!author)return null;
  return {...line,author,message,storedMessage};
}
// Fixed-origin, read-only item detail lookup for browser clients that cannot read the DB cross-origin.
export async function itemTooltipRoute(url,fetcher=fetch,Rewriter=globalThis.HTMLRewriter){
 const id=url.searchParams.get("id")??"";
 if(!/^[1-9][0-9]{0,9}$/.test(id)||Number(id)>2147483647)return reply({error:"invalid item id"},400);
 if(typeof Rewriter!=="function")return reply({error:"item lookup unavailable"},503);
 try{
  const response=await fetcher("https://octowow.st/db/?item="+id,{redirect:"error",headers:{Accept:"text/html"},signal:AbortSignal.timeout(7000),cf:{cacheEverything:true,cacheTtl:86400}});
  if(!response.ok)return reply({error:"item database unavailable"},502);
  const selector="#tooltip"+id+"-generic";let found=false,raw="";
  const append=text=>{if(raw.length<16000)raw+=text.slice(0,16000-raw.length);};
  const rewriter=new Rewriter().on(selector,{element(){found=true;},text(chunk){append(chunk.text);}});
  for(const tag of ["br","table","div","tr","td","th"])rewriter.on(selector+" "+tag,{element(el){if(tag==="br"||tag==="tr"||tag==="div")append("\n");if(tag!=="br")el.onEndTag(()=>append("\n"));}});
  await rewriter.transform(response).arrayBuffer();
  const tooltipText=raw.replace(/\r/g,"").replace(/[ \t]+/g," ").replace(/\n\s*\n/g,"\n").split("\n").map(line=>line.trim()).filter(Boolean).join("\n");
  if(!found||!tooltipText)return reply({error:"item tooltip not found"},404);
  return new Response(JSON.stringify({id:Number(id),tooltipText,source:"OctoWoW DB"}),{headers:{"Content-Type":"application/json; charset=utf-8","Access-Control-Allow-Origin":"https://equadis.github.io","Cache-Control":"public, max-age=3600","Vary":"Origin"}});
 }catch{return reply({error:"item database unavailable"},502);}
}

export async function worldChatRoute(request,env){
  const url=new URL(request.url);
  if(url.pathname==="/api/world-chat/item-tooltip"&&request.method==="GET")return itemTooltipRoute(url);
  if(!["/api/world-chat","/api/world-chat/ingest","/api/world-chat/history"].includes(url.pathname))return null;
  const now=Date.now(), db=env.DB;
  
  if(url.pathname==="/api/world-chat/history"&&request.method==="GET"){
    try{return await readHistory(url,db,now);}
    catch(error){
      const detail=String(error?.message??error);
      const missing=/no such table|no such column/i.test(detail);
      console.warn("World Chat history query failed",detail.slice(0,300));
      return reply({error:missing?"History schema missing":"History database unavailable",code:missing?"history_schema_missing":"history_database_error"},503);
    }
  }
  if(url.pathname.endsWith("/ingest")&&request.method==="POST"){
    if(!env.METRICS_PUSH_TOKEN)return reply({error:"ingest unavailable"},503);
    if(request.headers.get("authorization")!=="Bearer "+env.METRICS_PUSH_TOKEN)return reply({error:"unauthorised"},401);
    let payload;try{const raw=await request.text();if(raw.length>64000)return reply({error:"payload too large"},413);payload=JSON.parse(raw);}catch{return reply({error:"invalid JSON"},400);}
    if(!payload||!REALMS.has(payload.realm)||!SOURCES[payload.realm]?.includes(payload.account)||payload.channel!=="world"||
       !Array.isArray(payload.messages)||payload.messages.length>20)return reply({error:"invalid public channel batch"},400);
    const guilds=payload.guilds??[];
    if(!Array.isArray(guilds)||guilds.length>10)return reply({error:"invalid guild batch"},400);
    const statements=receiptSchema(db);
    for(const g of guilds){
      if(!g||typeof g.authorKey!=="string"||!/^[0-9]{1,20}$/.test(g.authorKey)||g.authorKey==="0"||
        typeof g.guild!=="string"||g.guild.length>100||!Number.isSafeInteger(g.time)||g.time<now-120000||g.time>now+5000)
        return reply({error:"invalid guild observation"},400);
      const level=Number.isInteger(g.level)&&g.level>=1&&g.level<=60?g.level:null;
      const classId=Number.isInteger(g.classId)&&Object.hasOwn(classInfo,g.classId)?g.classId:null;
      statements.push(db.prepare("INSERT INTO world_chat_profiles(realm,author_key,guild,level,class_id,observed_ms) VALUES(?,?,?,?,?,?) ON CONFLICT(realm,author_key) DO UPDATE SET guild=excluded.guild,level=COALESCE(excluded.level,world_chat_profiles.level),class_id=COALESCE(excluded.class_id,world_chat_profiles.class_id),observed_ms=excluded.observed_ms WHERE excluded.observed_ms>world_chat_profiles.observed_ms").bind(payload.realm,g.authorKey,cleanText(g.guild),level,classId,g.time));
    }
    const searchRows=[];
    for(const raw of payload.messages){
      const l=validLine(raw,now);if(!l)return reply({error:"invalid public chat message"},400);
      // A retry keeps its original receipt; a second observation from the same source
      // must not consume the same canonical message twice.
      statements.push(db.prepare(`INSERT OR IGNORE INTO world_chat_receipts(realm,id,source,canonical_id,observed_ms)
        VALUES(?,?,?,COALESCE((
          SELECT m.id FROM world_chat_messages m
          JOIN world_chat_receipts r ON r.realm=m.realm AND r.id=m.id AND r.canonical_id=m.id
          WHERE m.realm=? AND m.author_key=? AND m.message=? AND m.gm=?
            AND m.observed_ms BETWEEN ? AND ? AND r.source<>?
            AND NOT EXISTS(SELECT 1 FROM world_chat_receipts seen WHERE seen.realm=m.realm AND seen.canonical_id=m.id AND seen.source=?)
          ORDER BY ABS(m.observed_ms-?),m.id LIMIT 1
        ),?),?)`).bind(payload.realm,l.id,payload.account,payload.realm,l.authorKey,l.storedMessage,Number(l.gm),l.time-DEDUPE_MS,l.time+DEDUPE_MS,payload.account,payload.account,l.time,l.id,l.time));
      statements.push(db.prepare("INSERT OR IGNORE INTO world_chat_messages(realm,id,observed_ms,author_key,author,message,gm) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM world_chat_receipts WHERE realm=? AND id=? AND canonical_id=id)").bind(payload.realm,l.id,l.time,l.authorKey,l.author,l.storedMessage,Number(l.gm),payload.realm,l.id));
      searchRows.push([payload.realm,l.id,l.message.toLowerCase(),l.time]);
      if(!l.gm)for(const {kind,tag} of listingKinds(l.message).slice(0,3)){
        statements.push(db.prepare("INSERT INTO world_chat_listings(realm,kind,author_key,tag,author,message,observed_ms) VALUES(?,?,?,?,?,?,?) ON CONFLICT(realm,kind,author_key,tag) DO UPDATE SET author=excluded.author,message=excluded.message,observed_ms=excluded.observed_ms WHERE excluded.observed_ms>world_chat_listings.observed_ms").bind(payload.realm,kind,l.authorKey,tag,l.author,l.storedMessage,l.time));
      }
    }
    // One bounded multi-row write keeps the statement/parameter count within D1 limits.
    if(searchRows.length)statements.push(db.prepare("WITH candidates(realm,id,message,observed_ms) AS (VALUES "+searchRows.map(()=>"(?,?,?,?)").join(",")+") INSERT OR IGNORE INTO world_chat_search_text(realm,id,message,observed_ms) SELECT c.realm,c.id,c.message,c.observed_ms FROM candidates c JOIN world_chat_messages m ON m.realm=c.realm AND m.id=c.id").bind(...searchRows.flat()));
    // Heartbeat is sent only after a valid World packet was seen on this connection.
    statements.push(db.prepare("INSERT INTO world_chat_heartbeat(realm,observed_ms) VALUES(?,?) ON CONFLICT(realm) DO UPDATE SET observed_ms=MAX(observed_ms,excluded.observed_ms)").bind(payload.realm,now));
    await db.batch(statements);
    return reply({ok:true},202);
  }
  if(url.pathname==="/api/world-chat"&&request.method==="GET"){
    const realm=url.searchParams.get("realm")||"N'Zoth";
    if(!REALMS.has(realm))return reply({error:"invalid realm"},400);
    const [world,gm,lfg,wtb,wts,heartbeat]=await db.batch([
      db.prepare("SELECT m.id,m.author,m.message,m.gm,m.observed_ms,COALESCE(p.guild,g.guild) AS guild,p.level,p.class_id FROM world_chat_messages m LEFT JOIN world_chat_guilds g ON g.realm=m.realm AND g.author_key=m.author_key LEFT JOIN world_chat_profiles p ON p.realm=m.realm AND p.author_key=m.author_key WHERE m.realm=? AND m.gm=0 AND m.observed_ms>? ORDER BY m.observed_ms DESC,m.id DESC LIMIT 150").bind(realm,now-HISTORY),
      db.prepare("SELECT m.id,m.author,m.message,m.gm,m.observed_ms,COALESCE(p.guild,g.guild) AS guild,p.level,p.class_id FROM world_chat_messages m LEFT JOIN world_chat_guilds g ON g.realm=m.realm AND g.author_key=m.author_key LEFT JOIN world_chat_profiles p ON p.realm=m.realm AND p.author_key=m.author_key WHERE m.realm=? AND m.gm=1 AND m.observed_ms>? ORDER BY m.observed_ms DESC,m.id DESC LIMIT 100").bind(realm,now-HISTORY),
      ...["lfg","wtb","wts"].map(kind=>db.prepare("SELECT l.tag,l.author,l.message,l.observed_ms,COALESCE(p.guild,g.guild) AS guild,p.level,p.class_id FROM world_chat_listings l LEFT JOIN world_chat_guilds g ON g.realm=l.realm AND g.author_key=l.author_key LEFT JOIN world_chat_profiles p ON p.realm=l.realm AND p.author_key=l.author_key WHERE l.realm=? AND l.kind=? AND l.observed_ms>? ORDER BY l.observed_ms DESC LIMIT 300").bind(realm,kind,now-TTL)),
      db.prepare("SELECT observed_ms FROM world_chat_heartbeat WHERE realm=?").bind(realm)
    ]);
    const last=heartbeat.results[0]?.observed_ms??null;
    const listings=r=>r.results.map(x=>({tag:x.tag,author:x.author,guild:x.guild??null,level:x.level??null,classId:x.class_id??null,...publicChatMessage(x.message),time:x.observed_ms,expiresAt:x.observed_ms+TTL}));
    return reply({realm,generatedAt:now,lastCollectorAt:last,status:last===null?"waiting":now-last>45000?"stale":"live",world:world.results.map(publicLine).reverse(),gm:gm.results.map(publicLine).reverse(),lfg:listings(lfg),wtb:listings(wtb),wts:listings(wts)});
  }
  return reply({error:"method not allowed"},405);
}
// Keyset pagination, stable even when messages share timestamps or arrive during a read.
export async function readHistory(url,db,now){
 const realm=url.searchParams.get("realm")||"N'Zoth",feed=url.searchParams.get("feed")||"world";
 const q=(url.searchParams.get("q")||"").trim(),before=url.searchParams.get("before"),beforeId=url.searchParams.get("beforeId");
 const terms=searchTerms(q);
 if(!REALMS.has(realm)||!["world","gm"].includes(feed)||q.length>160||terms.length>80)return reply({error:"invalid history query"},400);
 if((before===null)!==(beforeId===null)||before!==null&&(!/^\d{1,16}$/.test(before)||!Number.isSafeInteger(Number(before))||!/^[a-f0-9-]{36}$/i.test(beforeId)))return reply({error:"invalid history cursor"},400);
 const size=historyPageSize(q),cutoff=now-HISTORY_MS;
 const from=" FROM world_chat_messages m LEFT JOIN world_chat_guilds g ON g.realm=m.realm AND g.author_key=m.author_key LEFT JOIN world_chat_profiles p ON p.realm=m.realm AND p.author_key=m.author_key"+(terms.length?" LEFT JOIN world_chat_search_text s ON s.realm=m.realm AND s.id=m.id":"");
 const select="SELECT m.id,m.author,m.message,m.gm,m.observed_ms,COALESCE(p.guild,g.guild) AS guild,p.level,p.class_id";
 const rows=[];let cursor=before===null?null:{time:Number(before),id:beforeId};
 // Legacy data may still contain raw item markup. SQL narrows candidate rows, and
 // visible-text verification removes matches in invisible protocol metadata.
 let exhausted=false;
 while(rows.length<=size&&!exhausted){
  const where=["m.realm=?","m.gm=?","m.observed_ms>=?","m.observed_ms<=?"],params=[realm,Number(feed==="gm"),cutoff,now+5000];
  if(cursor){where.push("(m.observed_ms,m.id)<(?,?)");params.push(cursor.time,cursor.id);}
  for(const {kind,value} of terms){
   if(kind==="from"){where.push("lower(m.author)=?");params.push(value);}
   else if(kind==="item"&&/^\d+$/.test(value)){const id=String(Number(value));where.push("(instr(lower(m.message),?)>0 OR instr(lower(m.message),?)>0)");params.push("|hitem:"+id+":","|hitem:"+id+"|h");}
   else if(kind==="item"){where.push("instr(lower(COALESCE(s.message,m.message)),?)>0");params.push(value);}
   else{where.push("instr(lower(m.author||' '||COALESCE(p.guild,g.guild,'')||' '||COALESCE(s.message,m.message)),?)>0");params.push(value);}
  }
  const limit=terms.length?Math.min(250,Math.max(101,size+1-rows.length)):size+1;
  const [result]=await db.batch([db.prepare(select+from+" WHERE "+where.join(" AND ")+" ORDER BY m.observed_ms DESC,m.id DESC LIMIT ?").bind(...params,limit)]);
  const candidates=result.results;
  for(const row of candidates){
   const line=publicLine(row);
   if(!terms.length||matchesChat(line,q))rows.push(line);
   if(rows.length>size)break;
  }
  exhausted=candidates.length<limit;
  if(!exhausted){const last=candidates.at(-1);cursor={time:last.observed_ms,id:last.id};}
 }
 const hasMore=rows.length>size,items=rows.slice(0,size).reverse();
 const oldest=items[0];
 return reply({realm,feed,query:q,items,hasMore,nextCursor:hasMore&&oldest?{before:String(oldest.time),beforeId:oldest.id}:null,pageSize:size,retentionDays:HISTORY_MS/86400000});
}
export async function worldChatCleanup(env){
  await env.DB.batch([
    ...receiptSchema(env.DB),
    env.DB.prepare("DELETE FROM world_chat_receipts WHERE observed_ms<?").bind(Date.now()-RECEIPT_TTL),
    env.DB.prepare("DELETE FROM world_chat_messages WHERE observed_ms<?").bind(Date.now()-HISTORY_MS),
    env.DB.prepare("DELETE FROM world_chat_search_text WHERE observed_ms<?").bind(Date.now()-HISTORY_MS),
    env.DB.prepare("DELETE FROM world_chat_listings WHERE observed_ms<?").bind(Date.now()-TTL),
    env.DB.prepare("DELETE FROM world_chat_guilds WHERE observed_ms<?").bind(Date.now()-HISTORY_MS),
    env.DB.prepare("DELETE FROM world_chat_profiles WHERE observed_ms<?").bind(Date.now()-HISTORY_MS)
  ]);
}
