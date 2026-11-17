// SYNTHETIC TEST FIXTURES ONLY: invented items and prices, never published anywhere.
// Exercises the real Worker items endpoint on SQLite: filters, combinations, sorting, pagination and favourite keys.
import {test} from "node:test";
import assert from "node:assert/strict";
import {skip,post,get,env} from "./auction-sqlite.mjs";
import {buildItemsQuery,parseKeys,MAX_FAVOURITE_KEYS} from "../auction-query.mjs";

const meta={
 1001:{item_name:"Iron Sword",quality:1,class_id:2,subclass_id:7,slot_id:13,req_level:10,item_level:12},
 1002:{item_name:"Epic Helm",quality:4,class_id:4,subclass_id:4,slot_id:1,req_level:60,item_level:70},
 1003:{item_name:"Linen Cloth",quality:1,class_id:7,subclass_id:5,slot_id:null,req_level:0,item_level:5},
 1004:{item_name:"Healing Potion",quality:1,class_id:0,subclass_id:1,slot_id:null,req_level:0,item_level:10},
 1005:{item_name:null,quality:null,class_id:null,subclass_id:null,slot_id:null,req_level:null,item_level:null}, // catalogue has no entry
 1006:{item_name:"Iron Mace",quality:2,class_id:2,subclass_id:4,slot_id:13,req_level:25,item_level:28}
};
let n=0;
const L=(item,over={})=>({auction_id:++n,item_id:item,variant:"0:0:0",quantity:1,icon_url:null,start_bid:10,current_bid:0,min_next_bid:10,
 buyout:1000,owner_guid:"7",time_left_ms:36000000,captured_at:"2026-11-01T00:00:00.000Z",...meta[item],...over});
const HOUR=3600000;
/** One scan; `price` scales the Iron Sword's buyout so history and market % can be exercised. */
function listings(price=500){
 n=0;
 return [
  L(1001,{buyout:price}),L(1001,{buyout:price+300}),
  L(1001,{variant:"0:5:3",buyout:1500}),
  L(1002,{buyout:100000}),
  L(1003,{quantity:20,buyout:400,time_left_ms:HOUR*20}),L(1003,{quantity:5,buyout:200,time_left_ms:HOUR}),L(1003,{quantity:20,buyout:null}),
  L(1004,{quantity:5,buyout:5000,time_left_ms:HOUR}),L(1004,{quantity:1,buyout:900,time_left_ms:HOUR*10,owner_guid:"42"}),
  L(1005,{buyout:300}),
  L(1006,{buyout:2500,current_bid:600})
 ];
}
async function scan(e,id,day,items){
 const pages=Math.max(1,Math.ceil(items.length/50));
 assert.equal((await post(e,"start",{scan_id:id,started_at:day+"T10:00:00.000Z",reported_total:items.length})).status,201);
 for(let p=0;p<pages;p++)assert.equal((await post(e,"page",{scan_id:id,page:p,response_ms:1,items:items.slice(p*50,p*50+50)})).status,202);
 assert.equal((await post(e,"complete",{scan_id:id,completed_at:day+"T10:30:00.000Z",expected_pages:pages,reported_total:items.length})).status,201);
}
const ids=r=>r.json.items.map(i=>i.item_id+(i.variant!=="0:0:0"?"/"+i.variant:""));
const q=(e,qs)=>get(e,"items?"+qs);
async function fresh(){const e=env();await scan(e,"ah_filters_01","2026-11-10",listings());return e;}

test("category, slot, gear and level filters use catalogue metadata and never match unknown items",{skip},async()=>{
 const e=await fresh();
 assert.deepEqual(ids(await q(e,"item_class=2&sort=name")),["1006","1001","1001/0:5:3"]);
 assert.deepEqual(ids(await q(e,"item_class=2&item_subclass=4")),["1006"]);
 assert.deepEqual(ids(await q(e,"slot=1")),["1002"]);
 assert.deepEqual(ids(await q(e,"gear=1&sort=name")),["1002","1006","1001","1001/0:5:3"]);
 assert.deepEqual(ids(await q(e,"min_level=20&sort=name")),["1002","1006"]);
 assert.deepEqual(ids(await q(e,"max_level=10&sort=name")),["1004","1001","1001/0:5:3","1003"]);
 assert.deepEqual(ids(await q(e,"min_level=10&max_level=25&sort=name")),["1006","1001","1001/0:5:3"]);
 for(const qs of ["min_level=0","max_level=70","item_class=0","gear=1"])
  assert.ok(!ids(await q(e,qs)).includes("1005"),"unknown metadata must not match: "+qs);
 assert.equal((await q(e,"min_level=30&max_level=10")).status,400);
});

