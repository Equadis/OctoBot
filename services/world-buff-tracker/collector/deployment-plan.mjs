import {PROFILES} from "./profiles.mjs";
const shared=name=>"${{shared."+name+"}}";
/** Non-executing deployment plan. No credentials or provider-generated variables. */
export function deploymentPlan(){
 return Object.entries(PROFILES).map(([name,p])=>{
  const variables={COLLECTOR_PROFILE:name,WOW_ACCOUNT:p.account,WOW_CHARACTER:p.account,WOW_REALM:p.realmName,WOW_LISTENERS:"[]",WOW_LOGIN_ENABLED:"false",
   WOW_AUTH_HOST:shared("WOW_AUTH_HOST"),WOW_PASSWORD:shared("WOW_PASSWORD"),METRICS_PUSH_URL:shared("METRICS_PUSH_URL"),METRICS_PUSH_TOKEN:shared("METRICS_PUSH_TOKEN"),RAILPACK_NODE_VERSION:shared("RAILPACK_NODE_VERSION")};
  if(p.raid)variables.RAID_STATE_KEY=shared("RAID_STATE_KEY");
  if(p.chat)variables.WORLD_CHAT_ENABLED="true";
  if(p.auction)Object.assign(variables,{AUCTION_COLLECTOR_ENABLED:"true",AUCTION_RULES_APPROVED:"false",AUCTION_PUSH_URL:shared("AUCTION_PUSH_URL"),AUCTION_PUSH_TOKEN:shared("AUCTION_PUSH_TOKEN"),AUCTION_MAX_PAGES:"2000",AUCTION_QUERY_INTERVAL_MS:"0",AUCTION_QUERY_TIMEOUT_MS:"30000",AUCTION_UPLOAD_INTERVAL_MS:"500",AUCTION_SCAN_COOLDOWN_MS:"3600000"});
  return {name,source:{repo:"Equadis/OctoBot",branch:"infra/seven-collector-recovery",rootDirectory:"/services/world-buff-tracker"},build:{builder:"RAILPACK",buildCommand:"npm run build"},deploy:{startCommand:"npm run start:collector",regions:{"europe-west4-drams3a":{numReplicas:1}}},variables};
 });
}
if(process.argv[1]?.endsWith("deployment-plan.mjs"))console.log(JSON.stringify(deploymentPlan(),null,2));
