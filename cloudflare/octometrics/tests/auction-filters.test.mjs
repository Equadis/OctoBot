// SYNTHETIC TEST FIXTURES ONLY: invented items and prices, never published anywhere.
// Exercises the real Worker items endpoint on SQLite: filters, combinations, sorting, pagination and favourite keys.
import {test} from "node:test";
import assert from "node:assert/strict";
import {skip,post,get,env,call} from "./auction-sqlite.mjs";
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
const CAPTURED=new Date().toISOString();
const L=(item,over={})=>({auction_id:++n,item_id:item,variant:"0:0:0",quantity:1,icon_url:null,start_bid:10,current_bid:0,min_next_bid:10,
 buyout:1000,owner_guid:"7",time_left_ms:36000000,captured_at:CAPTURED,...meta[item],...over});
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
 for(const sort of ["recent","name","unit_buyout","stack_buyout","current_bid","historical_avg","quantity","listings","trend_pct","market_pct","time_left","level"])
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
 assert.equal(ids(await q(e,"sort=time_left&dir=asc"))[0],"1001","shortest representative auction first, ties by item ID");
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
 for(const bad of ["quality=-1","quality=9","quality=x","min_level=71","item_class=99","slot=41","stack=0","stack=1.5","max_unit_buyout=-5","max_unit_buyout=1e12","owner=a1","time_left=x","sort=password"])
  assert.equal((await q(e,bad)).status,400,bad);
});

test("summary reports how many items have catalogue metadata",{skip},async()=>{
 const e=await fresh();
 const s=(await get(e,"summary")).json;
 assert.equal(s.item_count,7);          // 1001 (two variants), 1002..1006
 assert.equal(s.items_with_metadata,6);  // everything except item 1005
});

test("recent is the default and new auction IDs move their item ahead of existing listings",{skip},async()=>{
 const e=await fresh();const newer=listings();newer.push(L(1003,{auction_id:99999}));
 await scan(e,"ah_filters_recent","2026-11-11",newer);
 const r=await q(e,"");assert.equal(r.status,200);assert.equal(r.json.items[0].item_id,1003);
 assert.equal(r.json.items[0].latest_listing_seen_at,"2026-11-11T10:30:00.000Z");
 const repeat=listings();repeat.push(L(1003,{auction_id:99999}));await scan(e,"ah_filters_repeat","2026-11-12",repeat);
 assert.equal((await q(e,"")).json.items[0].latest_listing_seen_at,"2026-11-11T10:30:00.000Z");
});
test("time filters use elapsed time and exclude estimates that have elapsed",{skip},async()=>{
 const e=await fresh();const stale=new Date(Date.now()-3*HOUR).toISOString();
 await scan(e,"ah_filters_elapsed","2026-11-11",[L(1003,{time_left_ms:4*HOUR+15*60_000,captured_at:stale}),L(1004,{time_left_ms:HOUR,captured_at:stale})]);
 assert.deepEqual(ids(await q(e,"time_left=medium")),["1003"]);assert.deepEqual(ids(await q(e,"time_left=short")),[]);
});

test("missing item metadata is persisted, immediately searchable and retained across scans",{skip},async()=>{
 const e=await fresh();const before=await get(e,"missing-metadata");
 assert.deepEqual(before.json.items,[{item_id:1005,listings:1}]);
 const item={item_id:1005,item_name:"Recovered Material",quality:1,icon_url:"https://wow.zamimg.com/images/wow/icons/large/inv_misc_leatherscrap_08.jpg",item_level:40,req_level:0,class_id:7,subclass_id:1,slot_id:0};
 assert.equal((await post(e,"metadata",{scan_id:"ah_filters_01",items:[{...item,item_id:99999}]})).status,409);
 const denied=await (await import("../auction.mjs")).auctionRoute(new Request("https://octometrics.example/api/auction/scan/metadata",{method:"POST",body:JSON.stringify({scan_id:"ah_filters_01",items:[item]})}),e);
 assert.equal(denied.status,401);
 assert.equal((await post(e,"metadata",{scan_id:"ah_filters_01",items:[item]})).status,200);
 assert.deepEqual(ids(await q(e,"q=Recovered+Material&item_class=7")) ,["1005"]);
 assert.deepEqual(ids(await q(e,"q=Recovered+Material&item_class=7&max_unit_buyout=300")) ,["1005"]);
 assert.deepEqual((await get(e,"missing-metadata")).json.items,[]);
 assert.equal((await get(e,"summary")).json.items_with_metadata,7);
 await scan(e,"ah_filters_meta_next","2026-11-11",listings());
 const after=await q(e,"q=Recovered+Material");
 assert.equal(after.json.items[0].item_name,"Recovered Material");
 assert.equal(after.json.items[0].unit_buyout,300);
 assert.deepEqual((await get(e,"missing-metadata")).json.items,[]);
});
test("partial and failed scans do not create first-seen records",{skip},async()=>{
 const e=await fresh();const item=L(1003,{auction_id:90000});
 assert.equal((await post(e,"start",{scan_id:"ah_failed_meta",started_at:"2026-11-11T10:00:00.000Z",reported_total:1})).status,201);
 assert.equal((await post(e,"page",{scan_id:"ah_failed_meta",page:0,response_ms:1,items:[item]})).status,202);
 assert.equal((await post(e,"metadata",{scan_id:"ah_failed_meta",items:[{item_id:1003,item_name:"Linen Cloth"}]})).status,409);
 assert.equal((await post(e,"fail",{scan_id:"ah_failed_meta",reason:"fixture interruption"})).status,200);
 assert.equal(e.DB.sqlite.prepare("SELECT COUNT(*) n FROM ah_first_seen WHERE auction_id=90000").get().n,0);
 await scan(e,"ah_after_fail","2026-11-12",[item]);
 assert.equal((await q(e,"")).json.items[0].latest_listing_seen_at,"2026-11-12T10:30:00.000Z");
});

