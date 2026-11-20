// Shared by the Worker and the browser's cached catalogue.
const ranges = {short:[0,1800000], medium:[1800000,7200000], long:[7200000,43200000], very_long:[43200000,Infinity]};
const fields = {
 quality:['quality',0,8], min_level:['req_level',0,70,'min'], max_level:['req_level',0,70,'max'],
 item_class:['class_id',0,20], item_subclass:['subclass_id',0,30], slot:['slot_id',0,40],
 min_quantity:['quantity',1,10000000,'min'], min_market_pct:['market_pct',0,1000000,'min'],
 max_market_pct:['market_pct',0,1000000,'max'], stack:['quantity',1,100000],
 max_unit_buyout:['unit_buyout',0,4294967295,'max'], max_unit_bid:['unit_bid',0,4294967295,'max']
};
const listingFields = new Set(['stack','max_unit_buyout','max_unit_bid']);
const sortFields = {
 recent:'latest_listing_seen_at', name:'item_name', unit_buyout:'unit_buyout', stack_buyout:'stack_buyout',
 current_bid:'effective_bid', historical_avg:'historical_avg', quantity:'quantity', listings:'listings',
 trend_pct:'trend_pct', market_pct:'market_pct', time_left:'expiry', level:'req_level'
};
const descending = new Set(['recent','quantity','listings']);
export const auctionKey = (id,variant) => id+':'+variant;
const asciiLower = value => value.replace(/[A-Z]/g, letter => letter.toLowerCase());
const name = item => item.item_name ?? 'Item #'+item.item_id;
const effectiveBid = row => row.current_bid > 0 ? row.current_bid : row.start_bid;
const compare = (a,b) => (a>b)-(a<b);
export const listingOrder = (a,b) =>
 (a.unit_buyout==null)-(b.unit_buyout==null) || compare(a.unit_buyout,b.unit_buyout) || a.auction_id-b.auction_id;

export function parseSnapshotQuery(params) {
 const criteria=[], listingCriteria=[];
 for(const [param,[field,lo,hi,operation]] of Object.entries(fields)){
  const raw=params.get(param);
  if(!raw)continue;
  const value=Number(raw);
  if(!Number.isSafeInteger(value)||value<lo||value>hi)return {error:'invalid '+param};
  (listingFields.has(param)?listingCriteria:criteria).push([field,operation,value]);
 }
 for(const field of ['level','market_pct']){
  const min=params.get('min_'+field), max=params.get('max_'+field);
  if(min&&max&&Number(min)>Number(max))return {error:'min_'+field+' exceeds max_'+field};
 }
 const sort=params.get('sort')||'recent', dir=params.get('dir');
 if(!Object.hasOwn(sortFields,sort))return {error:'invalid sort'};
 if(dir!==null&&dir!=='asc'&&dir!=='desc')return {error:'invalid dir'};
 const keys=params.has('keys')?new Set((params.get('keys')||'').split(',').filter(Boolean)):null;
 if(keys&&(keys.size>100||[...keys].some(key=>!/^\d{1,10}:(?:\d{1,10}:\d{1,10}:\d{1,10})?$/.test(key)||Number(key.split(':')[0])<1)))return {error:'invalid keys'};
 const owner=(params.get('owner')||'').trim(), time=params.get('time_left')||'';
 if(owner&&!/^\d{1,20}$/.test(owner))return {error:'invalid owner'};
 if(time&&!Object.hasOwn(ranges,time))return {error:'invalid time_left'};
 const buyout=params.get('has_buyout')==='1';
 return {
  criteria,listingCriteria,owner,time,buyout,keys,listingFiltered:Boolean(owner||time||buyout||listingCriteria.length),
  q:asciiLower((params.get('q')||'').trim().slice(0,80)),exact:params.get('exact')==='1',
  gear:params.get('gear')==='1',sort,direction:(dir??(descending.has(sort)?'desc':'asc'))==='desc'?-1:1,
  limit:Math.min(100,Math.max(1,Math.trunc(Number(params.get('limit')))||50)),
  offset:Math.min(100000,Math.max(0,Math.trunc(Number(params.get('offset')))||0))
 };
}

