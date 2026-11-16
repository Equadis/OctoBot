import {test} from "node:test";
import assert from "node:assert/strict";
import {auctionRoute} from "../auction.mjs";

function request(path,method="GET",body=null,token=null){
 return new Request("https://octometrics.example"+path,{
  method,headers:{...(token?{authorization:"Bearer "+token}:{}),...(body?{"Content-Type":"application/json"}:{})},
  ...(body?{body:JSON.stringify(body)}:{})
 });
}
test("auction reads are no-data until a verified full scan exists",async()=>{
 const fake={prepare:()=>({bind:()=>({first:async()=>null})})};
 for(const path of ["/api/auction/summary","/api/auction/items","/api/auction/scan-status"]){
  const response=await auctionRoute(request(path),{DB:fake});
  assert.equal(response.status,200);
  const json=await response.json();
  if(path.endsWith("/summary"))assert.equal(json.completed_at,null);
  if(path.endsWith("/items"))assert.deepEqual(json.items,[]);
 }
});
test("unauthenticated writes cannot mutate Auction House data",async()=>{
 let accessed=false;
 const db={prepare:()=>{accessed=true;throw Error("Must not query DB")}};
 const input={scan_id:"ah_abcdef12",started_at:"2026-11-16T00:00:00Z",reported_total:1};
 const badToken=await auctionRoute(request("/api/auction/scan/start","POST",input,"wrong"),{DB:db,AUCTION_PUSH_TOKEN:"correct"});
 assert.equal(badToken.status,401);assert.equal(accessed,false);
 const noToken=await auctionRoute(request("/api/auction/scan/start","POST",input),{DB:db,AUCTION_PUSH_TOKEN:"correct"});
 assert.equal(noToken.status,401);assert.equal(accessed,false);
});
test("unconfigured ingestion refuses writes even with a bearer",async()=>{
 const response=await auctionRoute(request("/api/auction/scan/start","POST",{scan_id:"ah_abcdef12"},"x"),{DB:{}});
 assert.equal(response.status,503);
});
test("unrelated OctoMetrics paths are not intercepted by auction routes",async()=>{
 assert.equal(await auctionRoute(request("/api/summary"),{DB:{}}),null);
});
