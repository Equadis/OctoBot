import test from "node:test";import assert from "node:assert/strict";
import {listingKinds,cleanText} from "../world-chat-classify.mjs";
import {validLine} from "../world-chat.mjs";
import {decodeWorldPacket} from "../collector/dist-metrics/metrics/world-chat.js";
test("recruitment aliases, boundaries, multiple raids and trade exclusion",()=>{
  assert.deepEqual(listingKinds("LFM heal ZG / MC / Ony").map(x=>x.tag),["ZG","MC","Ony"]);
  assert.equal(listingKinds("I cleared MC yesterday").length,0);
  assert.equal(listingKinds("WTS MC boost")[0].kind,"wts");
  assert.equal(listingKinds("WTB [Arcane Crystal]")[0].kind,"wtb");
  assert.equal(listingKinds("LF2M WC")[0].tag,"WC");
  assert.equal(listingKinds("LFG DM north")[0].tag,"DM North");
  assert.equal(cleanText("|cffa335ee|Hitem:1|h[Item]|h|r"),"[Item]");
});
test("fresh event validation",()=>{
 const now=Date.now(),line={time:now,id:"12345678-1234-1234-1234-123456789abc",authorKey:"1",author:"Player",message:"LFM WC",gm:false};
 assert.ok(validLine(line,now));assert.equal(validLine({...line,time:now-120001},now),null);assert.equal(validLine({...line,gm:"true"},now),null);
});
test("GM flag is packet metadata, not message text",()=>{
 const text="<GM> fake",name=Buffer.from("world\0"),msg=Buffer.from(text+"\0"),body=Buffer.alloc(5+name.length+4+8+4+msg.length+1);
 name.copy(body,5);const p=5+name.length+4;body.writeBigUInt64LE(42n,p);body.writeUInt32LE(msg.length,p+8);msg.copy(body,p+12);
 assert.equal(decodeWorldPacket("world",42n,text,body).gm,false);
 body[body.length-1]=4;assert.equal(decodeWorldPacket("world",42n,text,body).gm,true);
 assert.equal(decodeWorldPacket("guild",42n,text,body),null);assert.equal(decodeWorldPacket("world",43n,text,body),null);
 body.writeUInt32LE(0xffffffff,1);assert.equal(decodeWorldPacket("world",42n,text,body),null);
});

