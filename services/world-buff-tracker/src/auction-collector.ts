/**
 * Dedicated, opt-in, read-only Auction House collector (N'Zoth / OBPVEAH).
 * Run as its OWN Railway service: npm run start:auction, not the raid / DMF entrypoint.
 * Real-server permission and 1.12 compatibility MUST be checked before enablement.
 * No movement or pathfinding: park OBPVEAH within visibility/interact range of Auctioneer Fitch.
 */
import {randomBytes} from "node:crypto";
import {connect, type Socket} from "node:net";
import {loadConfig,parseAddress,type BotConfig} from "./config.js";
import {AuthClient} from "./net/auth-client.js";
import {WorldClient} from "./net/world-client.js";
import {NpcWatch} from "./darkmoon/npc-watch.js";
import {parseUpdateObject} from "./protocol/update-object.js";
import type {AuctionResult,AuctionRow} from "./protocol/auction.js";
import type {ItemTemplateReply} from "./protocol/item-query.js";
import {resolveAuctionSellers} from "./auction-sellers.js";
import {AuctionScanCursor} from "./auction-scan.js";
import {fetchAuctionCatalogue,fetchAuctionItem,type AuctionItemMetadata} from "./auction-metadata.js";
import {createLogger,type Logger} from "./logger.js";
import {resolveBuild} from "./net/client-resolver.js";
import {VersionMismatchError} from "./errors.js";

try{process.loadEnvFile();}catch{/* Railway injects environment variables without a .env file. */}
const sleep=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
const endpoint=process.env.AUCTION_PUSH_URL?.trim()||"https://octometrics.eqvoice.workers.dev/api/auction/scan";
let stopping=false;
const sockets=new Set<Socket>();
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
if(uploadUrl.protocol!=="https:"||!uploadUrl.pathname.endsWith("/api/auction/scan")||
 uploadUrl.username||uploadUrl.password)throw new Error("AUCTION_PUSH_URL must be an HTTPS /api/auction/scan endpoint");