test("expiry diagnostics compare the same auction across two completed snapshots",{skip},async()=>{
 const e=env(),older=new Date(Date.now()-600000).toISOString(),newer=new Date().toISOString();
 const before=L(1003,{auction_id:100,time_left_ms:7200000,captured_at:older});
 const after={...before,time_left_ms:6600000,captured_at:newer};
 await scan(e,"ah_expiry_before","2026-11-10",[before]);
 await scan(e,"ah_expiry_after","2026-11-11",[after,L(1004,{auction_id:101,captured_at:newer})]);
 const r=await get(e,"expiry-diagnostics");
 assert.equal(r.status,200);assert.equal(r.json.sample_size,1);
 assert.equal(r.json.median_decrease_ms,600000);assert.ok(r.json.median_absolute_drift_ms<1000);
 assert.equal(r.json.within_2s,1);
});
test("elapsed countdowns sort last, in either direction",{skip},async()=>{
 const e=env(),at=new Date(Date.now()-3*HOUR).toISOString();
 await scan(e,"ah_time_sort_1","2026-11-10",[L(1003,{time_left_ms:HOUR,captured_at:at}),L(1004,{time_left_ms:4*HOUR,captured_at:at}),L(1006,{time_left_ms:null,captured_at:at})]);
 for(const dir of ["asc","desc"])assert.equal(ids(await q(e,"sort=time_left&dir="+dir))[0],"1004");
});

