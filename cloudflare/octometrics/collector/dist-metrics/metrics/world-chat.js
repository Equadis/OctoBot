import {randomUUID} from "node:crypto";
// Independent best-effort public feed: no disk/console chat archive, no pressure on raid telemetry.
export function decodeWorldPacket(channel,sender,text,raw){
  try{
    if(typeof channel!=="string"||channel.toLowerCase()!=="world"||typeof sender!=="bigint"||sender<=0n||
       !Buffer.isBuffer(raw)||raw.length<23||raw.readUInt32LE(1)===0xffffffff)return null;
    const end=raw.indexOf(0,5);if(end<0||raw.toString("utf8",5,end).toLowerCase()!=="world")return null;
    const offset=end+1+4;
    if(raw.readBigUInt64LE(offset)!==sender)return null;
    const len=raw.readUInt32LE(offset+8),start=offset+12,tag=start+len;
    if(len<2||tag!==raw.length-1||raw[tag-1]!==0||raw.toString("utf8",start,tag-1)!==text)return null;
    return {gm:(raw[tag]&4)!==0,text:text.trim()};
  }catch{return null;}
}
export function createWorldChat({account,config,log,getWorld}){
  const enabled=process.env.WORLD_CHAT_ENABLED==="true"&&account.role==="sw"&&!!config.pushUrl&&!!config.pushToken;
  let queue=[],timer=null,busy=false,seen=false,stopped=false,lookupCount=0,lastWarn=0;
  const names=new Map(),pending=new Map();
  async function nameFor(guid){
    if(names.has(guid))return names.get(guid);
    if(pending.has(guid))return pending.get(guid);
    const world=getWorld();
    if(!world||typeof world.resolveName!=="function"||lookupCount>=4)return "Unknown player";
    lookupCount++;
    const p=Promise.resolve().then(()=>world.resolveName(guid,3000)).then(n=>{
      const name=typeof n==="string"&&n.trim()?n.slice(0,80):"Unknown player";
      if(name!=="Unknown player"){if(names.size>=3000)names.delete(names.keys().next().value);names.set(guid,name);}
      return name;
    }).catch(()=>"Unknown player").finally(()=>{lookupCount--;pending.delete(guid);});
    pending.set(guid,p);return p;
  }
  async function flush(){
    if(!seen||busy||stopped)return;
    busy=true;const now=Date.now();queue=queue.filter(x=>x.time>=now-100000);
    const messages=queue.splice(0,20);
    try{
      const url=new URL(config.pushUrl);url.pathname="/api/world-chat/ingest";url.search="";url.hash="";
      const response=await fetch(url,{method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+config.pushToken},body:JSON.stringify({realm:account.realmName,account:account.account,channel:"world",messages}),signal:AbortSignal.timeout(7000)});
      if(!response.ok){if(response.status>=500||response.status===429)queue=[...messages,...queue].slice(-250);if(now-lastWarn>60000){lastWarn=now;log.warn("World Chat alpha: ingest HTTP "+response.status);}}
    }catch{queue=[...messages,...queue].slice(-250);}
    finally{busy=false;}
  }
  return {
    start(){
      if(!enabled)return;
      const world=getWorld();
      if(typeof world?.joinChannel!=="function"){log.warn("World Chat alpha: client has no joinChannel support; feed disabled");return;}
      try{world.joinChannel("world");log.info("World Chat alpha: joined requested public channel; awaiting valid packet");timer=setInterval(()=>void flush(),5000);}
      catch{log.warn("World Chat alpha: could not join world");}
    },
    receive(channel,guid,text,raw){
      if(!enabled||stopped||!timer)return;
      const packet=decodeWorldPacket(channel,guid,text,raw);
      if(!packet||!packet.text||packet.text.length>1200)return;
      if(!seen)log.info("World Chat alpha: first valid public channel packet received");
      seen=true;const time=Date.now(),id=randomUUID();
      void nameFor(guid).then(author=>{if(stopped)return;queue.push({id,time,authorKey:guid.toString(),author,message:packet.text,gm:packet.gm});if(queue.length>250)queue.shift();});
    },
    stop(){stopped=true;if(timer)clearInterval(timer);queue=[];}
  };
}
