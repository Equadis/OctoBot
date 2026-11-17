#!/usr/bin/env node
// Patch the separately uploaded metrics tracker without replacing its raid/auction logic.
import {readFileSync,writeFileSync,existsSync,mkdirSync} from "node:fs";
import {join,dirname,resolve} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {execFileSync} from "node:child_process";
const here=dirname(fileURLToPath(import.meta.url));
export function patchCollector(input){
  let src=input;
  const edits=[
    ['import { EventPublisher } from "./events.js";','import { createWorldChat } from "./world-chat.js";', 'after'],
    ['let world = null;','const worldChat = createWorldChat({account,config,log,getWorld:()=>world});','after'],
    ['whisperResponder.stop();','worldChat.stop();','after'],
    ['wasReady = true;','worldChat.start();','after'],
    ['onMonsterYell: (sender, text) => {','onChannelMessage: (channel, guid, text, raw) => worldChat.receive(channel,guid,text,raw),','before'],
    ['const whoSecond = raidWhoSlot(account);','stopJobs.push(scheduleSlot((whoSecond + 30) % 60, 60, () => { if (!whoBusy) void worldChat.guildTick(); }));','after'],
    ['void world.whoOnce({ zoneIds: [account.zone] }, 8000).then(result => {','worldChat.observeWho(result.players);','after']
  ];
  const present=edits.map(([,line])=>src.includes(line));
  if(present.every(Boolean))return src;
  const initial=present.slice(0,5);
  if((initial.some(Boolean)&&!initial.every(Boolean))||(!initial.every(Boolean)&&/onChannelMessage\s*:/.test(src)))throw Error("Existing or partial channel hook: merge manually; no files changed.");
  for(const [anchor,line,position] of edits){
    if(src.includes(line))continue;
    if(src.split(anchor).length!==2)throw Error("Expected exactly one collector anchor: "+anchor);
    const indent=src.slice(src.lastIndexOf("\n",src.indexOf(anchor)-1)+1,src.indexOf(anchor));
    src=src.replace(anchor,position==="before"?line+"\n"+indent+anchor:anchor+"\n"+indent+(anchor.endsWith("{")?"    ":"")+line);
  }
  return src;
}
export function makePlan(root){
  const dir=join(root,"dist-metrics","metrics"), entry=join(dir,"index.js");
  const client=join(root,"dist-metrics","net","world-client.js");
  for(const p of [entry,client,join(root,"package.json"),join(root,"wrangler.metrics.toml")])if(!existsSync(p))throw Error("Missing "+p);
  const original=readFileSync(entry,"utf8"),wire=readFileSync(client,"utf8");
  for(const marker of ["joinChannel(","resolveName(","onChannelMessage?.(","whoOnce("])if(!wire.includes(marker))throw Error("Collector client lacks "+marker+"; refusing to patch.");
  return [
    {path:entry,content:patchCollector(original)},
    {path:join(dir,"world-chat.js"),content:readFileSync(join(here,"dist-metrics","metrics","world-chat.js"),"utf8")}
  ];
}
function main(){
  const [target,...flags]=process.argv.slice(2);
  if(!target||flags.some(f=>!["--apply","--dry-run"].includes(f))||flags.includes("--apply")&&flags.includes("--dry-run"))throw Error("Usage: node apply-world-chat.mjs <existing collector folder> [--dry-run | --apply]");
  const apply=flags.includes("--apply"),root=resolve(target),plan=makePlan(root);
  // Parse the proposed JS before making any change. stdin avoids putting temporary files in the project.
  for(const item of plan)execFileSync(process.execPath,["--input-type=module","--check"],{input:item.content,stdio:["pipe","pipe","pipe"]});
  const changes=plan.filter(item=>!existsSync(item.path)||readFileSync(item.path,"utf8")!==item.content);
  const backupDir=join(dirname(root),".world-chat-backup-"+new Date().toISOString().replace(/[:.]/g,"-"));
  for(const item of changes)console.log((apply?"Updating ":"Would update ")+item.path);
  if(!apply){console.log("Dry run passed. No files changed.");return;}
  // Backups outside the Railway upload root, no credentials or unrelated files copied.
  if(changes.length){mkdirSync(backupDir,{recursive:true});for(const item of changes)if(existsSync(item.path))writeFileSync(join(backupDir,item.path.split(/[\\/]/).pop()),readFileSync(item.path));}
  for(const item of changes)writeFileSync(item.path,item.content,"utf8");
  console.log(changes.length?"Patched. Backup: "+backupDir:"Already patched.");
  console.log("No deployment performed. Apply D1 migration and deploy Worker before enabling WORLD_CHAT_ENABLED=true.");
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  try{main();}catch(e){console.error(e.message);process.exitCode=1;}
}
