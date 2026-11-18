/** Ordered, bounded TCP failover for a single trusted realm. No probing other realm ports. */
export type WorldTarget={host:string;port:number};
export function auctionWorldTargets(advertised:WorldTarget,override:WorldTarget|null,known:WorldTarget|null,fallbackHosts:string):WorldTarget[]{
 const fallbacks=fallbackHosts.split(",").map(host=>host.trim().toLowerCase()).filter(Boolean);
 if(fallbacks.length>5||fallbacks.some(host=>!(/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(host)&&host.length<=253)))throw new Error("Invalid AUCTION_WORLD_FALLBACK_HOSTS (up to five comma-separated hosts)");
 const candidates=[override,known?.port===advertised.port?known:null,advertised,...fallbacks.map(host=>({host,port:advertised.port}))];
 const seen=new Set<string>();
 return candidates.filter((target):target is WorldTarget=>{
  if(!target)return false;
  const key=target.host.toLowerCase()+":"+target.port;
  if(seen.has(key))return false;
  seen.add(key);return true;
 });
}
export async function connectAuctionWorld<T>(targets:readonly WorldTarget[],connect:(target:WorldTarget)=>Promise<T>,stopping:()=>boolean,onFailure:(target:WorldTarget,error:unknown)=>void):Promise<{connection:T;target:WorldTarget}>{
 let last:unknown;
 for(const target of targets){
  if(stopping())throw new Error("Auction collector stopping");
  try{return {connection:await connect(target),target};}
  catch(error){last=error;onFailure(target,error);}
 }
 throw new Error("All auction world TCP endpoints failed: "+(last instanceof Error?last.message:String(last)));
}
