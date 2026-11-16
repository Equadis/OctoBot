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
function normalise(raw){
 if(!raw||!integer(raw.auction_id,1,4294967295)||!integer(raw.item_id,1,4294967295)||
    !integer(raw.quantity,1,100000)||!amount(raw.start_bid)||!amount(raw.current_bid)||
    !amount(raw.min_next_bid)||!amount(raw.buyout)||!validIso(raw.captured_at))return null;
 const variant=raw.variant??'';
 if(!text(variant,90)||!text(raw.item_name??'',160)||!text(raw.owner_guid??'',25))return null;
 if(raw.quality!==null&&raw.quality!==undefined&&!integer(raw.quality,0,8))return null;
 if(raw.icon_url!==null&&raw.icon_url!==undefined&&(!text(raw.icon_url,400)||!/^https:\/\//.test(raw.icon_url)))return null;
 if(raw.time_left_ms!==null&&raw.time_left_ms!==undefined&&!integer(raw.time_left_ms,0,4294967295))return null;
 return {auction_id:raw.auction_id,item_id:raw.item_id,variant,item_name:raw.item_name||null,
   quality:raw.quality??null,icon_url:raw.icon_url??null,quantity:raw.quantity,
   start_bid:raw.start_bid,current_bid:raw.current_bid,min_next_bid:raw.min_next_bid,
   buyout:raw.buyout,
   owner_guid:raw.owner_guid||null,time_left_ms:raw.time_left_ms??null,captured_at:raw.captured_at};
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
 if(action==='start'){
   if(!validIso(body.started_at)||!integer(body.reported_total,0,1000000))return bad('invalid scan header');
   const existing=await first(db,'SELECT status FROM ah_scans WHERE scan_id=?',body.scan_id);
   if(existing)return respond({ok:true,duplicate:true,status:existing.status});
   const unfinished=await first(db,"SELECT scan_id FROM ah_scans WHERE status='uploading' AND started_at > strftime('%Y-%m-%dT%H:%M:%fZ','now','-12 hours') LIMIT 1");
   if(unfinished)return bad('another upload already in progress',409);
   await db.prepare("INSERT INTO ah_scans(scan_id,realm,status,started_at,reported_total) VALUES (?,?,'uploading',?,?)").bind(body.scan_id,"N'Zoth",body.started_at,body.reported_total).run();
   return respond({ok:true},201);
 }
 const scan=await first(db,"SELECT * FROM ah_scans WHERE scan_id=?",body.scan_id);
 if(!scan)return bad('unknown scan',404);
 if(scan.status!=='uploading')return bad('scan no longer uploading',409);
 if(action==='fail'){
   await db.prepare("UPDATE ah_scans SET status='failed',error=? WHERE scan_id=? AND status='uploading'").bind(String(body.reason||'interrupted').slice(0,200),body.scan_id).run();
   return respond({ok:true});
 }
 if(action==='page'){
   if(!integer(body.page,0,30000)||!integer(body.response_ms,0,600000)||!Array.isArray(body.items)||body.items.length>50)return bad('invalid page');
   const rows=body.items.map(normalise);
   if(rows.some(r=>!r))return bad('invalid listing');
   if(new Set(rows.map(r=>r.auction_id)).size!==rows.length)return bad('duplicate auction on page');
   // A retry replaces exactly one page. D1 batch is atomic, so transient failures cannot partially replace a page.
   const ops=[db.prepare('DELETE FROM ah_listings WHERE scan_id=? AND page=?').bind(body.scan_id,body.page)];
   for(const r of rows)ops.push(db.prepare(
     'INSERT INTO ah_listings(scan_id,auction_id,page,item_id,variant,item_name,quality,icon_url,quantity,start_bid,current_bid,min_next_bid,buyout,owner_guid,time_left_ms,captured_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
   ).bind(body.scan_id,r.auction_id,body.page,r.item_id,r.variant,r.item_name,r.quality,r.icon_url,r.quantity,r.start_bid,r.current_bid,r.min_next_bid,r.buyout,r.owner_guid,r.time_left_ms,r.captured_at));
   ops.push(db.prepare('INSERT INTO ah_pages(scan_id,page,count,response_ms) VALUES (?,?,?,?) ON CONFLICT(scan_id,page) DO UPDATE SET count=excluded.count,response_ms=excluded.response_ms,received_at=strftime(\'%Y-%m-%dT%H:%M:%fZ\',\'now\')').bind(body.scan_id,body.page,rows.length,body.response_ms));
   try{await db.batch(ops)}catch{return bad('page write failed (retry safely)',503)}
   return respond({ok:true,page:body.page,items:rows.length},202);
 }
 if(action==='complete'){
   if(!integer(body.expected_pages,1,30001)||!integer(body.reported_total,0,1000000)||!validIso(body.completed_at))return bad('invalid completion');
   const check=await first(db,"SELECT COUNT(*) n,MIN(page) first_page,MAX(page) last_page,SUM(count) rows FROM ah_pages WHERE scan_id=?",body.scan_id);
   if(check.n!==body.expected_pages||check.first_page!==0||check.last_page!==body.expected_pages-1)return bad('incomplete or missing pages',409);
   const count=await first(db,'SELECT COUNT(*) n,COUNT(DISTINCT auction_id) distinct_auctions FROM ah_listings WHERE scan_id=?',body.scan_id);
   if(count.n!==check.rows||count.n!==count.distinct_auctions)return bad('missing or duplicate listings',409);
   // The AH can change mid-scan; never claim completeness if fewer listings than the server reported.
   if(count.n<body.reported_total)return bad('fewer auctions than server reported; rescan',409);
   const duration=Math.max(0,Date.parse(body.completed_at)-Date.parse(scan.started_at));
   const ops=[
     db.prepare("INSERT INTO ah_item_points(scan_id,item_id,variant,cheapest_auction_id,unit_buyout,quantity,listings,captured_at) SELECT ?,g.item_id,g.variant,(SELECT l2.auction_id FROM ah_listings l2 WHERE l2.scan_id=? AND l2.item_id=g.item_id AND l2.variant=g.variant ORDER BY CASE WHEN l2.buyout IS NULL THEN 1 ELSE 0 END,CAST(l2.buyout AS REAL)/l2.quantity,l2.auction_id LIMIT 1),MIN(CASE WHEN g.buyout>0 THEN CAST(g.buyout AS REAL)/g.quantity END),SUM(g.quantity),COUNT(*),MAX(g.captured_at) FROM ah_listings g WHERE g.scan_id=? GROUP BY g.item_id,g.variant").bind(body.scan_id,body.scan_id,body.scan_id),
     db.prepare("INSERT INTO ah_daily(item_id,variant,day,representative_unit,quantity,listings,scan_id) SELECT item_id,variant,substr(?,1,10),unit_buyout,quantity,listings,? FROM ah_item_points WHERE scan_id=? AND unit_buyout IS NOT NULL AND 1=1 ON CONFLICT(item_id,variant,day) DO UPDATE SET representative_unit=MIN(ah_daily.representative_unit,excluded.representative_unit),quantity=excluded.quantity,listings=excluded.listings,scan_id=excluded.scan_id").bind(body.completed_at,body.scan_id,body.scan_id),
     db.prepare("UPDATE ah_scans SET status='complete',completed_at=?,expected_pages=?,reported_total=?,page_count=?,auction_count=?,duration_ms=? WHERE scan_id=? AND status='uploading'").bind(body.completed_at,body.expected_pages,body.reported_total,check.n,count.n,duration,body.scan_id)
   ];
   try{await db.batch(ops)}catch{return bad('finalisation failed',503)}
   return respond({ok:true,auction_count:count.n,duration_ms:duration},201);
 }
 return bad('unknown upload action',404);
}
function apiId(s){const id=Number(s);return integer(id,1,4294967295)?id:null;}
async function readApi(url,env){
 const db=env.DB;const scan=await active(db);
 const current=await first(db,"SELECT scan_id,started_at,(SELECT MAX(received_at) FROM ah_pages WHERE scan_id=ah_scans.scan_id) last_page_at,(SELECT COUNT(*) FROM ah_pages WHERE scan_id=ah_scans.scan_id) pages_done FROM ah_scans WHERE status='uploading' ORDER BY started_at DESC LIMIT 1");
 const recent=current&&Date.now()-Date.parse(current.last_page_at||current.started_at)<600000;
 if(url.pathname==='/api/auction/scan-status')return respond({scanning:!!current,collector_status:recent?'ONLINE':current?'STALE':'OFFLINE',pages_done:current?.pages_done??0,started_at:current?.started_at??null});
 if(url.pathname==='/api/auction/summary'){
   const item=scan?await first(db,'SELECT COUNT(*) n FROM ah_item_points WHERE scan_id=?',scan.scan_id):null;
   const hist=await first(db,'SELECT COUNT(DISTINCT day) n FROM ah_daily');
   return respond({collector_status:recent?'ONLINE':current?'STALE':'OFFLINE',scanning:!!current,
     pages_done:current?.pages_done??0,pages_expected:current?.expected_pages??null,
     completed_at:scan?.completed_at??null,auction_count:scan?.auction_count??null,
     item_count:item?.n??null,scan_duration_ms:scan?.duration_ms??null,historical_days:hist?.n??0});
 }
 if(!scan){
   if(url.pathname==='/api/auction/items')return respond({items:[],total:0,has_more:false});
   return respond({listings:[],history:[],error:'no complete scan'});
 }
 if(url.pathname==='/api/auction/items'){
   const limit=Math.min(100,Math.max(1,Number(url.searchParams.get('limit'))||50));
   const offset=Math.min(100000,Math.max(0,Number(url.searchParams.get('offset'))||0));
   const q=(url.searchParams.get('q')||'').trim().slice(0,80);
   const quality=url.searchParams.get('quality');
   const qualityNum=quality===null?null:Number(quality);
   if(quality!==null&&!integer(qualityNum,0,8))return bad('invalid quality');
   const sort=url.searchParams.get('sort')||'market_pct';
   const ordering={name:"COALESCE(l.item_name,'Item #'||p.item_id) COLLATE NOCASE ASC",unit_buyout:"p.unit_buyout IS NULL,p.unit_buyout ASC",historical_avg:"historical_avg IS NULL,historical_avg ASC",quantity:"p.quantity DESC",trend_pct:"trend_pct IS NULL,trend_pct ASC",market_pct:"market_pct IS NULL,market_pct ASC"}[sort];
   if(!ordering)return bad('invalid sort');
   const prev=await previous(db,scan);
   const sql="WITH history AS (SELECT item_id,variant,AVG(representative_unit) avg_unit,COUNT(*) days FROM ah_daily WHERE day < substr(?,1,10) AND day >= date(?,'-14 days') GROUP BY item_id,variant),data AS (SELECT p.*,l.item_name,l.quality,l.icon_url,l.start_bid,l.current_bid,l.buyout AS stack_buyout,l.time_left_ms,l.captured_at,h.avg_unit,h.days,(CASE WHEN h.days>=4 AND h.avg_unit>0 THEN 100*p.unit_buyout/h.avg_unit END) market_pct,prev.unit_buyout previous_unit,(CASE WHEN prev.unit_buyout>0 AND p.unit_buyout IS NOT NULL THEN 100*(p.unit_buyout-prev.unit_buyout)/prev.unit_buyout END) trend_pct FROM ah_item_points p LEFT JOIN ah_listings l ON l.scan_id=p.scan_id AND l.auction_id=p.cheapest_auction_id LEFT JOIN history h ON h.item_id=p.item_id AND h.variant=p.variant LEFT JOIN ah_item_points prev ON prev.scan_id=? AND prev.item_id=p.item_id AND prev.variant=p.variant WHERE p.scan_id=?) SELECT * FROM data WHERE (?='' OR COALESCE(item_name,'Item #'||item_id) LIKE '%'||?||'%' OR CAST(item_id AS TEXT) LIKE '%'||?||'%') AND (? IS NULL OR quality=?)";
   const binds=[scan.completed_at,scan.completed_at,prev?.scan_id||'',scan.scan_id,q,q,q,qualityNum,qualityNum];
   const totalRow=await first(db,'SELECT COUNT(*) n FROM ('+sql+')',...binds);
   const rows=await all(db,sql+' ORDER BY '+ordering+',item_id ASC LIMIT ? OFFSET ?',...binds,limit,offset);
   return respond({items:rows.map(r=>({item_id:r.item_id,variant:r.variant,item_name:r.item_name,quality:r.quality,icon_url:r.icon_url,quantity:r.quantity,listings:r.listings,unit_buyout:r.unit_buyout,stack_buyout:r.stack_buyout,current_bid:r.current_bid,start_bid:r.start_bid,historical_avg:r.days>=4?r.avg_unit:null,market_pct:r.market_pct,trend_pct:r.trend_pct,previous_unit:r.previous_unit,time_left_ms:r.time_left_ms,captured_at:r.captured_at})),total:totalRow.n,has_more:offset+rows.length<totalRow.n,scan_id:scan.scan_id,completed_at:scan.completed_at});
 }
 const detail=url.pathname.match(/^\/api\/auction\/(item|history)\/(\d+)$/);
 if(detail){
   const itemId=apiId(detail[2]);if(!itemId)return bad('invalid item');
   const variant=(url.searchParams.get('variant')||'').slice(0,90);
   if(detail[1]==='item'){
     const rows=await all(db,"SELECT auction_id,item_id,variant,quantity,start_bid,current_bid,min_next_bid,buyout,owner_guid AS owner_guid,time_left_ms,captured_at,CASE WHEN buyout>0 THEN CAST(buyout AS REAL)/quantity END unit_buyout FROM ah_listings WHERE scan_id=? AND item_id=? AND variant=? ORDER BY unit_buyout IS NULL,unit_buyout ASC LIMIT 200",scan.scan_id,itemId,variant);
     return respond({listings:rows,scan_id:scan.scan_id,limited:rows.length===200});
   }
   const rows=await all(db,"SELECT day,representative_unit,quantity,listings FROM ah_daily WHERE item_id=? AND variant=? ORDER BY day DESC LIMIT 90",itemId,variant);
   return respond({history:rows});
 }
 return bad('not found',404);
}
export async function auctionRoute(request,env){
 const url=new URL(request.url);
 if(!url.pathname.startsWith('/api/auction/'))return null;
 if(request.method==='POST'){
   const action=url.pathname.slice('/api/auction/scan/'.length);
   if(!url.pathname.startsWith('/api/auction/scan/')||!['start','page','complete','fail'].includes(action))return bad('not found',404);
   return upload(request,env,action);
 }
 if(request.method==='GET')return readApi(url,env);
 return bad('method not allowed',405);
}
export async function auctionCleanup(env){
 // Retain the three latest complete scans for movement comparisons; historical prices are compact daily rows.
 const db=env.DB;
 await db.prepare("DELETE FROM ah_listings WHERE scan_id IN (SELECT scan_id FROM ah_scans WHERE status='failed' OR (status='uploading' AND started_at<strftime('%Y-%m-%dT%H:%M:%fZ','now','-2 days')) OR (status='complete' AND scan_id NOT IN (SELECT scan_id FROM ah_scans WHERE status='complete' ORDER BY completed_at DESC LIMIT 3)))").run();
 await db.prepare("DELETE FROM ah_pages WHERE scan_id NOT IN (SELECT scan_id FROM ah_scans WHERE status='uploading' OR (status='complete' AND scan_id IN (SELECT scan_id FROM ah_scans WHERE status='complete' ORDER BY completed_at DESC LIMIT 3)))").run();
 await db.prepare("DELETE FROM ah_item_points WHERE scan_id NOT IN (SELECT scan_id FROM ah_scans WHERE status='complete' ORDER BY completed_at DESC LIMIT 3)").run();
 await db.prepare("DELETE FROM ah_scans WHERE status='failed' AND started_at<strftime('%Y-%m-%dT%H:%M:%fZ','now','-7 days')").run();
 await db.prepare("DELETE FROM ah_scans WHERE status='complete' AND scan_id NOT IN (SELECT scan_id FROM ah_scans WHERE status='complete' ORDER BY completed_at DESC LIMIT 3)").run();
 await db.prepare("DELETE FROM ah_daily WHERE day < date('now','-365 days')").run();
}