test("deployed Worker entry point routes metadata reads and authenticated writes", {skip}, async()=>{
 const e=await fresh();
 const {default:worker}=await import("../worker.mjs");
 const callWorker=(path,method="GET",body,auth=false)=>worker.fetch(new Request("https://octometrics.example/api/auction/"+path,{method,headers:{"content-type":"application/json",...(auth?{authorization:"Bearer "+e.AUCTION_PUSH_TOKEN}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}),e);
 const before=await callWorker("missing-metadata");
 assert.equal(before.status,200);
 assert.deepEqual((await before.json()).items,[{item_id:1005,listings:1}]);
 const payload={scan_id:"ah_filters_01",items:[{item_id:1005,item_name:"Recovered Material"}]};
 assert.equal((await callWorker("scan/metadata","POST",payload)).status,401);
 assert.equal((await callWorker("scan/metadata","POST",payload,true)).status,200);
 const after=await callWorker("missing-metadata");
 assert.equal(after.status,200);assert.deepEqual((await after.json()).items,[]);
 const items=await callWorker("items?q=Recovered+Material&sort=recent&dir=desc");
 assert.equal(items.status,200);assert.equal((await items.json()).items[0].item_name,"Recovered Material");
 assert.equal((await callWorker("expiry-diagnostics")).status,200);
});

test("historical count tracks unique completed auction IDs, never repeat listings or price changes", {skip}, async()=>{
 const e=env();
 const first=L(1001,{auction_id:81001}),second=L(1003,{auction_id:81002}),third=L(1004,{auction_id:81003});
 await scan(e,"ah_hist_first","2026-11-10",[first,second,third]);
 let s=(await get(e,"summary")).json;
 assert.equal(s.auction_count,3);assert.equal(s.total_historical_auctions,3);
 await scan(e,"ah_hist_second","2026-11-11",[{...first,buyout:999},second]);
 s=(await get(e,"summary")).json;
 assert.equal(s.auction_count,2);assert.equal(s.total_historical_auctions,3);
 const newer=L(1003,{auction_id:81004});
 await scan(e,"ah_hist_third","2026-11-12",[first,newer]);
 s=(await get(e,"summary")).json;
 assert.equal(s.auction_count,2);assert.equal(s.total_historical_auctions,4);
 const partial=L(1001,{auction_id:81005});
 assert.equal((await post(e,"start",{scan_id:"ah_hist_failed",started_at:"2026-11-13T10:00:00.000Z",reported_total:1})).status,201);
 assert.equal((await post(e,"page",{scan_id:"ah_hist_failed",page:0,response_ms:1,items:[partial]})).status,202);
 assert.equal((await get(e,"summary")).json.total_historical_auctions,4);
 assert.equal((await post(e,"fail",{scan_id:"ah_hist_failed",reason:"fixture"})).status,200);
 assert.equal((await get(e,"summary")).json.total_historical_auctions,4);
 const {readFileSync}=await import("node:fs");
 const migration=readFileSync(new URL("../migrations/0010_auction_historical_total.sql",import.meta.url),"utf8");
 e.DB.sqlite.exec("DROP TRIGGER ah_first_seen_count_insert; DROP TABLE ah_historical_total;");
 e.DB.sqlite.exec(migration);e.DB.sqlite.exec(migration);
 assert.equal((await get(e,"summary")).json.total_historical_auctions,4);
 await scan(e,"ah_hist_fourth","2026-11-14",[partial]);
 assert.equal((await get(e,"summary")).json.total_historical_auctions,5);
 assert.equal(e.DB.sqlite.prepare("SELECT COUNT(*) n FROM ah_first_seen").get().n,5);
});


test("early average uses distinct priced auction IDs, screens high outliers only with enough listings and keeps all live listings",{skip},async()=>{
 const e=env();n=0;
 const rows=Array.from({length:9},(_,i)=>L(1001,{auction_id:10000+i,buyout:i===8?2000:100}));
 const other=Array.from({length:4},(_,i)=>L(1002,{auction_id:20000+i,buyout:100}));
 await scan(e,"ah_price_01","2026-11-10",[...rows,...other]);
 let items=(await q(e,"sort=name")).json.items;
 let sword=items.find(i=>i.item_id===1001);assert.equal(sword.average_samples,9);assert.equal(sword.average_excluded,0);assert.equal(sword.historical_avg,(800+2000)/9);
 assert.equal(items.find(i=>i.item_id===1002).historical_avg,null);
 await scan(e,"ah_price_02","2026-11-11",[...rows,...other,L(1001,{auction_id:10009,buyout:100})]);
 items=(await q(e,"sort=market_pct")).json.items;sword=items.find(i=>i.item_id===1001);
 assert.equal(sword.average_source,"recent_listings");assert.equal(sword.average_samples,10);assert.equal(sword.average_excluded,1);assert.equal(sword.historical_avg,100);assert.equal(sword.market_pct,100);assert.equal(sword.listings,10);
 assert.equal(items.find(i=>i.item_id===1002).average_samples,4,"rescan is not an independent listing");
 const filtered=(await q(e,"max_unit_buyout=100&q=Iron+Sword")).json.items[0];assert.equal(filtered.historical_avg,100);assert.equal(filtered.listings,9);
});

test("the seller filter takes a GUID or part of a character name, and item listings page on the server",{skip},async()=>{
 const e=env();n=0;
 const many=[];for(let i=0;i<45;i++)many.push(L(1001,{variant:"0:0:0",buyout:1000+i*10,owner_guid:i<40?"5":"6"}));
 await scan(e,"ah_filters_paging","2026-11-11",many);
 assert.equal((await post(e,"seller-names",{scan_id:"ah_filters_paging",sellers:[{owner_guid:"5",character_name:"Bluebell"},{owner_guid:"6",character_name:"Moss"}]})).status,200);
 // Items list: GUID is exact; a name is partial and case-insensitive; anything else is rejected.
 assert.deepEqual(ids(await q(e,"owner=5")),["1001"]);
 assert.deepEqual(ids(await q(e,"owner=BLUE")),["1001"]);
 assert.deepEqual(ids(await q(e,"owner=ossy")),[]);
 assert.equal((await q(e,"owner=a_b")).status,400);
 assert.equal((await q(e,"owner=%25")).status,400);
 // Item listings: ?limit pages with a total; no ?limit keeps the earlier response shape.
 const legacy=(await get(e,"item/1001?variant=0:0:0")).json;
 assert.equal(legacy.listings.length,45);assert.equal(legacy.total,undefined);
 const first=(await get(e,"item/1001?variant=0:0:0&limit=20")).json;
 assert.equal(first.listings.length,20);assert.equal(first.total,45);assert.equal(first.has_more,true);assert.equal(first.offset,0);
 const second=(await get(e,"item/1001?variant=0:0:0&limit=20&offset=20")).json;
 assert.equal(second.listings.length,20);assert.equal(second.has_more,true);
 const last=(await get(e,"item/1001?variant=0:0:0&limit=20&offset=40")).json;
 assert.equal(last.listings.length,5);assert.equal(last.has_more,false);
 const all=[...first.listings,...second.listings,...last.listings].map(l=>l.auction_id);
 assert.equal(new Set(all).size,45,"no listing repeats across pages");
 assert.deepEqual(all,legacy.listings.map(l=>l.auction_id),"pages follow the same price order");
 const moss=(await get(e,"item/1001?variant=0:0:0&limit=20&owner=moss")).json;
 assert.equal(moss.total,5);assert.equal(moss.listings.length,5);assert.equal(moss.has_more,false);
 assert.equal((await get(e,"item/1001?variant=0:0:0&limit=20&owner=5")).json.total,40);
 assert.equal((await get(e,"item/1001?variant=0:0:0&owner=a1")).status,400);
});
