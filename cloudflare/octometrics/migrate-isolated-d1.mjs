#!/usr/bin/env node
/**
 * Build a safe, non-executing D1 isolation plan. Wrangler's --table selects ONE
 * table, not an array: repeat individual exports instead of silently exporting
 * only the last listed table. Check all dumps before executing any imports.
 */
export const AUCTION_TABLES=["scans","pages","listings","item_points","daily","first_seen","item_metadata","historical_total","seller_names"].flatMap(n=>["ah_"+n,"pvp_ah_"+n]);
export const CHAT_TABLES=["messages","listings","heartbeat","guilds","profiles","search_text"].map(n=>"world_chat_"+n);
export function migrationPlan(source,auction,chat){
 const names=[source,auction,chat];
 if(names.some(n=>typeof n!=="string"||!/^[a-zA-Z0-9_-]+$/.test(n))||new Set(names).size!==3)throw Error("Supply three distinct D1 database names");
 return [[auction,AUCTION_TABLES,"auction"],[chat,CHAT_TABLES,"chat"]].map(([target,tables,prefix])=>{
  const exports=tables.map(table=>{
   const file=prefix+"-"+table+".sql";
   return {table,file,
    export:["npx","wrangler","d1","export",source,"--remote","--table="+table,"--output="+file],
    import:["npx","wrangler","d1","execute",target,"--remote","--file="+file]};
  });
  const counts=tables.map(n=>"SELECT '"+n+"' AS table_name,COUNT(*) AS rows FROM "+n).join(" UNION ALL ");
  return {target,tables,exports,
   // Run only after all exports are verified and the destination is EMPTY.
   verifySource:["npx","wrangler","d1","execute",source,"--remote","--command="+counts,"--json"],
   verifyTarget:["npx","wrangler","d1","execute",target,"--remote","--command="+counts,"--json"],
   precondition:"Stop source writers, export from consistent snapshot, inspect ALL files; import into empty DB only. Preserve original DB."};
 });
}
if(process.argv[1]?.endsWith("migrate-isolated-d1.mjs"))console.log(JSON.stringify(migrationPlan(...process.argv.slice(2)),null,2));
