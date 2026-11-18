/** Auction hooks for one account-owned metrics session; no AuthClient or second login. */
import {randomBytes} from "node:crypto";
import type {WorldClient,WorldClientHandlers} from "./net/world-client.js";
import {NpcWatch} from "./darkmoon/npc-watch.js";
import {parseUpdateObject} from "./protocol/update-object.js";
import type {AuctionResult,AuctionRow} from "./protocol/auction.js";
import type {ItemTemplateReply} from "./protocol/item-query.js";
import {resolveAuctionSellers} from "./auction-sellers.js";
import {AuctionScanCursor} from "./auction-scan.js";
import {fetchAuctionCatalogue,fetchAuctionItem,type AuctionItemMetadata} from "./auction-metadata.js";
import type {Logger} from "./logger.js";


const sleep=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
const endpoint=process.env.AUCTION_PUSH_URL?.trim()||"https://octometrics.eqvoice.workers.dev/api/auction/scan";
const positiveInt=(raw:string|undefined,fallback:number,min:number,max:number)=>{
 const n=raw?Number(raw):fallback;
 if(!Number.isSafeInteger(n)||n<min||n>max)throw new Error("Invalid auction collector numeric configuration");
 return n;
};
const liveItemQueries=process.env.AUCTION_LIVE_ITEM_QUERIES==="true";
const intervalMs=positiveInt(process.env.AUCTION_QUERY_INTERVAL_MS,0,0,600000);
const uploadIntervalMs=positiveInt(process.env.AUCTION_UPLOAD_INTERVAL_MS,500,250,60000);
const cooldownMs=positiveInt(process.env.AUCTION_SCAN_COOLDOWN_MS,3600000,60000,86400000);
const queryTimeoutMs=positiveInt(process.env.AUCTION_QUERY_TIMEOUT_MS,30000,5000,180000);
const maxPages=positiveInt(process.env.AUCTION_MAX_PAGES,2000,1,20000);
const token=process.env.AUCTION_PUSH_TOKEN?.trim();
const uploadUrl=new URL(endpoint);
const auctionRealm=process.env.COLLECTOR_PROFILE==="OBPVEAH"?"N\u0027Zoth":"Y\u0027Shaarj";
uploadUrl.searchParams.set("realm",auctionRealm);
if(uploadUrl.protocol!=="https:"||!uploadUrl.pathname.endsWith("/api/auction/scan")||
 uploadUrl.username||uploadUrl.password)throw new Error("AUCTION_PUSH_URL must be an HTTPS /api/auction/scan endpoint");
