import {buildItemsQuery} from "./auction-query.mjs";
/* Auction House ingestion and read API.
 * Always publish from the latest COMPLETE scan; never expose partial pages.
 * Shares the existing OctoMetrics Worker/D1 but does not touch metric_events. */
const CORS={'Access-Control-Allow-Origin':'https://equadis.github.io','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Authorization,Content-Type','Vary':'Origin'};
function respond(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...CORS}});}
const bad=(reason,status=400)=>respond({error:reason},status);
const integer=(n,min=0,max=2147483647)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const text=(s,max=100)=>typeof s==='string'&&s.length<=max;
const validIso=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/.test(s)&&Number.isFinite(Date.parse(s));
const validId=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{8,80}$/.test(s);
const amount=n=>n===null?true:integer(n,0,4294967295);
export function expectedPageLength(total,page){
 if(!integer(total,0,1000000))return null;
 const pages=Math.max(1,Math.ceil(total/50));
 if(!integer(page,0,pages-1))return null;
 return Math.max(0,Math.min(50,total-page*50));
}
function normalise(raw){
 if(!raw||!integer(raw.auction_id,1,4294967295)||!integer(raw.item_id,1,4294967295)||
    !integer(raw.quantity,1,100000)||!amount(raw.start_bid)||!amount(raw.current_bid)||
    !amount(raw.min_next_bid)||!amount(raw.buyout)||!validIso(raw.captured_at))return null;
 const variant=raw.variant??'';
 if(!text(variant,90)||!text(raw.item_name??'',160)||!text(raw.owner_guid??'',25))return null;
 if(raw.quality!==null&&raw.quality!==undefined&&!integer(raw.quality,0,8))return null;
 if(raw.icon_url!==null&&raw.icon_url!==undefined&&(!text(raw.icon_url,400)||!/^https:\/\//.test(raw.icon_url)))return null;
 for(const [k,max] of [['item_level',200],['req_level',70],['class_id',20],['subclass_id',30],['slot_id',40]])
   if(raw[k]!==null&&raw[k]!==undefined&&!integer(raw[k],0,max))return null;
 if(raw.time_left_ms!==null&&raw.time_left_ms!==undefined&&!integer(raw.time_left_ms,0,4294967295))return null;
 return {auction_id:raw.auction_id,item_id:raw.item_id,variant,item_name:raw.item_name||null,
   quality:raw.quality??null,icon_url:raw.icon_url??null,quantity:raw.quantity,
   start_bid:raw.start_bid,current_bid:raw.current_bid,min_next_bid:raw.min_next_bid,
   buyout:raw.buyout,
   owner_guid:raw.owner_guid||null,time_left_ms:raw.time_left_ms??null,captured_at:raw.captured_at,
   item_level:raw.item_level??null,req_level:raw.req_level??null,class_id:raw.class_id??null,subclass_id:raw.subclass_id??null,slot_id:raw.slot_id??null};
}
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results||[];
const first=async(db,sql,...args)=>db.prepare(sql).bind(...args).first();
async function active(db){return first(db,"SELECT * FROM ah_scans WHERE status='complete' ORDER BY completed_at DESC,created_at DESC LIMIT 1");}
async function previous(db,scan){return first(db,"SELECT scan_id FROM ah_scans WHERE status='complete' AND completed_at < ? ORDER BY completed_at DESC LIMIT 1",scan.completed_at);}
const SCAN_SELECT="SELECT scan_id,status,started_at,completed_at,expected_pages,reported_total,page_count,auction_count,duration_ms FROM ah_scans";
async function upload(req,env,action){
 if(!env.AUCTION_PUSH_TOKEN)return bad('auction ingestion not configured',503);
 if(req.headers.get('authorization')!==('Bearer '+env.AUCTION_PUSH_TOKEN))return bad('unauthorised',401);
 if(Number(req.headers.get('content-length')||0)>100000)return bad('payload too large',413);
 let body;try{body=await req.json()}catch{return bad('invalid JSON');}
 if(!validId(body?.scan_id))return bad('invalid scan_id');
 const db=env.DB;
 if(action==='seller-names'){
   const scan=await first(db,"SELECT status FROM ah_scans WHERE scan_id=?",body.scan_id);
   if(scan?.status!=='complete')return bad('seller names require a completed scan',409);
   const rows=body.sellers;
   if(!Array.isArray(rows)||rows.length<1||rows.length>50||rows.some(r=>!r||typeof r.owner_guid!=='string'||!/^\d{1,20}$/.test(r.owner_guid)||r.owner_guid==='0'||(r.character_name!==null&&(typeof r.character_name!=='string'||!/^\p{L}{1,24}$/u.test(r.character_name))))||new Set(rows.map(r=>r.owner_guid)).size!==rows.length)return bad('invalid seller batch');
   const observed=await all(db,"SELECT DISTINCT owner_guid FROM ah_listings WHERE scan_id=? AND owner_guid IN (SELECT value FROM json_each(?))",body.scan_id,JSON.stringify(rows.map(r=>r.owner_guid)));
   if(observed.length!==rows.length)return bad('seller not observed in scan',409);
   const sql="INSERT INTO ah_seller_names(owner_guid,character_name,attempted_at) VALUES (?,?,?) ON CONFLICT(owner_guid) DO UPDATE SET character_name=COALESCE(excluded.character_name,ah_seller_names.character_name),attempted_at=excluded.attempted_at";
   await db.batch(rows.map(r=>db.prepare(sql).bind(r.owner_guid,r.character_name,new Date().toISOString())));
   return respond({ok:true,resolved:rows.filter(r=>r.character_name).length});
 }
 if(action==='metadata'){
   const scan=await first(db,"SELECT status FROM ah_scans WHERE scan_id=?",body.scan_id);
   if(scan?.status!=='complete')return bad('metadata requires a completed scan',409);
   if(!Array.isArray(body.items)||body.items.length<1||body.items.length>50)return bad('invalid metadata batch');
   const rows=body.items.map(raw=>normalise({...raw,auction_id:1,quantity:1,start_bid:0,current_bid:0,min_next_bid:0,buyout:null,captured_at:new Date().toISOString()}));
   if(rows.some(r=>!r||!r.item_name?.trim())||new Set(rows.map(r=>r.item_id)).size!==rows.length)return bad('invalid metadata item');
   const observed=await all(db,"SELECT DISTINCT item_id FROM ah_listings WHERE scan_id=? AND item_id IN (SELECT value FROM json_each(?))",body.scan_id,JSON.stringify(rows.map(r=>r.item_id)));
   if(observed.length!==rows.length)return bad('metadata item not observed in scan',409);
   const fields=['item_name','quality','icon_url','item_level','req_level','class_id','subclass_id','slot_id'];
   const sql='INSERT INTO ah_item_metadata(item_id,'+fields.join(',')+',resolved_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(item_id) DO UPDATE SET '+fields.map(k=>k+'=COALESCE(excluded.'+k+',ah_item_metadata.'+k+')').join(',')+',resolved_at=excluded.resolved_at';
   try{await db.batch(rows.map(r=>db.prepare(sql).bind(r.item_id,...fields.map(k=>r[k]),new Date().toISOString())))}catch{return bad('metadata write failed',503)}
   return respond({ok:true,resolved:rows.length});
 }
 if(action==='start'){
   if(!validIso(body.started_at)||!integer(body.reported_total,0,1000000))return bad('invalid scan header');
   const existing=await first(db,'SELECT status,started_at,reported_total FROM ah_scans WHERE scan_id=?',body.scan_id);
   if(existing){
     // Safe retry only for the identical ongoing scan; no completed scan ID reuse.
     if(existing.status==='uploading'&&existing.started_at===body.started_at&&existing.reported_total===body.reported_total)
       return respond({ok:true,duplicate:true,status:existing.status});
     return bad('scan ID already used or different scan header',409);
   }
   await db.prepare("UPDATE ah_scans SET status='failed',error='abandoned upload' WHERE status='uploading' AND COALESCE((SELECT MAX(received_at) FROM ah_pages WHERE scan_id=ah_scans.scan_id),created_at)<strftime('%Y-%m-%dT%H:%M:%fZ','now','-5 minutes')").run();
   const unfinished=await first(db,"SELECT scan_id FROM ah_scans WHERE status='uploading' LIMIT 1");
   if(unfinished)return bad('another upload already in progress',409);
   // Partial unique D1 index also protects concurrent starts.
   try{
     await db.prepare("INSERT INTO ah_scans(scan_id,realm,status,started_at,reported_total) VALUES (?,?,'uploading',?,?)").bind(body.scan_id,env.AUCTION_REALM??"N'Zoth",body.started_at,body.reported_total).run();
   }catch(error){if(/unique constraint/i.test(String(error)))return bad('another upload already in progress or duplicate scan ID',409);return bad('database temporarily unavailable',503)}
   return respond({ok:true},201);
 }
 const scan=await first(db,"SELECT * FROM ah_scans WHERE scan_id=?",body.scan_id);
 if(!scan)return bad('unknown scan',404);
 const liveSnapshot=body.scan_id.startsWith('ahl_');
 if(action==='complete'&&scan.status==='complete'){
   if(integer(body.expected_pages,1,30001)&&integer(body.reported_total,0,1000000)&&validIso(body.completed_at)&&
      scan.expected_pages===body.expected_pages&&scan.reported_total===body.reported_total&&scan.completed_at===body.completed_at)
     return respond({ok:true,duplicate:true,auction_count:scan.auction_count,duration_ms:scan.duration_ms});
   return bad('completion does not match published scan',409);
 }
 if(action==='fail'&&scan.status==='failed')return respond({ok:true,duplicate:true});
 if(scan.status!=='uploading')return bad('scan no longer uploading',409);
 if(action==='fail'){
   await db.prepare("UPDATE ah_scans SET status='failed',error=? WHERE scan_id=? AND status='uploading'").bind(String(body.reason||'interrupted').slice(0,200),body.scan_id).run();
   return respond({ok:true});
 }
 if(action==='page'){
   if(!integer(body.page,0,30000)||!integer(body.response_ms,0,600000)||!Array.isArray(body.items)||body.items.length>50)return bad('invalid page');
   const expected=liveSnapshot?body.items.length:expectedPageLength(scan.reported_total,body.page);
   if(expected===null||body.items.length!==expected)return bad('page outside scan range or incorrect length',409);
   const rows=body.items.map(normalise);
   if(rows.some(r=>!r))return bad('invalid listing');
   if(new Set(rows.map(r=>r.auction_id)).size!==rows.length)return bad('duplicate auction on page');
   // Three statements rather than up to 52 per page. JSON uses one bound
   // parameter, below D1's 100-variable limit; all rows were validated above.
   // The status checks happen inside the atomic batch, not just before it.
   const columns=['auction_id','item_id','variant','item_name','quality','icon_url','quantity','start_bid','current_bid','min_next_bid','buyout','owner_guid','time_left_ms','captured_at','item_level','req_level','class_id','subclass_id','slot_id'];
   const ops=[
     db.prepare("DELETE FROM ah_listings WHERE scan_id=? AND page=? AND EXISTS(SELECT 1 FROM ah_scans WHERE scan_id=? AND status='uploading')").bind(body.scan_id,body.page,body.scan_id),
     db.prepare((liveSnapshot?'INSERT OR REPLACE INTO':'INSERT INTO')+' ah_listings(scan_id,page,'+columns.join(',')+') SELECT ?,?,'+columns.map(k=>"json_extract(value,'$."+k+"')").join(',')+" FROM json_each(?) WHERE EXISTS(SELECT 1 FROM ah_scans WHERE scan_id=? AND status='uploading')").bind(body.scan_id,body.page,JSON.stringify(rows),body.scan_id),
     db.prepare("INSERT INTO ah_pages(scan_id,page,count,response_ms) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM ah_scans WHERE scan_id=? AND status='uploading') ON CONFLICT(scan_id,page) DO UPDATE SET count=excluded.count,response_ms=excluded.response_ms,received_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')").bind(body.scan_id,body.page,rows.length,body.response_ms,body.scan_id)
   ];
   try{await db.batch(ops)}catch{return bad('page write failed (retry safely)',503)}
   return respond({ok:true,page:body.page,items:rows.length},202);
 }
 if(action==='complete'){
   if(!integer(body.expected_pages,1,30001)||!integer(body.reported_total,0,1000000)||!validIso(body.completed_at))return bad('invalid completion');
   if(body.reported_total!==scan.reported_total||(!liveSnapshot&&body.expected_pages!==Math.max(1,Math.ceil(scan.reported_total/50))))
     return bad('completion disagrees with original server total',409);
   if(Date.parse(body.completed_at)<Date.parse(scan.started_at))return bad('completion precedes scan start',409);
   const check=await first(db,"SELECT COUNT(*) n,MIN(page) first_page,MAX(page) last_page,SUM(count) rows FROM ah_pages WHERE scan_id=?",body.scan_id);
   if(check.n!==body.expected_pages||check.first_page!==0||check.last_page!==body.expected_pages-1)return bad('incomplete or missing pages',409);
   const count=await first(db,'SELECT COUNT(*) n,COUNT(DISTINCT auction_id) distinct_auctions FROM ah_listings WHERE scan_id=?',body.scan_id);
   if(count.n!==count.distinct_auctions)return bad('duplicate listings persisted',409);
   if(liveSnapshot){
     // A live AH changes during a scan. Deduplicate cross-page overlaps while
     // preserving the truthful observed count rather than calling it an atomic snapshot.
     if(count.n>check.rows||(scan.reported_total>0&&count.n===0))
       return bad('live traversal has no valid listings',409);
   }else{
     if(count.n!==check.rows)return bad('missing listings',409);
     if(count.n!==scan.reported_total)return bad('auction count differs from original server total; rescan',409);
   }
   const duration=Math.max(0,Date.parse(body.completed_at)-Date.parse(scan.started_at));
   const ops=[
     db.prepare("INSERT OR IGNORE INTO ah_first_seen(auction_id,first_seen_at) SELECT auction_id,? FROM ah_listings WHERE scan_id=? AND EXISTS(SELECT 1 FROM ah_scans WHERE scan_id=? AND status='uploading')").bind(body.completed_at,body.scan_id,body.scan_id),
     db.prepare("INSERT INTO ah_item_points(scan_id,item_id,variant,cheapest_auction_id,unit_buyout,quantity,listings,captured_at) SELECT ?,g.item_id,g.variant,(SELECT l2.auction_id FROM ah_listings l2 WHERE l2.scan_id=? AND l2.item_id=g.item_id AND l2.variant=g.variant ORDER BY CASE WHEN l2.buyout>0 THEN 0 ELSE 1 END,CASE WHEN l2.buyout>0 THEN CAST(l2.buyout AS REAL)/l2.quantity END,l2.auction_id LIMIT 1),MIN(CASE WHEN g.buyout>0 THEN CAST(g.buyout AS REAL)/g.quantity END),SUM(g.quantity),COUNT(*),MAX(g.captured_at) FROM ah_listings g WHERE g.scan_id=? AND EXISTS(SELECT 1 FROM ah_scans WHERE scan_id=? AND status='uploading') GROUP BY g.item_id,g.variant").bind(body.scan_id,body.scan_id,body.scan_id,body.scan_id),
     db.prepare("INSERT INTO ah_daily(item_id,variant,day,representative_unit,quantity,listings,scan_id) SELECT item_id,variant,substr(?,1,10),unit_buyout,quantity,listings,? FROM ah_item_points WHERE scan_id=? AND unit_buyout IS NOT NULL AND EXISTS(SELECT 1 FROM ah_scans WHERE scan_id=? AND status='uploading') ON CONFLICT(item_id,variant,day) DO UPDATE SET representative_unit=MIN(ah_daily.representative_unit,excluded.representative_unit),quantity=excluded.quantity,listings=excluded.listings,scan_id=excluded.scan_id") .bind(body.completed_at,body.scan_id,body.scan_id,body.scan_id),
     db.prepare("UPDATE ah_scans SET status='complete',completed_at=?,expected_pages=?,reported_total=?,page_count=?,auction_count=?,duration_ms=? WHERE scan_id=? AND status='uploading'").bind(body.completed_at,body.expected_pages,body.reported_total,check.n,count.n,duration,body.scan_id)
   ];
   if(env.AUCTION_PRECOMPUTED==='true'){
     const query=buildItemsQuery(new URLSearchParams(),{scan_id:body.scan_id,completed_at:body.completed_at},'');
     // The final status, market rows and readiness marker are committed atomically.
     ops.push(db.prepare("INSERT INTO ah_market_baseline(scan_id,item_id,variant,avg_unit,days,price_samples,price_excluded,average_source,latest_listing_seen_at) SELECT ?,x.* FROM ("+query.baselineSql+") x").bind(body.scan_id,...query.binds));
     ops.push(db.prepare("INSERT INTO ah_market_ready(scan_id) VALUES (?)").bind(body.scan_id));
   }
   try{await db.batch(ops)}catch{return bad('finalisation failed',503)}
   const published=await first(db,"SELECT status,completed_at,expected_pages,reported_total,auction_count,duration_ms FROM ah_scans WHERE scan_id=?",body.scan_id);
   if(published?.status!=='complete'||published.completed_at!==body.completed_at||published.expected_pages!==body.expected_pages||published.reported_total!==body.reported_total)return bad('scan no longer uploading or completion conflict',409);
   return respond({ok:true,auction_count:published.auction_count,duration_ms:published.duration_ms,snapshot_quality:liveSnapshot?'live_estimate':'strict'},201);
 }
 return bad('unknown upload action',404);
}
function apiId(s){const id=Number(s);return integer(id,1,4294967295)?id:null;}
async function readApi(url,env){
 const db=env.DB;const scan=await active(db);
 const current=await first(db,"SELECT scan_id,started_at,reported_total,(SELECT MAX(received_at) FROM ah_pages WHERE scan_id=ah_scans.scan_id) last_page_at,(SELECT COUNT(*) FROM ah_pages WHERE scan_id=ah_scans.scan_id) pages_done FROM ah_scans WHERE status='uploading' ORDER BY started_at DESC LIMIT 1");
 const recent=current&&Date.now()-Date.parse(current.last_page_at||current.started_at)<600000;
 if(url.pathname==='/api/auction/scan-status')return respond({scanning:!!current,collector_status:recent?'ONLINE':current?'STALE':'OFFLINE',pages_done:current?.pages_done??0,pages_expected:current?Math.max(1,Math.ceil(current.reported_total/50)):null,started_at:current?.started_at??null});
 if(url.pathname==='/api/auction/summary'){
   const item=scan?await first(db,'SELECT COUNT(*) n FROM ah_item_points WHERE scan_id=?',scan.scan_id):null;
   const hist=await first(db,'SELECT COUNT(DISTINCT day) n FROM ah_daily');
   const total=await first(db,'SELECT auction_count FROM ah_historical_total WHERE id=1');
   const meta=scan?await first(db,"SELECT COUNT(*) n FROM ah_item_points p LEFT JOIN ah_listings l ON l.scan_id=p.scan_id AND l.auction_id=p.cheapest_auction_id LEFT JOIN ah_item_metadata m ON m.item_id=p.item_id WHERE p.scan_id=? AND COALESCE(l.class_id,m.class_id) IS NOT NULL",scan.scan_id):null;
   return respond({collector_status:recent?'ONLINE':current?'STALE':'OFFLINE',scanning:!!current,
     pages_done:current?.pages_done??0,pages_expected:current?Math.max(1,Math.ceil(current.reported_total/50)):null,
     completed_at:scan?.completed_at??null,auction_count:scan?.auction_count??null,total_historical_auctions:total?.auction_count??null,
     item_count:item?.n??null,items_with_metadata:meta?.n??null,scan_duration_ms:scan?.duration_ms??null,historical_days:hist?.n??0,
      snapshot_quality:scan?(scan.scan_id.startsWith('ahl_')?'live_estimate':'strict'):null});
 }
 if(!scan){
   if(url.pathname==='/api/auction/items')return respond({items:[],total:0,has_more:false});
   return respond({listings:[],history:[],error:'no complete scan'});
 }
 if(url.pathname==='/api/auction/expiry-diagnostics'){
   const prev=await previous(db,scan);
   if(!prev)return respond({sample_size:0,reason:'No previous complete scan',scan_id:scan.scan_id});
   const rows=await all(db,"SELECT c.time_left_ms newer_ms,p.time_left_ms older_ms,c.captured_at newer_at,p.captured_at older_at FROM ah_listings c JOIN ah_listings p ON p.scan_id=? AND p.auction_id=c.auction_id AND p.item_id=c.item_id AND p.variant=c.variant AND p.owner_guid IS c.owner_guid WHERE c.scan_id=? AND c.time_left_ms IS NOT NULL AND p.time_left_ms IS NOT NULL AND julianday(c.captured_at)>julianday(p.captured_at) ORDER BY c.auction_id LIMIT 1000",prev.scan_id,scan.scan_id);
   const values=rows.map(r=>{
     const elapsed=Date.parse(r.newer_at)-Date.parse(r.older_at);
     const decrease=r.older_ms-r.newer_ms;
     return {elapsed,decrease,drift:Math.abs(elapsed-decrease)};
   }).filter(r=>Number.isFinite(r.drift)&&r.elapsed>=1000);
   const median=xs=>{const a=xs.sort((x,y)=>x-y);return a.length?(a[Math.floor((a.length-1)/2)]+a[Math.floor(a.length/2)])/2:null;};
   return respond({scan_id:scan.scan_id,previous_scan_id:prev.scan_id,sample_size:values.length,
     median_elapsed_ms:median(values.map(v=>v.elapsed)),median_decrease_ms:median(values.map(v=>v.decrease)),
     median_absolute_drift_ms:median(values.map(v=>v.drift)),
     within_2s:values.filter(v=>v.drift<=2000).length,within_10s:values.filter(v=>v.drift<=10000).length,
     note:'Matching auction IDs across two complete scans; compares packet duration decay with observation time, not actual in-game expiry.'});
 }
 if(url.pathname==='/api/auction/missing-sellers'){
   const rows=await all(db,"SELECT l.owner_guid,COUNT(*) listings FROM ah_listings l LEFT JOIN ah_seller_names s ON s.owner_guid=l.owner_guid WHERE l.scan_id=? AND l.owner_guid IS NOT NULL AND l.owner_guid<>'0' AND (s.owner_guid IS NULL OR (s.character_name IS NULL AND s.attempted_at<strftime('%Y-%m-%dT%H:%M:%fZ','now','-6 hours')) OR (s.character_name IS NOT NULL AND s.attempted_at<strftime('%Y-%m-%dT%H:%M:%fZ','now','-30 days'))) GROUP BY l.owner_guid ORDER BY listings DESC,l.owner_guid LIMIT 30",scan.scan_id);
   return respond({scan_id:scan.scan_id,sellers:rows});
 }
 if(url.pathname==='/api/auction/incomplete-metadata'){
   const rows=await all(db,"SELECT l.item_id,COUNT(*) listings,MAX(CASE WHEN COALESCE(l.item_name,m.item_name) IS NULL THEN 1 ELSE 0 END) missing_name FROM ah_listings l LEFT JOIN ah_item_metadata m ON m.item_id=l.item_id WHERE l.scan_id=? AND (COALESCE(l.item_name,m.item_name) IS NULL OR COALESCE(l.quality,m.quality) IS NULL OR COALESCE(l.class_id,m.class_id) IS NULL OR COALESCE(l.subclass_id,m.subclass_id) IS NULL OR COALESCE(l.item_level,m.item_level) IS NULL OR COALESCE(l.req_level,m.req_level) IS NULL OR COALESCE(l.icon_url,m.icon_url) IS NULL) AND (m.resolved_at IS NULL OR julianday(m.resolved_at)<julianday('now','-30 minutes')) GROUP BY l.item_id ORDER BY missing_name DESC,listings DESC,l.item_id LIMIT 1000",scan.scan_id);
   return respond({items:rows,scan_id:scan.scan_id});
 }
 if(url.pathname==='/api/auction/missing-metadata'){
   const rows=await all(db,"SELECT l.item_id,COUNT(*) listings FROM ah_listings l LEFT JOIN ah_item_metadata m ON m.item_id=l.item_id WHERE l.scan_id=? AND COALESCE(l.item_name,m.item_name) IS NULL GROUP BY l.item_id ORDER BY listings DESC,l.item_id LIMIT 1000",scan.scan_id);
   return respond({items:rows,scan_id:scan.scan_id});
 }
 if(url.pathname==='/api/auction/items'){
   const prev=await previous(db,scan);
   const precomputed=env.AUCTION_PRECOMPUTED==='true';
   if(precomputed&&!await first(db,"SELECT scan_id FROM ah_market_ready WHERE scan_id=?",scan.scan_id))
     return bad('Awaiting next hourly market snapshot',503);
   const query=buildItemsQuery(url.searchParams,scan,prev?.scan_id,Date.now(),precomputed);
   if(query.error)return bad(query.error);
   const rows=await all(db,query.pageSql,...query.binds,query.limit,query.offset);
   const total=rows.length?rows[0].total_rows:query.offset>0?(await first(db,query.countSql,...query.binds)).n:0;
   return respond({items:rows.map(r=>({item_id:r.item_id,variant:r.variant,item_name:r.item_name,quality:r.quality,icon_url:r.icon_url,
     item_level:r.item_level,req_level:r.req_level,class_id:r.class_id,subclass_id:r.subclass_id,slot_id:r.slot_id,
     quantity:r.quantity,listings:r.listings,unit_buyout:r.unit_buyout,stack_buyout:r.stack_buyout,current_bid:r.current_bid,start_bid:r.start_bid,
     historical_avg:r.avg_unit??null,historical_days:r.days??0,average_samples:r.price_samples??0,average_excluded:r.price_excluded??0,average_source:r.average_source??null,market_pct:r.market_pct,trend_pct:r.trend_pct,previous_unit:r.previous_unit??null,
     time_left_ms:r.time_left_ms,captured_at:r.captured_at,latest_listing_seen_at:r.latest_listing_seen_at})),
     total,has_more:query.offset+rows.length<total,limit:query.limit,offset:query.offset,
     listing_filtered:query.listingFiltered,scan_id:scan.scan_id,completed_at:scan.completed_at});
 }
 const detail=url.pathname.match(/^\/api\/auction\/(item|history)\/(\d+)$/);
 if(detail){
   const itemId=apiId(detail[2]);if(!itemId)return bad('invalid item');
   const variant=(url.searchParams.get('variant')||'').slice(0,90);
   if(detail[1]==='item'){
     const rows=await all(db,"SELECT l.auction_id,l.item_id,l.variant,l.quantity,l.start_bid,l.current_bid,l.min_next_bid,l.buyout,l.owner_guid,s.character_name owner_name,l.time_left_ms,l.captured_at,f.first_seen_at,CASE WHEN l.buyout>0 THEN CAST(l.buyout AS REAL)/l.quantity END unit_buyout FROM ah_listings l LEFT JOIN ah_first_seen f ON f.auction_id=l.auction_id LEFT JOIN ah_seller_names s ON s.owner_guid=l.owner_guid WHERE l.scan_id=? AND l.item_id=? AND l.variant=? ORDER BY unit_buyout IS NULL,unit_buyout ASC,l.auction_id LIMIT 200",scan.scan_id,itemId,variant);
     return respond({listings:rows,scan_id:scan.scan_id,limited:rows.length===200});
   }
   const rows=await all(db,"SELECT day,representative_unit,quantity,listings FROM ah_daily WHERE item_id=? AND variant=? ORDER BY day DESC LIMIT 90",itemId,variant);
   return respond({history:rows});
 }
 return bad('not found',404);
}
// Realm-specific namespace keeps listing IDs, history, scan locks and counters isolated.
export function auctionNamespace(db,realm){
 if(realm==="N'Zoth")return db;
 if(realm!=="Y'Shaarj")throw new Error("Unsupported auction realm");
 return {prepare(sql){return db.prepare(sql.replace(/\bah_/g,"pvp_ah_"));},batch(statements){return db.batch(statements);}};
}
export async function auctionRoute(request,env){
 const url=new URL(request.url);
 if(!url.pathname.startsWith('/api/auction/'))return null;
 if(env.AUCTION_API_PAUSED==='true')return bad('Auction House temporarily paused to protect database budget',503);
 const realm=url.searchParams.get('realm')??"N'Zoth";
 if(realm!=="N'Zoth"&&realm!=="Y'Shaarj")return bad('auction realm unavailable',400);
 env={...env,DB:auctionNamespace(env.DB,realm),AUCTION_REALM:realm};
 if(request.method==='POST'){
   const action=url.pathname.slice('/api/auction/scan/'.length);
   if(!url.pathname.startsWith('/api/auction/scan/')||!['start','page','complete','fail','metadata','seller-names'].includes(action))return bad('not found',404);
   try{return await upload(request,env,action);}catch(error){console.warn('Auction upload temporarily unavailable',String(error).slice(0,200));return new Response(JSON.stringify({error:'database temporarily unavailable'}),{status:503,headers:{'Content-Type':'application/json','Retry-After':'15','Cache-Control':'no-store',...CORS}});}
 }
 if(request.method==='GET'){
   if(url.pathname==='/api/auction/missing-sellers'&&(!env.AUCTION_PUSH_TOKEN||request.headers.get('authorization')!=='Bearer '+env.AUCTION_PUSH_TOKEN))return bad('unauthorised',401);
   if(url.pathname==='/api/auction/missing-sellers'||url.pathname==='/api/auction/incomplete-metadata'||url.pathname==='/api/auction/missing-metadata')return readApi(url,env);
   // Collapse repeated public browser reads at the edge. Never cache authenticated
   // endpoints, failures, or writes. Keep live scan status on a shorter TTL.
   const cache=globalThis.caches?.default;
   if(!cache)return readApi(url,env);
   const key=new Request(url.href,{method:'GET'});
   try{const hit=await cache.match(key);if(hit)return hit;}catch{}
   let result;
   try{result=await readApi(url,env);}catch(error){
     console.warn('Auction read temporarily unavailable',String(error).slice(0,200));
     return new Response(JSON.stringify({error:'database temporarily unavailable'}),{status:503,headers:{'Content-Type':'application/json','Retry-After':'15','Cache-Control':'no-store',...CORS}});
   }
   if(result.ok){
     const ttl=url.pathname.endsWith('/scan-status')?30:300;
     const headers=new Headers(result.headers);headers.set('Cache-Control','public, max-age='+ttl);
     result=new Response(result.body,{status:result.status,headers});
     try{await cache.put(key,result.clone());}catch{}
   }
   return result;
 }
 return bad('method not allowed',405);
}
export async function auctionCleanup(env){
 if(env.AUCTION_API_PAUSED==='true')return;
 await cleanupRealm(env.DB,env.AUCTION_PRECOMPUTED==='true');
 // PvP tables are created by migration 0011; deploy the migration before this Worker.
 await cleanupRealm(auctionNamespace(env.DB,"Y'Shaarj"),env.AUCTION_PRECOMPUTED==='true');
}
async function cleanupRealm(db,precomputed=false){
 // The three latest complete scans and all compact price history remain readable.
 // Limit write amplification per SQL statement; incomplete cleanup resumes on the next cron.
 const expired="SELECT scan_id FROM ah_scans WHERE status='failed' OR (status='complete' AND scan_id NOT IN (SELECT scan_id FROM ah_scans WHERE status='complete' ORDER BY completed_at DESC,scan_id DESC LIMIT 3))";
 await db.prepare("UPDATE ah_scans SET status='failed',error='abandoned upload' WHERE status='uploading' AND COALESCE((SELECT MAX(received_at) FROM ah_pages WHERE scan_id=ah_scans.scan_id),created_at)<strftime('%Y-%m-%dT%H:%M:%fZ','now','-5 minutes')").run();
 for(const table of ["ah_listings","ah_pages","ah_item_points",...(precomputed?["ah_market_baseline","ah_market_ready"]:[])]){
   for(let i=0;i<4;i++){
     const result=await db.prepare("DELETE FROM "+table+" WHERE rowid IN (SELECT rowid FROM "+table+" WHERE scan_id IN ("+expired+") LIMIT 2000)").run();
     if(result?.meta?.changes===0)break;
   }
 }
 await db.prepare("DELETE FROM ah_scans WHERE (status='failed' AND started_at<strftime('%Y-%m-%dT%H:%M:%fZ','now','-7 days') OR status='complete' AND scan_id NOT IN (SELECT scan_id FROM ah_scans WHERE status='complete' ORDER BY completed_at DESC,scan_id DESC LIMIT 3)) AND NOT EXISTS(SELECT 1 FROM ah_listings l WHERE l.scan_id=ah_scans.scan_id) AND NOT EXISTS(SELECT 1 FROM ah_pages p WHERE p.scan_id=ah_scans.scan_id) AND NOT EXISTS(SELECT 1 FROM ah_item_points i WHERE i.scan_id=ah_scans.scan_id)").run();
 await db.prepare("DELETE FROM ah_daily WHERE rowid IN (SELECT rowid FROM ah_daily WHERE day < date('now','-365 days') LIMIT 2000)").run();
}