function matches(value,operation,expected){
 return value!=null&&(operation==='min'?value>=expected:operation==='max'?value<=expected:value===expected);
}

export function selectItemListing(item,listings){
 let quantity=0,latest=null,cheapest=null,stack=null;
 for(const row of listings){
  quantity+=row.quantity;
  if(row.first_seen_at&&(!latest||row.first_seen_at>latest))latest=row.first_seen_at;
  if(!cheapest||listingOrder(row,cheapest)<0)cheapest=row;
  if(row.buyout>0&&(stack===null||row.buyout<stack))stack=row.buyout;
 }
 return {
  ...item,quantity,listings:listings.length,unit_buyout:cheapest?.unit_buyout??null,
  stack_buyout:cheapest?.buyout??null,cheapest_stack_buyout:stack,
  start_bid:cheapest?.start_bid??null,current_bid:cheapest?.current_bid??null,
  time_left_ms:cheapest?.time_left_ms??null,captured_at:cheapest?.captured_at??null,latest_listing_seen_at:latest
 };
}

export function querySnapshot(catalogue,query,groups,now=Date.now()){
 const {criteria,q,exact,keys,gear,listingFiltered,listingCriteria,owner,buyout,time,sort,direction,limit,offset}=query;
 const matchesListing=row=>{
  if((owner&&row.owner_guid!==owner)||(buyout&&row.unit_buyout==null))return false;
  if(!listingCriteria.every(([field,op,value])=>
   matches(field==='unit_bid'?effectiveBid(row)/row.quantity:row[field],op,value)))return false;
  if(!time)return true;
  const remaining=row.time_left_ms==null?null:row.time_left_ms-Math.max(0,now-Date.parse(row.captured_at));
  const [lo,hi]=ranges[time];
  return remaining!==null&&remaining>lo&&remaining<=hi;
 };
 const result=[];
 for(let item of catalogue){
  const key=auctionKey(item.item_id,item.variant);
  if(keys&&!keys.has(key))continue;
  if(gear&&!(item.slot_id>0))continue;
  if(q&&(exact?item.item_name==null||asciiLower(item.item_name)!==q:!asciiLower(name(item)).includes(q)&&!String(item.item_id).includes(q)))continue;
  if(!criteria.every(([field,op,value])=>(listingFiltered&&['quantity','market_pct'].includes(field))||matches(item[field],op,value)))continue;
  if(listingFiltered){
   const rows=(typeof groups==='function'?groups(key):groups[key]||[]).filter(matchesListing);
   if(!rows.length)continue;
   item=selectItemListing(item,rows);
   item.market_pct=item.unit_buyout!==null&&item.historical_avg>0?100*item.unit_buyout/item.historical_avg:null;
   item.trend_pct=item.previous_unit=null;
   if(!criteria.every(([field,op,value])=>matches(item[field],op,value)))continue;
  }
  let value=item[sortFields[sort]];
  if(sort==='name')value=asciiLower(name(item));
  if(sort==='stack_buyout'&&!(value>0))value=null;
  if(sort==='current_bid')value=effectiveBid(item)||null;
  if(sort==='time_left'){
   const expiry=item.time_left_ms==null?null:Date.parse(item.captured_at)+item.time_left_ms;
   value=expiry>now?expiry:null;
  }
  result.push({item,value});
 }
 result.sort((a,b)=>(a.value==null)-(b.value==null)||direction*compare(a.value,b.value)||
  a.item.item_id-b.item.item_id||compare(a.item.variant,b.item.variant));
 return {items:result.slice(offset,offset+limit).map(row=>row.item),total:result.length,
  has_more:offset+limit<result.length,limit,offset,listing_filtered:listingFiltered};
}
