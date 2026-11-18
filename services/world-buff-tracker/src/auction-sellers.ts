/** Resolve only names requested by the authenticated, realm-scoped Worker.
 * Bounded to 30 lookups after a completed scan; never blocks publication.
 * Failed/offline lookups are persisted as attempts and retried later. */
export async function resolveAuctionSellers(options:{
 url:URL;token:string|undefined;scanId:string;resolve:(guid:bigint)=>Promise<string|null>;
 publish:(payload:Record<string,unknown>)=>Promise<void>;log:{info:(s:string)=>void;warn:(s:string)=>void};active:()=>boolean;
}):Promise<void>{
 const {url,token,scanId,resolve,publish,log,active}=options;
 if(!token||!active())return;
 try{
  const response=await fetch(url,{headers:{authorization:"Bearer "+token},signal:AbortSignal.timeout(10000)});
  if(!response.ok)return;
  const data=await response.json() as {scan_id?:string;sellers?:{owner_guid:string}[]};
  if(data.scan_id!==scanId||!Array.isArray(data.sellers))return;
  const sellers:{owner_guid:string;character_name:string|null}[]=[];
  for(const {owner_guid} of data.sellers.slice(0,30)){
   if(!active())break;
   if(!/^\d{1,20}$/.test(owner_guid)||BigInt(owner_guid)===0n||BigInt(owner_guid)>0xffffffffffffffffn)continue;
   let name:string|null=null;
   try{name=await resolve(BigInt(owner_guid));}catch{/* session unavailable */}
   if(!active())break;
   sellers.push({owner_guid,character_name:typeof name==="string"&&/^\p{L}{1,24}$/u.test(name)?name:null});
   await new Promise<void>(done=>setTimeout(done,500));
  }
  if(sellers.length){await publish({scan_id:scanId,sellers});log.info("Auction seller names: "+sellers.filter(s=>s.character_name).length+"/"+sellers.length+" resolved");}
 }catch(error){log.warn("Auction seller lookup deferred: "+String(error));}
}
