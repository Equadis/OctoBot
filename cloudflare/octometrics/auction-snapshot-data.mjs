import {auctionKey,listingOrder,selectItemListing} from '../../docs/auction-house/snapshot-query.mjs';
import {MIN_PRICE_LISTINGS,MIN_OUTLIER_LISTINGS,HIGH_PRICE_MULTIPLIER} from './auction-query.mjs';

export const PARTITIONS=16;
export const HISTORY_DAYS=365;
export const MAX_LISTINGS=60000;
const price=row=>row.buyout>0?row.buyout/row.quantity:null;
const average=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const metadataFields=['item_name','quality','icon_url','item_level','req_level','class_id','subclass_id','slot_id'];
function before(day,n){
 return new Date(Date.parse(day)-n*86400000).toISOString().slice(0,10);
}
function dailyAverage(history,day){
 const cutoff=before(day,14);
 const daily=Object.entries(history).filter(([date])=>date>=cutoff&&date<day).map(([,point])=>point[0]);
 return [daily.length,daily.length?average(daily):null];
}
export function marketBaseline(item,priorPrices,history,day,dailySummary){
 const [days,daily]=dailySummary??dailyAverage(history,day);
 const distinct=new Map();
 for(const observations of [priorPrices[1],priorPrices[0],item]){
  for(const [id,unit] of observations||[])distinct.set(id,unit);
 }
 const values=[...distinct.values()].sort((a,b)=>a-b), n=values.length;
 const median=(values[Math.floor((n-1)/2)]+values[Math.floor(n/2)])/2;
 const retained=n<MIN_OUTLIER_LISTINGS?values:values.filter(value=>value<=median*HIGH_PRICE_MULTIPLIER);
 const recent=retained.length>=MIN_PRICE_LISTINGS, dailyEnough=days>=4;
 return {
  historical_avg:recent?average(retained):dailyEnough?daily:null,
  historical_days:days,average_samples:n,average_excluded:recent?n-retained.length:0,
  average_source:recent?'recent_listings':dailyEnough?'daily_lows':null
 };
}

export function partitionListings(listings){
 const byItem=Array.from({length:PARTITIONS},()=>({}));
 const byAuction=Array.from({length:PARTITIONS},()=>[]);
 for(const row of listings){
  const key=auctionKey(row.item_id,row.variant);
  (byItem[row.item_id%PARTITIONS][key]??=[]).push(row);
  byAuction[row.auction_id%PARTITIONS].push(row);
 }
 return {byItem,byAuction};
}

export function recordSeen(rows,previous,completed){
 let firstSeen=0;
 const timestamps=previous.timestamps??{};
 const active={}, counts={new:0,changed:0,unchanged:0,disappeared:0};
 for(const row of rows){
  if(timestamps[row.auction_id]===undefined){
   timestamps[row.auction_id]=completed;
   firstSeen++;
  }
  row.first_seen_at=timestamps[row.auction_id];
  const fingerprint=JSON.stringify([row.item_id,row.variant,row.quantity,row.start_bid,row.current_bid,row.min_next_bid,row.buyout,row.owner_guid]);
  active[row.auction_id]=fingerprint;
  const prior=previous.active?.[row.auction_id];
  counts[prior===undefined?'new':prior===fingerprint?'unchanged':'changed']++;
 }
 for(const id of Object.keys(previous.active??{}))if(!Object.hasOwn(active,id))counts.disappeared++;
 return {firstSeen,counts,ledger:{timestamps,active}};
}

// Listing filters need a narrow projection, never the complete detail objects.
export function projectListings(details){
 const projection={};
 for(const [key,rows] of Object.entries(details)){
  projection[key]=rows.map(row=>[row.auction_id,row.quantity,row.start_bid,row.current_bid,row.buyout,row.owner_guid,
   row.time_left_ms,row.captured_at,row.first_seen_at,row.unit_buyout]);
 }
 return projection;
}

export function expandProjection(rows){
 return rows?.map(([auction_id,quantity,start_bid,current_bid,buyout,owner_guid,time_left_ms,captured_at,first_seen_at,unit_buyout])=>({
  auction_id,quantity,start_bid,current_bid,buyout,owner_guid,time_left_ms,captured_at,first_seen_at,unit_buyout
 }))??[];
}

export function closeAuctionDay(history,active,day){
 const cutoff=before(day,HISTORY_DAYS-1);
 if(active?.day&&active.day<day){
  for(const [key,point] of Object.entries(active.dayPoints??{})){
   (history[key]??={})[active.day]=point;
  }
 }
 const days=new Set(), baselines={};
 for(const [key,points] of Object.entries(history)){
  for(const date of Object.keys(points)){
   if(date<cutoff||date>=day)delete points[date];
   else days.add(date);
  }
  if(Object.keys(points).length){
   const summary=dailyAverage(points,day);
   if(summary[0])baselines[key]=summary;
  }else delete history[key];
 }
 return {history,baselines,days:[...days]};
}

export function buildPartition(groups,previous,completed){
 const day=completed.slice(0,10);
 const prices={},items=[],details={},metadata=previous.metadata||{};
 const dayPoints=previous.day===day?previous.dayPoints??{}:{};
 const baselines=previous.baselines??{};
 for(const [key,rows] of Object.entries(groups)){
  const sample=[],itemId=rows[0].item_id,known=metadata[itemId]??={};
  for(const row of rows){
   for(const field of metadataFields)if(row[field]!=null)known[field]=row[field];
   row.unit_buyout=price(row);
   if(row.unit_buyout!=null)sample.push([row.auction_id,row.unit_buyout]);
  }
  rows.sort(listingOrder);
  prices[key]=sample;
  const baseline=marketBaseline(sample,[previous.prices?.[key],previous.olderPrices?.[key]],{},day,baselines[key]??[0,null]);
  const first=rows[0];
  const item=selectItemListing({item_id:first.item_id,variant:first.variant,
   ...Object.fromEntries(metadataFields.map(field=>[field,first[field]??known[field]??null])),...baseline},rows);
  const previousUnit=previous.units?.[key]??null;
  item.previous_unit=previousUnit;
  item.trend_pct=previousUnit>0&&item.unit_buyout!=null?100*(item.unit_buyout-previousUnit)/previousUnit:null;
  item.market_pct=item.historical_avg>0&&item.unit_buyout!=null?100*item.unit_buyout/item.historical_avg:null;
  if(item.unit_buyout!=null){
   dayPoints[key]=[Math.min(dayPoints[key]?.[0]??Infinity,item.unit_buyout),item.quantity,item.listings];
  }
  items.push(item);
  details[key]=rows.map(({auction_id,quantity,start_bid,current_bid,min_next_bid,buyout,owner_guid,time_left_ms,captured_at,first_seen_at,unit_buyout})=>({
   auction_id,quantity,start_bid,current_bid,min_next_bid,buyout,owner_guid,time_left_ms,captured_at,first_seen_at,unit_buyout
  }));
 }
 return {items,details,state:{prices,olderPrices:previous.prices||{},day,dayPoints,baselines,metadata,
  units:Object.fromEntries(items.filter(item=>item.unit_buyout!=null).map(item=>[auctionKey(item.item_id,item.variant),item.unit_buyout]))}};
}
