import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {env,skip,call} from "./auction-sqlite.mjs";
import {auctionCleanup} from "../auction.mjs";
import {patchPvpAuction} from "../collector/apply-pvp-auction.mjs";
const pvp="?realm="+encodeURIComponent("Y'Shaarj");
const at=new Date().toISOString();
test("PvP auction migration isolates scans, first seen IDs, prices, and cleanup", {skip}, async()=>{
 const e=env();
 const post=(realm,action,body)=>call(e,"POST","/api/auction/scan/"+action+realm,body);
 const get=(realm,path)=>call(e,"GET","/api/auction/"+path+realm);
 for(const realm of ["",pvp])assert.equal((await post(realm,"start",{scan_id:"ahl_synthetic1",started_at:at,reported_total:1})).status,201);
 const row={auction_id:1,item_id:100,variant:"0:0:0",quantity:1,item_name:"Synthetic","quality":1,start_bid:10,current_bid:0,min_next_bid:10,buyout:100,owner_guid:"1",captured_at:at};
 for(const [realm,buyout] of [["",100],[pvp,900]]){
  assert.equal((await post(realm,"page",{scan_id:"ahl_synthetic1",page:0,response_ms:1,items:[{...row,buyout}]})).status,202);
  assert.equal((await post(realm,"complete",{scan_id:"ahl_synthetic1",completed_at:at,expected_pages:1,reported_total:1})).status,201);
 }
 for(const [realm,buyout] of [["",100],[pvp,900]]){
  const s=await get(realm,"summary");assert.equal(s.status,200);assert.equal(s.json.total_historical_auctions,1);
  const items=await get(realm,"items");assert.equal(items.status,200);assert.equal(items.json.items[0].unit_buyout,buyout);
 }
 assert.equal((await get("?realm="+encodeURIComponent("C'Thun"),"summary")).status,400);
 assert.equal(e.DB.sqlite.prepare("select realm from pvp_ah_scans").get().realm,"Y'Shaarj");
 assert.equal(e.DB.sqlite.prepare("select realm from ah_scans").get().realm,"N'Zoth");
 await auctionCleanup(e);
});
test("metrics hook patch preserves chat and population code and is idempotent",()=>{
 const original=readFileSync(new URL("../collector/dist-metrics/metrics/index.js",import.meta.url),"utf8");
 const patched=patchPvpAuction(original);
 assert.equal(patchPvpAuction(patched),patched);
 for(const marker of ["worldChat.start()","worldChat.stop()","worldChat.receive(",".server info","pvpAuction.start()","pvpAuction.stop()","...pvpAuction.handlers"])assert.ok(patched.includes(marker),marker);
 assert.throws(()=>patchPvpAuction(original.replace("handlers: {","handlers: { onAuctionList:()=>{},")),/manual merge/);
});


test("seller names resolve separately per realm and unknown sellers retry without losing a resolved name",{skip},async()=>{
 const e=env();const path=(prefix,realm)=>prefix+(realm?"?realm="+encodeURIComponent("Y'Shaarj"):"");
 const post=(realm,action,body)=>call(e,"POST",path("/api/auction/scan/"+action,realm),body);
 const get=(realm,action)=>call(e,"GET",path("/api/auction/"+action,realm));
 const scan_id="ahl_seller_test";const row={auction_id:1,item_id:100,variant:"",quantity:1,item_name:"Synthetic",quality:1,start_bid:10,current_bid:0,min_next_bid:10,buyout:100,owner_guid:"42",captured_at:at};
 for(const realm of [false,true]){
  assert.equal((await post(realm,"start",{scan_id,started_at:at,reported_total:1})).status,201);
  assert.equal((await post(realm,"page",{scan_id,page:0,response_ms:1,items:[row]})).status,202);
  assert.equal((await post(realm,"complete",{scan_id,completed_at:at,expected_pages:1,reported_total:1})).status,201);
  assert.equal((await get(realm,"missing-sellers")).json.sellers[0].owner_guid,"42");
  assert.equal((await post(realm,"seller-names",{scan_id,sellers:[{owner_guid:"99",character_name:"Fake"}]})).status,409);
  assert.equal((await post(realm,"seller-names",{scan_id,sellers:[{owner_guid:"42",character_name:realm?"Horde":"Alliance"}]})).status,200);
  assert.equal((await get(realm,"missing-sellers")).json.sellers.length,0);
  assert.equal((await post(realm,"seller-names",{scan_id,sellers:[{owner_guid:"42",character_name:null}]})).status,200);
 }
 assert.equal((await get(false,"item/100")).json.listings[0].owner_name,"Alliance");
 assert.equal((await get(true,"item/100")).json.listings[0].owner_name,"Horde");
});
