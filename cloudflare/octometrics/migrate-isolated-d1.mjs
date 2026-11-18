#!/usr/bin/env node
// Prints export/import commands only. No database access or mutations.
export const AUCTION_TABLES=["scans","pages","listings","item_points","daily","first_seen","item_metadata","historical_total","seller_names"].flatMap(n=>["ah_"+n,"pvp_ah_"+n]);
export const CHAT_TABLES=["messages","listings","heartbeat","guilds","profiles","search_text"].map(n=>"world_chat_"+n);
export function migrationPlan(source,auction,chat){
 const names=[source,auction,chat];
 if(names.some(n=>typeof n!=="string"||!/^[a-zA-Z0-9_-]+$/.test(n))||new Set(names).size!==3)throw Error("Supply three distinct D1 database names");
 const plan=[];
 for(const [target,tables,file] of [[auction,AUCTION_TABLES,"auction-backup.sql"],[chat,CHAT_TABLES,"chat-backup.sql"]]){
  const counts=tables.map(n=>"SELECT '"+n+"' AS table_name,COUNT(*) AS rows FROM "+n).join(" UNION ALL ");
  plan.push({target,tables,export:["npx","wrangler","d1","export",source,"--remote","--output="+file,...tables.map(n=>"--table="+n)],import:["npx","wrangler","d1","execute",target,"--remote","--file="+file],verifySource:["npx","wrangler","d1","execute",source,"--remote","--command="+counts,"--json"],verifyTarget:["npx","wrangler","d1","execute",target,"--remote","--command="+counts,"--json"]});
 }
 return plan;
}
if(process.argv[1]?.endsWith("migrate-isolated-d1.mjs"))console.log(JSON.stringify(migrationPlan(...process.argv.slice(2)),null,2));
