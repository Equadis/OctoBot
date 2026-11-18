// Shared test harness: a D1-compatible adapter over node:sqlite, built from the real migrations. SYNTHETIC DATA ONLY.
import {readFileSync} from "node:fs";
import {auctionRoute} from "../auction.mjs";
export let DatabaseSync=null;
try{({DatabaseSync}=await import("node:sqlite"));}catch{/* Node < 22.5 */}
export const skip=DatabaseSync?false:"node:sqlite unavailable (needs Node >= 22.5)";
export const token="lifecycle-test-only-token";

export function d1(){
 const sqlite=new DatabaseSync(":memory:");
 for(const file of ["0002_auction.sql","0003_auction_item_metadata.sql","0004_auction_first_seen.sql","0005_auction_metadata_recovery.sql","0010_auction_historical_total.sql","0011_pvp_auction.sql","0012_auction_seller_names.sql"])
  sqlite.exec(readFileSync(new URL("../migrations/"+file,import.meta.url),"utf8"));
 const stmt=sql=>{
  let args=[];
  const s={
   bind(...a){args=a;return s;},
   async first(){return sqlite.prepare(sql).get(...args)??null;},
   async all(){return {results:sqlite.prepare(sql).all(...args)};},
   async run(){sqlite.prepare(sql).run(...args);return {success:true};},
   _run(){return sqlite.prepare(sql).run(...args);}
  };
  return s;
 };
 return {sqlite,prepare:stmt,async batch(ops){
  sqlite.exec("BEGIN");
  try{for(const o of ops)o._run();sqlite.exec("COMMIT");}
  catch(e){sqlite.exec("ROLLBACK");throw e;}
  return ops.map(()=>({success:true}));
 }};
}
export const call=async(env,method,path,body)=>{
 const res=await auctionRoute(new Request("https://octometrics.example"+path,{method,
  headers:{authorization:"Bearer "+token,"content-type":"application/json"},
  body:body===undefined?undefined:JSON.stringify(body)}),env);
 return {status:res.status,json:await res.json()};
};
export const post=(env,action,body)=>call(env,"POST","/api/auction/scan/"+action,body);
export const get=(env,path)=>call(env,"GET","/api/auction/"+path);


export const env=()=>({DB:d1(),AUCTION_PUSH_TOKEN:token});