test("name, exact name, rarity and ID search combine with category filters",{skip},async()=>{
 const e=await fresh();
 assert.deepEqual(ids(await q(e,"q=iron&sort=name")),["1006","1001","1001/0:5:3"]);
 assert.deepEqual(ids(await q(e,"q=iron&item_class=2&quality=2")),["1006"]);
 assert.deepEqual(ids(await q(e,"q=iron+sword&exact=1&sort=name")),["1001","1001/0:5:3"]);
 assert.deepEqual(ids(await q(e,"q=iron&exact=1")),[],"exact must not do partial matching");
 assert.deepEqual(ids(await q(e,"q=1005")),["1005"],"item ID search finds an item the catalogue does not describe");
 assert.equal((await q(e,"quality=4&item_class=2")).json.total,0);
});

test("listing filters recompute quantity, listings and price from matching listings only",{skip},async()=>{
 const e=await fresh();
 let r=await q(e,"stack=5&sort=name");
 assert.deepEqual(ids(r),["1004","1003"]);
 const cloth=r.json.items.find(i=>i.item_id===1003);
 assert.deepEqual([cloth.quantity,cloth.listings,cloth.unit_buyout,cloth.stack_buyout],[5,1,40,200]);
 assert.equal(r.json.listing_filtered,true);
 assert.equal(cloth.trend_pct,null,"movement is withheld when the listing set differs");
 // Unit buyout cap: the 5-stack (40c) is excluded, only the 20c stack remains; no-buyout listing never matches.
 r=await q(e,"item_class=7&max_unit_buyout=30");
 assert.deepEqual(r.json.items.map(i=>[i.quantity,i.listings,i.unit_buyout]),[[20,1,20]]);
 // Buyout-only removes the 20-unit no-buyout stack from the totals.
 r=await q(e,"item_class=7&has_buyout=1");
 assert.deepEqual(r.json.items.map(i=>[i.quantity,i.listings]),[[25,2]]);
 // Unit bid cap uses the current bid when there is one, otherwise the starting bid.
 assert.deepEqual(ids(await q(e,"max_unit_bid=0")),[],"0.5c per unit in a 20-stack is above 0");
 assert.deepEqual(ids(await q(e,"max_unit_bid=1")),["1003"],"only the 20-stack of cloth bids under 1c per unit");
 assert.ok(ids(await q(e,"max_unit_bid=10")).includes("1001"));
 assert.deepEqual(ids(await q(e,"item_class=2&max_unit_bid=10&sort=name")),["1001","1001/0:5:3"],"the Iron Mace's 600c bid excludes it");
 // Seller by GUID, time-left buckets.
 assert.deepEqual(ids(await q(e,"owner=42")),["1004"]);
 assert.deepEqual((await q(e,"time_left=medium&item_class=0")).json.items.map(i=>i.quantity),[5]);
 assert.deepEqual((await q(e,"time_left=long&item_class=0")).json.items.map(i=>i.quantity),[1]);
 assert.deepEqual(ids(await q(e,"time_left=short")),[]);
 assert.equal((await q(e,"time_left=soon")).status,400);
 // Without listing filters the result is unchanged and flagged as such.
 assert.equal((await q(e,"item_class=7")).json.listing_filtered,false);
});

test("market % filters, with history, combine with the other filters",{skip},async()=>{
 const e=env();
 for(const [i,d] of ["2026-11-01","2026-11-02","2026-11-03","2026-11-04"].entries())await scan(e,"ah_mkt_000"+i,d,listings(500));
 // Without four prior days no market % exists, so a market filter must match nothing rather than guess.
 assert.equal((await q(e,"max_market_pct=1000")).json.total,0);
 await scan(e,"ah_mkt_0005","2026-11-05",listings(1000));          // Iron Sword now 1000c vs 500c average
 const all=(await q(e,"sort=name")).json.items.find(i=>i.item_id===1001&&i.variant==="0:0:0");
 assert.equal(all.market_pct,200);assert.equal(all.trend_pct,100);
 assert.deepEqual(ids(await q(e,"min_market_pct=150&sort=name")),["1001"]);
 assert.deepEqual(ids(await q(e,"max_market_pct=120&sort=name")),["1002","1004","1006","1001/0:5:3","1005","1003"],"everything except the Iron Sword (200%)");
 assert.deepEqual(ids(await q(e,"min_market_pct=150&item_class=4")),[]);
 assert.equal((await q(e,"min_market_pct=300&max_market_pct=100")).status,400);
});

