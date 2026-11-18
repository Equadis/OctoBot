// Existing OctoMetrics deployment only. Never create a Worker, D1 database or secret.
import {readFile,readdir} from "node:fs/promises";
import {fileURLToPath} from "node:url";
const token=process.env.CLOUDFLARE_API_TOKEN;
if(!token)throw Error("CLOUDFLARE_API_TOKEN repository secret is missing");
const root="https://api.cloudflare.com/client/v4";
const worker="octometrics";
const folder=new URL("./",import.meta.url);
async function api(path,options={}){
 const headers={Authorization:"Bearer "+token,...options.headers};
 const res=await fetch(root+path,{...options,headers,signal:AbortSignal.timeout(60000)});
 const data=await res.json();
 if(!res.ok||!data.success)throw Error("Cloudflare "+options.method+" "+path.split("?")[0]+" failed (HTTP "+res.status+"; error codes "+(data.errors??[]).map(e=>e.code).join(",")+")");
 return data.result;
}
const configured=process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const accounts=configured?[{id:configured}]:await api("/accounts?per_page=50");
if(!Array.isArray(accounts)||accounts.length!==1)throw Error("Set the CLOUDFLARE_ACCOUNT_ID repository variable (exactly one authorised account required).");
const id=accounts[0].id;
if(!/^[a-f0-9]{32}$/i.test(id))throw Error("Invalid Cloudflare account ID");
const base="/accounts/"+id;
const path=base+"/workers/scripts/"+worker;
const settings=await api(path+"/settings");
if(!Array.isArray(settings.bindings)||!settings.compatibility_date)throw Error("Cannot verify existing Worker configuration");
const binding=settings.bindings.find(b=>b.name==="DB"&&b.type==="d1");
if(!binding)throw Error("Existing DB binding not found");
const database=binding.id??binding.database_id;
if(!/^[0-9a-f-]{36}$/i.test(database??""))throw Error("Existing D1 ID could not be verified");
const db=base+"/d1/database/"+database;
const dbInfo=await api(db);
if(dbInfo.name!=="octometrics")throw Error("DB binding is not the octometrics database");
for(const name of ["METRICS_PUSH_TOKEN","AUCTION_PUSH_TOKEN"])if(!settings.bindings.some(b=>b.name===name))throw Error("Required existing binding missing: "+name);
const keepNames=settings.bindings.map(b=>b.name).sort();
const before=await api(path+"/deployments");
console.log("Existing deployment:",before.deployments?.[0]?.id??"unknown");
const query=async sql=>api(db+"/query",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sql})});
const tables=await query("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('metric_events','ah_listings','pvp_ah_listings','ah_daily','pvp_ah_daily')");
if(!Array.isArray(tables)||tables[0]?.results?.length!==5)throw Error("Existing production schema not verified");
const migration=await readFile(new URL("migrations/0012_auction_seller_names.sql",folder),"utf8");
await query(migration);
const verified=await query("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('ah_seller_names','pvp_ah_seller_names')");
if(verified[0]?.results?.length!==2)throw Error("Seller schema not verified");
console.log("Both realm seller caches exist.");
// Inherit every existing binding by name. Strict mode rejects missing inheritance.
const metadata={main_module:"worker.mjs",compatibility_date:settings.compatibility_date,compatibility_flags:settings.compatibility_flags??[],bindings:settings.bindings.map(b=>({type:"inherit",name:b.name})),annotations:{"workers/message":"OctoBot "+(process.env.GITHUB_SHA??"manual").slice(0,12)}};
for(const key of ["limits","logpush","observability","placement","tags","tail_consumers","usage_model","cache_options"])if(settings[key]!=null)metadata[key]=settings[key];
const parts=new FormData();
parts.append("metadata",new Blob([JSON.stringify(metadata)],{type:"application/json"}));
for(const name of (await readdir(folder)).filter(n=>n.endsWith(".mjs")&&!n.startsWith("deploy-")&&!n.startsWith("audit-"))){
 parts.append(name,new Blob([await readFile(new URL(name,folder))],{type:"application/javascript+module"}),name);
}
await api(path+"?bindings_inherit=strict",{method:"PUT",body:parts});
const after=await api(path+"/settings");
if(JSON.stringify(after.bindings.map(b=>b.name).sort())!==JSON.stringify(keepNames))throw Error("Post-deploy binding check failed");
console.log("Existing bindings preserved.");
for(const realm of ["N'Zoth","Y'Shaarj"]){
 const baseUrl="https://octometrics.eqvoice.workers.dev/api/auction/";
 const suffix="?realm="+encodeURIComponent(realm);
 const get=async resource=>{
  const r=await fetch(baseUrl+resource+suffix+(resource==="items"?"&limit=10&sort=quantity&dir=desc":""),{signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw Error("Production "+realm+" "+resource+" HTTP "+r.status);
  return r.json();
 };
 const summary=await get("summary");
 const items=await get("items");
 if(items.items?.length&&!Object.hasOwn(items.items[0],"average_samples"))throw Error("New price contract missing");
 console.log(realm+": "+(summary.auction_count??0)+" listings; "+(items.items??[]).filter(i=>i.historical_avg!=null).length+" of "+(items.items??[]).length+" sampled items have averages");
}
console.log("OctoMetrics deploy complete.");
