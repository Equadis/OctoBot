#!/usr/bin/env node
/** Patch the locally uploaded metrics bundle without replacing its custom metrics modules. */
import {readFileSync,writeFileSync,existsSync,mkdirSync} from "node:fs";
import {join,dirname,resolve,relative} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {execFileSync} from "node:child_process";
const here=dirname(fileURLToPath(import.meta.url));
export function patchPvpAuction(input){
 const edits=[
 ['import { WorldClient } from "../net/world-client.js";','import { createPvpAuction } from "../pvp-auction-session.js";','after'],
 ['let world = null;','const pvpAuction = createPvpAuction({account,log,getWorld:()=>world});','after'],
 ['worldChat.stop();','pvpAuction.stop();','after'],
 ['worldChat.start();','pvpAuction.start();','after'],
 ['handlers: {','...pvpAuction.handlers,','after']
 ];
 if(edits.every(([,line])=>input.includes(line)))return input;
 if(edits.some(([,line])=>input.includes(line)))throw Error("Partial PvP auction patch; refusing to overwrite");
 let s=input;
 for(const [anchor,line] of edits){if(s.split(anchor).length!==2)throw Error("Expected exactly one anchor: "+anchor);s=s.replace(anchor,anchor+"\n"+line);}
 for(const key of ["onWorldObjects","onCreatureName","onObjectDestroyed","onAuctionHello","onAuctionList","onItemTemplate"])if(new RegExp("\\b"+key+"\\s*:").test(input))throw Error("Existing "+key+" handler requires a manual merge");
 return s;
}
export function makePlan(root,dist){
 const target=join(root,"dist-metrics"),entry=join(target,"metrics","index.js");
 const original=readFileSync(entry,"utf8");
 if(!original.includes("worldChat.start()"))throw Error("Apply existing world-chat patch first");
 const plan=new Map([[entry,patchPvpAuction(original)]]);
 const seen=new Set();
 function copy(file){
  if(seen.has(file))return;seen.add(file);
  const source=join(dist,file),code=readFileSync(source,"utf8");
  if(file.startsWith("metrics/")||file.startsWith(".."))throw Error("Unexpected dependency "+file);
  plan.set(join(target,file),code);
  // Relative static imports only; recursively copy the current tested client dependencies.
  for(const m of code.matchAll(/(?:from\s*|import\s*)["'](\.[^"']+\.js)["']/g)){
   const dep=relative(dist,resolve(dirname(source),m[1])).replace(/\\/g,"/");copy(dep);
  }
 }
 copy("pvp-auction-session.js");copy("net/world-client.js");
 const wire=plan.get(join(target,"net","world-client.js"));
 for(const marker of ["joinChannel(","resolveName(","whoOnce(","auctionHello(","auctionList(","onAuctionList?.("])if(!wire.includes(marker))throw Error("Compiled client lacks "+marker);
 return plan;
}
function main(){
 const [target,...flags]=process.argv.slice(2);
 if(!target||flags.some(f=>!["--apply","--dry-run"].includes(f))||flags.includes("--apply")&&flags.includes("--dry-run"))throw Error("Usage: node apply-pvp-auction.mjs <metrics upload folder> [--dry-run|--apply]");
 const root=resolve(target),dist=resolve(here,"../../../services/world-buff-tracker/dist"),plan=makePlan(root,dist),apply=flags.includes("--apply");
 for(const code of plan.values())execFileSync(process.execPath,["--input-type=module","--check"],{input:code,stdio:["pipe","pipe","pipe"]});
 const changed=[...plan].filter(([path,code])=>!existsSync(path)||readFileSync(path,"utf8")!==code);
 for(const [path] of changed)console.log((apply?"Updating ":"Would update ")+path);
 if(!apply){console.log("Dry run passed; no files changed.");return;}
 const backup=join(dirname(root),".pvp-auction-backup-"+new Date().toISOString().replace(/[:.]/g,"-"));
 for(const [path] of changed)if(existsSync(path)){const dest=join(backup,relative(root,path));mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,readFileSync(path));}
 for(const [path,code] of changed){mkdirSync(dirname(path),{recursive:true});writeFileSync(path,code);}
 console.log("Patched; no deployment performed. Backup: "+backup);
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)try{main();}catch(e){console.error(e.message);process.exitCode=1;}
