import {createHash,createCipheriv,createDecipheriv,randomBytes} from "node:crypto";
// Authenticated encryption prevents raw roster names from reaching D1. The key is
// deployment-wide and must be kept across restarts/rotations. No secrets go into logs.
function keyFor(secret){if(!secret||secret.length<16)throw Error("RAID_STATE_KEY must have at least 16 characters");return createHash("sha256").update("octobot-raid-state:v2:"+secret).digest();}
export function sealCheckpoint(checkpoint,zone,secret){
 const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",keyFor(secret),iv);
 cipher.setAAD(Buffer.from("octobot:"+zone));
 const data=Buffer.concat([cipher.update(JSON.stringify(checkpoint),"utf8"),cipher.final()]);
 return Buffer.concat([iv,cipher.getAuthTag(),data]).toString("base64");
}
export function openCheckpoint(payload,zone,secret){
 const b=Buffer.from(payload,"base64");if(b.length<29)throw Error("Invalid checkpoint");
 const cipher=createDecipheriv("aes-256-gcm",keyFor(secret),b.subarray(0,12));
 cipher.setAAD(Buffer.from("octobot:"+zone));cipher.setAuthTag(b.subarray(12,28));
 const state=JSON.parse(Buffer.concat([cipher.update(b.subarray(28)),cipher.final()]).toString("utf8"));
 if(state.version!==1||!Array.isArray(state.slots)||!Array.isArray(state.ended)||!Array.isArray(state.seen)||!state.locks)throw Error("Invalid checkpoint schema");
 return state;
}
/** Legacy lockout timestamps represent the time a roster member was last locked.
 * An active slot always blocks a clean cutover, regardless of its age. */
export function legacyStateNeedsMigration(state,lockoutMs,now=Date.now()){
 if(!state||!Array.isArray(state.slots)||state.slots.length)return true;
 const locks=state.lockouts??{};
 if(!locks||typeof locks!=="object"||Array.isArray(locks))return true;
 const values=Object.values(locks);
 if(!values.length)return false;
 if(!Number.isSafeInteger(lockoutMs)||lockoutMs<=0)return true;
 return values.some(at=>!Number.isSafeInteger(at)||at<=0||at>now||now-at<lockoutMs);
}
export function createRaidPersistence({url,token,secret,zone,fetcher=fetch,lockoutMs,now=Date.now}){
 keyFor(secret);
 const headers={authorization:"Bearer "+token,"content-type":"application/json"};
 async function req(path,method="GET",body){
  const response=await fetcher(new URL("/api/raid/"+path,url),{method,headers,...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(8000)});
  return {status:response.status,data:await response.json()};
 }
 let lastSaved=0;
 return {
  async restore(tracker){
   const r=await req("checkpoint?zone="+zone);
   if(r.status===200){tracker.restoreCheckpoint(openCheckpoint(r.data.payload,zone,secret));lastSaved=r.data.observedAt;return "restored";}
   if(r.status!==404)throw Error("Raid checkpoint read HTTP "+r.status);
   const old=await req("state?zone="+zone);
   if(old.status===200&&legacyStateNeedsMigration(old.data.state,lockoutMs,now()))throw Error("Legacy raid state requires migration before starting "+zone);
   if(![200,404].includes(old.status))throw Error("Legacy state read HTTP "+old.status);
   return "empty";
  },
  async save(tracker){
   const state=tracker.checkpoint();if(state.at<=0||state.at<lastSaved)return;
   const payload=sealCheckpoint(state,zone,secret);
   const r=await req("checkpoint","PUT",{zone,observedAt:state.at,payload});
   if(r.status!==200)throw Error("Raid checkpoint write HTTP "+r.status);
   lastSaved=state.at;
  },
  async number(tracker){
   for(const s of tracker.sessions().sessions){
    if(s.id!==null)continue;
    const requestId=zone+":"+s.key;
    const r=await req("number","POST",{zone,requestId});
    if(r.status!==200||!Number.isSafeInteger(r.data.n))throw Error("Raid number allocation HTTP "+r.status);
    if(!tracker.assignNumber(s.key,r.data.n))throw Error("Raid number could not attach to session");
   }
  }
 };
}
