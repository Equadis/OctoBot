import {auctionKey, parseSnapshotQuery, querySnapshot} from '../../docs/auction-house/snapshot-query.mjs';
import {PARTITIONS, MAX_LISTINGS, partitionListings, recordSeen, buildPartition, closeAuctionDay, projectListings, expandProjection} from './auction-snapshot-data.mjs';
import {AuctionError, AUCTION_HOUR, MAX_SCAN_MS, SLOT_GRACE, MAX_BODY_BYTES, MAX_OBJECT_BYTES, prefix, getJson, requireJson, readJson, putGzip, compareAndPut} from './auction-r2.mjs';
import {verifyAuctionBudget, setAuctionBudget} from './auction-budget.mjs';

const META=['item_name','quality','icon_url','item_level','req_level','class_id','subclass_id','slot_id'];
const integer=(n,min=0,max=4294967295)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const variantValid=value=>typeof value==='string'&&/^(?:\d{1,10}:\d{1,10}:\d{1,10})?$/.test(value);
const guidValid=value=>typeof value==='string'&&/^\d{1,20}$/.test(value)&&value!=='0';
const idValid=value=>typeof value==='string'&&/^ahl_[a-z0-9_]{12,64}$/.test(value);
const headers={'Access-Control-Allow-Origin':'https://equadis.github.io','Access-Control-Expose-Headers':'ETag','Content-Type':'application/json; charset=utf-8'};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{...headers,'Cache-Control':'no-store'}});
const iso=ms=>new Date(ms).toISOString();
const paused=(env,name)=>env[name]==='true';
const partKey=(generation,type,index)=>generation+'/'+type+'/'+index;
const FINALISE_LEASE=120000;
const parts=Array.from({length:PARTITIONS},(_,i)=>i);

function assert(condition,message,status=400){
 if(!condition)throw new AuctionError(message,status);
}

