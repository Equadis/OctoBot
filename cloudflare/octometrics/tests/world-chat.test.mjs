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
 sql.exec(readFileSync(new URL("../migrations/0007_world_chat_history.sql",import.meta.url),"utf8"));
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

import {parseChatMessage,publicChatMessage,appendChatMessage} from "../../../docs/world-chat/chat-links.mjs";
test("item links preserve numeric IDs, quality colours, surrounding text and multiple items",()=>{
 const raw="WTS |cff1eff00|Hitem:18329:0:0:0|h[Arcanum of Rapidity]|h|r 50g, |cff0070dd|Hitem:16712:0:0:0|h[Shadowcraft Gloves]|h|r 90g";
 const parts=publicChatMessage(raw);
 assert.equal(parts.message,"WTS [Arcanum of Rapidity] 50g, [Shadowcraft Gloves] 90g");
 assert.deepEqual(parts.parts.filter(x=>x.itemId),[{text:"[Arcanum of Rapidity]",itemId:18329,colour:"#1eff00"},{text:"[Shadowcraft Gloves]",itemId:16712,colour:"#0070dd"}]);
 assert.equal(validLine({time:Date.now(),id:"12345678-1234-1234-1234-123456789abc",authorKey:"1",author:"Player",message:raw,gm:false},Date.now()).storedMessage,raw);
 assert.deepEqual(listingKinds(parts.message).map(x=>x.kind),["wts"]);
});
test("safe markup, escaped pipes, unsupported link types and malformed IDs",()=>{
 assert.deepEqual(publicChatMessage("WTB [Shadowcraft Gloves]"),{message:"WTB [Shadowcraft Gloves]"});
 assert.deepEqual(publicChatMessage("|Hurl:javascript:alert(1)|h[evil]|h"),{message:"[evil]"});
 assert.deepEqual(publicChatMessage("|Hitem:0|h[bad]|h |Hitem:2147483648|h[bad2]|h"),{message:"[bad] [bad2]"});
 assert.equal(parseChatMessage("||Hitem:1|h[test]|h").parts.some(x=>x.itemId),false);
 assert.equal(parseChatMessage("|cff123456|Hitem:1|h[Item]|h|r").parts[0].colour,"#ffffff");
 const doc={createTextNode:text=>({text}),createElement:tag=>({tag,style:{}})},parent={ownerDocument:doc,children:[],append(x){this.children.push(x)}};
 appendChatMessage(parent,{message:"<img> [test]",parts:[{text:"<img> "},{text:"[test]",itemId:16712,colour:"red; background:url(evil)"}]});
 assert.deepEqual(parent.children[0],{text:"<img> "});
 assert.equal(parent.children[1].href,"https://octowow.st/db/?item=16712");assert.equal(parent.children[1].rel,"noopener noreferrer");assert.equal(parent.children[1].style.color,"#ffffff");
 appendChatMessage(parent,{message:"[Not a link]",parts:[{text:"different",itemId:1}]});assert.deepEqual(parent.children.at(-1),{text:"[Not a link]"});
});
test("item markup survives real SQL storage and listing refresh; legacy plain text remains plain",async()=>{
 const DB=dbAdapter(),env={DB,METRICS_PUSH_TOKEN:"test-only"},base="https://worker.example/api/world-chat";
 const now=Date.now(),id=i=>"12345678-1234-1234-1234-"+String(i).padStart(12,"0");
 const line=(i,message)=>({id:id(i),time:now+i,authorKey:"1",author:"Player",gm:false,message});
 const send=messages=>worldChatRoute(new Request(base+"/ingest",{method:"POST",headers:{authorization:"Bearer test-only"},body:JSON.stringify({realm:"N'Zoth",account:"OBPVESW",channel:"world",messages})}),env);
 try{
  assert.equal((await send([line(1,"WTB [Shadowcraft Gloves]"),line(2,"WTB |cff0070dd|Hitem:16712:0:0:0|h[Shadowcraft Gloves]|h|r")])).status,202);
  const data=await (await worldChatRoute(new Request(base),env)).json();
  assert.equal(data.world.length,2);assert.equal(data.world[0].parts,undefined);assert.equal(data.world[1].parts[1].itemId,16712);
  assert.equal(data.wtb.length,1);assert.equal(data.wtb[0].parts[1].colour,"#0070dd");assert.equal(data.wtb[0].message,"WTB [Shadowcraft Gloves]");
 }finally{DB.sql.close();}
});

