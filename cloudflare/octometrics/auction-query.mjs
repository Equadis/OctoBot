/* Builds the Auction House item-list query. Pure function: no database access, so every filter can be tested.
 *
 * Two kinds of filter:
 *  - Item filters (name, rarity, required level, class, slot, market %, favourites) never change which listing
 *    represents an item, so they use the precomputed per-scan item points.
 *  - Listing filters (unit buyout cap, unit bid cap, stack size, time left, buyout only, seller) change which
 *    listings count. When any is active, quantity, listing count and prices are recomputed from only the
 *    matching listings (Aux behaves the same way), and price movement is withheld because it would compare
 *    different sets of listings.
 * Unknown metadata never matches a metadata filter: an item the catalogue does not describe is not guessed at.
 * D1 allows at most 100 bound parameters per statement, so favourites travel as ONE JSON parameter. */
const int=(s,min,max)=>{
  if(s===null||s==='')return undefined;
  const n=Number(s);
  return Number.isSafeInteger(n)&&n>=min&&n<=max?n:null;      // null = invalid
};
export const TIME_BUCKETS=Object.freeze({
  short:[0,30*60e3],medium:[30*60e3,2*3600e3],long:[2*3600e3,12*3600e3],very_long:[12*3600e3,Infinity]
});
export const MAX_FAVOURITE_KEYS=100;
export function parseKeys(raw){
  if(raw===null||raw===undefined||raw==='')return [];
  const keys=[];
  for(const part of raw.split(',')){
    const m=/^(\d{1,10}):((?:\d{1,10}:\d{1,10}:\d{1,10})?)$/.exec(part);
    if(!m||!Number.isSafeInteger(Number(m[1]))||Number(m[1])<1)return null;
    if(!keys.some(k=>k[0]===Number(m[1])&&k[1]===m[2]))keys.push([Number(m[1]),m[2]]);
  }
  return keys.length>MAX_FAVOURITE_KEYS?null:keys;
}
const SORTS={
  recent:{expr:'latest_listing_seen_at',dir:'DESC',nullable:true},
  name:{expr:"COALESCE(item_name,'Item #'||item_id) COLLATE NOCASE",dir:'ASC'},
  unit_buyout:{expr:'unit_buyout',dir:'ASC',nullable:true},
  stack_buyout:{expr:'(CASE WHEN stack_buyout>0 THEN stack_buyout END)',dir:'ASC',nullable:true},
  current_bid:{expr:'(CASE WHEN current_bid>0 THEN current_bid WHEN start_bid>0 THEN start_bid END)',dir:'ASC',nullable:true},
  historical_avg:{expr:'(CASE WHEN days>=4 THEN avg_unit END)',dir:'ASC',nullable:true},
  quantity:{expr:'quantity',dir:'DESC'},
  listings:{expr:'listings',dir:'DESC'},
  trend_pct:{expr:'trend_pct',dir:'ASC',nullable:true},
  market_pct:{expr:'market_pct',dir:'ASC',nullable:true},
  time_left:{expr:"(CASE WHEN time_left_ms IS NOT NULL AND captured_at IS NOT NULL THEN julianday(captured_at)+time_left_ms/86400000.0 END)",dir:'ASC',nullable:true},
  level:{expr:'req_level',dir:'ASC',nullable:true}
};
export const SORT_NAMES=Object.keys(SORTS);
const META_FIELDS=['item_name','quality','icon_url','item_level','req_level','class_id','subclass_id','slot_id'];
const overlay=(alias)=>META_FIELDS.map(k=>'COALESCE('+alias+'.'+k+',m.'+k+') '+k).join(',');
const COLUMNS="item_id,variant,quantity,listings,unit_buyout,item_name,quality,icon_url,start_bid,current_bid,stack_buyout,time_left_ms,captured_at,item_level,req_level,class_id,subclass_id,slot_id,cheapest_auction_id,latest_listing_seen_at";