function metadata(raw){
 if(!raw||typeof raw!=='object')return {};
 const result={};
 for(const [field,max] of [['quality',8],['item_level',200],['req_level',70],['class_id',20],['subclass_id',30],['slot_id',40]]){
  if(integer(raw[field],0,max))result[field]=raw[field];
 }
 if(typeof raw.item_name==='string'&&raw.item_name.trim()&&raw.item_name.length<=160)result.item_name=raw.item_name;
 if(typeof raw.icon_url==='string'&&/^https:\/\//.test(raw.icon_url)&&raw.icon_url.length<=400)result.icon_url=raw.icon_url;
 return result;
}

function scanListings(body,claim,now){
 const completed=Date.parse(body.completed_at), started=Date.parse(body.started_at);
 assert(Number.isFinite(completed)&&Number.isFinite(started)&&started>=claim.slot&&started<claim.slot+SLOT_GRACE&&
  completed>=started&&completed<=now+60000&&completed<=claim.slot+MAX_SCAN_MS,'invalid scan times');
 assert(integer(body.expected_pages,1,20000)&&integer(body.reported_total,0,1000000)&&
  integer(body.final_total,0,1000000)&&integer(body.traversed,0,1000000)&&integer(body.final_page_count,0,50)&&
  body.traversed===50*(body.expected_pages-1)+body.final_page_count&&body.traversed>=body.final_total&&
  Array.isArray(body.items)&&body.items.length<=MAX_LISTINGS&&body.items.length<=body.traversed&&
  (body.traversed===0?body.items.length===0:body.items.length>0),'incomplete auction traversal');
 const unique=new Set();
 for(const row of body.items){
  const captured=Date.parse(row?.captured_at);
  assert(row&&integer(row.auction_id,1)&&integer(row.item_id,1)&&variantValid(row.variant)&&integer(row.quantity,1,100000)&&
   [row.start_bid,row.current_bid,row.min_next_bid,row.buyout,row.time_left_ms].every(n=>n===null||integer(n))&&
   (row.owner_guid===null||guidValid(row.owner_guid))&&Number.isFinite(captured)&&captured>=started&&captured<=completed&&
   !unique.has(row.auction_id),'invalid or duplicate auction listing');
  unique.add(row.auction_id);
 }
 return body.items.map(row=>({
  ...metadata(body.metadata?.[row.item_id]), auction_id:row.auction_id,item_id:row.item_id,variant:row.variant,
  quantity:row.quantity,start_bid:row.start_bid,current_bid:row.current_bid,min_next_bid:row.min_next_bid,buyout:row.buyout,
  owner_guid:row.owner_guid,time_left_ms:row.time_left_ms,captured_at:row.captured_at
 }));
}

function status(control,now){
 const claim=control?.claim;
 const live=claim&&['scanning','finalising'].includes(claim.phase)&&now<claim.slot+MAX_SCAN_MS;
 const recent=live&&now-(claim.progress?.at??claim.claimed_at)<120000;
 return {scanning:Boolean(live),collector_status:recent?'ONLINE':live?'STALE':'OFFLINE',
  pages_done:live?claim.progress?.pages_done??0:0,pages_expected:live?claim.progress?.pages_expected??null:null,
  started_at:live?iso(claim.claimed_at):null,scan_id:control?.latest?.scan_id??null};
}

async function claimScan(bucket,key,env,body,control,now){
 const slot=Math.floor(now/AUCTION_HOUR)*AUCTION_HOUR;
 assert(body.slot===slot&&now-slot<SLOT_GRACE,'outside UTC scan window',409);
 const state=control?.value??{};
 const previous=state.claim;
 if(previous?.slot===slot&&previous.id===body.scan_id&&previous.phase==='scanning')return {ok:true,duplicate:true};
 assert(!previous||previous.slot<slot,'UTC scan slot already claimed',409);
 assert(previous?.phase!=='finalising'||now-previous.finalising_at>=FINALISE_LEASE,'previous auction scan is still finalising',409);
 assert(state.latest||state.seed||env.AUCTION_ALLOW_EMPTY_HISTORY==='true','auction history import required',503);
 assert(!paused(env,'AUCTION_COLLECTION_PAUSED'),'auction collection paused',503);
 await verifyAuctionBudget(bucket,env,now);
 const claim={id:body.scan_id,slot,phase:'scanning',claimed_at:now};
 assert(await compareAndPut(bucket,key,control?.etag,{...state,claim}),'UTC scan slot already claimed',409);
 return {ok:true};
}

async function updateClaim(bucket,key,control,claim){
 assert(await compareAndPut(bucket,key,control.etag,{...control.value,claim}),'auction scan state changed',409);
}

async function readPrior(bucket,state,section,index){
 if(state.latest){
  const key=section==='seen'?state.latest.seen_keys?.[index]:null;
  return requireJson(bucket,key??partKey(state.latest.generation,section,index));
 }
 if(state.seed)return requireJson(bucket,partKey(state.seed,section,index));
 return {};
}

async function publishScan(bucket,key,env,body,control,now){
 const state=control.value, claim=state.claim;
 if(state.latest?.scan_id===body.scan_id){
  assert(state.latest.completed_at===body.completed_at,'completion does not match published scan',409);
  return {ok:true,duplicate:true,auction_count:state.latest.auction_count};
 }
 assert(claim?.id===body.scan_id&&['scanning','finalising'].includes(claim.phase)&&now<claim.slot+MAX_SCAN_MS,'no active auction claim',409);
 assert(claim.phase!=='finalising'||now-claim.finalising_at>=FINALISE_LEASE,'auction snapshot finalisation in progress',425);
 assert((claim.attempt??0)<3,'auction finalisation retry limit reached',409);
 assert(!paused(env,'AUCTION_HISTORY_PAUSED'),'auction historical calculation paused',503);
 await verifyAuctionBudget(bucket,env,now);
 const listings=scanListings(body,claim,now);
 const wallStart=Date.now();
 const generation=key.replace(/control$/,'versions/')+body.scan_id+'-'+crypto.randomUUID();
 const finalising={...claim,phase:'finalising',finalising_at:now,generation,attempt:(claim.attempt??0)+1};
 const lock=await compareAndPut(bucket,key,control.etag,{...state,claim:finalising});
 assert(lock,'auction snapshot finalisation in progress',425);
 const written=[];
 let packedBytes=0;
 const write=async(path,value)=>{
  packedBytes+=await putGzip(bucket,path,value);
  written.push(path);
 };
 try{
  const {byItem,byAuction}=partitionListings(listings);
  const recovered=await readRecovery(bucket,key.replace(/control$/,''),state);
  const sellerCounts={};
  for(const row of listings)if(row.owner_guid)sellerCounts[row.owner_guid]=(sellerCounts[row.owner_guid]??0)+1;
  let newCount=0;
  const changes={new:0,changed:0,unchanged:0,disappeared:0}, seenKeys=[];
  for(const i of parts){
   const seen=await readPrior(bucket,state,'seen',i);
   const updated=recordSeen(byAuction[i],seen,body.completed_at);
   newCount+=updated.firstSeen;
   for(const category of Object.keys(changes))changes[category]+=updated.counts[category];
   const priorKey=state.latest?.seen_keys?.[i]??(state.latest?partKey(state.latest.generation,'seen',i):null);
   if(priorKey&&!updated.firstSeen&&!updated.counts.new&&!updated.counts.changed&&!updated.counts.disappeared){
    seenKeys.push(priorKey);
   }else{
    const path=partKey(generation,'seen',i);
    await write(path,updated.ledger);
    seenKeys.push(path);
   }
  }
  const catalogue=[], filterListings={}, archiveKeys=[], day=body.completed_at.slice(0,10);
  const sameDay=state.latest?.completed_at.slice(0,10)===day;
  const days=new Set(sameDay?state.latest.archived_days:[]);
  let hasDayPoints=false;
  for(const i of parts){
   const previous=await readPrior(bucket,state,'state',i);
   if(!sameDay){
    const priorKey=state.latest?.archive_keys?.[i];
    const priorHistory=priorKey?await requireJson(bucket,priorKey):{};
    const closed=closeAuctionDay(priorHistory,previous,day);
    previous.baselines=closed.baselines;
    for(const date of closed.days)days.add(date);
    const path=partKey(generation,'archive',i);
    await write(path,closed.history);
    archiveKeys.push(path);
   }else archiveKeys.push(state.latest.archive_keys[i]);
   previous.metadata??={};
   for(const [id,entry] of Object.entries(recovered.metadata??{})){
    if(Number(id)%PARTITIONS===i)previous.metadata[id]={...previous.metadata[id],...entry.fields};
   }
   const built=buildPartition(byItem[i],previous,body.completed_at);
   catalogue.push(...built.items);
   Object.assign(filterListings,projectListings(built.details));
   if(Object.keys(built.state.dayPoints).length)hasDayPoints=true;
   await write(partKey(generation,'details',i),built.details);
   await write(partKey(generation,'state',i),built.state);
  }
  await write(generation+'/catalogue',catalogue);
  await write(generation+'/filters',filterListings);
  await write(generation+'/sellers',sellerCounts);
  const latest={
   generation,seen_keys:seenKeys,archive_keys:archiveKeys,archived_days:[...days],listing_changes:changes,scan_id:body.scan_id,completed_at:body.completed_at,auction_count:listings.length,
   total_historical_auctions:(state.latest?.total_historical_auctions??state.seed_total??0)+newCount,
   item_count:catalogue.length,items_with_metadata:catalogue.filter(row=>row.class_id!==null).length,
   scan_duration_ms:Date.parse(body.completed_at)-Date.parse(body.started_at),historical_days:days.size+Number(hasDayPoints),snapshot_quality:'live_estimate'
  };
  const old=state.retained??[];
  const retained=[latest,...old].slice(0,3);
  const published=await compareAndPut(bucket,key,lock.etag,{...state,latest,claim:{id:claim.id,slot:claim.slot,phase:'complete'},retained});
  assert(published,'auction publication superseded',409);
  // Current and previous versions can serve in-flight requests. Delete only known superseded versions.
  if(!paused(env,'AUCTION_MAINTENANCE_PAUSED')){
   const obsolete=old.slice(2);
   const liveKeys=new Set(retained.flatMap(entry=>[...(entry.seen_keys??[]),...(entry.archive_keys??[])]));
   const deletions=new Set();
   for(const entry of obsolete){
    deletions.add(entry.generation+'/catalogue');
    deletions.add(entry.generation+'/filters');
    deletions.add(entry.generation+'/sellers');
    for(const i of parts){
     deletions.add(partKey(entry.generation,'state',i));
     deletions.add(partKey(entry.generation,'details',i));
     const seenKey=entry.seen_keys?.[i]??partKey(entry.generation,'seen',i);
     if(!liveKeys.has(seenKey))deletions.add(seenKey);
     const archiveKey=entry.archive_keys?.[i]??partKey(entry.generation,'archive',i);
     if(!liveKeys.has(archiveKey))deletions.add(archiveKey);
    }
   }
   if(claim.generation){
    deletions.add(claim.generation+'/catalogue');
    deletions.add(claim.generation+'/filters');
    deletions.add(claim.generation+'/sellers');
    for(const i of parts)for(const type of ['state','seen','details','archive'])deletions.add(partKey(claim.generation,type,i));
   }
   if(deletions.size)try{await bucket.delete([...deletions]);}
   catch(error){console.warn('Auction snapshot retention deferred',String(error).slice(0,160));}
  }
  if(env.AUCTION_ARCHIVE_RAW==='true'&&!paused(env,'AUCTION_MAINTENANCE_PAUSED')){
   try{await putGzip(bucket,key.replace(/control$/,'archive/')+body.scan_id,body,MAX_BODY_BYTES);}
   catch(error){console.warn('Auction archival deferred',String(error).slice(0,160));}
  }
  console.log(JSON.stringify({event:'auction_snapshot_published',realm:key.split('/')[2],scan_id:latest.scan_id,
   listings:latest.auction_count,items:catalogue.length,changes,d1_rows_read:0,d1_rows_written:0,
   snapshot_objects:written.length,snapshot_bytes:packedBytes,publication_wall_ms:Date.now()-wallStart}));
  return {ok:true,auction_count:latest.auction_count,scan_id:latest.scan_id};
 }catch(error){
  // A pointer write can time out after committing. Cleanup cannot delete that generation.
  const current=await getJson(bucket,key).catch(()=>null);
  if(current?.value.latest?.generation===generation)return {ok:true,duplicate:true,auction_count:listings.length};
  if(current?.etag===lock.etag){
   const reset={...claim,phase:'scanning',attempt:finalising.attempt};
   if(await compareAndPut(bucket,key,lock.etag,{...state,claim:reset}).catch(()=>null)){
    await bucket.delete(written).catch(()=>{});
   }
  }
  throw error;
 }
}

async function recover(bucket,base,state,latest,body,action,now){
 assert(latest?.scan_id===body.scan_id,'recovery requires the latest completed scan',409);
 const key=base+'recovery';
 const recovery=await getJson(bucket,key);
 const current=recovery?.value??await readRecovery(bucket,base,state);
 const isSeller=action==='seller-names';
 const rows=isSeller?body.sellers:body.items;
 assert(Array.isArray(rows)&&rows.length>0&&rows.length<=50,'invalid recovery batch');
 const byPartition=new Map();
 const sellers=isSeller?await requireJson(bucket,latest.generation+'/sellers'):null;
 for(const row of rows){
  if(isSeller){
   assert(guidValid(row?.owner_guid)&&(row.character_name===null||
    typeof row.character_name==='string'&&/^\p{L}{1,24}$/u.test(row.character_name)),'invalid seller');
   assert(Object.hasOwn(sellers,row.owner_guid),'seller not observed in scan',409);
   current.sellers[row.owner_guid]={name:row.character_name??current.sellers[row.owner_guid]?.name??null,at:now};
  }else{
   assert(integer(row?.item_id,1)&&metadata(row).item_name,'invalid metadata item');
   const i=row.item_id%PARTITIONS;
   (byPartition.get(i)??byPartition.set(i,[]).get(i)).push(row.item_id);
   current.metadata[row.item_id]={fields:{...current.metadata[row.item_id]?.fields,...metadata(row)},at:now};
  }
 }
 for(const [i,ids] of byPartition){
  const details=await requireJson(bucket,partKey(latest.generation,'details',i));
  const observed=new Set(Object.keys(details).map(key=>Number(key.split(':')[0])));
  assert(ids.every(id=>observed.has(id)),'metadata item not observed in scan',409);
 }
 // Preserve recovered metadata in the versioned state. Drop retry notes after 30 days.
 for(const [id,entry] of Object.entries(current.metadata))if(now-entry.at>30*86400000)delete current.metadata[id];
 for(const [guid,entry] of Object.entries(current.sellers))if(now-entry.at>90*86400000)delete current.sellers[guid];
 assert(new TextEncoder().encode(JSON.stringify(current)).length<=MAX_OBJECT_BYTES,'auction recovery exceeds byte budget',503);
 assert(await compareAndPut(bucket,key,recovery?.etag,current),'auction recovery updated concurrently',425);
 return {ok:true};
}

async function recoveryCandidates(bucket,base,state,latest,action,now){
 const result={scan_id:latest?.scan_id??null};
 if(!latest)return {...result,[action==='missing-sellers'?'sellers':'items']:[]};
 const recovery=await readRecovery(bucket,base,state);
 if(action==='missing-sellers'){
  const counts=await requireJson(bucket,latest.generation+'/sellers');
  const due=([id])=>{
   const known=recovery.sellers?.[id];
   return !known||now-known.at>(known.name?30*86400000:21600000);
  };
  return {...result,sellers:Object.entries(counts).filter(due).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,30)
   .map(([owner_guid,listings])=>({owner_guid,listings}))};
 }
 const catalogue=await requireJson(bucket,latest.generation+'/catalogue'), counts=new Map();
 for(const item of catalogue){
  const known=recovery.metadata?.[item.item_id];
  const missing=field=>item[field]==null&&known?.fields?.[field]==null;
  const needs=action==='missing-metadata'?missing('item_name'):META.filter(field=>field!=='slot_id').some(missing);
  if(!needs||known&&now-known.at<1800000)continue;
  const entry=counts.get(item.item_id)??{item_id:item.item_id,listings:0,missing_name:Number(missing('item_name'))};
  entry.listings+=item.listings;
  counts.set(item.item_id,entry);
 }
 return {...result,items:[...counts.values()].sort((a,b)=>b.missing_name-a.missing_name||b.listings-a.listings||a.item_id-b.item_id).slice(0,1000)};
}

