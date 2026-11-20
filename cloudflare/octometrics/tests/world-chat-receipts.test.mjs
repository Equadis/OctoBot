import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import {worldChatRoute,worldChatCleanup} from "../world-chat.mjs";

test("cross-source receipts pair observations one-to-one without suppressing same-source repeats",async()=>{
 const sql=new DatabaseSync(":memory:");
 for(const name of ["0004_world_chat","0005_world_chat_guilds","0006_world_chat_profiles","0007_world_chat_history"])
  sql.exec(readFileSync(new URL("../migrations/"+name+".sql",import.meta.url),"utf8"));
 const DB={prepare(query){return {bind(...args){return {query,args}}}},async batch(statements){
  sql.exec("BEGIN");try{const out=statements.map(({query,args})=>{
   const stmt=sql.prepare(query);return /^SELECT/i.test(query)?{results:stmt.all(...args)}:stmt.run(...args);
  });sql.exec("COMMIT");return out;}catch(e){sql.exec("ROLLBACK");throw e;}
 }};
 const env={DB,METRICS_PUSH_TOKEN:"test-only"},url="https://worker.example/api/world-chat",now=Date.now();
 const id=n=>"12345678-1234-1234-1234-"+String(n).padStart(12,"0");
 const line=(n,time=now,authorKey="1",message="LFM WC",gm=false)=>({id:id(n),authorKey,author:"Player"+authorKey,message,gm,time});
 const send=async(account,messages,realm="N'Zoth")=>{
  const response=await worldChatRoute(new Request(url+"/ingest",{method:"POST",headers:{authorization:"Bearer test-only"},body:JSON.stringify({realm,account,channel:"world",messages})}),env);
  assert.equal(response.status,202);
 };
 const ids=()=>sql.prepare("SELECT id FROM world_chat_messages WHERE realm=? ORDER BY id").all("N'Zoth").map(x=>x.id);
 try{
  await send("OBPVEDMFA",[line(1),line(2,now+200)]);
  await send("OBPVEDMFH",[line(3,now+30),line(4,now+220)]);
  await send("OBPVEDMFH",[line(3,now+30),line(4,now+220)]);
  assert.deepEqual(ids(),[id(1),id(2)]);
  await send("OBPVEDMFH",[line(5,now-20000)]);
  await send("OBPVEDMFA",[line(6,now-19990)]);
  await send("OBPVEDMFH",[line(7,now-15000)]);
  await send("OBPVEDMFA",[line(8,now-15000,"2"),line(9,now-15000,"1","different"),line(10,now-15000,"1","LFM WC",true)]);
  await send("OBPVPSW",[line(11)],"Y'Shaarj");
  assert.deepEqual(ids(),[1,2,5,7,8,9,10].map(id));
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM world_chat_search_text").get().n,8);
  const feed=await(await worldChatRoute(new Request(url),env)).json();
  assert.equal(feed.world.length,6);assert.equal(feed.gm.length,1);
  const history=await(await worldChatRoute(new Request(url+"/history?q=WC"),env)).json();
  assert.equal(history.items.length,5);
  await worldChatCleanup(env);
 }finally{sql.close();}
});

test("legacy overlap is hidden in history and live reads without deleting archive",async()=>{
 const sql=new DatabaseSync(":memory:");
 for(const name of ["0004_world_chat","0005_world_chat_guilds","0006_world_chat_profiles","0007_world_chat_history"])
  sql.exec(readFileSync(new URL("../migrations/"+name+".sql",import.meta.url),"utf8"));
 const DB={prepare(query){return {bind(...args){return {query,args}}}},async batch(statements){return statements.map(({query,args})=>({results:sql.prepare(query).all(...args)}));}};
 const now=Date.parse("2026-11-20T11:18:00Z"),t=Date.parse("2026-11-20T11:05:00Z"),original=Date.now;
 const insert=sql.prepare("INSERT INTO world_chat_messages(realm,id,observed_ms,author_key,author,message,gm) VALUES(?,?,?,?,?,?,?)");
 const id=n=>"12345678-1234-1234-1234-"+String(n).padStart(12,"0");
 try{
  Date.now=()=>now;
  for(const [n,realm,time,sender,msg] of [[1,"N'Zoth",t,"1","same"],[2,"N'Zoth",t+100,"1","same"],[3,"N'Zoth",t+150,"2","same"],[4,"N'Zoth",t+1500,"1","same"],[5,"Y'Shaarj",t+100,"1","same"],[6,"Y'Shaarj",t+200,"1","same"],[7,"N'Zoth",t-30000,"1","same"],[8,"N'Zoth",t-29900,"1","same"]])insert.run(realm,id(n),time,sender,"Player"+sender,msg,0);
  const base="https://worker.example/api/world-chat";
  const history=await(await worldChatRoute(new Request(base+"/history"),{DB})).json();
  assert.deepEqual(history.items.map(x=>x.id),[7,8,1,3,4].map(id));
  const live=await(await worldChatRoute(new Request(base),{DB})).json();
  assert.deepEqual(live.world.map(x=>x.id),[7,8,1,3,4].map(id));
  const pvp=await(await worldChatRoute(new Request(base+"/history?realm=Y%27Shaarj"),{DB})).json();
  assert.equal(pvp.items.length,2);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM world_chat_messages").get().n,8);
 }finally{Date.now=original;sql.close();}
});

import {searchTerms,matchesChat,SEARCH_OPTIONS} from "../../../docs/world-chat/chat-history.mjs";
test("advanced search options compose with quoted values and exact player mentions",()=>{
 const row={author:"Alice",guild:"Night Watch",message:"Hey @Bob, see https://example.org and [Sword]",parts:[{text:"[Sword]",itemId:123}]};
 assert.equal(SEARCH_OPTIONS.length,7);
 assert.deepEqual(searchTerms('from:Alice in:"Night Watch" has:item'),[{kind:"from",value:"alice"},{kind:"in",value:"night watch"},{kind:"has",value:"item"}]);
 for(const q of ['from:alice','mentions:bob','has:mentions','has:item','has:link','item:123','in:"Night Watch"','from:alice has:item mentions:bob'])assert.equal(matchesChat(row,q),true,q);
 for(const q of ['from:bob','mentions:bo','in:other','has:unknown','item:124'])assert.equal(matchesChat(row,q),false,q);
});
