/**
 * Dedicated, opt-in, read-only Auction House collector (N'Zoth / OBPVEAH).
 * Run as its OWN Railway service: npm run start:auction, not the raid / DMF entrypoint.
 * Real-server permission and 1.12 compatibility MUST be checked before enablement.
 * No movement or pathfinding: park OBPVEAH within visibility/interact range of Auctioneer Finch.
 */
import {randomBytes} from "node:crypto";
import {connect, type Socket} from "node:net";
import {loadConfig,parseAddress,type BotConfig} from "./config.js";
import {AuthClient} from "./net/auth-client.js";
import {WorldClient} from "./net/world-client.js";
import {NpcWatch} from "./darkmoon/npc-watch.js";
import {parseUpdateObject} from "./protocol/update-object.js";
import type {AuctionResult,AuctionRow} from "./protocol/auction.js";
import {createLogger,type Logger} from "./logger.js";
import {resolveBuild} from "./net/client-resolver.js";
import {VersionMismatchError} from "./errors.js";

const sleep=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
const endpoint=process.env.AUCTION_PUSH_URL?.trim()||"https://octometrics.eqvoice.workers.dev/api/auction/scan";
let stopping=false;
const sockets=new Set<Socket>();
const positiveInt=(raw:string|undefined,fallback:number,min:number,max:number)=>{
 const n=raw?Number(raw):fallback;
 if(!Number.isSafeInteger(n)||n<min||n>max)throw new Error("Invalid auction collector numeric configuration");
 return n;
};
const intervalMs=positiveInt(process.env.AUCTION_QUERY_INTERVAL_MS,5500,5000,600000);
const cooldownMs=positiveInt(process.env.AUCTION_SCAN_COOLDOWN_MS,3600000,60000,86400000);
const queryTimeoutMs=positiveInt(process.env.AUCTION_QUERY_TIMEOUT_MS,30000,5000,180000);
const maxPages=positiveInt(process.env.AUCTION_MAX_PAGES,2000,1,20000);
const token=process.env.AUCTION_PUSH_TOKEN?.trim();
const uploadUrl=new URL(endpoint);
if(uploadUrl.protocol!=="https:"||!uploadUrl.pathname.endsWith("/api/auction/scan")||
 uploadUrl.username||uploadUrl.password)throw new Error("AUCTION_PUSH_URL must be an HTTPS /api/auction/scan endpoint");
async function publish(action:"start"|"page"|"complete"|"fail",payload:Record<string,unknown>):Promise<void>{
 if(!token)throw new Error("AUCTION_PUSH_TOKEN missing");
 const response=await fetch(new URL(uploadUrl.toString().replace(/\/$/,"")+"/"+action),{
   method:"POST",headers:{"authorization":"Bearer "+token,"content-type":"application/json"},
   body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)
 });
 if(!response.ok)throw new Error("Auction ingestion "+action+" HTTP "+response.status+" "+(await response.text()).slice(0,180));
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
 let pendingHello:Pending<bigint>|null=null;
 let readyTimer:ReturnType<typeof setTimeout>|null=null;
 let auctioneerGuid:bigint|null=null;
 let succeeded=false,finished=false,started=false,scanId="";
 let lastQuery=0;
 let resolveSession!:()=>void,rejectSession!:(error:Error)=>void;
 const completePromise=new Promise<void>((resolve,reject)=>{resolveSession=resolve;rejectSession=reject;});
 const watchers=new NpcWatch(120);
 const knownGuids=new Map<number,bigint>();
 const target="Auctioneer Finch";
 const end=(error?:Error)=>{
  if(finished)return;
  finished=true;if(readyTimer)clearTimeout(readyTimer);
  if(pendingQuery){clearTimeout(pendingQuery.timer);pendingQuery.reject(error||new Error("Session stopped"));pendingQuery=null;}
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
 const run=async(guid:bigint):Promise<void>=>{
   const startedAt=new Date().toISOString();
   scanId="ah_"+Date.now().toString(36)+"_"+randomBytes(6).toString("hex");
   let total=0,offset=0,page=0,seen=new Set<number>(),retrieved=0;
   try{
    // Do not declare a scan started until the server actually replies to the first query.
    for(;page<maxPages;page++){
      const sentAt=Date.now();
      const response=await query(guid,offset);
      const responseMs=Date.now()-sentAt;
      if(page===0){
       total=response.total;
       await publish("start",{scan_id:scanId,started_at:startedAt,reported_total:total});
       started=true;
      }
      if(page>0&&response.auctions.length===0&&offset<total)throw new Error("Auction scan ended before all pages");
      if(response.auctions.length>50)throw new Error("Unexpected page length");
      for(const row of response.auctions){
       if(seen.has(row.auction_id))throw new Error("Auction pagination shifted; duplicate listing across pages");
       seen.add(row.auction_id);
      }
      const items=response.auctions.map((row:AuctionRow)=>({
       auction_id:row.auction_id,item_id:row.item_id,variant:row.variant,quantity:row.quantity,
       start_bid:row.start_bid,current_bid:row.current_bid,min_next_bid:row.min_next_bid,
       buyout:row.buyout,owner_guid:row.owner_guid,time_left_ms:row.time_left_ms,
       captured_at:row.captured_at
       // No name, icon or quality is fabricated: protocol list omits these fields.
      }));
      await publish("page",{scan_id:scanId,page,items,response_ms:responseMs});
      retrieved+=items.length;
      offset+=response.auctions.length;
      log.info("Auction scan "+scanId+": "+retrieved+"/"+total+" auctions; page "+(page+1)+" in "+responseMs+"ms");
      if(offset>=total)break;
      if(response.auctions.length<50)throw new Error("Unexpected short non-final auction page");
    }
    if(page>=maxPages)throw new Error("Auction scan exceeded AUCTION_MAX_PAGES");
    if(retrieved<total)throw new Error("Incomplete scan: server reported "+total+" but collected "+retrieved);
    await publish("complete",{scan_id:scanId,completed_at:new Date().toISOString(),expected_pages:page+1,reported_total:total});
    succeeded=true;
    log.info("Auction scan completed: "+retrieved+" listings, "+(page+1)+" pages, "+(Date.now()-Date.parse(startedAt))+"ms");
   }catch(error){
    if(started)try{await publish("fail",{scan_id:scanId,reason:(error instanceof Error?error.message:String(error)).slice(0,170)})}catch(e){log.warn("Failed to record partial scan failure");}
    throw error;
   }
 };
 const world=new WorldClient({
   socket,account:config.account,sessionKey:auth.sessionKey,characterName:config.characterName,
   build:config.worldBuild,logger:log,handlers:{
    onReady:()=>{log.info("OBPVEAH in world; waiting to discover nearby Auctioneer Finch");},
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
     log.info("Verified Auctioneer Finch nearby (GUID from live object update); requesting AH service");
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
    onAuctionList:result=>{
     const p=pendingQuery;if(!p||finished)return;
     clearTimeout(p.timer);pendingQuery=null;p.resolve(result);
    },
    onError:error=>end(error),
    onClose:()=>end(new Error("Auction world connection closed")),
   }
 });
 world.start();
 readyTimer=setTimeout(()=>end(new Error("Auctioneer Finch not discovered within 2 minutes; park character nearby")),120000);
 try{await completePromise;}
 finally{socket.destroy();sockets.delete(socket);}
 if(!succeeded)throw new Error("No complete scan published");
}
async function main():Promise<void>{
 try{process.loadEnvFile();}catch{/* Railway environment variables */ }
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