function publicManifest(state,now){
 const {generation,seen_keys,archive_keys,archived_days,...summary}=state?.latest??{};
 return {...summary,completed_at:summary.completed_at??null,has_catalogue:Boolean(generation),...status(state,now)};
}
function cachedJson(data,etag,request,ttl){
 const responseHeaders={...headers,ETag:etag,'Cache-Control':'public, max-age='+ttl};
 if(request.headers.get('If-None-Match')?.split(',').some(value=>value.trim()===etag||value.trim()==='*'))return new Response(null,{status:304,headers:responseHeaders});
 return new Response(JSON.stringify(data),{headers:responseHeaders});
}
async function versionedResponse(request,latest,resource,variant,ttl,build){
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([latest.generation,resource,variant])));
 const tag=[...new Uint8Array(hash)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
 const etag='"'+tag+'"';
 if(request.headers.get('If-None-Match')?.split(',').some(value=>value.trim()===etag||value.trim()==='*'))return cachedJson(null,etag,request,ttl);
 const cache=globalThis.caches?.default;
 const cacheKey=new Request(new URL('/__auction-cache/'+tag,request.url));
 const hit=await cache?.match(cacheKey);
 if(hit)return hit;
 const response=cachedJson(await build(),etag,request,ttl);
 if(cache)try{await cache.put(cacheKey,response.clone());}catch{}
 return response;
}

