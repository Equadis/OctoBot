// Convert a verified local copy of the existing D1 SQLite database into R2 objects.
import {DatabaseSync} from 'node:sqlite';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {partitionListings,recordSeen,buildPartition,closeAuctionDay,projectListings,PARTITIONS,MAX_LISTINGS} from './auction-snapshot-data.mjs';
import {MAX_OBJECT_BYTES,prefix} from './auction-r2.mjs';

const [input,output]=process.argv.slice(2);
if(!input||!output)throw new Error('Usage: node seed-auction-snapshots.mjs verified.sqlite output-directory');
const db=new DatabaseSync(input,{readOnly:true});
const values=(sql,...args)=>db.prepare(sql).all(...args);
function lookups(rows,group){
 const result=Array.from({length:PARTITIONS},()=>({}));
 for(const row of rows)group(result,row);
 return result;
}
const makeKey=row=>row.item_id+':'+row.variant;
for(const [realm,ns,name] of [["N'Zoth",'ah_','nzoth'],["Y'Shaarj",'pvp_ah_','yshaarj']]){
 const scans=values("SELECT * FROM "+ns+"scans WHERE status='complete' ORDER BY completed_at DESC,scan_id DESC LIMIT 3");
 const latest=scans[0];
 if(!latest)throw new Error('No completed legacy scan for '+realm);
 const current=values('SELECT * FROM '+ns+'listings WHERE scan_id=? ORDER BY auction_id',latest.scan_id);
 if(current.length!==latest.auction_count||current.length>MAX_LISTINGS)throw new Error('Incomplete or oversized legacy scan for '+realm);
 for(const row of current)if(row.owner_guid==='0')row.owner_guid=null;
 const historical=lookups(values('SELECT item_id,variant,day,representative_unit,quantity,listings FROM '+ns+'daily'),(parts,row)=>{
  (parts[row.item_id%PARTITIONS][makeKey(row)]??={})[row.day]=[row.representative_unit,row.quantity,row.listings];
 });
 const meta=lookups(values('SELECT * FROM '+ns+'item_metadata'),(parts,row)=>{
  const {item_id,resolved_at,...fields}=row;
  parts[item_id%PARTITIONS][item_id]=fields;
 });
 const ledger=lookups(db.prepare('SELECT auction_id,first_seen_at FROM '+ns+'first_seen').iterate(),(parts,row)=>{
  parts[row.auction_id%PARTITIONS][row.auction_id]=row.first_seen_at;
 });
 const archivedTotal=values('SELECT auction_count FROM '+ns+'historical_total WHERE id=1')[0]?.auction_count;
 const ledgerSize=ledger.reduce((sum,part)=>sum+Object.keys(part).length,0);
 if(archivedTotal!==ledgerSize)throw new Error('Historical total differs from the verified ledger for '+realm);
 const sampleSql='SELECT auction_id,item_id,variant,CAST(buyout AS REAL)/quantity unit FROM '+ns+'listings WHERE scan_id=? AND buyout>0 AND quantity>0';
 const prior=scans.slice(1).map(scan=>lookups(values(sampleSql,scan.scan_id),(parts,row)=>{
  (parts[row.item_id%PARTITIONS][makeKey(row)]??=[]).push([row.auction_id,row.unit]);
 }));
 const priorUnits=lookups(scans[1]?values('SELECT item_id,variant,unit_buyout FROM '+ns+'item_points WHERE scan_id=?',scans[1].scan_id):[],(parts,row)=>{
  if(row.unit_buyout!=null)parts[row.item_id%PARTITIONS][makeKey(row)]=row.unit_buyout;
 });
 const sellers={};
 for(const row of db.prepare('SELECT * FROM '+ns+'seller_names').iterate()){
  sellers[row.owner_guid]={name:row.character_name,at:Date.parse(row.attempted_at)};
 }
 if(!/^[A-Za-z0-9_-]{8,80}$/.test(latest.scan_id))throw new Error('Invalid legacy scan ID');
 const base=prefix(realm), generation=base+'versions/import-'+latest.scan_id;
 const files={}, directory=join(output,name);
 await mkdir(directory,{recursive:true});
 const write=async(key,value)=>{
  const bytes=Buffer.from(JSON.stringify(value));
  if(bytes.length>MAX_OBJECT_BYTES)throw new Error(key+' exceeds snapshot partition size');
  const content=gzipSync(bytes);
  const file=key.slice(base.length).replaceAll('/','-')+'.json.gz';
  await writeFile(join(directory,file),content);
  files[key]={file,bytes:content.length,md5:createHash('md5').update(content).digest('hex')};
 };
 const {byItem,byAuction}=partitionListings(current);
 const catalogue=[],filters={},days=new Set(),day=latest.completed_at.slice(0,10);
 let hasDayPoints=false;
 for(let i=0;i<PARTITIONS;i++){
  const recorded=recordSeen(byAuction[i],{timestamps:ledger[i]},latest.completed_at);
  if(recorded.firstSeen)throw new Error('Legacy scan has missing first-seen entries for '+realm);
  await write(generation+'/seen/'+i,recorded.ledger);
  const dayPoints=Object.fromEntries(Object.entries(historical[i]).filter(([,points])=>points[day]).map(([key,points])=>[key,points[day]]));
  const closed=closeAuctionDay(historical[i],null,day);
  const value=buildPartition(byItem[i],{day,dayPoints,baselines:closed.baselines,metadata:meta[i],prices:prior[0]?.[i],
   olderPrices:prior[1]?.[i],units:priorUnits[i]},latest.completed_at);
  catalogue.push(...value.items);
  Object.assign(filters,projectListings(value.details));
  for(const date of closed.days)days.add(date);
  if(Object.keys(value.state.dayPoints).length)hasDayPoints=true;
  await write(generation+'/archive/'+i,closed.history);
  await write(generation+'/state/'+i,value.state);
  await write(generation+'/details/'+i,value.details);
 }
 await write(generation+'/catalogue',catalogue);
 await write(generation+'/filters',filters);
 const sellerCounts={};
 for(const row of current)if(row.owner_guid)sellerCounts[row.owner_guid]=(sellerCounts[row.owner_guid]??0)+1;
 await write(generation+'/sellers',sellerCounts);
 await write(generation+'/recovery',{metadata:{},sellers});
 const manifest={files,latest:{generation,scan_id:latest.scan_id,completed_at:latest.completed_at,
  auction_count:latest.auction_count,total_historical_auctions:ledgerSize,item_count:catalogue.length,
  items_with_metadata:catalogue.filter(row=>row.class_id!==null).length,scan_duration_ms:latest.duration_ms,
  historical_days:days.size+Number(hasDayPoints),archived_days:[...days],snapshot_quality:latest.scan_id.startsWith('ahl_')?'live_estimate':'strict'}};
 await writeFile(join(directory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log(realm+': '+current.length+' current listings, '+ledgerSize+' historical auctions and '+days.size+' price days.');
}
db.close();
