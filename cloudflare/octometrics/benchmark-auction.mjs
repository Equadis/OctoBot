import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {gzipSync} from 'node:zlib';
import {auctionRoute} from './auction.mjs';
import {buildItemsQuery} from './auction-query.mjs';
import {d1} from './tests/auction-sqlite.mjs';

const size=Number(process.argv[2]??30000);
if(!Number.isSafeInteger(size)||size<50||size>60000)throw Error('Listing count must be between 50 and 60,000');
const slot=Date.parse('2026-11-20T12:00:00Z'), hour=3600000;
const iso=ms=>new Date(ms).toISOString();
const metadata={}, rows=[];
for(let i=0;i<size;i++){
 // Half the listings belong to 80 heavily traded items. The remainder
 // cover thousands of items with sparse, variant-specific observations.
 const item_id=i%2?1+i%80:81+(i*37)%10127;
 const variant=i%11===0?'0:12:0':'0:0:0';
 metadata[item_id]={item_name:'Bench item '+item_id,quality:item_id%7,req_level:item_id%61,
  class_id:item_id%15,icon_url:'https://example.com/icon/'+item_id+'.png'};
 const quantity=1+i%20, buyout=i%13===0?0:quantity*(1+((i*811)%90000));
 rows.push({auction_id:i+1,item_id,variant,quantity,start_bid:buyout||100,current_bid:i%23===0?500:0,
  min_next_bid:100,buyout,owner_guid:String(1+i%4700),time_left_ms:3600000+(i%59)*60000,captured_at:iso(slot+2000)});
}