export async function auctionSnapshotRoute(request,url,env,realm){
 const now=env.AUCTION_CLOCK?.()??Date.now();
 const bucket=env.AUCTION_SNAPSHOTS;
 if(!bucket)return json({error:'auction snapshot storage unavailable'},503);
 const base=prefix(realm), key=base+'control', route=url.pathname.slice('/api/auction/'.length);
 const isPost=request.method==='POST';
 const internal=isPost||['missing-sellers','missing-metadata','incomplete-metadata','expiry-diagnostics'].includes(route);
 try{
  if(internal&&!['budget','import'].includes(route))assert(env.AUCTION_PUSH_TOKEN&&request.headers.get('authorization')==='Bearer '+env.AUCTION_PUSH_TOKEN,'unauthorised',401);
  if(isPost&&['budget','import'].includes(route)){
   assert(env.AUCTION_ADMIN_TOKEN&&request.headers.get('authorization')==='Bearer '+env.AUCTION_ADMIN_TOKEN,'unauthorised',401);
   if(route==='budget')return json(await setAuctionBudget(bucket,request,now));
   return json(await activateImport(bucket,base,key,request,env),201);
  }
  if(isPost)assert(!paused(env,'AUCTION_INGEST_PAUSED'),'auction ingestion paused',503);
  if(!internal)assert(!paused(env,'AUCTION_PUBLIC_PAUSED'),'auction public data paused',503);
  assert(request.method==='GET'||isPost,'method not allowed',405);
  assert(url.search.length<=6000,'auction query too large',413);
  const control=internal?await getJson(bucket,key):await publicControl(bucket,key,request);
  const state=control?.value;
  let latest=state?.latest;
  if(isPost){
   const action=route.startsWith('scan/')?route.slice(5):'';
   assert(['claim','progress','complete','fail','metadata','seller-names'].includes(action),'not found',404);
   const body=await readJson(request.body,request.headers.get('content-encoding'),action==='complete'?MAX_BODY_BYTES:64000);
   assert(idValid(body?.scan_id),'invalid scan_id');
   if(action==='claim')return json(await claimScan(bucket,key,env,body,control,now),201);
   if(action==='complete'){
    assert(control,'no active auction claim',409);
    return json(await publishScan(bucket,key,env,body,control,now),201);
   }
   if(action==='metadata'||action==='seller-names')return json(await recover(bucket,base,state,latest,body,action,now));
   const claim=state?.claim;
   assert(claim?.id===body.scan_id,'unknown scan claim',409);
   if(action==='fail'){
    if(claim.phase==='failed')return json({ok:true,duplicate:true});
    assert(claim.phase==='scanning','cannot fail a published or finalising scan',409);
    await updateClaim(bucket,key,control,{...claim,phase:'failed',reason:String(body.reason??'interrupted').slice(0,200)});
    return json({ok:true});
   }
   assert(claim.phase==='scanning'&&now<claim.slot+MAX_SCAN_MS,'scan slot expired',409);
   assert(integer(body.pages_done,0,20000)&&integer(body.pages_expected,1,20000),'invalid scan progress');
   if(!claim.progress||now-claim.progress.at>=30000){
    await updateClaim(bucket,key,control,{...claim,progress:{pages_done:body.pages_done,pages_expected:body.pages_expected,at:now}});
   }
   return json({ok:true});
  }
  if(route==='summary'){
   const data=publicManifest(state,now);
   const tag='"'+(control?.etag??'empty')+'-'+data.collector_status+'"';
   return cachedJson(data,tag,request,15);
  }
  if(route==='scan-status')return json(status(state,now));
  if(['missing-sellers','missing-metadata','incomplete-metadata'].includes(route))return json(await recoveryCandidates(bucket,base,state,latest,route,now));
  if(route==='expiry-diagnostics')return json(await expiryDiagnostics(bucket,state,latest));
  const requestedVersion=url.searchParams.get('scan_id');
  if(requestedVersion&&(['catalogue','items'].includes(route)||/^(item|history)\//.test(route))){
   latest=state?.retained?.find(entry=>entry.scan_id===requestedVersion);
   assert(latest,'auction snapshot changed',409);
  }
  if(route==='catalogue'){
   assert(latest,'no complete scan',404);
   const tag='"'+latest.scan_id+'"';
   const responseHeaders={...headers,ETag:tag,'Cache-Control':'public, max-age=300'};
   if(request.headers.get('If-None-Match')===tag)return new Response(null,{status:304,headers:responseHeaders});
   const cache=globalThis.caches?.default;
   const cacheKey=new Request(new URL('/__auction-catalogue/'+encodeURIComponent(latest.generation),request.url));
   const hit=await cache?.match(cacheKey);
   if(hit)return hit;
   const object=await bucket.get(latest.generation+'/catalogue');
   assert(object,'auction catalogue unavailable',503);
   responseHeaders['Content-Encoding']='gzip';
   const response=new Response(object.body,{headers:responseHeaders,encodeBody:'manual'});
   if(cache)try{await cache.put(cacheKey,response.clone());}catch{}
   return response;
  }
  if(route==='items'){
   const query=parseSnapshotQuery(url.searchParams);
   assert(!query.error,query.error);
   if(!latest)return json(querySnapshot([],query,{}));
   const {keys,...parameters}=query;
   const ttl=query.time?15:query.sort==='time_left'?30:300;
   return await versionedResponse(request,latest,route,[parameters,keys?[...keys].sort():null,ttl<300?Math.floor(now/(ttl*1000)):null],ttl,async()=>{
    if(query.listingFiltered){
     assert(!paused(env,'AUCTION_LIST_FILTERS_PAUSED'),'new advanced listing queries temporarily paused',503);
     if(env.AUCTION_QUERY_LIMITER){
      const ip=request.headers.get('CF-Connecting-IP')??'unknown';
      const allowed=await env.AUCTION_QUERY_LIMITER.limit({key:'auction-'+ip});
      assert(allowed.success,'advanced auction query rate limit exceeded',429);
     }
    }
    const catalogue=await requireJson(bucket,latest.generation+'/catalogue');
    if(!query.listingFiltered)return {...querySnapshot(catalogue,query,{},now),scan_id:latest.scan_id,completed_at:latest.completed_at};
    const result=querySnapshot(catalogue,query,await listingGroups(bucket,latest,query),now);
    return {...result,scan_id:latest.scan_id,completed_at:latest.completed_at};
   });
  }
  const match=/^(item|history)\/(\d{1,10})$/.exec(route);
  assert(match,'not found',404);
  const item=Number(match[2]), variant=url.searchParams.get('variant')??'';
  assert(integer(item,1)&&variantValid(variant),'invalid item or variant');
  const itemKey=auctionKey(item,variant), index=item%PARTITIONS;
  if(!latest&&!state?.seed)return json({listings:[],history:[],error:'no complete scan'});
  if(match[1]==='history'){
   const source=latest??{generation:state.seed};
   return await versionedResponse(request,source,'history',itemKey,300,async()=>{
    const stored=await requireJson(bucket,partKey(source.generation,'state',index));
    const archiveKey=source.archive_keys?.[index];
    const archive=archiveKey?await requireJson(bucket,archiveKey):{};
    const last=stored.dayPoints?.[itemKey];
    const history=Object.entries({...archive[itemKey],...(last?{[stored.day]:last}:{})}).sort(([a],[b])=>b.localeCompare(a)).slice(0,90)
     .map(([day,[representative_unit,quantity,listings]])=>({day,representative_unit,quantity,listings}));
    return {history};
   });
  }
  if(!latest)return json({listings:[],scan_id:null,limited:false});
  return await versionedResponse(request,latest,'item',[itemKey,Math.floor(now/300000)],300,async()=>{
   const groups=await requireJson(bucket,partKey(latest.generation,'details',index));
   const sellers=(await readRecovery(bucket,base,state)).sellers;
   const listings=(groups[itemKey]??[]).slice(0,200).map(row=>({...row,item_id:item,variant,owner_name:sellers[row.owner_guid]?.name??null}));
   return {listings,scan_id:latest.scan_id,limited:listings.length===200};
  });
 }catch(error){
  if(error instanceof AuctionError){
   if(error.status===429&&isPost)console.warn(JSON.stringify({event:'auction_budget_suspended',realm,route,reason:error.message}));
   return json({error:error.message},error.status);
  }
  console.warn('Auction snapshot temporarily unavailable',String(error).slice(0,180));
  return json({error:'auction snapshot temporarily unavailable'},503);
 }
}

async function readRecovery(bucket,base,state){
 const current=await getJson(bucket,base+'recovery');
 if(current)return current.value;
 if(state?.import_recovery)return requireJson(bucket,state.import_recovery);
 return {metadata:{},sellers:{}};
}

async function activateImport(bucket,base,key,request,env){
 assert(env.AUCTION_IMPORT_ENABLED==='true'&&env.AUCTION_COLLECTION_PAUSED==='true','auction import requires collection paused and import enabled',503);
 const current=await getJson(bucket,key);
 assert(!current,'auction snapshot already initialised',409);
 const manifest=await readJson(request.body,null,64000);
 const latest=manifest?.latest;
 assert(latest&&typeof latest.scan_id==='string'&&/^[A-Za-z0-9_-]{8,80}$/.test(latest.scan_id)&&
  latest.generation===base+'versions/import-'+latest.scan_id&&Number.isFinite(Date.parse(latest.completed_at))&&
  integer(latest.auction_count,0,MAX_LISTINGS)&&integer(latest.total_historical_auctions,latest.auction_count)&&
  integer(latest.item_count,0,latest.auction_count)&&integer(latest.items_with_metadata,0,latest.item_count)&&
  integer(latest.historical_days,0,365)&&Array.isArray(latest.archived_days)&&
  latest.archived_days.length<=364&&latest.archived_days.every(day=>typeof day==='string'&&/^\d{4}-\d\d-\d\d$/.test(day)),
  'invalid auction import manifest');
 const files=[latest.generation+'/catalogue',latest.generation+'/recovery',latest.generation+'/sellers',latest.generation+'/filters',
  ...parts.flatMap(i=>['details','seen','state','archive'].map(type=>partKey(latest.generation,type,i)))];
 for(const path of files){
  const expected=manifest.files?.[path];
  assert(expected&&integer(expected.bytes,1,MAX_OBJECT_BYTES)&&/^[a-f0-9]{32}$/.test(expected.md5),'invalid auction import object');
  const found=await bucket.head(path);
  assert(found?.etag===expected.md5&&found.size===expected.bytes&&found.httpMetadata?.contentEncoding==='gzip',
   'auction import object failed checksum or encoding verification',409);
 }
 const selected=Object.fromEntries(['generation','scan_id','completed_at','auction_count','total_historical_auctions',
  'item_count','items_with_metadata','scan_duration_ms','historical_days','snapshot_quality','archived_days'].map(field=>[field,latest[field]]));
 selected.archive_keys=parts.map(i=>partKey(selected.generation,'archive',i));
 selected.seen_keys=parts.map(i=>partKey(selected.generation,'seen',i));
 assert(await compareAndPut(bucket,key,null,{latest:selected,retained:[selected],import_recovery:latest.generation+'/recovery'}),
  'auction snapshot already initialised',409);
 return {ok:true,scan_id:latest.scan_id};
}

async function publicControl(bucket,key,request){
 const cache=globalThis.caches?.default;
 if(!cache)return getJson(bucket,key);
 const cacheKey=new Request(new URL('/__auction-control/'+encodeURIComponent(key),request.url));
 try{
  const hit=await cache.match(cacheKey);
  if(hit)return hit.json();
 }catch{}
 const control=await getJson(bucket,key);
 try{
  await cache.put(cacheKey,new Response(JSON.stringify(control),{headers:{'Cache-Control':'public, max-age=15'}}));
 }catch{}
 return control;
}

async function listingGroups(bucket,latest,query){
 if(query.keys&&query.keys.size<=1){
  const key=query.keys.values().next().value;
  return key?requireJson(bucket,partKey(latest.generation,'details',Number(key.split(':')[0])%PARTITIONS)):{};
 }
 const projected=await requireJson(bucket,latest.generation+'/filters');
 return key=>expandProjection(projected[key]);
}

async function expiryDiagnostics(bucket,state,latest){
 const previous=state?.retained?.[1];
 if(!latest||!previous)return {sample_size:0,reason:'No previous complete scan',scan_id:latest?.scan_id??null};
 const sample=[];
 for(const i of parts){
  const current=await requireJson(bucket,partKey(latest.generation,'details',i));
  const older=await requireJson(bucket,partKey(previous.generation,'details',i));
  for(const [key,rows] of Object.entries(current)){
   const candidates=new Map((older[key]??[]).map(row=>[row.auction_id,row]));
   for(const row of rows){
    const match=candidates.get(row.auction_id);
    if(!match||row.owner_guid!==match.owner_guid||row.time_left_ms===null||match.time_left_ms===null)continue;
    const elapsed=Date.parse(row.captured_at)-Date.parse(match.captured_at);
    if(elapsed<1000)continue;
    const decrease=match.time_left_ms-row.time_left_ms;
    sample.push({elapsed,decrease,drift:Math.abs(elapsed-decrease)});
    if(sample.length===1000)break;
   }
   if(sample.length===1000)break;
  }
  if(sample.length===1000)break;
 }
 const median=key=>{
  const values=sample.map(entry=>entry[key]).sort((a,b)=>a-b), n=values.length;
  return n?(values[Math.floor((n-1)/2)]+values[Math.floor(n/2)])/2:null;
 };
 return {scan_id:latest.scan_id,previous_scan_id:previous.scan_id,sample_size:sample.length,
  median_elapsed_ms:median('elapsed'),median_decrease_ms:median('decrease'),median_absolute_drift_ms:median('drift'),
  within_2s:sample.filter(row=>row.drift<=2000).length,within_10s:sample.filter(row=>row.drift<=10000).length};
}

// Recover storage from interrupted writes. The cutoff is longer than any scan
// lease and the live pointer provides the complete set of protected objects.
export async function auctionSnapshotCleanup(env){
 if(!env.AUCTION_SNAPSHOTS||env.AUCTION_MAINTENANCE_PAUSED==='true'||env.AUCTION_GC_ENABLED!=='true')return;
 const bucket=env.AUCTION_SNAPSHOTS, now=Date.now();
 await verifyAuctionBudget(bucket,env,now);
 for(const realm of ["N'Zoth","Y'Shaarj"]){
  const base=prefix(realm), scanKey=base+'control', cursorKey=base+'gc-cursor';
  const state=(await getJson(bucket,scanKey))?.value;
  if(!state?.latest)continue;
  const oldCursor=await getJson(bucket,cursorKey);
  const page=await bucket.list({prefix:base+'versions/',limit:200,
   ...(oldCursor?.value.cursor?{cursor:oldCursor.value.cursor}:{})});
  const generations=new Set([state.claim?.generation,...state.retained.map(entry=>entry.generation)]);
  const keep=new Set([state.import_recovery,...state.retained.flatMap(entry=>[...(entry.seen_keys??[]),...(entry.archive_keys??[])])]);
  const old=page.objects.filter(object=>{
   const generation=object.key.split('/').slice(0,5).join('/');
   return now-object.uploaded.getTime()>=86400000&&!generation.split('/').at(-1).startsWith('import-')&&
    !generations.has(generation)&&!keep.has(object.key);
  }).map(object=>object.key);
  if(old.length)await bucket.delete(old);
  await compareAndPut(bucket,cursorKey,oldCursor?.etag,{cursor:page.truncated?page.cursor:null});
 }
}
