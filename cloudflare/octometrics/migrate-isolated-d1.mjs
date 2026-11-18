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
  const command=(db,sql)=>["npx","wrangler","d1","execute",db,"--remote","--command="+sql,"--json"];
  // Do not combine full-table counts into a large UNION on an already stressed D1 database.
  const checks=tables.map(n=>({name:"rows:"+n,sql:"SELECT COUNT(*) AS rows FROM "+n}));
  for(const n of tables)checks.push({name:"schema:"+n,sql:"SELECT type,name,sql FROM sqlite_schema WHERE tbl_name='"+n+"' AND sql IS NOT NULL ORDER BY type,name"});
  if(prefix==="auction")for(const p of ["ah_","pvp_ah_"]){
    checks.push({name:p+"latest_complete",sql:"SELECT scan_id,completed_at,auction_count,page_count FROM "+p+"scans WHERE status='complete' ORDER BY completed_at DESC,scan_id DESC LIMIT 1"});
    checks.push({name:p+"historical_total",sql:"SELECT auction_count FROM "+p+"historical_total WHERE id=1"});
    checks.push({name:p+"upload_lock",sql:"SELECT scan_id FROM "+p+"scans WHERE status='uploading'"});
  }else checks.push({name:"chat_latest",sql:"SELECT realm,MAX(observed_ms) latest_ms FROM world_chat_messages GROUP BY realm ORDER BY realm"});
  return {target,tables,exports,
   // Run only after all exports are verified and the destination is EMPTY.
   verification:checks.map(({name,sql})=>({name,source:command(source,sql),target:command(target,sql)})),
   precondition:"Stop source writers, export from consistent snapshot, inspect ALL files; import into empty DB only. Preserve original DB."};
 });
}
if(process.argv[1]?.endsWith("migrate-isolated-d1.mjs"))console.log(JSON.stringify(migrationPlan(...process.argv.slice(2)),null,2));
