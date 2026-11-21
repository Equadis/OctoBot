// Existing OctoMetrics deployment only. Never create a Worker, D1 database or secret.
import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {relative,resolve,dirname,sep} from "node:path";
const token=process.env.CLOUDFLARE_API_TOKEN;
if(!token)throw Error("CLOUDFLARE_API_TOKEN repository secret is missing");
const root="https://api.cloudflare.com/client/v4";
const worker="octometrics";
const folder=new URL("./",import.meta.url);
async function api(path,options={}){
 const headers={Authorization:"Bearer "+token,...options.headers};
 const res=await fetch(root+path,{...options,headers,signal:AbortSignal.timeout(60000)});
 const data=await res.json();
 if(!res.ok||!data.success)throw Error("Cloudflare "+options.method+" "+path.split("?")[0]+" failed (HTTP "+res.status+"; error codes "+(data.errors??[]).map(e=>e.code).join(",")+")"+(options.method==="PUT"?": "+(data.errors??[]).map(e=>String(e.message??"").replaceAll(token,"[redacted]").slice(0,500)).join("; "):""));
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
const variable=name=>settings.bindings.find(binding=>binding.name===name&&binding.type==='plain_text')?.text;
const snapshotMode=variable('AUCTION_SNAPSHOT_MODE')==='true';
if(snapshotMode){
 if(!settings.bindings.some(binding=>binding.name==='AUCTION_SNAPSHOTS'&&binding.type==='r2_bucket'))throw Error('Snapshot mode requires the existing AUCTION_SNAPSHOTS R2 binding');
 if(!settings.bindings.some(binding=>binding.name==='AUCTION_ADMIN_TOKEN'))throw Error('Snapshot mode requires an existing AUCTION_ADMIN_TOKEN secret');
 if(variable('AUCTION_COLLECTION_PAUSED')!=='true'&&process.env.OCTOMETRICS_ALLOW_AUCTION_LIVE!=='true'){
  throw Error('Pause Auction House collection for the first snapshot deployment or explicitly acknowledge a live update');
 }
}else{
 const tables=await query("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('metric_events','ah_listings','pvp_ah_listings','ah_daily','pvp_ah_daily')");
 if(!Array.isArray(tables)||tables[0]?.results?.length!==5)throw Error("Existing production schema not verified");
 const migration=await readFile(new URL("migrations/0012_auction_seller_names.sql",folder),"utf8");
 await query(migration);
 const verified=await query("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('ah_seller_names','pvp_ah_seller_names')");
 if(verified[0]?.results?.length!==2)throw Error("Seller schema not verified");
 console.log("Both realm seller caches exist.");
}
// Inherit every existing binding by name. Strict mode rejects missing inheritance.
const metadata={main_module:"cloudflare/octometrics/worker.mjs",compatibility_date:settings.compatibility_date,compatibility_flags:settings.compatibility_flags??[],bindings:settings.bindings.map(b=>({type:"inherit",name:b.name})),annotations:{"workers/message":"OctoBot "+(process.env.GITHUB_SHA??"manual").slice(0,12)}};
for(const key of ["limits","logpush","observability","placement","tags","tail_consumers","usage_model","cache_options"])if(settings[key]!=null)metadata[key]=settings[key];
// Preserve the repository-relative module names, including shared World Chat modules.
const repoRoot=resolve(fileURLToPath(folder),"../..");
const graph=new Map();
async function addModule(filename){
 const name=relative(repoRoot,filename).split(sep).join("/");
 if(name.startsWith("../")||!name.endsWith(".mjs"))throw Error("Unexpected Worker dependency: "+name);
 if(graph.has(name))return;
 const source=await readFile(filename,"utf8");
 graph.set(name,source);
 for(const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)["'](\.[^"']+\.mjs)["']/g)){
  await addModule(resolve(dirname(filename),match[1]));
 }
}
await addModule(resolve(repoRoot,metadata.main_module));
await import(new URL("worker.mjs",folder));
const parts=new FormData();
parts.append("metadata",new Blob([JSON.stringify(metadata)],{type:"application/json"}),"metadata.json");
for(const [name,source] of graph)parts.append(name,new Blob([source],{type:"application/javascript+module"}),name);
console.log("Worker modules:",[...graph.keys()].join(", "));
await api(path+"?bindings_inherit=strict",{method:"PUT",body:parts});
const after=await api(path+"/settings");
if(JSON.stringify(after.bindings.map(b=>b.name).sort())!==JSON.stringify(keepNames))throw Error("Post-deploy binding check failed");
console.log("Existing bindings preserved.");
await query(await readFile(new URL("migrations/0008_world_chat_staff_repair.sql",folder),"utf8"));
const health=await fetch('https://octometrics.eqvoice.workers.dev/health',{signal:AbortSignal.timeout(20000)});
if(!health.ok||!(await health.json()).ok)throw Error('OctoMetrics health check failed');
const auctionPaused=variable('AUCTION_API_PAUSED')==='true'||variable('AUCTION_PUBLIC_PAUSED')==='true';
for(const realm of auctionPaused?[]:["N'Zoth","Y'Shaarj"]){
 const baseUrl="https://octometrics.eqvoice.workers.dev/api/auction/";
 const suffix="?realm="+encodeURIComponent(realm);
 const get=async resource=>{
  const r=await fetch(baseUrl+resource+suffix+(resource==="items"?"&limit=10&sort=quantity&dir=desc":""),{signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw Error("Production "+realm+" "+resource+" HTTP "+r.status);
  return r.json();
 };
 const summary=await get("summary");
 if(snapshotMode&&!summary.has_catalogue)continue;
 const items=await get("items");
 if(items.items?.length&&!Object.hasOwn(items.items[0],"average_samples"))throw Error("New price contract missing");
 console.log(realm+": "+(summary.auction_count??0)+" listings; "+(items.items??[]).filter(i=>i.historical_avg!=null).length+" of "+(items.items??[]).length+" sampled items have averages");
}
console.log("OctoMetrics deploy complete.");