test("favourite keys restrict results server-side and combine with every other filter",{skip},async()=>{
 const e=await fresh();
 const keys="keys=1001:0:0:0,1004:0:0:0,9999:0:0:0";
 assert.deepEqual(ids(await q(e,keys+"&sort=name")),["1004","1001"],"unavailable item 9999 is simply absent");
 assert.deepEqual(ids(await q(e,"keys=1001:0:5:3")),["1001/0:5:3"],"a favourited variant does not pull in the base item");
 assert.deepEqual(ids(await q(e,"keys=1001:0:0:0")),["1001"],"nor does the base item pull in the variant");
 assert.deepEqual(ids(await q(e,"keys=1001:0:0:0,1001:0:0:0")),["1001"],"duplicate keys do not duplicate rows");
 assert.equal((await q(e,"keys=")).json.total,0,"favourites-only with none saved returns nothing");
 assert.deepEqual(ids(await q(e,keys+"&quality=1&q=potion")),["1004"]);
 assert.deepEqual(ids(await q(e,keys+"&stack=5")),["1004"]);
 // Pagination counts only the favourites.
 const page1=await q(e,keys+"&sort=name&limit=1&offset=0"),page2=await q(e,keys+"&sort=name&limit=1&offset=1");
 assert.equal(page1.json.total,2);assert.equal(page1.json.has_more,true);assert.equal(page2.json.has_more,false);
 assert.notEqual(ids(page1)[0],ids(page2)[0]);
 for(const bad of ["keys=abc","keys=1001","keys=0:0:0:0","keys=1001:a:b:c","keys=1001:1:2"])
  assert.equal((await q(e,bad)).status,400,bad);
});

test("sorting is stable and pagination neither repeats nor omits items, in both directions",{skip},async()=>{
 const e=await fresh();
 const total=(await q(e,"limit=100")).json.total;
 for(const sort of ["name","unit_buyout","stack_buyout","current_bid","historical_avg","quantity","listings","trend_pct","market_pct","time_left","level"])
  for(const dir of ["asc","desc"]){
   const seen=[];
   for(let offset=0;offset<total;offset+=2){
    const r=await q(e,`sort=${sort}&dir=${dir}&limit=2&offset=${offset}`);
    assert.equal(r.status,200,sort+" "+dir);
    seen.push(...ids(r));
   }
   assert.equal(seen.length,total,sort+" "+dir+" count");
   assert.equal(new Set(seen).size,total,sort+" "+dir+" duplicates");
  }
 const asc=ids(await q(e,"sort=unit_buyout&dir=asc")),desc=ids(await q(e,"sort=unit_buyout&dir=desc"));
 assert.equal(asc[0],"1003");assert.equal(desc[0],"1002");
 assert.deepEqual(asc.slice(0,3),["1003","1005","1001"]);
 assert.equal(ids(await q(e,"sort=stack_buyout&dir=desc"))[0],"1002","highest stack buyout first");
 assert.equal(ids(await q(e,"sort=current_bid&dir=desc"))[0],"1006","highest current bid first");
 assert.equal(ids(await q(e,"sort=time_left&dir=desc"))[0],"1003","longest observed auction first");
 assert.equal(ids(await q(e,"sort=time_left&dir=asc"))[0],"1003","shortest remaining auction first");
 assert.deepEqual(ids(await q(e,"sort=name&dir=desc&limit=2")),["1003","1005"],"unnamed items sort as Item #ID");
 assert.equal((await q(e,"sort=name&dir=sideways")).status,400);
});

test("every filter at once stays under D1's 100 bound-parameter limit",()=>{
 const params=new URLSearchParams({q:"iron",exact:"1",quality:"2",min_level:"1",max_level:"60",item_class:"2",item_subclass:"4",slot:"13",gear:"1",
  min_quantity:"1",stack:"5",max_unit_buyout:"99999",max_unit_bid:"99999",has_buyout:"1",owner:"42",time_left:"long",min_market_pct:"1",max_market_pct:"900",
  keys:Array.from({length:MAX_FAVOURITE_KEYS},(_,i)=>`${i+1}:0:0:0`).join(","),sort:"market_pct",dir:"desc",limit:"100",offset:"5000"});
 const built=buildItemsQuery(params,{scan_id:"s",completed_at:"2026-11-10T10:30:00.000Z"},null);
 assert.ok(!built.error,built.error);
 assert.ok(built.binds.length+2<=100,"binds: "+(built.binds.length+2));
 assert.equal(parseKeys(Array.from({length:MAX_FAVOURITE_KEYS+1},(_,i)=>`${i+1}:0:0:0`).join(",")),null);
});

test("invalid filter values are rejected, not ignored",{skip},async()=>{
 const e=await fresh();
 for(const bad of ["quality=-1","quality=9","quality=x","min_level=71","item_class=99","slot=41","stack=0","stack=1.5","max_unit_buyout=-5","max_unit_buyout=1e12","owner=abc","time_left=x","sort=password"])
  assert.equal((await q(e,bad)).status,400,bad);
});

test("summary reports how many items have catalogue metadata",{skip},async()=>{
 const e=await fresh();
 const s=(await get(e,"summary")).json;
 assert.equal(s.item_count,7);          // 1001 (two variants), 1002..1006
 assert.equal(s.items_with_metadata,6);  // everything except item 1005
});
