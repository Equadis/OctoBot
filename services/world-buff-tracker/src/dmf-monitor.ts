/**
 * Dedicated, NPC-only N'Zoth Darkmoon Faire collector.
 * Uses the advanced tracker's authenticated game client and NPC name matcher.
 * Run with: npm run start:dmf (not npm start).
 */
import {connect, type Socket} from "node:net";
import {loadConfig, parseAddress, type BotConfig} from "./config.js";
import {AuthClient} from "./net/auth-client.js";
import {WorldClient} from "./net/world-client.js";
import {NpcWatch} from "./darkmoon/npc-watch.js";
import {isFaireNpc} from "./darkmoon/npcs.js";
import {parseUpdateObject} from "./protocol/update-object.js";
import {resolveBuild} from "./net/client-resolver.js";
import {VersionMismatchError} from "./errors.js";
import {createLogger, prefixed, type Logger} from "./logger.js";
import type {FaireLocation} from "./darkmoon/location.js";

type DmfRole = "dmfa" | "dmfh";
type Watcher = {account:string; loginAccount:string; password:string; character:string; role:DmfRole; site:FaireLocation};
type EventData =
  | {type:"dmf_status"; connected:boolean; queries:number}
  | {type:"dmf_sighting"; npc:string; source:"onsite"; confirmed:true};

const sockets = new Set<Socket>();
let stopping = false;
const HEARTBEAT_MS = 60_000;

export function watchersFromConfig(config:BotConfig): readonly Watcher[] {
  const h = config.listeners[0];
  // OBPVEDMFA / OBPVEDMFH are in-game CHARACTER names, not authentication accounts.
  // Legacy Railway variables used those character names as WOW_ACCOUNT; correct the
  // login here without exposing or changing the existing stored passwords.
  const allianceLogin=config.account==="OBPVEDMFA"?"PVEOBDMFA":config.account;
  const hordeLogin=h?.account==="OBPVEDMFH"?"PVEOBDMFH":h?.account;
  if(config.realm !== "N'Zoth" || allianceLogin !== "PVEOBDMFA" ||
    config.darkmoonWatchLocation !== "elwynn" || config.listeners.length !== 1 ||
    !h || hordeLogin !== "PVEOBDMFH" || h.darkmoonWatchLocation !== "mulgore") {
    throw new Error("DMF-only mode needs login accounts PVEOBDMFA (Elwynn) and PVEOBDMFH (Mulgore) on N'Zoth");
  }
  return [
    {account:"OBPVEDMFA",loginAccount:allianceLogin,password:config.password,character:config.characterName,role:"dmfa",site:"elwynn"},
    {account:"OBPVEDMFH",loginAccount:hordeLogin,password:h.password,character:h.characterName,role:"dmfh",site:"mulgore"},
  ];
}

function pushFactory(config:BotConfig, logger:Logger) {
  const token=process.env.METRICS_PUSH_TOKEN?.trim();
  if(!token)throw new Error("METRICS_PUSH_TOKEN is required");
  const url=new URL(process.env.METRICS_PUSH_URL?.trim() || "https://octometrics.eqvoice.workers.dev/api/ingest");
  if(url.protocol!=="https:" || url.pathname!=="/api/ingest" || url.username || url.password)
    throw new Error("METRICS_PUSH_URL must be a secure /api/ingest endpoint");
  return async (watcher:Watcher, event:EventData):Promise<void> => {
    try {
      const response=await fetch(url,{
        method:"POST",
        headers:{authorization:"Bearer "+token,"content-type":"application/json"},
        body:JSON.stringify({...event,realm:config.realm,account:watcher.account,role:watcher.role,
          site:watcher.site,time:new Date().toISOString()}),
        signal:AbortSignal.timeout(10_000),
      });
      if(!response.ok)throw new Error("HTTP "+response.status);
    } catch(error) {
      logger.warn("DMF ingest failed for "+watcher.account+": "+(error instanceof Error?error.message:String(error)));
    }
  };
}

function tcp(host:string,port:number):Promise<Socket> {
  return new Promise((resolve,reject)=>{
    const socket=connect({host,port});
    const timer=setTimeout(()=>{socket.destroy();reject(new Error("World TCP connection timed out"));},15_000);
    socket.once("connect",()=>{clearTimeout(timer);socket.removeAllListeners("error");resolve(socket);});
    socket.once("error",(error)=>{clearTimeout(timer);socket.destroy();reject(error);});
  });
}

