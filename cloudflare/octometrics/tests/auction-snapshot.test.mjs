import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync,gzipSync} from 'node:zlib';
import {auctionRoute} from '../auction.mjs';
import {marketBaseline} from '../auction-snapshot-data.mjs';
import {prefix} from '../auction-r2.mjs';

class Bucket {
 objects=new Map();
 version=0;
 writes=0;
 reads=0;
 failKey=null;
 async get(key){
  this.reads++;
  const value=this.objects.get(key);
  return value?{...value,body:new Response(value.bytes).body}:null;
 }
 async head(key){return this.objects.get(key)??null;}
 async put(key,raw,{onlyIf,httpMetadata}={}){
  if(this.failKey?.(key))throw new Error('simulated object failure');
  const bytes=typeof raw==='string'?new TextEncoder().encode(raw):raw;
  const current=this.objects.get(key);
  if(onlyIf?.get?.('If-None-Match')==='*'&&current)return null;
  if(onlyIf?.etagMatches&&onlyIf.etagMatches!==current?.etag)return null;
  this.writes++;
  const etag=createHash('md5').update(bytes).digest('hex');
  const value={etag,bytes,size:bytes.length,httpMetadata};
  this.objects.set(key,value);
  return value;
 }
 async delete(keys){for(const key of keys)this.objects.delete(key);}
}

const hour=3600000, now0=Date.parse('2026-11-20T12:00:00Z');
const iso=value=>new Date(value).toISOString();
const nz="N'Zoth", pvp="Y'Shaarj";
const first='ahl_test_fixture_1', second='ahl_test_fixture_2';
function fixtures(){
 const bucket=new Bucket();
 let now=now0;
 const env={
  AUCTION_SNAPSHOT_MODE:'true',AUCTION_SNAPSHOTS:bucket,AUCTION_PUSH_TOKEN:'internal',
  AUCTION_ADMIN_TOKEN:'admin',AUCTION_ALLOW_EMPTY_HISTORY:'true',AUCTION_BUDGET_REQUIRED:'false',AUCTION_CLOCK:()=>now,
  DB:{prepare(){assert.fail('Snapshot route must not query D1');}}
 };
 const go=(path,{body,realm=nz,token='internal',headers={},compressed=false}={})=>{
  const url=new URL('https://octometrics.example/api/auction/'+path);
  url.searchParams.set('realm',realm);
  const request=new Request(url,{
   ...(body?{method:'POST',body:compressed?gzipSync(JSON.stringify(body)):JSON.stringify(body)}:{}),
   headers:{...(token?{authorization:'Bearer '+token}:{}),...(compressed?{'content-encoding':'gzip'}:{}),...headers}
  });
  return auctionRoute(request,env);
 };
 const claim=(id,slot=now0,realm=nz)=>go('scan/claim',{body:{scan_id:id,slot},realm});
 return {bucket,go,claim,env,time:value=>{now=value;}};
}
function row(id,{item=9,variant='',buy=100,quantity=1,bid=0,owner='15',at=now0+2300}={}){
 return {auction_id:id,item_id:item,variant,quantity,buyout:buy,start_bid:10,min_next_bid:10,current_bid:bid,
  captured_at:iso(at),owner_guid:owner,time_left_ms:1000000};
}
function complete(id,items,at=now0,overrides={}){
 return {scan_id:id,started_at:iso(at+900),completed_at:iso(at+3000),expected_pages:1,
  traversed:items.length,reported_total:items.length,final_total:items.length,final_page_count:items.length,items,
  metadata:{9:{item_name:'Heavy Leather',quality:1,class_id:7}},...overrides};
}
const read=async promise=>(await promise).json();

test('atomic claims reject a competing restart, missed boundary, and a prior finalisation',async()=>{
 const {claim,go,time}=fixtures();
 const responses=await Promise.all([claim(first),claim(second)]);
 assert.deepEqual(responses.map(r=>r.status).sort(),[201,409]);
 const winner=responses[0].status===201?first:second;
 assert.equal((await claim(winner)).status,201);
 time(now0+16000);
 assert.equal((await claim('ahl_test_restart3')).status,409);
 const status=await read(go('scan-status'));
 assert.equal(status.scanning,true);
 assert.equal((await go('scan/fail',{body:{scan_id:winner}})).status,200);
 assert.equal((await read(go('summary'))).completed_at,null);
 time(now0+hour);
 assert.equal((await claim('ahl_test_restart3',now0+hour)).status,201);
});

