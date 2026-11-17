import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { MongoClient } from "mongodb";
import { medianOf } from "./duration-store.js";
import { RAID_ZONE_STORE_NAMES } from "../raid-zone-setup.js";
import type { RaidZoneId } from "./raid-zone.js";

export interface AuditDuration {
  readonly _id?: unknown;
  readonly ts?: unknown;
  readonly ms?: unknown;
  readonly sessionKey?: unknown;
  readonly valid?: unknown;
}
interface D1Record {
  readonly key: string;
  readonly durationMs: number;
  readonly trusted: boolean;
}
export interface D1ZoneAudit {
  readonly realm: string;
  readonly zone: RaidZoneId;
  readonly retainedDetails?: readonly D1Record[];
  readonly standaloneKeysExcluded?: readonly string[];
}
const dateMs=(ts:unknown):number=>ts instanceof Date?ts.getTime():typeof ts==="string"?Date.parse(ts):NaN;
const validMs=(ms:unknown):ms is number=>typeof ms==="number"&&Number.isFinite(ms)&&ms>0;
const keyOf=(d:AuditDuration):string|null=>typeof d.sessionKey==="string"&&d.sessionKey.length>0?d.sessionKey:null;

/** Input is sorted newest first by Mongo ts then _id, same as the learning aggregation. */
export function auditMongoDurations(rows:readonly AuditDuration[],zone:RaidZoneId,d1?:D1ZoneAudit){
  const keys=new Map<string,AuditDuration>(),counts=new Map<string,number>();
  let unkeyed=0,malformed=0,invalid=0;
  for(const row of rows){
    const key=keyOf(row);
    if(!key)unkeyed++;
    else {
      counts.set(key,(counts.get(key)??0)+1);
      if(!keys.has(key))keys.set(key,row);
    }
    if(!validMs(row.ms)||!Number.isFinite(dateMs(row.ts)))malformed++;
    if(row.valid===false)invalid++;
  }
  const eligible=[...keys.entries()].filter(([,row])=>row.valid===true&&validMs(row.ms)&&Number.isFinite(dateMs(row.ts)));
  const durations=eligible.slice(0,200).map(([,row])=>row.ms as number);
  const byD1=new Map((d1?.retainedDetails??[]).map(r=>[r.key,r]));
  const excluded=new Set(d1?.standaloneKeysExcluded??[]);
  const comparisons=d1?{
    matching:eligible.filter(([key,row])=>byD1.get(key)?.durationMs===row.ms&&byD1.get(key)?.trusted).length,
    excludedButMongoValid:eligible.filter(([key])=>excluded.has(key)).map(([key])=>key),
    durationMismatch:eligible.flatMap(([key,row])=>{const expected=byD1.get(key);return expected&&expected.durationMs!==row.ms?[{key,mongoMs:row.ms,d1Ms:expected.durationMs}]:[];}),
    d1UntrustedButMongoValid:eligible.filter(([key])=>byD1.get(key)?.trusted===false).map(([key])=>key),
    mongoWithoutRetainedD1Evidence:eligible.filter(([key])=>!excluded.has(key)&&!byD1.has(key)).map(([key])=>key),
    trustedD1MissingValidMongoSample:(d1.retainedDetails??[]).filter(r=>r.trusted&&!eligible.some(([key])=>key===r.key)).map(r=>r.key),
  }:null;
  return {zone,rows:rows.length,unkeyedLegacyRows:unkeyed,malformedRows:malformed,invalidRows:invalid,duplicateKeys:[...counts.entries()].filter(([,n])=>n>1).map(([key,count])=>({key,count})),eligibleSessions:eligible.length,learningWindow:{samples:durations.length,medianMs:medianOf(durations)},comparisons};
}

async function main(){
  const uri=process.env.MONGODB_URI,dbName=process.env.MONGODB_DB;
  if(!uri||!dbName)throw new Error("MONGODB_URI and MONGODB_DB must already be configured in this environment");
  const arg=process.argv.indexOf("--d1");
  const d1File=arg>=0?process.argv[arg+1]:undefined;
  const reports:D1ZoneAudit[]=d1File?JSON.parse(readFileSync(d1File,"utf8").replace(/^\uFEFF/,"")):[];
  const realm=process.env.WOW_REALM??"N'Zoth";
  const client=new MongoClient(uri,{maxPoolSize:2,serverSelectionTimeoutMS:10_000});
  try{
    await client.connect();
    const db=client.db(dbName),zones: RaidZoneId[]=["onyxia","bwl"];
    const result=[];
    for(const zone of zones){
      const docs=await db.collection<AuditDuration>(RAID_ZONE_STORE_NAMES[zone].durations).find({},{projection:{_id:1,sessionKey:1,ts:1,ms:1,valid:1}}).sort({ts:-1,_id:-1}).toArray();
      result.push(auditMongoDurations(docs,zone,reports.find(r=>r.realm===realm&&r.zone===zone)));
    }
    const checkpointCount=await db.collection("raidcheckpoints").countDocuments();
    console.log(JSON.stringify({realm,checkpointCount,zones:result},null,2));
  }finally{await client.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(()=>{console.error("MongoDB history audit failed. Verify the authorised connection, database, and read permissions. No writes were attempted.");process.exitCode=1;});
}