async function session(config:BotConfig, watcher:Watcher, build:number,
  push:(w:Watcher,e:EventData)=>Promise<void>, log:Logger):Promise<void> {
  const auth=await new AuthClient(log).login({
    host:config.authHost,port:config.authPort,username:watcher.loginAccount,password:watcher.password,
    integrityChecksum:config.integrityChecksum,build,
  });
  const realm=auth.realms.find(r=>r.name.toLowerCase()===config.realm.toLowerCase());
  if(!realm)throw new Error("N'Zoth not found in realm list");
  const target=config.worldHost?{host:config.worldHost,port:config.worldPort??8085}:parseAddress(realm.address);
  const socket=await tcp(target.host,target.port);
  sockets.add(socket);
  await new Promise<void>((resolve,reject)=>{
    const watch=new NpcWatch();
    const nearby=new Map<bigint,number>(); // only units still in range
    const names=new Map<number,string>(); // creature entry -> verified name
    let lastConfirmedAt=0;
    let ready=false,finished=false;
    let timeout:ReturnType<typeof setTimeout>|null=null;
    let heartbeat:ReturnType<typeof setInterval>|null=null;
    const reportStatus=(connected:boolean):void=>{
      void push(watcher,{type:"dmf_status",connected,queries:watch.asked});
    };
    const reportPresence=():void=>{
      if(!ready || Date.now()-lastConfirmedAt<HEARTBEAT_MS)return;
      for(const entry of nearby.values()){
        const name=names.get(entry);
        if(name && isFaireNpc(name)){
          lastConfirmedAt=Date.now();
          log.info("DMF confirmed at "+watcher.site+" by nearby NPC "+name);
          void push(watcher,{type:"dmf_sighting",npc:name,source:"onsite",confirmed:true});
          return;
        }
      }
    };
    const finish=(error?:Error):void=>{
      if(finished)return;
      finished=true;
      if(timeout)clearTimeout(timeout);
      if(heartbeat)clearInterval(heartbeat);
      sockets.delete(socket);
      if(ready)reportStatus(false);
      world.close();
      if(error && !stopping)reject(error);
      else resolve();
    };
    const world=new WorldClient({
      socket,account:watcher.loginAccount,sessionKey:auth.sessionKey,
      characterName:watcher.character,build:config.worldBuild,logger:log,
      handlers:{
        onReady:()=>{
          ready=true;
          if(timeout)clearTimeout(timeout);
          log.info("DMF in-world at "+watcher.site+"; NPC detector active (no /who, whispers or chat)");
          reportStatus(true);
          heartbeat=setInterval(()=>{reportStatus(true);reportPresence();},HEARTBEAT_MS);
        },
        onWorldObjects:(raw)=>{
          if(!world.isReady)return;
          const update=parseUpdateObject(raw,world.selfGuid??undefined);
          if(update.incomplete)log.debug("Partial nearby-object update");
          for(const change of update.ownerChanges){
            if(change.kind==="out-of-range")nearby.delete(change.guid);
          }
          const entries=new Map<number,bigint>();
          for(const unit of update.units){
            nearby.set(unit.guid,unit.entry);
            entries.set(unit.entry,unit.guid);
          }
          for(const entry of watch.take(entries.keys())){
            const guid=entries.get(entry);
            if(guid!==undefined)world.queryCreature(entry,guid);
          }
          reportPresence();
        },
        onCreatureName:(entry,name)=>{
          if(name===null)return;
          names.set(entry,name);
          reportPresence();
        },
        onObjectDestroyed:(guid)=>{nearby.delete(guid);},
        onError:(error)=>finish(error),
        onClose:()=>finish(new Error("World connection closed")),
      },
    });
    world.start();
    timeout=setTimeout(()=>finish(new Error("World handshake timed out")),30_000);
  });
}

async function monitor(config:BotConfig,watcher:Watcher,
  push:(w:Watcher,e:EventData)=>Promise<void>,logger:Logger):Promise<void>{
  const log=prefixed(logger,watcher.account);
  let build=config.build,backoff=5_000,lastBuildCheck=0;
  while(!stopping){
    try {
      await session(config,watcher,build,push,log);
      backoff=5_000;
    }catch(error){
      log.warn("DMF session failed: "+(error instanceof Error?error.message:String(error)));
      if(error instanceof VersionMismatchError && config.autoResolve &&
        Date.now()-lastBuildCheck>=5*60_000){
        lastBuildCheck=Date.now();
        try {
          const updated=await resolveBuild(config.clientCdn);
          if(updated!==build){log.info("Client build updated "+build+" -> "+updated);build=updated;}
        }catch(e){log.warn("Client version lookup failed: "+(e instanceof Error?e.message:String(e)));}
      }
    }
    if(stopping)break;
    await new Promise(resolve=>setTimeout(resolve,backoff));
    backoff=Math.min(backoff*2,60_000);
  }
}

async function main():Promise<void>{
  try{process.loadEnvFile();}catch{ /* Railway env is authoritative */ }
  const config=loadConfig(process.env);
  const log=createLogger(config.logLevel);
  const watchers=watchersFromConfig(config);
  const push=pushFactory(config,log);
  if(!config.loginEnabled){
    log.warn("DMF-only logins disabled by WOW_LOGIN_ENABLED=false");
    setInterval(()=>log.info("DMF collector idle"),10*60_000);
    return;
  }
  const stop=():void=>{stopping=true;for(const socket of sockets)socket.destroy();};
  process.once("SIGTERM",stop);
  process.once("SIGINT",stop);
  log.info("DMF-only process: "+watchers.map(w=>w.account+" "+w.site).join(", "));
  await Promise.all(watchers.map(w=>monitor(config,w,push,log)));
}

main().catch((error:unknown)=>{
  console.error(error instanceof Error?error.stack??error.message:String(error));
  process.exitCode=1;
});