test('publishes only a complete compressed scan and retains previous catalogue on an interrupted write',async()=>{
 const {go,time,claim,bucket}=fixtures();
 assert.equal((await claim(first)).status,201);
 time(now0+5000);
 const bad=complete(first,[row(1)],now0,{final_total:42});
 assert.equal((await go('scan/complete',{body:bad})).status,400);
 assert.equal((await read(go('summary'))).completed_at,null);
 const good=complete(first,[row(1),row(2,{variant:'0:12:0',buy:50,quantity:2})]);
 const race=await Promise.all([go('scan/complete',{body:good,compressed:true}),go('scan/complete',{body:good})]);
 assert.ok(race.some(resp=>resp.status===201));
 assert.ok(race.every(resp=>resp.status===201||resp.status===425));
 const last=await read(go('summary'));
 assert.equal(last.scan_id,first);
 assert.equal(last.item_count,2);
 const catalogue=await go('catalogue?scan_id='+first);
 assert.equal(catalogue.headers.get('content-encoding'),'gzip');
 assert.equal(JSON.parse(gunzipSync(Buffer.from(await catalogue.arrayBuffer()))).length,2);
 assert.equal((await go('catalogue?scan_id='+first,{headers:{'If-None-Match':catalogue.headers.get('ETag')}})).status,304);
 assert.equal((await read(go('scan/complete',{body:good}))).duplicate,true);
 time(now0+hour);
 await claim(second,now0+hour);
 time(now0+hour+5000);
 bucket.failKey=key=>key.includes(second)&&key.endsWith('/details/9');
 const newBody=complete(second,[row(1,{at:now0+hour+2300,quantity:2})],now0+hour);
 assert.equal((await go('scan/complete',{body:newBody})).status,503);
 assert.equal((await read(go('summary'))).scan_id,first);
 bucket.failKey=null;
 assert.equal((await go('scan/complete',{body:newBody})).status,201);
 const after=await read(go('summary'));
 assert.equal(after.scan_id,second);
 assert.equal(after.total_historical_auctions,2);
 assert.deepEqual(after.listing_changes,{new:0,changed:1,unchanged:0,disappeared:1});
 const retained=await read(go('items?scan_id='+first));
 assert.equal(retained.total,2);
 const retainedDetail=await read(go('item/9?variant=0:12:0&scan_id='+first));
 assert.equal(retainedDetail.listings[0].auction_id,2);
 const retainedHistory=await read(go('history/9?variant=0:12:0&scan_id='+first));
 assert.equal(retainedHistory.history[0].representative_unit,25);
 assert.equal((await read(go('summary',{realm:pvp}))).completed_at,null);
});

test('search, listing price filters, favourites, history, seller and realm are version-aware',async()=>{
 const {go,time,claim}=fixtures();
 await claim(first);
 await claim(first,now0,pvp);
 time(now0+5000);
 const items=[row(1,{buy:100,quantity:5}),row(2,{buy:60,quantity:2,owner:'16'}),row(3,{variant:'0:1:0',buy:400})];
 await go('scan/complete',{body:complete(first,items)});
 await go('scan/complete',{body:complete(first,[row(1,{buy:2000})]),realm:pvp});
 const data=await read(go('items?q=heavy&quality=1&keys=9:&sort=stack_buyout'));
 assert.equal(data.items[0].stack_buyout,100);
 assert.equal(data.items[0].cheapest_stack_buyout,60);
 assert.equal(data.items[0].quantity,7);
 const filtered=await read(go('items?owner=16&max_unit_buyout=50&q=heavy'));
 assert.equal(filtered.items[0].stack_buyout,60);
 assert.equal(filtered.items[0].quantity,2);
 assert.equal(filtered.items[0].trend_pct,null);
 assert.equal(filtered.listing_filtered,true);
 const stale=await go('items?q=heavy&quality=1&keys=9:&sort=stack_buyout',{headers:{'If-None-Match':(await go('items?sort=stack_buyout&keys=9:&quality=1&q=heavy')).headers.get('ETag')}});
 assert.equal(stale.status,304);
 assert.equal((await read(go('items',{realm:pvp}))).items[0].unit_buyout,2000);
 assert.equal((await go('missing-sellers',{token:null})).status,401);
 assert.equal((await go('scan/seller-names',{body:{scan_id:first,sellers:[{owner_guid:'99',character_name:'Example'}]}})).status,409);
 assert.equal((await go('scan/seller-names',{body:{scan_id:first,sellers:[{owner_guid:'16',character_name:'Example'}]}})).status,200);
 assert.equal((await read(go('item/9'))).listings[1].owner_name,'Example');
 assert.equal((await read(go('history/9'))).history[0].representative_unit,20);
 assert.equal((await read(go('history/9?variant=0:1:0'))).history[0].representative_unit,400);
});