/** @returns {{error:string}|{sql:string,countSql:string,binds:any[],listingFiltered:boolean,limit:number,offset:number}} */
export function buildItemsQuery(params,scan,previousScanId,now=Date.now()){
  const get=name=>params.get(name);
  const bad=message=>({error:message});
  const limit=Math.min(100,Math.max(1,Number(get('limit'))||50));
  const offset=Math.min(100000,Math.max(0,Number(get('offset'))||0));
  const q=(get('q')||'').trim().slice(0,80).replace(/[!%_]/g,m=>'!'+m);
  const key=get('sort')||'recent';
  const sort=Object.hasOwn(SORTS,key)?SORTS[key]:null;
  if(!sort)return bad('invalid sort');
  const dirParam=get('dir');
  if(dirParam!==null&&dirParam!=='asc'&&dirParam!=='desc')return bad('invalid dir');
  const dir=dirParam?dirParam.toUpperCase():sort.dir;

  const ints={};
  for(const [name,min,max] of [['quality',0,8],['min_level',0,70],['max_level',0,70],['item_class',0,20],['item_subclass',0,30],['slot',0,40],
     ['min_quantity',1,10000000],['stack',1,100000],['max_unit_buyout',0,4294967295],['max_unit_bid',0,4294967295],['max_market_pct',0,1000000],['min_market_pct',0,1000000]]){
    const v=int(get(name),min,max);
    if(v===null)return bad('invalid '+name);
    if(v!==undefined)ints[name]=v;
  }
  if(ints.min_level!==undefined&&ints.max_level!==undefined&&ints.min_level>ints.max_level)return bad('min_level exceeds max_level');
  if(ints.min_market_pct!==undefined&&ints.max_market_pct!==undefined&&ints.min_market_pct>ints.max_market_pct)return bad('min_market_pct exceeds max_market_pct');
  const timeLeft=get('time_left');
  if(timeLeft!==null&&timeLeft!==''&&!Object.hasOwn(TIME_BUCKETS,timeLeft))return bad('invalid time_left');
  const owner=(get('owner')||'').trim();
  if(owner&&!/^\d{1,20}$/.test(owner))return bad('invalid owner');
  const keys=parseKeys(get('keys'));
  if(keys===null)return bad('invalid keys');
  const hasKeys=get('keys')!==null;                       // keys present but empty = "favourites only, with none"
  const flag=name=>get(name)==='1';

  // ---- listing filters ----
  const lw=['scan_id=?'],lb=[scan.scan_id];
  if(ints.max_unit_buyout!==undefined){lw.push('buyout>0 AND CAST(buyout AS REAL)/quantity<=?');lb.push(ints.max_unit_buyout);}
  if(ints.max_unit_bid!==undefined){lw.push('CAST(CASE WHEN current_bid>0 THEN current_bid ELSE start_bid END AS REAL)/quantity<=?');lb.push(ints.max_unit_bid);}
  if(ints.stack!==undefined){lw.push('quantity=?');lb.push(ints.stack);}
  if(flag('has_buyout'))lw.push('buyout>0');
  if(owner){lw.push('owner_guid=?');lb.push(owner);}
  if(timeLeft){const [lo,hi]=TIME_BUCKETS[timeLeft];
    const remaining="(time_left_ms-MAX(0,ROUND((julianday(?)-julianday(captured_at))*86400000)))";
    const at=new Date(now).toISOString();
    lw.push('time_left_ms IS NOT NULL AND '+remaining+'>?'+(Number.isFinite(hi)?' AND '+remaining+'<=?':''));
    lb.push(at,lo);if(Number.isFinite(hi))lb.push(at,hi);}
  const listingFiltered=lw.length>1;

  const binds=[];
  let pts;
  if(listingFiltered){
    pts="ranked AS (SELECT l.*,CASE WHEN buyout>0 THEN CAST(buyout AS REAL)/quantity END unit,"
      +"ROW_NUMBER() OVER (PARTITION BY item_id,variant ORDER BY CASE WHEN buyout>0 THEN 0 ELSE 1 END,CASE WHEN buyout>0 THEN CAST(buyout AS REAL)/quantity END,auction_id) rn,"
      +"SUM(quantity) OVER (PARTITION BY item_id,variant) qty,COUNT(*) OVER (PARTITION BY item_id,variant) n,MAX((SELECT first_seen_at FROM ah_first_seen f WHERE f.auction_id=l.auction_id)) OVER (PARTITION BY item_id,variant) latest_listing_seen_at "
      +"FROM ah_listings l WHERE "+lw.join(' AND ')+"),"
      +"pts AS (SELECT r.item_id,r.variant,qty quantity,n listings,unit unit_buyout,"+overlay('r')+",start_bid,current_bid,buyout stack_buyout,time_left_ms,captured_at,auction_id cheapest_auction_id,latest_listing_seen_at FROM ranked r LEFT JOIN ah_item_metadata m ON m.item_id=r.item_id WHERE rn=1)";
    binds.push(...lb);
  }else{
    pts="pts AS (SELECT p.item_id,p.variant,p.quantity,p.listings,p.unit_buyout,"+overlay('l')+",l.start_bid,l.current_bid,l.buyout stack_buyout,l.time_left_ms,l.captured_at,p.cheapest_auction_id,(SELECT MAX(f.first_seen_at) FROM ah_listings a JOIN ah_first_seen f ON f.auction_id=a.auction_id WHERE a.scan_id=p.scan_id AND a.item_id=p.item_id AND a.variant=p.variant) latest_listing_seen_at "
      +"FROM ah_item_points p LEFT JOIN ah_listings l ON l.scan_id=p.scan_id AND l.auction_id=p.cheapest_auction_id LEFT JOIN ah_item_metadata m ON m.item_id=p.item_id WHERE p.scan_id=?)";
    binds.push(scan.scan_id);
  }
  const trend=listingFiltered?"NULL":"(CASE WHEN prev.unit_buyout>0 AND d.unit_buyout IS NOT NULL THEN 100*(d.unit_buyout-prev.unit_buyout)/prev.unit_buyout END)";
  const prevJoin=listingFiltered?"":" LEFT JOIN ah_item_points prev ON prev.scan_id=? AND prev.item_id=d.item_id AND prev.variant=d.variant";
  const sql0="WITH history AS (SELECT item_id,variant,AVG(representative_unit) avg_unit,COUNT(*) days FROM ah_daily WHERE day < substr(?,1,10) AND day >= date(?,'-14 days') GROUP BY item_id,variant),"
    +pts+",data AS (SELECT d.*,h.avg_unit,h.days,(CASE WHEN h.days>=4 AND h.avg_unit>0 THEN 100*d.unit_buyout/h.avg_unit END) market_pct,"
    +(listingFiltered?"":"prev.unit_buyout previous_unit,")+trend+" trend_pct FROM pts d LEFT JOIN history h ON h.item_id=d.item_id AND h.variant=d.variant"+prevJoin+")";
  // Bind order follows placeholder order: history (2), pts (listing or point binds), then previous scan.
  const allBinds=[scan.completed_at,scan.completed_at,...binds];
  if(!listingFiltered)allBinds.push(previousScanId||'');
  const sql=listingFiltered?sql0.replace("prev.unit_buyout previous_unit,",""):sql0;

  // ---- item filters ----
  const iw=[],ib=[];
  if(q){
    if(flag('exact')){iw.push("(item_name IS NOT NULL AND item_name=? COLLATE NOCASE)");ib.push(q.replace(/!([!%_])/g,'$1'));}
    else{iw.push("(COALESCE(item_name,'Item #'||item_id) LIKE '%'||?||'%' ESCAPE '!' OR CAST(item_id AS TEXT) LIKE '%'||?||'%' ESCAPE '!')");ib.push(q,q);}
  }
  if(ints.quality!==undefined){iw.push('quality=?');ib.push(ints.quality);}
  if(ints.min_level!==undefined){iw.push('req_level>=?');ib.push(ints.min_level);}
  if(ints.max_level!==undefined){iw.push('req_level<=?');ib.push(ints.max_level);}
  if(ints.item_class!==undefined){iw.push('class_id=?');ib.push(ints.item_class);}
  if(ints.item_subclass!==undefined){iw.push('subclass_id=?');ib.push(ints.item_subclass);}
  if(ints.slot!==undefined){iw.push('slot_id=?');ib.push(ints.slot);}
  if(flag('gear'))iw.push('slot_id>0');
  if(ints.min_quantity!==undefined){iw.push('quantity>=?');ib.push(ints.min_quantity);}
  if(ints.min_market_pct!==undefined){iw.push('market_pct>=?');ib.push(ints.min_market_pct);}
  if(ints.max_market_pct!==undefined){iw.push('market_pct<=?');ib.push(ints.max_market_pct);}
  if(hasKeys){
    if(!keys.length)iw.push('0=1');
    else{iw.push("EXISTS (SELECT 1 FROM json_each(?) j WHERE json_extract(j.value,'$[0]')=item_id AND json_extract(j.value,'$[1]')=variant)");ib.push(JSON.stringify(keys));}
  }
  const where=iw.length?' WHERE '+iw.join(' AND '):'';
  const base=sql+' SELECT '+COLUMNS+',avg_unit,days,market_pct,trend_pct'+(listingFiltered?'':',previous_unit')+' FROM data'+where;
  const order=(sort.nullable?sort.expr+' IS NULL,':'')+sort.expr+' '+dir;
  return {
    sql:base+' ORDER BY '+order+',item_id ASC,variant ASC LIMIT ? OFFSET ?',
    countSql:'SELECT COUNT(*) n FROM ('+base+')',
    binds:[...allBinds,...ib],limit,offset,listingFiltered
  };
}