import {readFileSync} from "node:fs";
import {patchCollector} from "../collector/apply-world-chat.mjs";
import {DatabaseSync} from "node:sqlite";
import {worldChatRoute,worldChatCleanup} from "../world-chat.mjs";
test("safe incremental collector patch, idempotence and refusal on mismatch",()=>{
 const patched=readFileSync(new URL("../collector/dist-metrics/metrics/index.js",import.meta.url),"utf8");
 const original=patched.split("\n").filter(line=>!line.includes("worldChat")&&!line.includes("createWorldChat")).join("\n");
 assert.equal(patchCollector(original),patched);
 assert.equal(patchCollector(patched),patched);
 const prior=patched.split("\n").filter(line=>!line.includes("worldChat.guildTick")&&!line.includes("worldChat.observeWho")).join("\n");assert.equal(patchCollector(prior),patched);
 assert.throws(()=>patchCollector(original.replace("whisperResponder.stop();","unknown();")));
 assert.throws(()=>patchCollector(original+"\nonChannelMessage: existing"));
});
function dbAdapter(){
 const sql=new DatabaseSync(":memory:");
 sql.exec(readFileSync(new URL("../migrations/0004_world_chat.sql",import.meta.url),"utf8"));
 sql.exec(readFileSync(new URL("../migrations/0005_world_chat_guilds.sql",import.meta.url),"utf8"));
 sql.exec(readFileSync(new URL("../migrations/0006_world_chat_profiles.sql",import.meta.url),"utf8"));
 return {sql,prepare(query){return {bind(...args){return {query,args}}}},async batch(statements){
   sql.exec("BEGIN");try{const out=statements.map(({query,args})=>{
     const stmt=sql.prepare(query);
     return /^SELECT/i.test(query)?{results:stmt.all(...args)}:stmt.run(...args);
   });sql.exec("COMMIT");return out;}catch(e){sql.exec("ROLLBACK");throw e;}
 }};
}
test("real SQL lifecycle: auth, dedupe, realms, refresh, independent listings, expiry and GM separation",async()=>{
 const DB=dbAdapter(),env={DB,METRICS_PUSH_TOKEN:"test-only"},base="https://worker.example/api/world-chat";
 let now=Date.now();const actual=Date.now;Date.now=()=>now;
 try{
  const line=(id,authorKey,message,gm=false,time=now)=>({id:"12345678-1234-1234-1234-"+String(id).padStart(12,"0"),authorKey,author:"Player"+authorKey,message,gm,time});
  const send=(messages,realm="N'Zoth",account="OBPVESW",auth="Bearer test-only",guilds=[])=>worldChatRoute(new Request(base+"/ingest",{method:"POST",headers:{authorization:auth},body:JSON.stringify({realm,account,channel:"world",messages,guilds})}),env);
  const read=async(realm="N'Zoth")=>(await worldChatRoute(new Request(base+"?realm="+encodeURIComponent(realm)),env)).json();
  assert.equal((await read()).status,"waiting");
  assert.equal((await send([], "N'Zoth","OBPVESW","Bearer no")).status,401);
  assert.equal((await send([], "N'Zoth","OBPVPORG")).status,400);
  const first=line(1,"1","LFM WC");
  assert.equal((await send([first,line(2,"2","LFG WC"),line(3,"3","<GM> fake"),line(4,"4","announcement",true),line(5,"5","WTB linen")])).status,202);
  await send([first]);
  let data=await read();assert.equal(data.world.length,4);assert.equal(data.gm.length,1);assert.equal(data.lfg.length,2);assert.equal(data.wtb.length,1);
  assert.ok(data.world.some(x=>x.message==="<GM> fake"));
  assert.equal(data.world.find(x=>x.author==="Player1").guild,null);
  await send([], "N'Zoth","OBPVESW","Bearer test-only",[{authorKey:"1",guild:"Raiders",time:now,level:60,classId:4}]);
  data=await read();assert.equal(data.world.find(x=>x.author==="Player1").guild,"Raiders");assert.equal(data.lfg.find(x=>x.author==="Player1").guild,"Raiders");assert.equal(data.lfg.find(x=>x.author==="Player1").classId,4);assert.equal(data.lfg.find(x=>x.author==="Player1").level,60);
  assert.equal(data.world.find(x=>x.author==="Player2").guild,null);
  await send([line(7,"1","LFG WC")],"Y'Shaarj","OBPVPSW");assert.equal((await read("Y'Shaarj")).world[0].guild,null);
  assert.equal((await read("Y'Shaarj")).world.length,1);
  now+=180000;await send([line(6,"1","LF2M WC")]);data=await read();assert.equal(data.lfg.length,2);
  assert.equal(data.lfg.find(x=>x.author==="Player1").expiresAt,now+300000);
  now+=120000;data=await read();assert.equal(data.lfg.length,1);assert.equal(data.wtb.length,0);assert.equal(data.status,"stale");
  await worldChatCleanup(env);assert.equal(DB.sql.prepare("SELECT COUNT(*) AS n FROM world_chat_listings WHERE observed_ms<?").get(now-300000).n,0);
  now+=180000;assert.equal((await read()).lfg.length,0);
 }finally{Date.now=actual;DB.sql.close();}
});

import {catalog,analyseRecruitment,filterListings} from "../../../docs/world-chat/lfg-catalog.mjs";
test("catalogue, distinct wings, Octo instances and ambiguous shorthand",()=>{
 assert.equal(new Set(catalog.map(x=>x.tag)).size,catalog.length);
 for(const [message,expected] of [["LF2M dme heals",["DM East"]],["LFG sm cath",["SM Cath"]],["LFG strat UD",["Strat UD"]],["LF1M gnomer",["Gnomer"]],["LF3M LKH",["Kara"]],["LFG Emerald Sanctum",["ES"]],["LFM dark reaver of karazhan",["Dark Reaver"]],["LFG DM",["DM"]],["LFG Kara crypt",["Kara Crypt"]],["WTS ZG boost",[]],["guild recruiting for MC",[]]])assert.deepEqual(analyseRecruitment(message).tags,expected,message);
 assert.equal(analyseRecruitment("LF2M tank and healer WC").needed,2);assert.deepEqual(analyseRecruitment("LF2M tank and healer WC").roles,["Tank","Healer"]);assert.equal(analyseRecruitment("LFG WC").intent,"LFG");
 const rows=[{tag:"WC",message:"LF2M tank WC",author:"A",expiresAt:100},{tag:"ZG",message:"LFG ZG dps",author:"B",expiresAt:100},{tag:"WC",message:"LFG WC",author:"C",expiresAt:1}];
 assert.deepEqual(filterListings(rows,{kind:"dungeon",role:"Tank",query:"wailing",blacklist:"boost"},10).map(x=>x.author),["A"]);
 assert.deepEqual(filterListings(rows,{kind:"raid",intent:"LFG",blacklist:"dps"},10),[]);
});
