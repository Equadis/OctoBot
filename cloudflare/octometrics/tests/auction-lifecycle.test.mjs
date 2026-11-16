// SYNTHETIC TEST FIXTURES ONLY. Every listing below is invented; none is real OctoWoW data.
// Runs the real Worker (auctionRoute) against a real SQLite database built from the real migration,
// through a minimal D1-compatible adapter. Proves SQL/logic, NOT real-server protocol compatibility.
import {test} from "node:test";
import assert from "node:assert/strict";
import {auctionRoute,auctionCleanup} from "../auction.mjs";

import {skip,post,get,env} from "./auction-sqlite.mjs";
/** listing(n): auction n, items 100..104 cycling; buyout in copper, per-unit = buyout/quantity. */
function listing(n,over={}){
 return {auction_id:n,item_id:100+(n%5),variant:"0:0:0",quantity:1,item_name:null,quality:null,icon_url:null,
  start_bid:50,current_bid:0,min_next_bid:50,buyout:1000,owner_guid:"1",time_left_ms:3600000,
  captured_at:"2026-11-01T00:00:00.000Z",...over};
}
async function runScan(env,{id,day,listings,failBefore=false,started=day+"T10:00:00.000Z"}){
 const done=day+"T10:30:00.000Z";
 assert.equal((await post(env,"start",{scan_id:id,started_at:started,reported_total:listings.length})).status,201);
 const pages=Math.max(1,Math.ceil(listings.length/50));
 for(let p=0;p<pages;p++){
  const r=await post(env,"page",{scan_id:id,page:p,response_ms:100,items:listings.slice(p*50,p*50+50)});
  assert.equal(r.status,202);
 }
 if(failBefore)return null;
 return post(env,"complete",{scan_id:id,completed_at:done,expected_pages:pages,reported_total:listings.length});
}

test("empty database serves NO DATA, never fabricated rows",{skip},async()=>{
 const e=env();
 const s=(await get(e,"summary")).json;
 assert.equal(s.completed_at,null);assert.equal(s.auction_count,null);assert.equal(s.collector_status,"OFFLINE");
 assert.deepEqual((await get(e,"items")).json.items,[]);
});

test("interrupted scan is never public; previous snapshot stays live",{skip},async()=>{
 const e=env();
 const base=Array.from({length:120},(_,i)=>listing(i+1));
 assert.equal((await runScan(e,{id:"ah_good_0001",day:"2026-11-01",listings:base})).status,201);
 const before=(await get(e,"items?limit=100")).json;
 // Interrupted scan: pages uploaded, never completed.
 await runScan(e,{id:"ah_interrupted1",day:"2026-11-02",started:new Date().toISOString(),listings:base.map(l=>({...l,buyout:1})),failBefore:true});
 assert.equal((await get(e,"scan-status")).json.scanning,true);
 const during=(await get(e,"items?limit=100")).json;
 assert.deepEqual(during.items,before.items);
 assert.equal(during.scan_id,"ah_good_0001");
 // A second concurrent start is rejected.
 assert.equal((await post(e,"start",{scan_id:"ah_second_0001",started_at:"2026-11-02T11:00:00.000Z",reported_total:1})).status,409);
 // Failure is recorded and idempotent; data stays private.
 assert.equal((await post(e,"fail",{scan_id:"ah_interrupted1",reason:"socket closed"})).status,200);
 assert.equal((await post(e,"fail",{scan_id:"ah_interrupted1",reason:"socket closed"})).json.duplicate,true);
 assert.equal((await get(e,"summary")).json.completed_at,"2026-11-01T10:30:00.000Z");
 assert.equal(e.DB.sqlite.prepare("SELECT status FROM ah_scans WHERE scan_id='ah_interrupted1'").get().status,"failed");
});