const legacy=d1();
const db=legacy.sqlite;
const previousCount='SELECT COUNT(*) AS c FROM ah_listings WHERE scan_id=?';
const insert=db.prepare('INSERT INTO ah_listings (scan_id,auction_id,page,item_id,variant,quantity,buyout,start_bid,current_bid,min_next_bid,owner_guid,captured_at,quality,item_name,class_id,req_level,icon_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
const seen=db.prepare('INSERT INTO ah_first_seen VALUES (?,?)');
const point=db.prepare('INSERT INTO ah_item_points VALUES (?,?,?,?,?,?,?,?)');
const daily=db.prepare('INSERT INTO ah_daily VALUES (?,?,?,?,?,?,?)');
const counts=new Map();
for(const row of rows){
 const key=row.item_id+':'+row.variant;
 if(!counts.has(key))counts.set(key,[]);
 counts.get(key).push(row);
}
db.exec('BEGIN');
for(let s=0;s<3;s++){
 const id='ahl_legacy_'+s, at=iso(slot-(2-s)*hour+3000);
 db.prepare("INSERT INTO ah_scans(scan_id,realm,status,started_at,completed_at,auction_count) VALUES (?,?,'complete',?,?,?)")
  .run(id,"N'Zoth",at,at,size);
 for(const row of rows){
  const m=metadata[row.item_id];
  insert.run(id,row.auction_id,Math.floor((row.auction_id-1)/50),row.item_id,row.variant,row.quantity,row.buyout,row.start_bid,row.current_bid,row.min_next_bid,row.owner_guid,
   at,m.quality,m.item_name,m.class_id,m.req_level,m.icon_url);
  if(s===0)seen.run(row.auction_id,at);
 }
 for(const list of counts.values()){
  const priced=list.filter(row=>row.buyout>0).sort((a,b)=>a.buyout/a.quantity-b.buyout/b.quantity);
  const cheapest=priced[0]??list[0], unit=cheapest.buyout>0?cheapest.buyout/cheapest.quantity:null;
  const quantity=list.reduce((sum,row)=>sum+row.quantity,0);
  point.run(id,cheapest.item_id,cheapest.variant,cheapest.auction_id,unit,quantity,list.length,at);
  if(s===0&&unit!=null)for(let t=1;t<=14;t++){
   daily.run(cheapest.item_id,cheapest.variant,iso(slot-t*86400000).slice(0,10),unit,quantity,list.length,id);
  }
 }
}
db.exec('COMMIT');
function timed(task){
 const start=performance.now(),cpu=process.cpuUsage();
 return Promise.resolve(task()).then(result=>{
  const used=process.cpuUsage(cpu);
  return {result,wall_ms:Math.round(performance.now()-start),cpu_ms:Math.round((used.user+used.system)/1000)};
 });
}
async function sql(params){
 const query=buildItemsQuery(new URLSearchParams(params),{scan_id:'ahl_legacy_2',completed_at:iso(slot+3000)},'ahl_legacy_1');
 const args=[...query.binds,query.limit,query.offset];
 const plan=db.prepare('EXPLAIN QUERY PLAN '+query.pageSql).all(...args).map(row=>row.detail);
 const measured=await timed(()=>db.prepare(query.pageSql).all(...args));
 return {wall_ms:measured.wall_ms,cpu_ms:measured.cpu_ms,result_count:measured.result[0]?.total_rows??0,
  representative_plan:plan.filter(line=>/ah_|recent_prices|history|TEMP B-TREE/.test(line))};
}
const beforeOrdinary=await sql('q=bench&limit=50');
const beforeFiltered=await sql('q=bench&quality=3&owner=153&sort=market_pct&limit=50');

class Bucket {
 data=new Map();
 reads=0;
 writes=0;
 async get(key){
  this.reads++;
  const match=this.data.get(key);
  return match?{...match,body:new Response(match.bytes).body}:null;
 }
 async put(key,raw,{onlyIf,httpMetadata}={}){
  const before=this.data.get(key);
  if(onlyIf?.get?.('If-None-Match')==='*'&&before)return null;
  if(onlyIf?.etagMatches&&onlyIf.etagMatches!==before?.etag)return null;
  this.writes++;
  const bytes=typeof raw==='string'?new TextEncoder().encode(raw):raw;
  const value={bytes,etag:createHash('md5').update(bytes).digest('hex'),httpMetadata};
  this.data.set(key,value);
  return value;
 }
 async delete(keys){for(const key of keys)this.data.delete(key);}
}
const bucket=new Bucket();
let now=slot;
const env={AUCTION_SNAPSHOT_MODE:'true',AUCTION_SNAPSHOTS:bucket,AUCTION_PUSH_TOKEN:'bench',
 AUCTION_ALLOW_EMPTY_HISTORY:'true',AUCTION_BUDGET_REQUIRED:'false',AUCTION_CLOCK:()=>now,
 DB:{prepare(){throw Error('Snapshot touched D1');}}};
const url='https://octometrics.example/api/auction/';
async function call(path,body){
 const compressed=path.startsWith('scan/complete?');
 const headers={authorization:'Bearer bench',...(compressed?{'content-encoding':'gzip'}:{})};
 const request=new Request(url+path,body?{method:'POST',headers,body:compressed?body:JSON.stringify(body)}:{headers});
 const response=await auctionRoute(request,env);
 if(!response.ok)throw Error(path+': '+response.status+' '+await response.text());
 return response;
}
async function publish(s,realm){
 const scan_id='ahl_benchmark_fixture_'+s, suffix='?realm='+encodeURIComponent(realm);
 now=slot+s*hour;
 await call('scan/claim'+suffix,{scan_id,slot:now});
 const scan=rows.map(row=>({...row,buyout:row.auction_id%9===0?row.buyout+s:row.buyout,captured_at:iso(now+2000)}));
 const started_at=iso(now),completed_at=iso(now+3000);
 now+=4000;
 const body={scan_id,started_at,completed_at,expected_pages:Math.ceil(size/50),traversed:size,reported_total:size,
  final_total:size,final_page_count:size%50||50,items:scan,metadata};
 const compressed=gzipSync(JSON.stringify(body));
 const reads=bucket.reads,writes=bucket.writes;
 const measured=await timed(async()=>await (await call('scan/complete'+suffix,compressed)).json());
 return {wall_ms:measured.wall_ms,cpu_ms:measured.cpu_ms,reads:bucket.reads-reads,writes:bucket.writes-writes};
}
await publish(0,"N'Zoth");
await publish(0,"Y'Shaarj");
const second=await publish(1,"N'Zoth");
await publish(1,"Y'Shaarj");
const third=await publish(2,"N'Zoth");
await publish(2,"Y'Shaarj");
await publish(3,"N'Zoth");
await publish(3,"Y'Shaarj");
async function get(path){
 const reads=bucket.reads;
 const measured=await timed(async()=>await (await call(path)).json());
 return {wall_ms:measured.wall_ms,cpu_ms:measured.cpu_ms,reads:bucket.reads-reads,result_count:measured.result.total};
}
const afterOrdinary=await get('items?q=bench&limit=50');
const afterFiltered=await get('items?q=bench&quality=3&owner=153&sort=market_pct&limit=50');
const bytes=[...bucket.data.values()].reduce((sum,value)=>sum+value.bytes.byteLength,0);
const compressedCatalogue=(await call('catalogue')).headers.get('content-encoding')==='gzip'?
 (await (await call('catalogue')).arrayBuffer()).byteLength:null;
const print={
 fixture:{rows_per_scan:size,distinct_variants:counts.size,legacy_snapshots:3,days:14},
 legacy:{candidate_history_observations:db.prepare(previousCount).get('ahl_legacy_0').c*3,
  minimum_listing_inserts_per_scan:size,ordinary:beforeOrdinary,filtered:beforeFiltered},
 snapshots:{d1_rows_read:0,d1_rows_written:0,second,third,ordinary:afterOrdinary,filtered:afterFiltered,
  two_realm_retained_bytes:bytes,compressed_catalogue_bytes:compressedCatalogue}
};
console.log(JSON.stringify(print,null,2));
db.close();
