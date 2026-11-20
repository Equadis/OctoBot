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