test("malformed, duplicate, retried and out-of-range pages",{skip},async()=>{
 const e=env(),all=Array.from({length:120},(_,i)=>listing(i+1));
 await post(e,"start",{scan_id:"ah_pages_0001",started_at:"2026-11-01T10:00:00.000Z",reported_total:120});
 const page=(p,items)=>post(e,"page",{scan_id:"ah_pages_0001",page:p,response_ms:1,items});
 assert.equal((await page(0,all.slice(0,49))).status,409,"short middle page");
 assert.equal((await page(3,[])).status,409,"page beyond range");
 assert.equal((await page(0,[...all.slice(0,49),listing(1)])).status,400,"duplicate id within page");
 assert.equal((await page(0,[...all.slice(0,49),listing(0)])).status,400,"invalid auction id");
 assert.equal((await page(0,all.slice(0,50))).status,202);
 // Lost HTTP response: identical retry must be harmless.
 assert.equal((await page(0,all.slice(0,50))).status,202);
 assert.equal(e.DB.sqlite.prepare("SELECT COUNT(*) n FROM ah_listings").get().n,50);
 // Auction ID repeated on a different page violates the primary key: nothing from that page persists.
 assert.notEqual((await page(1,[...all.slice(0,1),...all.slice(51,100)])).status,202);
 assert.equal(e.DB.sqlite.prepare("SELECT COUNT(*) n FROM ah_listings").get().n,50);
 assert.equal((await post(e,"complete",{scan_id:"ah_pages_0001",completed_at:"2026-11-01T10:30:00.000Z",expected_pages:3,reported_total:120})).status,409,"missing pages");
 await page(1,all.slice(50,100));
 // Completion that disagrees with the header is rejected.
 assert.equal((await post(e,"complete",{scan_id:"ah_pages_0001",completed_at:"2026-11-01T10:30:00.000Z",expected_pages:3,reported_total:121})).status,409);
 await page(2,all.slice(100,120));
 const done={scan_id:"ah_pages_0001",completed_at:"2026-11-01T10:30:00.000Z",expected_pages:3,reported_total:120};
 assert.equal((await post(e,"complete",done)).status,201);
 assert.equal((await post(e,"complete",done)).json.duplicate,true,"lost completion response retried");
 assert.equal((await post(e,"page",{scan_id:"ah_pages_0001",page:0,response_ms:1,items:all.slice(0,50)})).status,409,"no writes after completion");
});

test("scan header reuse, unauthorised calls and stale uploads",{skip},async()=>{
 const e=env();
 const hdr={scan_id:"ah_stale_0001",started_at:"2020-01-01T00:00:00.000Z",reported_total:5};
 assert.equal((await post(e,"start",hdr)).status,201);
 assert.equal((await post(e,"start",hdr)).json.duplicate,true);
 assert.equal((await post(e,"start",{...hdr,reported_total:6})).status,409);
 // The ancient upload is abandoned, not allowed to block collection forever.
 assert.equal((await post(e,"start",{scan_id:"ah_fresh_0001",started_at:new Date().toISOString(),reported_total:0})).status,201);
 assert.equal(e.DB.sqlite.prepare("SELECT status FROM ah_scans WHERE scan_id='ah_stale_0001'").get().status,"failed");
 const res=await auctionRoute(new Request("https://octometrics.example/api/auction/scan/start",{method:"POST",headers:{authorization:"Bearer wrong"},body:"{}"}),e);
 assert.equal(res.status,401);
});

test("empty scan completes and publishes zero items",{skip},async()=>{
 const e=env();
 assert.equal((await runScan(e,{id:"ah_empty_0001",day:"2026-11-01",listings:[]})).status,201);
 const s=(await get(e,"summary")).json;
 assert.equal(s.auction_count,0);assert.equal(s.item_count,0);
 assert.deepEqual((await get(e,"items")).json.items,[]);
});

test("summary, search, quality, sort, pagination and detail",{skip},async()=>{
 const e=env();
 const items=Array.from({length:120},(_,i)=>listing(i+1,{
  item_name:(100+((i+1)%5))===100?"Copper Bar":"Item "+(100+((i+1)%5)),quality:(i+1)%5===0?3:1,
  icon_url:"https://wow.zamimg.com/images/wow/icons/large/inv_misc_gem_01.jpg"}));
 assert.equal((await runScan(e,{id:"ah_browse_0001",day:"2026-11-01",listings:items})).status,201);
 const s=(await get(e,"summary")).json;
 assert.equal(s.auction_count,120);assert.equal(s.item_count,5);assert.equal(s.scan_duration_ms,1800000);
 let r=(await get(e,"items?limit=2&offset=0&sort=name")).json;
 assert.equal(r.total,5);assert.equal(r.items.length,2);assert.equal(r.has_more,true);
 r=(await get(e,"items?limit=2&offset=4&sort=name")).json;
 assert.equal(r.items.length,1);assert.equal(r.has_more,false);
 assert.equal((await get(e,"items?q=copper")).json.total,1);
 assert.equal((await get(e,"items?q=102")).json.total,1,"item-id search");
 assert.equal((await get(e,"items?q=nothing-here")).json.total,0);
 assert.equal((await get(e,"items?quality=3")).json.total,1);
 assert.equal((await get(e,"items?quality=9")).status,400);
 assert.equal((await get(e,"items?sort=bogus")).status,400);
 for(const sort of ["name","unit_buyout","historical_avg","quantity","trend_pct","market_pct"])
  assert.equal((await get(e,"items?sort="+sort)).status,200,sort);
 const d=(await get(e,"item/100?variant=0:0:0")).json;
 assert.equal(d.listings.length,24);
 assert.equal((await get(e,"item/0")).status,400);
});

test("missing metadata is shown as null, never guessed",{skip},async()=>{
 const e=env();
 await runScan(e,{id:"ah_nometa_001",day:"2026-11-01",listings:[listing(1),listing(2)]});
 const it=(await get(e,"items")).json.items[0];
 assert.equal(it.item_name,null);assert.equal(it.quality,null);assert.equal(it.icon_url,null);
});

