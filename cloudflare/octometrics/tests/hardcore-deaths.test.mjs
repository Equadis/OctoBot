import {test} from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import worker,{serverUptimeSeconds} from "../worker.mjs";
import {createHardcoreDeathListener,hardcoreDeathAnnouncement} from "../../../services/world-buff-tracker/collector/hardcore-deaths.mjs";

const announcement="Boaring (Level 42) died to a boar. Their last words were: Still drunk.";
test("death announcement parser keeps last words and removes game formatting",()=>{
 assert.equal(hardcoreDeathAnnouncement("|cffffff00"+announcement+"|r"),announcement);
 assert.equal(hardcoreDeathAnnouncement("Boaring died to a boar."),"Boaring died to a boar.");
 assert.equal(hardcoreDeathAnnouncement("Players online: 1200"),null);
});

test("server sends separate death and last words messages, which are paired by character",()=>{
 const sent=[];
 const listener=createHardcoreDeathListener(text=>sent.push(text));
 assert.equal(listener.receive("Players online: 1200"),false);
 listener.receive("A tragedy has occurred. Hardcore character Fallen (level 12) has fallen to Son of Arugal (level 25) in Silverpine Forest. May this sacrifice not be forgotten.");
 listener.receive("A tragedy has occurred. Hardcore character Boaring (level 42) has fallen to a boar (level 42) in the Barrens. May this sacrifice not be forgotten.");
 listener.receive(`Boaring's last words: "Still drunk."`);
 listener.flush();
 assert.deepEqual(sent,[
  'Boaring died to a boar (level 42) in the Barrens. Their last words were: "Still drunk."',
  'Fallen died to Son of Arugal (level 25) in Silverpine Forest.'
 ]);
});

test("extracts uptime from the in-game .server info format",()=>{
 assert.equal(serverUptimeSeconds(["Players online: 286. Max online: 297.","Server uptime: 1 Day 15 Hours 26 Minutes 31 Seconds"]),141991);
 assert.equal(serverUptimeSeconds(["Server uptime: 36 Seconds"]),36);
 assert.equal(serverUptimeSeconds(["Players online: 286."]),null);
});

test("authenticated death announcements are scoped to the collector and returned once per realm",async()=>{
 const database=new DatabaseSync(":memory:");
 database.exec(readFileSync(new URL("../schema.sql",import.meta.url),"utf8"));
 const DB={prepare(query){const stmt=database.prepare(query);return {bind(...args){
  return {run:async()=>stmt.run(...args),all:async()=>({results:stmt.all(...args)})};
 }}}};
 const base="https://worker.example/api";
 const env={DB,METRICS_PUSH_TOKEN:"test-only"};
 const event={type:"hardcore_death",realm:"N'Zoth",role:"sw",account:"OBPVESW",
  time:new Date().toISOString(),text:announcement,eventId:randomUUID()};
 const send=(payload,auth="Bearer test-only")=>worker.fetch(new Request(base+"/ingest",{
  method:"POST",headers:{authorization:auth},body:JSON.stringify(payload)
 }),env);
 const get=async(realm,after=0)=>(await worker.fetch(new Request(base+"/world-chat/deaths?"+
  new URLSearchParams({realm,after})),env)).json();
 try{
  assert.equal((await send(event,"")).status,401);
  assert.equal((await send({...event,role:"org",account:"OBPVEORG"})).status,400);
  assert.equal((await send({...event,text:"Players online: 1200"})).status,400);
  assert.equal((await send(event)).status,202);
  assert.equal((await send(event)).status,202);
  assert.equal((await send({...event,eventId:randomUUID()})).status,202);
  const {items}=await get("N'Zoth");
  assert.equal(items.length,1);
  assert.equal(items[0].text,announcement);
  assert.deepEqual((await get("C'Thun")).items,[]);
  assert.deepEqual((await get("N'Zoth",items[0].id)).items,[]);
 }finally{database.close();}
});