function auctionUrl(suffix:string):URL {
 const url=new URL(uploadUrl);url.pathname=url.pathname.replace(/\/scan\/?$/,"")+suffix;return url;
}
class UploadError extends Error{constructor(message:string,readonly status:number){super(message);}}
async function publish(action:"start"|"page"|"complete"|"fail"|"metadata"|"seller-names",payload:Record<string,unknown>):Promise<void>{
 if(!token)throw new Error("AUCTION_PUSH_TOKEN missing");
 for(let attempt=0;attempt<6;attempt++){
  try{
   const response=await fetch(auctionUrl("/scan/"+action),{
     method:"POST",headers:{"authorization":"Bearer "+token,"content-type":"application/json"},
     body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)
   });
   if(response.ok)return;
   throw new UploadError("Auction ingestion "+action+" HTTP "+response.status+" "+(await response.text()).slice(0,180),response.status);
  }catch(error){
   if(error instanceof UploadError&&error.status!==429&&error.status<500)throw error;
   if(attempt===5)throw error;
   await sleep(Math.min(30000,2000*2**attempt)+Math.floor(Math.random()*1000));
  }
 }
}
let metadataPromise:Promise<ReadonlyMap<number,AuctionItemMetadata>>|null=null;
let metadataLoadedAt=0;
let lastCatalogue:ReadonlyMap<number,AuctionItemMetadata>=new Map();
const recoveredMetadata=new Map<number,AuctionItemMetadata>();
const lookupAfter=new Map<number,number>();
async function resolveMissingMetadata(scanId:string,ids:Set<number>,log:Logger,gameLookup?:(id:number)=>Promise<ItemTemplateReply|null>):Promise<void>{
 // The Worker remembers resolved IDs across restarts. Fall back to local observations
 // if its read endpoint is unavailable, without disrupting the scan.
 try{
  const url=auctionUrl(gameLookup?"/incomplete-metadata":"/missing-metadata");
  const response=await fetch(url,{signal:AbortSignal.timeout(6000)});
  if(response.ok){
   const result=await response.json() as {scan_id?:string;items?:{item_id:number}[]};
   if(result.scan_id===scanId&&Array.isArray(result.items))ids=new Set(result.items.map(row=>row.item_id));
  }
 }catch{/* metadata recovery must not fail a completed scan */}
 const pending=[...ids].filter(id=>(lookupAfter.get(id)??0)<=Date.now()).slice(0,gameLookup?15:50);
 const resolved:({item_id:number}&AuctionItemMetadata)[]=[];
 // Game queries are serialised and matched by item ID; HTTP remains a fallback for icons.
 const recover=async(id:number)=>{
  const known=lastCatalogue.get(id)??recoveredMetadata.get(id);
  const [game,web]=await Promise.all([gameLookup?.(id)??Promise.resolve(null),known?.icon_url&&gameLookup?Promise.resolve(null):fetchAuctionItem(id)]);
  const template=game?.metadata;
  const base=template??web??known;
  if(base){
   const item={...base,icon_url:known?.icon_url??web?.icon_url??base.icon_url,
     quality:template?.quality??known?.quality??web?.quality??null,
     item_level:template?.item_level??known?.item_level??web?.item_level??null,
     req_level:template?.req_level??known?.req_level??web?.req_level??null,
     class_id:template?.class_id??known?.class_id??web?.class_id??null,
     subclass_id:template?.subclass_id??known?.subclass_id??web?.subclass_id??null,
     slot_id:template?.slot_id??known?.slot_id??web?.slot_id??null};
   recoveredMetadata.set(id,item);resolved.push({item_id:id,...item});
  }
  lookupAfter.set(id,Date.now()+30*60_000);
 };
 if(gameLookup){for(const id of pending)await recover(id);}
 else for(let i=0;i<pending.length;i+=3){
  if(i>0)await sleep(500);
  await Promise.all(pending.slice(i,i+3).map(recover));
 }
 let persisted=0;
 if(resolved.length)try{await publish('metadata',{scan_id:scanId,items:resolved});persisted=resolved.length;}catch(error){
  for(const item of resolved)recoveredMetadata.delete(item.item_id);
  log.warn('Auction metadata persistence failed; will retry: '+String(error));
 }
 if(pending.length)log.info('Auction metadata lookups: '+pending.length+' attempted; '+resolved.length+' resolved in batch; '+persisted+' persisted; '+ids.size+' unresolved candidates before recovery');
}
async function cachedMetadata(log:Logger):Promise<ReadonlyMap<number,AuctionItemMetadata>>{
 try{
  if(!metadataPromise||Date.now()-metadataLoadedAt>=60*60_000){
   metadataPromise=fetchAuctionCatalogue();
   metadataLoadedAt=Date.now();
  }
  lastCatalogue=await metadataPromise;return lastCatalogue;
 }catch(error){
  metadataPromise=null;log.warn("Auction item catalogue unavailable; retaining item IDs without guessing metadata: "+String(error));
  return lastCatalogue;
 }
}

