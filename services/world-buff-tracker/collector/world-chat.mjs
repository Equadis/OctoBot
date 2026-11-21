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
    // Vanilla chat tags are enum values: 1 = AFK, 2 = DND, 3 = GM.
    return {gm:raw[tag]===3,text:text.trim()};
  }catch{return null;}
}
export function createWorldChat({account,config,log,getWorld}){
  const sources={"N\u0027Zoth":["OBPVEDMFA","OBPVEDMFH"],"Y\u0027Shaarj":[],"C\u0027Thun":[]};
  const enabled=process.env.WORLD_CHAT_ENABLED==="true"&&sources[account.realmName]?.includes(account.account.toUpperCase())&&!!config.pushUrl&&!!config.pushToken;
  let queue=[],timer=null,busy=false,seen=false,stopped=false,lookupCount=0,lastWarn=0,retryAt=0,backoff=10000;
  const names=new Map(),pending=new Map(),guildCache=new Map(),guildRequests=new Map(),guildOut=new Map();
  let guildBusy=false,lastLookup=0;
  function queueGuild(guid,name){
    if(!name||name==="Unknown player")return;
    if(Date.now()-(guildCache.get(guid)??0)<30*60*1000||guildRequests.has(guid))return;
    if(guildRequests.size>=500)guildRequests.delete(guildRequests.keys().next().value);
    guildRequests.set(guid,name);
  }
  function observeWho(players){
    if(!enabled||stopped||!Array.isArray(players))return;
    const byName=new Map(players.filter(p=>typeof p.name==="string"&&typeof p.guild==="string").map(p=>[p.name.toLowerCase(),p]));
    for(const [guid,name] of guildRequests){
      if(!byName.has(name.toLowerCase()))continue;
      const time=Date.now(),profile=byName.get(name.toLowerCase()),guild=profile.guild.slice(0,100);
      if(guildCache.size>=3000)guildCache.delete(guildCache.keys().next().value);
      guildCache.set(guid,time);guildRequests.delete(guid);
      if(guildOut.size>=250)guildOut.delete(guildOut.keys().next().value);
      guildOut.set(guid,{authorKey:guid.toString(),guild,time,level:profile.level,classId:profile.classId});
    }
  }
  async function guildTick(){
    const world=getWorld(),now=Date.now();
    if(!enabled||stopped||!seen||guildBusy||!world?.isReady||typeof world.whoOnce!=="function"||now-lastLookup<55000||!guildRequests.size)return;
    const [guid,name]=guildRequests.entries().next().value;
    guildBusy=true;lastLookup=now;
    try{
      const result=await world.whoOnce({playerName:name},5000);
      const match=result?.players?.find(p=>typeof p.name==="string"&&p.name.toLowerCase()===name.toLowerCase());
      if(match)observeWho([match]);
    }catch{}
    finally{
      // No result is not proof of being guildless. Rotate unanswered requests to avoid starvation.
      if(guildRequests.has(guid)){guildRequests.delete(guid);guildRequests.set(guid,name);}
      guildBusy=false;
    }
  }
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
    if(!seen||busy||stopped||Date.now()<retryAt)return;
    busy=true;const now=Date.now();queue=queue.filter(x=>x.time>=now-100000);
    const messages=queue.splice(0,20);
    for(const [key,item] of guildOut)if(item.time<now-100000)guildOut.delete(key);
    const guilds=[...guildOut.entries()].slice(0,10);
    for(const [key] of guilds)guildOut.delete(key);
    function retryGuilds(){for(const [key,item] of guilds)if(!guildOut.has(key))guildOut.set(key,item);}
    try{
      const url=new URL(config.pushUrl);url.pathname="/api/world-chat/ingest";url.search="";url.hash="";
      const response=await fetch(url,{method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+config.pushToken},body:JSON.stringify({realm:account.realmName,account:account.account,channel:"world",messages,guilds:guilds.map(([,item])=>item)}),signal:AbortSignal.timeout(7000)});
      if(response.ok){backoff=10000;retryAt=0;}else{if(response.status>=500||response.status===429){queue=[...messages,...queue].slice(-250);retryGuilds();retryAt=Date.now()+backoff;backoff=Math.min(backoff*2,120000);}if(now-lastWarn>60000){lastWarn=now;log.warn("World Chat alpha: ingest HTTP "+response.status);}}
    }catch{queue=[...messages,...queue].slice(-250);retryGuilds();retryAt=Date.now()+backoff;backoff=Math.min(backoff*2,120000);}
    finally{busy=false;}
  }
  return {
    start(){
      if(!enabled)return;
      const world=getWorld();
      if(typeof world?.joinChannel!=="function"){log.warn("World Chat alpha: client has no joinChannel support; feed disabled");return;}
      try{world.joinChannel("world");log.info("World Chat alpha: joined requested public channel; awaiting valid packet");timer={active:true};}
      catch{log.warn("World Chat alpha: could not join world");}
    },
    flush,guildTick,observeWho,
    receive(channel,guid,text,raw){
      if(!enabled||stopped||!timer)return;
      const packet=decodeWorldPacket(channel,guid,text,raw);
      if(!packet||!packet.text||packet.text.length>1200)return;
      if(!seen)log.info("World Chat alpha: first valid public channel packet received");
      seen=true;const time=Date.now(),id=randomUUID();
      void nameFor(guid).then(author=>{if(stopped)return;queueGuild(guid,author);queue.push({id,time,authorKey:guid.toString(),author,message:packet.text,gm:packet.gm});if(queue.length>250)queue.shift();});
    },
    stop(){stopped=true;timer=null;queue=[];guildRequests.clear();guildOut.clear();}
  };
}