import {splitWebLinks} from "../../../docs/world-chat/chat-links.mjs";
import {historyPageSize,matchesChat,mergeChat,cursorFor,HISTORY_MS} from "../../../docs/world-chat/chat-history.mjs";
test("ordinary links are safe, clickable, preserve punctuation and remember clicks",()=>{
 const parts=splitWebLinks("See (https://example.com/a_(b)), www.example.org and discord.gg/abc. javascript:alert(1)");
 assert.deepEqual(parts.filter(p=>p.href).map(p=>p.href),["https://example.com/a_(b)","https://www.example.org/","https://discord.gg/abc"]);
 assert.equal(parts.map(p=>p.text).join(""),"See (https://example.com/a_(b)), www.example.org and discord.gg/abc. javascript:alert(1)");
 assert.equal(splitWebLinks("https://trusted.example@evil.example").some(p=>p.href),false);
 const doc={createTextNode:text=>({text}),createElement:tag=>({tag,style:{},handlers:{},addEventListener(k,f){this.handlers[k]=f},classList:{add(){}}})},parent={ownerDocument:doc,children:[],append(x){this.children.push(x)}};
 appendChatMessage(parent,{message:"https://example.com/visited-test"});const a=parent.children[0];assert.equal(a.href,"https://example.com/visited-test");assert.equal(a.rel,"noopener noreferrer");a.handlers.click();
 appendChatMessage(parent,{message:"https://example.com/visited-test"});assert.match(parent.children[1].className,/is-visited/);
});
test("history paging and literal search across thousands of rows, realms, guilds and item captions",async()=>{
 const DB=dbAdapter(),env={DB,METRICS_PUSH_TOKEN:"test-only"},now=Date.now(),base="https://worker.example/api/world-chat/history";
 const id=i=>"12345678-1234-1234-1234-"+String(i).padStart(12,"0");
 const insert=DB.sql.prepare("INSERT INTO world_chat_messages(realm,id,observed_ms,author_key,author,message,gm) VALUES(?,?,?,?,?,?,?)");
 const insertSearch=DB.sql.prepare("INSERT INTO world_chat_search_text(realm,id,message,observed_ms) VALUES(?,?,?,?)");
 try{
  DB.sql.exec("BEGIN");
  for(let i=1;i<=2405;i++){const time=now-10000+Math.floor(i/3),raw=i%10===0?"WTS |cff0070dd|Hitem:16712:0:0:0|h[Shadowcraft Gloves]|h|r":"ordinary "+i;
   insert.run("N'Zoth",id(i),time,"1","Testplayer",raw,0);
   insertSearch.run("N'Zoth",id(i),publicChatMessage(raw).message.toLowerCase(),time);
  }
  insert.run("N'Zoth",id(4001),now-1,"2","GM","Shadowcraft notice",1);
  insert.run("Y'Shaarj",id(4002),now-1,"1","Testplayer","Shadowcraft",0);
  insert.run("N'Zoth",id(4003),now-HISTORY_MS-10000,"1","Testplayer","Shadowcraft old",0);
  DB.sql.prepare("INSERT INTO world_chat_guilds VALUES(?,?,?,?)").run("N'Zoth","1","Test Guild",now);
  DB.sql.exec("COMMIT");
  const read=async params=>(await worldChatRoute(new Request(base+"?"+new URLSearchParams(params)),env)).json();
  const first=await read({}),second=await read(first.nextCursor),third=await read(second.nextCursor);
  assert.equal(first.items.length,1000);assert.equal(second.items.length,1000);assert.equal(third.items.length,405);assert.equal(third.hasMore,false);
  assert.equal(new Set([...first.items,...second.items,...third.items].map(r=>r.id)).size,2405);
  assert.ok(second.items.at(-1).time<=first.items[0].time);
  const q="testplayer Shadowcraft gloves test guild";
  const search=await read({q}),search2=await read({q,...search.nextCursor}),search3=await read({q,...search2.nextCursor});
  assert.equal(search.items.length,100);assert.equal(search2.items.length,100);assert.equal(search3.items.length,40);
  assert.ok([...search.items,...search2.items,...search3.items].every(r=>matchesChat(r,q)&&!r.gm));
  assert.equal((await read({q:"16712"})).items.length,0);
  assert.equal((await read({q:"Shadowcraft",feed:"gm"})).items.length,1);
  assert.equal((await read({q:"Shadowcraft",realm:"Y'Shaarj"})).items.length,1);
  assert.equal((await read({q:"%_"})).items.length,0);
  assert.equal((await worldChatRoute(new Request(base+"?before=invalid"),env)).status,400);
  assert.equal(historyPageSize(q),100);assert.equal(historyPageSize(""),1000);
  assert.equal(mergeChat(first.items,first.items).length,1000);assert.deepEqual(cursorFor(first.items),first.nextCursor);
  await worldChatCleanup(env);
  assert.equal(DB.sql.prepare("SELECT count(*) AS n FROM world_chat_messages WHERE id=?").get(id(4003)).n,0);
  assert.equal(DB.sql.prepare("SELECT count(*) AS n FROM world_chat_messages WHERE realm=? AND gm=0").get("N'Zoth").n,2405);
 }finally{DB.sql.close();}
});