type Pending<T>={resolve:(value:T)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>};
let nextAttemptAt=0;
export function pvpAuctionEligible(account:{account:string;realmName:string}, env:NodeJS.ProcessEnv=process.env):boolean {
 return account.account==="OBPVPSW"&&account.realmName==="Y'Shaarj"&&env.AUCTION_COLLECTOR_ENABLED==="true"&&env.AUCTION_RULES_APPROVED==="true"&&Boolean(env.AUCTION_PUSH_TOKEN?.trim());
}
export function createAuctionSession({account,log,getWorld}:{account:{account:string;realmName:string};log:Logger;getWorld:()=>WorldClient|null}):{start:()=>void;stop:()=>void;handlers:WorldClientHandlers}{
 const approved=process.env.AUCTION_COLLECTOR_ENABLED==="true"&&process.env.AUCTION_RULES_APPROVED==="true"&&Boolean(token);
 const allowed=auctionRealm==="N\u0027Zoth"?account.account==="OBPVEAH"&&account.realmName===auctionRealm:pvpAuctionEligible(account);
 if(!approved||!allowed)return {start(){},stop(){},handlers:{}};
 const current=()=>{const w=getWorld();if(!w?.isReady)throw new Error("PvP world unavailable");return w;};
 // The existing socket is owned by the metrics supervisor. Only a page timeout
 // closes it, to prevent a delayed page response from being matched to another query.
 const world={auctionList:(g:bigint,o:number)=>current().auctionList(g,o),queryItemTemplate:(id:number)=>current().queryItemTemplate(id),close:()=>getWorld()?.close()};
 let pendingQuery:Pending<AuctionResult>|null=null;
 let pendingItem:{id:number;resolve:(reply:ItemTemplateReply|null)=>void;timer:ReturnType<typeof setTimeout>}|null=null;
 let pendingHello:ReturnType<typeof setTimeout>|null=null;
 let finished=false,started=false,scanId="",lastQuery=0,busy=false;
 let auctioneerGuid:bigint|null=null;
 let ticker:ReturnType<typeof setInterval>|null=null;
 const watchers=new NpcWatch(120);
 const knownGuids=new Map<number,bigint>();
 const target="Auctioneer Fitch";
 const stop=()=>{
  finished=true;
  if(ticker)clearInterval(ticker);ticker=null;
  if(pendingHello)clearTimeout(pendingHello);pendingHello=null;
  if(pendingQuery){const p=pendingQuery;pendingQuery=null;clearTimeout(p.timer);p.reject(new Error("PvP session stopped"));}
  if(pendingItem){const p=pendingItem;pendingItem=null;clearTimeout(p.timer);p.resolve(null);}
 };
 const query=async(guid:bigint,offset:number):Promise<AuctionResult>=>{
  const elapsed=Date.now()-lastQuery;
  if(lastQuery&&elapsed<intervalMs)await sleep(intervalMs-elapsed);
  if(finished)throw new Error("Auction collector stopping");
  if(pendingQuery)throw new Error("Auction query overlap blocked");
  return new Promise<AuctionResult>((resolve,reject)=>{
   const timer=setTimeout(()=>{pendingQuery=null;reject(new Error("Auction page response timeout; do not misassociate late reply"));world.close();},queryTimeoutMs);
   pendingQuery={resolve,reject,timer};
   lastQuery=Date.now();
   try{world.auctionList(guid,offset);}catch(error){clearTimeout(timer);pendingQuery=null;reject(error instanceof Error?error:new Error(String(error)));}
  });
 };
 const queryItem=(id:number):Promise<ItemTemplateReply|null>=>{
  if(finished||pendingItem||id>=0x80000000)return Promise.resolve(null);
  return new Promise(resolve=>{
   const timer=setTimeout(()=>{pendingItem=null;resolve(null);},2000);
   pendingItem={id,resolve,timer};
   try{world.queryItemTemplate(id);}catch{clearTimeout(timer);pendingItem=null;resolve(null);}
  });
 };
 const run=async(guid:bigint):Promise<void>=>{
   const catalogue=await cachedMetadata(log);
   if(finished)throw new Error('Auction session stopped');
   started=false;
   const missingIds=new Set<number>();
   const startedAt=new Date().toISOString();
   scanId=(auctionRealm==="N\u0027Zoth"?"ahl_":"ahl_pvp_")+Date.now().toString(36)+"_"+randomBytes(6).toString("hex");
   const cursor=new AuctionScanCursor(true);
   try{
    // Do not declare a scan started until the server actually replies to the first query.
    while(cursor.page<maxPages){
      const page=cursor.page,offset=cursor.retrieved;
      const sentAt=Date.now();
      const response=await query(guid,offset);
      const responseMs=Date.now()-sentAt;
      cursor.accept(response); // Live AH counts drift; allow offset shifts, deduplicate IDs during ingestion.
      if(page===0){
       await publish("start",{scan_id:scanId,started_at:startedAt,reported_total:cursor.total});
       started=true;
      }
      const items=response.auctions.map((row:AuctionRow)=>{
       const info=recoveredMetadata.get(row.item_id)??catalogue.get(row.item_id);
       if(!info)missingIds.add(row.item_id);
       return {
        auction_id:row.auction_id,item_id:row.item_id,variant:row.variant,quantity:row.quantity,
        item_name:info?.item_name??null,quality:info?.quality??null,icon_url:info?.icon_url??null,
        item_level:info?.item_level??null,req_level:info?.req_level??null,class_id:info?.class_id??null,
        subclass_id:info?.subclass_id??null,slot_id:info?.slot_id??null,
        start_bid:row.start_bid,current_bid:row.current_bid,min_next_bid:row.min_next_bid,
        buyout:row.buyout,owner_guid:row.owner_guid,time_left_ms:row.time_left_ms,
        captured_at:row.captured_at
       };
      });
      await publish("page",{scan_id:scanId,page,items,response_ms:responseMs});
      await sleep(uploadIntervalMs);
      if(page===0||cursor.page%20===0||cursor.complete)log.info("Auction scan "+scanId+": "+cursor.retrieved+"/"+cursor.latestTotal+" rows traversed; page "+cursor.page+" in "+responseMs+"ms");
      if(cursor.complete)break;
    }
    if(!cursor.complete)throw new Error("Auction scan exceeded AUCTION_MAX_PAGES or ended early");
    await publish("complete",{scan_id:scanId,completed_at:new Date().toISOString(),expected_pages:cursor.page,reported_total:cursor.total});
    
    await resolveMissingMetadata(scanId,missingIds,log,liveItemQueries?queryItem:undefined);
    await resolveAuctionSellers({url:auctionUrl("/missing-sellers"),token,scanId,resolve:guid=>current().resolveName(guid,3000),publish:payload=>publish("seller-names",payload),log,active:()=>!finished&&Boolean(getWorld()?.isReady)});
    log.info("Auction live traversal completed: "+cursor.retrieved+" rows, "+cursor.ids.size+" unique IDs, "+cursor.page+" pages, "+(Date.now()-Date.parse(startedAt))+"ms; listing totals can change during traversal");
   }catch(error){
    if(started)try{await publish("fail",{scan_id:scanId,reason:(error instanceof Error?error.message:String(error)).slice(0,170)})}catch(e){log.warn("Failed to record partial scan failure");}
    throw error;
   }
 };

 const attempt=()=>{
  if(finished||busy||!auctioneerGuid||Date.now()<nextAttemptAt||!getWorld()?.isReady)return;
  busy=true;nextAttemptAt=Date.now()+cooldownMs;
  const guid=auctioneerGuid;
  pendingHello=setTimeout(()=>{pendingHello=null;busy=false;log.warn("PvP auction hello timed out; will retry next scan interval");},queryTimeoutMs);
  try{current().auctionHello(guid);}catch(e){clearTimeout(pendingHello);pendingHello=null;busy=false;log.warn(String(e));}
 };
 return {
  start(){if(finished||ticker)return;log.info("AH enabled on "+account.account+" connection; waiting for Auctioneer Fitch");ticker=setInterval(attempt,15000);ticker.unref?.();},
  stop,
  handlers:{
   onWorldObjects(raw){if(finished||!getWorld()?.isReady)return;const w=current();const objects=parseUpdateObject(raw,w.selfGuid??undefined);
    for(const unit of objects.units)knownGuids.set(unit.entry,unit.guid);
    for(const change of objects.ownerChanges)if(change.kind==="out-of-range"){if(auctioneerGuid===change.guid)auctioneerGuid=null;for(const [entry,value] of knownGuids)if(value===change.guid)knownGuids.delete(entry);}
    for(const entry of watchers.take(objects.units.map(u=>u.entry),15)){const guid=knownGuids.get(entry);if(guid!==undefined)w.queryCreature(entry,guid);}
   },
   onCreatureName(entry,name){if(finished||name!==target)return;const guid=knownGuids.get(entry);if(guid===undefined)return;auctioneerGuid=guid;log.info("PvP Auctioneer Fitch discovered");attempt();},
   onObjectDestroyed(guid){if(auctioneerGuid===guid)auctioneerGuid=null;for(const [entry,value] of knownGuids)if(value===guid)knownGuids.delete(entry);},
   onAuctionHello(hello){if(!pendingHello||finished)return;clearTimeout(pendingHello);pendingHello=null;
    if(hello.guid!==auctioneerGuid||hello.houseId===0){busy=false;log.warn("PvP Auction House unavailable");return;}
    void run(hello.guid).catch(e=>log.warn("PvP auction scan failed: "+String(e))).finally(()=>{busy=false;nextAttemptAt=Date.now()+cooldownMs;});
   },
   onAuctionList(result){const p=pendingQuery;if(!p||finished)return;clearTimeout(p.timer);pendingQuery=null;p.resolve(result);},
   onItemTemplate(reply){const p=pendingItem;if(!p||p.id!==reply.item_id)return;clearTimeout(p.timer);pendingItem=null;p.resolve(reply);}
  }
 };
}

// Compatibility for existing production patch tooling.
export const createPvpAuction=createAuctionSession;
