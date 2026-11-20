import {connect} from "node:net";
import {getProfile,schedule,validateLiveProfile} from "./profiles.mjs";
import {loadConfig,parseAddress} from "../dist/config.js";
import {AuthClient} from "../dist/net/auth-client.js";
import {WorldClient} from "../dist/net/world-client.js";
import {resolveBuild} from "../dist/net/client-resolver.js";
import {createLogger,prefixed} from "../dist/logger.js";
import {VersionMismatchError} from "../dist/errors.js";
import {NpcWatch} from "../dist/darkmoon/npc-watch.js";
import {isFaireNpc} from "../dist/darkmoon/npcs.js";
import {parseUpdateObject} from "../dist/protocol/update-object.js";
import {RaidTracker} from "../dist/watcher/raid-tracker.js";
import {createRaidTelemetryFromEnv} from "../dist/raid-telemetry.js";
import {fetchRoster} from "../dist/watcher/roster.js";
import {HttpChronicleClient,BLACKWING_RECENT_URL} from "../dist/chronicle/client.js";
import {cleanFinalBossKills} from "../dist/chronicle/parse.js";
import {createDropPipeline} from "./drop-pipeline.mjs";
import {ListenerHealth} from "./listener-health.mjs";
import {EventPublisher} from "./events.mjs";
import {createWorldChat} from "./world-chat.mjs";
import {createRaidPersistence} from "./raid-persistence.mjs";
try{process.loadEnvFile();}catch{}
const profile=getProfile();
// Load the auction module only after .env is loaded; its legacy configuration is evaluated on import.
const auctionEnabled=Boolean(profile.auction)&&process.env.AUCTION_COLLECTOR_ENABLED==="true";
const createAuctionSession=auctionEnabled?(await import("../dist/pvp-auction-session.js")).createAuctionSession:null;
const cfg=loadConfig({...process.env,WOW_ACCOUNT:profile.account,WOW_CHARACTER:profile.character,WOW_REALM:profile.realmName,WOW_LISTENERS:"[]"});
const log=prefixed(createLogger(cfg.logLevel),profile.key);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
if(!cfg.loginEnabled){log.info("Collector disabled");setInterval(()=>{},60000);await new Promise(()=>{});}
validateLiveProfile(profile);
const token=process.env.METRICS_PUSH_TOKEN?.trim();
if(!token)throw Error("METRICS_PUSH_TOKEN required");
const url=new URL(process.env.METRICS_PUSH_URL||"https://octometrics.eqvoice.workers.dev/api/ingest");
if(url.protocol!=="https:"||url.pathname!=="/api/ingest"||url.username||url.password)throw Error("Invalid metrics URL");
// Railway retains stdout; do not grow an unbounded per-container JSONL file.
const publisher=new EventPublisher("/tmp/octobot-"+profile.key+".jsonl",url.href,token,{append:async()=>{}});
const emit=(type,details)=>publisher.publish({type,time:new Date().toISOString(),realm:profile.realmName,account:profile.account,role:profile.role,...details});
const drops=createDropPipeline({publish:e=>publisher.publish(e)});
const raid=profile.raid;
const zone=profile.role==="org"?"bwl":"onyxia";
if(raid&&zone==="bwl"&&!cfg.blackwingLair)throw Error("BWL profile requires WOW_BWL_ENABLED");
const raidConfig=zone==="bwl"?cfg.blackwingLair??cfg:cfg;
const threshold=raidConfig.raidStrengthSize??raid?.minActivity;
const tracker=raid?new RaidTracker({minRaidSize:raidConfig.minRaidSize??threshold,grouping:cfg.raidGrouping,clearSize:raidConfig.raidClearSize,strengthSize:threshold,leftFloor:raidConfig.raidLeftFloor,clearSustainedMs:raidConfig.raidClearSustainedMs,fillWindowMs:raidConfig.raidFillWindowMs,lockoutMs:raidConfig.raidLockoutMs,maxConcurrentRaids:raidConfig.raidMaxConcurrent,rosterCap:raidConfig.raidRosterCap,formConfirmMs:raidConfig.raidFormConfirmMs}):null;
const telemetry=raid?createRaidTelemetryFromEnv(process.env,profile.realmName,log):null;
const persistence=tracker?createRaidPersistence({url,token,secret:process.env.RAID_STATE_KEY,zone,lockoutMs:raidConfig.raidLockoutMs}):null;
if(persistence)log.info("Raid checkpoint: "+await persistence.restore(tracker));
const chronicle=raid?new HttpChronicleClient(undefined,zone==="bwl"?BLACKWING_RECENT_URL:undefined):null;
let lastChronicleAttempt=0;
async function reconcileChronicle(departureReady=false){
 // Recheck the source before publishing a new roster-departure completion,
 // even if the normal minute interval has not elapsed.
 if(!chronicle||!tracker.sessions().sessions.length||(!departureReady&&Date.now()-lastChronicleAttempt<60000))return;
 lastChronicleAttempt=Date.now();
 try{const logs=await chronicle.fetchRecent();const kills=cleanFinalBossKills(logs,profile.realmName,zone==="bwl"?"Nefarian":"Onyxia");
  return kills;
 }catch(error){log.warn("Chronicle unavailable; using roster departure: "+String(error));}
}
let stopping=false,socket=null,build=cfg.build,connectedAt=0;
for(const signal of ["SIGTERM","SIGINT"])process.once(signal,()=>{stopping=true;socket?.destroy();});
function tcp(host,port){return new Promise((resolve,reject)=>{const s=connect({host,port});socket=s;const timer=setTimeout(()=>{s.destroy();reject(Error("TCP timeout"));},15000);s.once("error",e=>{clearTimeout(timer);reject(e);});s.once("connect",()=>{clearTimeout(timer);resolve(s);});});}
async function session(){
 const auth=await new AuthClient(log).login({host:cfg.authHost,port:cfg.authPort,username:cfg.account,password:cfg.password,integrityChecksum:cfg.integrityChecksum,build});
 const realm=auth.realms.find(r=>r.name.toLowerCase()===profile.realmName.toLowerCase());
 if(!realm)throw Error("Realm absent");
 const target=cfg.worldHost?{host:cfg.worldHost,port:cfg.worldPort??8085}:parseAddress(realm.address);
 const s=await tcp(target.host,target.port);if(stopping){s.destroy();return;}
 await new Promise((resolve,reject)=>{
  let world,ended=false,ready=false,info=null,infoTimer=null,lastDmf=0;
  const stops=[],health=new ListenerHealth(profile),watch=new NpcWatch(),nearby=new Map(),names=new Map();
  const chat=profile.chat?createWorldChat({account:profile,config:{pushUrl:url.href,pushToken:token},log,getWorld:()=>world}):null;
  const ah=auctionEnabled?createAuctionSession({account:profile,log,getWorld:()=>world}):null;
  const timeout=setTimeout(()=>finish(Error("World login timeout")),30000);
  function finish(error){if(ended)return;ended=true;clearTimeout(timeout);clearTimeout(infoTimer);for(const stop of stops)stop();chat?.stop();ah?.stop();if(ready)emit("session_offline",{reason:String(error??"closed").slice(0,160)});if(ready&&profile.dmf)emit("dmf_status",{site:profile.dmf,connected:false,queries:watch.asked});if(ready&&profile.buffs){health.disconnected(Date.now(),String(error??"closed"));emit("listener_health",health.snapshot(Date.now(),publisher.stats()));}ready=false;world?.close();s.destroy();error&&!stopping?reject(error):resolve();}
  function presence(){if(!ready||Date.now()-lastDmf<60000)return;for(const entry of nearby.values()){const npc=names.get(entry);if(npc&&isFaireNpc(npc)){lastDmf=Date.now();emit("dmf_sighting",{site:profile.dmf,npc,source:"onsite",confirmed:true});break;}}}
  function pollInfo(){if(!ready||info)return;info=[];try{world.say(".server info");}catch(error){info=null;throw error;}infoTimer=setTimeout(()=>{const lines=info??[];info=null;const match=lines.join(" ").match(/Players online:\s*(\d+)/i);if(match)emit("server_info",{lines,population:Number(match[1]),source:"server_info",valid:true});else log.warn("No valid server info reply");},6000);}
  async function pollRaid(){if(!ready)return;let lastWho=0;const areaId=zone==="bwl"?raidConfig.areaId:cfg.watchAreaId;const result=await fetchRoster(async query=>{if(lastWho)await wait(Math.max(0,cfg.whoSliceDelayMs-(Date.now()-lastWho)));if(!ready||ended)throw Error("Raid session disconnected");lastWho=Date.now();return world.whoOnce(query,cfg.whoTimeoutMs);},areaId),at=Date.now(),present=result.players.filter(p=>p.areaId===areaId),complete=result.complete;if(!ready||ended)return;const observation=tracker.observe({present,complete,at});const kills=await reconcileChronicle(observation.events.some(e=>e.kind==='cleared'));if(!ready||ended)return;for(const kill of kills??[]){if(tracker.confirmChronicleKill(kill.uploader,kill.at.getTime(),Date.now()))log.info("Chronicle final boss kill matched to raid");}await persistence.save(tracker);if(!ready||ended)return;const observedState=tracker.sessions();emit("raid_who",{zone:areaId,zoneName:raid.zoneName,playersListed:present.length,serverWhoOnline:result.onlineCount,listCapped:!complete,activity:observedState.sessions.some(x=>x.status!=="ended"),observationOnly:true,clearConfirmed:false});if(observedState.sessions.some(s=>s.id===null)){await persistence.number(tracker);await persistence.save(tracker);}if(!ready||ended)return;const state=tracker.sessions();telemetry?.report(zone,[{label:"crossfaction",sessions:state}],{formAt:threshold,floor:raidConfig.raidLeftFloor},{present:present.length,complete,at});}
  const job=(fn,settings)=>stops.push(schedule(fn,settings,{onError:e=>log.warn(String(e))}));
  world=new WorldClient({socket:s,account:cfg.account,sessionKey:auth.sessionKey,characterName:cfg.characterName,build:cfg.worldBuild,logger:log,handlers:{
    ...ah?.handlers,
    onReady(){if(ended||ready)return;ready=true;connectedAt=Date.now();clearTimeout(timeout);log.info("Profile ready "+profile.key);health.connected(Date.now());emit("session_online",{});job(()=>emit("session_online",{}),{period:60,offset:({OBPVESW:3,OBPVEORG:13,OBPVEDMFA:23,OBPVEDMFH:33,OBPVEAH:43,OBPVPSW:53,OVHCSW:55})[profile.key]});if(profile.info)job(pollInfo,profile.info);if(raid)job(pollRaid,raid);if(profile.buffs){emit("listener_health",health.snapshot(Date.now(),publisher.stats()));job(()=>emit("listener_health",health.snapshot(Date.now(),publisher.stats())),{period:60,offset:profile.role==="org"?26:11});}if(profile.dmf){emit("dmf_status",{site:profile.dmf,connected:true,queries:watch.asked});job(()=>{emit("dmf_status",{site:profile.dmf,connected:true,queries:watch.asked});presence();},{period:60,offset:profile.role==="dmfa"?32:42});}if(chat){chat.start();job(()=>chat.flush(),profile.chat);job(()=>chat.guildTick(),{period:60,offset:profile.role==="dmfa"?17:47});}ah?.start();},
    onSystemMessage(line){if(info&&line)info.push(line);},
    onMonsterYell(sender,text){if(profile.buffs){health.heardYell(Date.now());drops.handleYell(profile,sender,text,health);}},
    onChannelMessage(...args){chat?.receive(...args);},
    onWorldObjects(raw){ah?.handlers.onWorldObjects?.(raw);if(!profile.dmf||!world.isReady)return;const update=parseUpdateObject(raw,world.selfGuid??undefined);for(const c of update.ownerChanges)if(c.kind==="out-of-range")nearby.delete(c.guid);const entries=new Map();for(const u of update.units){nearby.set(u.guid,u.entry);entries.set(u.entry,u.guid);}for(const entry of watch.take(entries.keys())){const guid=entries.get(entry);if(guid!==undefined)world.queryCreature(entry,guid);}presence();},
    onCreatureName(entry,name){ah?.handlers.onCreatureName?.(entry,name);if(profile.dmf&&name){names.set(entry,name);presence();}},
    onObjectDestroyed(guid){ah?.handlers.onObjectDestroyed?.(guid);nearby.delete(guid);},
    onError:finish,onClose:()=>finish(Error("World connection closed"))
  }});world.start();
 });
}
let backoff=5000;
while(!stopping){connectedAt=0;try{await session();}catch(e){log.warn("Collector session failed: "+String(e));if(e instanceof VersionMismatchError&&cfg.autoResolve)try{build=await resolveBuild(cfg.clientCdn);}catch{}}
 if(connectedAt&&Date.now()-connectedAt>=60000)backoff=5000;
 if(!stopping){await wait(backoff+Math.floor(Math.random()*1000));backoff=Math.min(backoff*2,120000);}}
await publisher.close();
