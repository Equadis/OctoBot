import {test} from "node:test";
import assert from "node:assert/strict";
import {auctionRoute,expectedPageLength} from "../auction.mjs";
const token="auction-test-only-token",id="ah_integrity123";
function post(action,body){return new Request("https://octometrics.example/api/auction/scan/"+action,{
 method:"POST",headers:{authorization:"Bearer "+token,"content-type":"application/json"},
 body:JSON.stringify({scan_id:id,...body})
});}
function fakeDb(scan,options={}){
 const calls=[],batches=[];let current={...scan};const boundCalls=new WeakMap();
 const db={
  prepare(sql){
   const call={sql,args:[]};calls.push(call);
   const bound={
    bind(...args){call.args=args;return bound;},
    async first(){
     if(sql.includes("FROM ah_scans WHERE scan_id=?"))return current;
     if(sql.includes("FROM ah_pages WHERE scan_id=?"))return options.pages||null;
     if(sql.includes("COUNT(DISTINCT auction_id)"))return options.listings||null;
     return null;
    },
    async run(){return {success:true};}
   };
   boundCalls.set(bound,call);return bound;
  },
  async batch(ops){batches.push(ops);for(const op of ops){const call=boundCalls.get(op);if(call?.sql.startsWith("UPDATE ah_scans SET status='complete'")&&current.status==='uploading'){const [completed_at,expected_pages,reported_total,page_count,auction_count,duration_ms]=call.args;current={...current,status:'complete',completed_at,expected_pages,reported_total,page_count,auction_count,duration_ms};}}return ops.map(()=>({success:true}));}
 };
 return {db,calls,batches};
}
test("strict page size requires a full middle page and allows a zero-auction scan",()=>{
 assert.equal(expectedPageLength(51,0),50);
 assert.equal(expectedPageLength(51,1),1);
 assert.equal(expectedPageLength(51,2),null);
 assert.equal(expectedPageLength(0,0),0);
 assert.equal(expectedPageLength(0,1),null);
 assert.equal(expectedPageLength(-1,0),null);
});
test("duplicate start can only resume the same uploading scan, not replace its header",async()=>{
 const started_at="2026-11-16T12:00:00Z";
 const {db,calls}=fakeDb({status:"uploading",started_at,reported_total:51});
 const ok=await auctionRoute(post("start",{started_at,reported_total:51}),{DB:db,AUCTION_PUSH_TOKEN:token});
 assert.equal(ok.status,200);assert.equal((await ok.json()).duplicate,true);
 const bad=await auctionRoute(post("start",{started_at,reported_total:52}),{DB:db,AUCTION_PUSH_TOKEN:token});
 assert.equal(bad.status,409);
 assert.equal(calls.filter(call=>call.sql.startsWith("INSERT")).length,0);
});
test("partial, excess and out-of-range pages never enter the atomic write batch",async()=>{
 const {db,batches}=fakeDb({status:"uploading",reported_total:51});
 for(const [page,items] of [[0,[]],[1,[]],[2,[]]]){
  const res=await auctionRoute(post("page",{page,response_ms:10,items}),{DB:db,AUCTION_PUSH_TOKEN:token});
  assert.equal(res.status,409);
 }
 assert.equal(batches.length,0);
});
test("completion cannot rewrite the original server total or page count",async()=>{
 const {db,batches}=fakeDb({status:"uploading",started_at:"2026-11-16T12:00:00Z",reported_total:51});
 const base={expected_pages:2,reported_total:51,completed_at:"2026-11-16T12:05:00Z"};
 for(const change of [{reported_total:52},{expected_pages:3},{completed_at:"2026-11-16T11:00:00Z"}]){
  const res=await auctionRoute(post("complete",{...base,...change}),{DB:db,AUCTION_PUSH_TOKEN:token});
  assert.equal(res.status,409);
 }
 assert.equal(batches.length,0);
});
test("finalisation rejects missing rows and only publishes a counted full scan",async()=>{
 const scan={status:"uploading",started_at:"2026-11-16T12:00:00Z",reported_total:51};
 const complete={expected_pages:2,reported_total:51,completed_at:"2026-11-16T12:05:00Z"};
 const incomplete=fakeDb(scan,{pages:{n:2,first_page:0,last_page:1,rows:50},listings:{n:50,distinct_auctions:50}});
 const refused=await auctionRoute(post("complete",complete),{DB:incomplete.db,AUCTION_PUSH_TOKEN:token});
 assert.equal(refused.status,409);assert.equal(incomplete.batches.length,0);
 const full=fakeDb(scan,{pages:{n:2,first_page:0,last_page:1,rows:51},listings:{n:51,distinct_auctions:51}});
 const accepted=await auctionRoute(post("complete",complete),{DB:full.db,AUCTION_PUSH_TOKEN:token});
 assert.equal(accepted.status,201);assert.equal(full.batches.length,1);
 const insert=full.calls.find(call=>call.sql.includes("INSERT INTO ah_item_points"));
 assert.match(insert.sql,/CASE WHEN l2\.buyout>0 THEN 0 ELSE 1 END/);
 assert.equal(full.calls.filter(call=>call.sql.startsWith("UPDATE ah_scans SET status='complete'")).length,1);
});
test("lost completion acknowledgment is safe to retry, but completed pages are immutable",async()=>{
 const {db,batches}=fakeDb({status:"complete",started_at:"2026-11-16T12:00:00Z",
  completed_at:"2026-11-16T12:05:00Z",reported_total:0,expected_pages:1,auction_count:0,duration_ms:300000});
 const completed=await auctionRoute(post("complete",{completed_at:"2026-11-16T12:05:00Z",reported_total:0,expected_pages:1}),{DB:db,AUCTION_PUSH_TOKEN:token});
 assert.equal(completed.status,200);assert.equal((await completed.json()).duplicate,true);
 const latePage=await auctionRoute(post("page",{page:0,response_ms:1,items:[]}),{DB:db,AUCTION_PUSH_TOKEN:token});
 assert.equal(latePage.status,409);assert.equal(batches.length,0);
});