test("movement, no-buyout handling, four-day history and market %",{skip},async()=>{
 const e=env();
 // One item (id 101) per scan. Daily lowest unit buyout: 1000,1000,1000,1000 then 2500 today.
 const mk=(unit,extra=[])=>[listing(1,{item_id:101,quantity:10,buyout:unit*10}),
   listing(2,{item_id:101,quantity:1,buyout:null}),   // no-buyout: must not set the price
   listing(3,{item_id:101,quantity:1,buyout:0}),      // zero buyout: must not set the price
   listing(4,{item_id:101,quantity:1,buyout:unit*5}),...extra];
 const days=["2026-11-01","2026-11-02","2026-11-03","2026-11-04"];
 for(const [i,d] of days.entries()){
  assert.equal((await runScan(e,{id:"ah_hist_000"+i,day:d,listings:mk(1000)})).status,201);
  const it=(await get(e,"items")).json.items[0];
  assert.equal(it.unit_buyout,1000);
  assert.equal(it.market_pct,null,"fewer than 4 prior days: no fabricated average (day "+(i+1)+")");
  assert.equal(it.historical_avg,null);
 }
 assert.equal((await get(e,"summary")).json.historical_days,4);
 // Fifth scan, new price 2500: +150% vs previous snapshot, 250% of the 4-day mean.
 assert.equal((await runScan(e,{id:"ah_hist_0005",day:"2026-11-05",listings:mk(2500)})).status,201);
 let it=(await get(e,"items")).json.items[0];
 assert.equal(it.unit_buyout,2500);assert.equal(it.historical_avg,1000);
 assert.equal(it.market_pct,250);assert.equal(it.trend_pct,150);assert.equal(it.previous_unit,1000);
 assert.equal(it.stack_buyout,25000,"cheapest listing is the buyout one");
 // Detail view: buyout listings first by unit price; no-buyout and zero-buyout listings last.
 const det=(await get(e,"item/101?variant=0:0:0")).json.listings.map(l=>l.unit_buyout);
 assert.deepEqual(det,[2500,12500,null,null]);
 const hist=(await get(e,"history/101?variant=0:0:0")).json.history;
 assert.deepEqual(hist.map(h=>h.representative_unit),[2500,1000,1000,1000,1000]);
 // Second scan on the SAME day keeps the lowest representative price.
 assert.equal((await runScan(e,{id:"ah_hist_0006",day:"2026-11-05",listings:mk(500)})).status,201);
 assert.equal((await get(e,"history/101?variant=0:0:0")).json.history[0].representative_unit,500);
 // Cleanup retains only the three latest complete scans but keeps compact daily history.
 await auctionCleanup(e);
 assert.equal(e.DB.sqlite.prepare("SELECT COUNT(*) n FROM ah_scans WHERE status='complete'").get().n,3);
 assert.equal((await get(e,"history/101?variant=0:0:0")).json.history.length,5);
});

test("variants are priced separately",{skip},async()=>{
 const e=env();
 await runScan(e,{id:"ah_variant_01",day:"2026-11-01",listings:[
  listing(1,{item_id:200,variant:"0:11:5",buyout:100}),listing(2,{item_id:200,variant:"0:12:5",buyout:900})]});
 const r=(await get(e,"items")).json;
 assert.equal(r.total,2);
 assert.deepEqual(r.items.map(i=>i.unit_buyout).sort((a,b)=>a-b),[100,900]);
});

test("search wildcards are treated literally",{skip},async()=>{
 const e=env();
 await runScan(e,{id:"ah_wild_00001",day:"2026-11-01",listings:[listing(1,{item_name:"Plain Bar"}),listing(2,{item_id:300,item_name:"100% Pure"})]});
 assert.equal((await get(e,"items?q=%25")).json.total,1);
 assert.equal((await get(e,"items?q=_")).json.total,0);
});

test("a full-size scan uploads, publishes and queries within sane limits",{skip},async()=>{
 const e=env();
 const n=20000; // synthetic stress size, 400 pages
 const items=Array.from({length:n},(_,i)=>listing(i+1,{item_id:1000+(i%6000),buyout:100+(i%977)}));
 const t0=performance.now();
 assert.equal((await runScan(e,{id:"ah_big_000001",day:"2026-11-01",listings:items})).status,201);
 const t1=performance.now();
 const r=await get(e,"items?limit=100&sort=market_pct");
 const t2=performance.now();
 assert.equal(r.json.total,6000);
 console.log(`# synthetic ${n} listings: upload+finalise ${(t1-t0).toFixed(0)}ms; list query ${(t2-t1).toFixed(0)}ms; `+
  `rows written ≈ ${n} listings + ${6000} points + ${6000} daily`);
 assert.ok(t2-t1<5000);
});