test('most recent priced observation, median outlier and daily fallback preserve the pricing window',()=>{
 const previous=Array.from({length:10},(_,i)=>[i+1,10]);
 const window=marketBaseline([[10,1000],[11,20]],[previous,[[1,500]]],{},'2026-11-20');
 assert.equal(window.average_samples,11);
 assert.equal(window.average_excluded,1);
 assert.equal(window.historical_avg,11);
 const sparse=marketBaseline([[1,250]],[],{
  '2026-11-05':[5000,1,1],'2026-11-06':[20,1,1],'2026-11-07':[10,1,1],
  '2026-11-08':[30,1,1],'2026-11-09':[40,1,1],'2026-11-20':[50,1,1]
 },'2026-11-20');
 assert.equal(sparse.average_source,'daily_lows');
 assert.equal(sparse.historical_avg,25);
});

test('usage thresholds halt only collection while published public data remains readable',async()=>{
 const {go,time,claim,env}=fixtures();
 env.AUCTION_BUDGET_REQUIRED='true';
 assert.equal((await claim(first)).status,429);
 const report={observed_at:iso(now0),billing_period:'2026-11-09',day_reads:0,day_writes:0,month_reads:0,month_writes:0,storage_bytes:0,
  worker_requests:0,worker_cpu_ms:0,r2_class_a:0,r2_class_b:0,r2_bytes:0};
 assert.equal((await go('budget',{body:report})).status,401);
 assert.equal((await go('budget',{body:report,token:'admin'})).status,200);
 assert.equal((await claim(first)).status,201);
 time(now0+5000);
 await go('scan/complete',{body:complete(first,[row(1)])});
 time(now0+hour);
 assert.equal((await go('budget',{body:{...report,day_writes:1000000,observed_at:iso(now0+hour)},token:'admin'})).status,200);
 assert.equal((await claim(second,now0+hour)).status,429);
 assert.equal((await read(go('summary'))).scan_id,first);
 env.AUCTION_PUBLIC_PAUSED='true';
 assert.equal((await go('items')).status,503);
 assert.equal(await auctionRoute(new Request('https://octometrics.example/api/summary'),env),null);
});

test('historical import is checksum-gated, atomic and cannot overwrite an active realm',async()=>{
 const {go,env,bucket}=fixtures();
 const generation=prefix(nz)+'versions/import-ahl_legacy_001';
 const latest={generation,scan_id:'ahl_legacy_001',completed_at:iso(now0-hour),auction_count:0,total_historical_auctions:0,
  item_count:0,items_with_metadata:0,scan_duration_ms:100,historical_days:0,archived_days:[],snapshot_quality:'live_estimate'};
 const manifest={latest,files:{}};
 const entries=['catalogue','recovery','sellers','filters'];
 for(let i=0;i<16;i++)for(const type of ['details','state','seen','archive'])entries.push(type+'/'+i);
 for(const name of entries){
  const path=generation+'/'+name;
  const data=gzipSync(JSON.stringify(name==='catalogue'?[]:name==='recovery'?{metadata:{},sellers:{}}:{}));
  const result=await bucket.put(path,data,{httpMetadata:{contentEncoding:'gzip'}});
  manifest.files[path]={bytes:data.length,md5:result.etag};
 }
 const submit=()=>go('import',{body:manifest,token:'admin'});
 assert.equal((await submit()).status,503);
 env.AUCTION_IMPORT_ENABLED=env.AUCTION_COLLECTION_PAUSED='true';
 manifest.files[generation+'/catalogue'].bytes++;
 assert.equal((await submit()).status,409);
 assert.equal((await read(go('summary'))).scan_id,null);
 manifest.files[generation+'/catalogue'].bytes--;
 assert.equal((await submit()).status,201);
 assert.equal((await read(go('summary'))).scan_id,latest.scan_id);
 assert.equal((await submit()).status,409);
});

test('rolls daily lows into history across UTC midnight and keeps earlier prices available',async()=>{
 const {go,time,claim}=fixtures();
 const slot=now0+11*hour;
 time(slot);
 await claim(first,slot);
 time(slot+5000);
 await go('scan/complete',{body:complete(first,[row(1,{at:slot+2300,buy:125})],slot)});
 time(slot+hour);
 await claim(second,slot+hour);
 time(slot+hour+5000);
 await go('scan/complete',{body:complete(second,[row(1,{at:slot+hour+2300,buy:80})],slot+hour)});
 const history=(await read(go('history/9'))).history;
 assert.deepEqual(history.map(day=>[day.day,day.representative_unit]),[['2026-11-21',80],['2026-11-20',125]]);
 assert.equal((await read(go('summary'))).historical_days,2);
});