class UploadError extends Error{constructor(message:string,readonly status:number){super(message);}}
async function publish(action:"start"|"page"|"complete"|"fail"|"metadata"|"seller-names",payload:Record<string,unknown>):Promise<void>{
 if(!token)throw new Error("AUCTION_PUSH_TOKEN missing");
 for(let attempt=0;attempt<6;attempt++){
  try{
   const response=await fetch(new URL(uploadUrl.toString().replace(/\/$/,"")+"/"+action),{
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
  const url=new URL(uploadUrl.toString().replace(/\/scan\/?$/,gameLookup?"/incomplete-metadata":"/missing-metadata"));
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
function tcp(host:string,port:number):Promise<Socket>{
 return new Promise((resolve,reject)=>{
  const socket=connect({host,port});
  const timeout=setTimeout(()=>{socket.destroy();reject(new Error("Auction world TCP timeout"));},15000);
  socket.once("connect",()=>{clearTimeout(timeout);socket.removeAllListeners("error");resolve(socket)});
  socket.once("error",(error)=>{clearTimeout(timeout);socket.destroy();reject(error)});
 });
}
type Pending<T>={resolve:(value:T)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>};
async function scanOnce(config:BotConfig,build:number,log:Logger):Promise<void>{
 const auth=await new AuthClient(log).login({
  host:config.authHost,port:config.authPort,username:config.account,
  password:config.password,integrityChecksum:config.integrityChecksum,build
 });
 const realm=auth.realms.find(r=>r.name.toLowerCase()==="n'zoth");
 if(!realm)throw new Error("N'Zoth unavailable in authentication realm list");
 const addr=config.worldHost?{host:config.worldHost,port:config.worldPort??8085}:parseAddress(realm.address);
 const socket=await tcp(addr.host,addr.port);sockets.add(socket);
 let pendingQuery:Pending<AuctionResult>|null=null;
 let pendingItem:{id:number;resolve:(reply:ItemTemplateReply|null)=>void;timer:ReturnType<typeof setTimeout>}|null=null;
 let pendingHello:Pending<bigint>|null=null;
 let readyTimer:ReturnType<typeof setTimeout>|null=null;
 let auctioneerGuid:bigint|null=null;
 let succeeded=false,finished=false,started=false,scanId="";
 let lastQuery=0;
 let resolveSession!:()=>void,rejectSession!:(error:Error)=>void;
 const completePromise=new Promise<void>((resolve,reject)=>{resolveSession=resolve;rejectSession=reject;});
 const watchers=new NpcWatch(120);
 const knownGuids=new Map<number,bigint>();
 const target="Auctioneer Fitch";
 const end=(error?:Error)=>{
  if(finished)return;
  finished=true;if(readyTimer)clearTimeout(readyTimer);
  if(pendingQuery){clearTimeout(pendingQuery.timer);pendingQuery.reject(error||new Error("Session stopped"));pendingQuery=null;}
  if(pendingItem){clearTimeout(pendingItem.timer);pendingItem.resolve(null);pendingItem=null;}
  if(pendingHello){clearTimeout(pendingHello.timer);pendingHello.reject(error||new Error("Session stopped"));pendingHello=null;}
  sockets.delete(socket);world.close();
  if(error)rejectSession(error);else resolveSession();
 };
 const query=async(guid:bigint,offset:number):Promise<AuctionResult>=>{
  const elapsed=Date.now()-lastQuery;
  if(lastQuery&&elapsed<intervalMs)await sleep(intervalMs-elapsed);
  if(finished||stopping)throw new Error("Auction collector stopping");
  if(pendingQuery)throw new Error("Auction query overlap blocked");
  return new Promise<AuctionResult>((resolve,reject)=>{
   const timer=setTimeout(()=>{pendingQuery=null;reject(new Error("Auction page response timeout; do not misassociate late reply"));world.close();},queryTimeoutMs);
   pendingQuery={resolve,reject,timer};
   lastQuery=Date.now();
   world.auctionList(guid,offset);
  });
 };
 const queryItem=(id:number):Promise<ItemTemplateReply|null>=>{
  if(finished||stopping||pendingItem||id>=0x80000000)return Promise.resolve(null);
  return new Promise(resolve=>{
   const timer=setTimeout(()=>{pendingItem=null;resolve(null);},2000);
   pendingItem={id,resolve,timer};
   try{world.queryItemTemplate(id);}catch{clearTimeout(timer);pendingItem=null;resolve(null);}
  });
 };
 const run=async(guid:bigint):Promise<void>=>{
   const catalogue=await cachedMetadata(log);
   const missingIds=new Set<number>();
   const startedAt=new Date().toISOString();
   scanId="ahl_"+Date.now().toString(36)+"_"+randomBytes(6).toString("hex");
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
    succeeded=true;
    await resolveMissingMetadata(scanId,missingIds,log,liveItemQueries?queryItem:undefined);
    await resolveAuctionSellers({url:new URL("/api/auction/missing-sellers",uploadUrl),token,scanId,resolve:guid=>world.resolveName(guid,3000),publish:payload=>publish("seller-names",payload),log,active:()=>!finished&&!stopping&&world.isReady});
    log.info("Auction live traversal completed: "+cursor.retrieved+" rows, "+cursor.ids.size+" unique IDs, "+cursor.page+" pages, "+(Date.now()-Date.parse(startedAt))+"ms; listing totals can change during traversal");
   }catch(error){
    if(started)try{await publish("fail",{scan_id:scanId,reason:(error instanceof Error?error.message:String(error)).slice(0,170)})}catch(e){log.warn("Failed to record partial scan failure");}
    throw error;
   }
 };
 const world=new WorldClient({
   socket,account:config.account,sessionKey:auth.sessionKey,characterName:config.characterName,
   build:config.worldBuild,logger:log,handlers:{
    onReady:()=>{log.info("OBPVEAH in world; waiting to discover nearby Auctioneer Fitch");},
    onWorldObjects:raw=>{
      if(!world.isReady||finished)return;
      const objects=parseUpdateObject(raw,world.selfGuid??undefined);
      for(const unit of objects.units)knownGuids.set(unit.entry,unit.guid);
      for(const entry of watchers.take(objects.units.map(u=>u.entry),15)){
       const guid=knownGuids.get(entry);if(guid!==undefined)world.queryCreature(entry,guid);
      }
    },
    onCreatureName:(entry,name)=>{
     if(name!==target||pendingHello||finished)return;
     const guid=knownGuids.get(entry);if(!guid)return;
     auctioneerGuid=guid;
     log.info("Verified Auctioneer Fitch nearby (GUID from live object update); requesting AH service");
     const timer=setTimeout(()=>end(new Error("Auction hello timed out; NPC inaccessible or incompatible")),queryTimeoutMs);
     pendingHello={timer,resolve:()=>{},reject:()=>{}};
     world.auctionHello(guid);
    },
    onAuctionHello:hello=>{
     if(!pendingHello||finished)return;
     const targetGuid=auctioneerGuid;
     if(!targetGuid||targetGuid!==hello.guid||hello.houseId===0){end(new Error("Auction hello mismatch or unavailable service"));return;}
     clearTimeout(pendingHello.timer);pendingHello=null;
     if(readyTimer){clearTimeout(readyTimer);readyTimer=null;}
     void run(hello.guid).then(()=>end(),error=>end(error instanceof Error?error:new Error(String(error))));
    },
    onItemTemplate:reply=>{
     const p=pendingItem;if(!p||p.id!==reply.item_id)return;
     clearTimeout(p.timer);pendingItem=null;p.resolve(reply);
    },
    onAuctionList:result=>{
     const p=pendingQuery;if(!p||finished)return;
     clearTimeout(p.timer);pendingQuery=null;p.resolve(result);
    },
    onError:error=>end(error),
    onClose:()=>end(new Error("Auction world connection closed")),
   }
 });
 world.start();
 readyTimer=setTimeout(()=>end(new Error("Auctioneer Fitch not discovered within 2 minutes; park character nearby")),120000);
 try{await completePromise;}
 finally{socket.destroy();sockets.delete(socket);}
 if(!succeeded)throw new Error("No complete scan published");
}
async function main():Promise<void>{
 if(process.env.AUCTION_COLLECTOR_ENABLED!=="true"||process.env.AUCTION_RULES_APPROVED!=="true"){
   console.log("Auction collector DISABLED. Set AUCTION_COLLECTOR_ENABLED and AUCTION_RULES_APPROVED explicitly after verifying server rules.");
   return;
 }
 if(!token)throw new Error("AUCTION_PUSH_TOKEN required");
 const config=loadConfig(process.env);
 if(config.realm!=="N'Zoth"||config.characterName!=="OBPVEAH"||!config.loginEnabled)
  throw new Error("Auction service must use N'Zoth / OBPVEAH and WOW_LOGIN_ENABLED must be true");
 if(config.listeners.length)throw new Error("Auction service must not run extra capital/raid listeners");
 const log=createLogger(config.logLevel);
 const stop=()=>{stopping=true;for(const socket of sockets)socket.destroy();};
 process.once("SIGTERM",stop);process.once("SIGINT",stop);
 let build=config.build,backoff=5000;
 while(!stopping){
  try{
    await scanOnce(config,build,log);backoff=5000;
    if(!stopping)await sleep(cooldownMs);
  }catch(e){
    const error=e instanceof Error?e:new Error(String(e));
    log.warn("Auction collector session: "+error.message);
    if(e instanceof VersionMismatchError&&config.autoResolve){
     try{build=await resolveBuild(config.clientCdn)}catch(error){log.warn("Auction client build lookup failed");}
    }
    if(!stopping){await sleep(backoff);backoff=Math.min(backoff*2,300000);}
  }
 }
}
void main().catch(error=>{console.error(error instanceof Error?error.message:String(error));process.exitCode=1});
