/**
 * Read-only audit of retained production raid events exported as Wrangler D1 JSON.
 * Does not connect, write or delete anything. Accepts one or more paginated export files.
 */
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {cleanSession,endedEvents,latestSnapshots,learnAuthoritative,ZONE_HEAD,snapshotHistoryRevisions} from './raid-sessions.mjs';
import {RAIDS} from './raid-intel.mjs';

export function auditRaidHistory(rows,now=Date.now()){
  const result=[];
  const realms=[...new Set(rows.map(r=>r.realm))].sort();
  for(const realm of realms)for(const zone of Object.keys(ZONE_HEAD)){
    const input=rows.filter(r=>r.realm===realm);
    const snapshots=[],ends=[],revisions=[],seen=new Set(),keys=new Set(),endKeys=new Set();
    let malformed=0,duplicates=0,legacyEnds=0,semanticDuplicates=0,untrusted=0,disbanded=0,interrupted=0;
    for(const r of input){
      let p;try{p=JSON.parse(r.payload_json);}catch{continue;}
      if(p?.zone!==zone)continue;
      const eid=p.eventId;
      if(eid&&seen.has(eid)){duplicates++;continue;}
      if(eid)seen.add(eid);
      if(r.type==='raid_sessions'){
        if(!Array.isArray(p.sessions)||p.schema!==1||!Number.isFinite(p.seq)){malformed++;continue;}
        if(p.sessions.some(s=>!cleanSession(s,now))){malformed++;continue;}
        snapshots.push(r);

      }else if(r.type==='raid_session_ended'||r.type==='raid_session_revision'){
        const s=p.session;
        if(!cleanSession(s,now)){malformed++;continue;}
        if(s.status==='ended'){
          const duration=Date.parse(s.endedAt)-Date.parse(s.formedAt);
          if(p.durationMs!==duration){malformed++;continue;}
          if(r.type==='raid_session_ended'){
            const key=[s.key,s.endedAt,s.endReason].join('|');
            if(endKeys.has(key))semanticDuplicates++;
            endKeys.add(key);keys.add(s.key);
            if(!s.confirmedAt)legacyEnds++;
          }
          if(s.endReason==='disbanded')disbanded++;
          if(s.endReason==='interrupted')interrupted++;
          if(!s.trusted)untrusted++;
        }
        (r.type==='raid_session_ended'?ends:revisions).push(r);
      }
    }
    if(!snapshots.length&&!ends.length&&!revisions.length&&!malformed)continue;
    const compact=snapshotHistoryRevisions(snapshots,zone,now);
    revisions.push(...compact);
    const snapshot=latestSnapshots(snapshots,now)[zone]??null;
    const reconciled=endedEvents(ends,zone,snapshot,revisions);
    const learned=learnAuthoritative(reconciled,RAIDS[ZONE_HEAD[zone]]);
    const details=reconciled.map(p=>({key:p.session.key,formedAt:p.session.formedAt,departedAt:p.session.endedAt,confirmedAt:p.confirmedAt,confirmationExact:Boolean(p.session.confirmedAt),endReason:p.session.endReason,clearSource:p.session.clearSource,trusted:p.session.trusted,durationMs:p.durationMs}));
    const exclusions=[...keys].filter(k=>!reconciled.some(p=>p.session.key===k)).map(key=>{
      const records=[...ends,...revisions].flatMap(r=>{try{const s=JSON.parse(r.payload_json).session;return s?.key===key?[{status:s.status,endReason:s.endReason??null,resumed:s.resumed,observedAt:r.observed_at}]:[];}catch{return [];}});
      const live=snapshot?.payload.sessions.find(s=>s.key===key&&s.status!=='ended');
      return {key,latestSnapshotStatus:live?.status??null,observedEndReasons:[...new Set(records.map(r=>r.endReason).filter(Boolean))],resumeObserved:records.some(r=>r.status!=='ended'&&r.resumed)};
    });
    result.push({realm,zone,rows:{snapshots:snapshots.length,standaloneEnds:ends.length,revisions:revisions.length},malformed,duplicateEventIds:duplicates,duplicateEndTransitions:semanticDuplicates,legacyEndsWithoutConfirmation:legacyEnds,untrustedEndRows:untrusted,disbandedEndRows:disbanded,interruptedEndRows:interrupted,standaloneKeysExcluded:[...keys].filter(k=>!reconciled.some(p=>p.session.key===k)),retainedFinishes:reconciled.length,excludedDetails:exclusions,retainedDetails:details,prediction:learned,lastFinished:reconciled[0]?{key:reconciled[0].session.key,at:reconciled[0].confirmedAt}:null});
  }
  return result;
}

/** Generate append-only, idempotent D1 SQL from retained snapshot evidence. */
export function buildHistoryBackfillSql(rows,now=Date.now()){
  const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
  const output=['-- Derived raid lifecycle revisions only; raw telemetry is NOT modified.'];
  for(const realm of [...new Set(rows.map(r=>r.realm))]){
    const source=rows.filter(r=>r.realm===realm&&r.type==='raid_sessions');
    for(const zone of Object.keys(ZONE_HEAD))for(const r of snapshotHistoryRevisions(source,zone,now)){
      const p=JSON.parse(r.payload_json);
      output.push("INSERT INTO metric_events(type,realm,account,role,observed_at,payload_json) SELECT "+['raid_session_revision',realm,r.account,r.role,r.observed_at,r.payload_json].map(quote).join(',')+" WHERE NOT EXISTS (SELECT 1 FROM metric_events WHERE realm="+quote(realm)+" AND type='raid_session_revision' AND json_extract(payload_json,'$.eventId')="+quote(p.eventId)+");");
    }
  }
  return output.join('\n')+'\n';
}

function rowsFrom(file){
  const bytes=readFileSync(file);
  const text=(bytes[0]===255&&bytes[1]===254?bytes.toString('utf16le'):bytes.toString('utf8')).replace(/^\uFEFF/,'');
  const data=JSON.parse(text);
  return (Array.isArray(data)?data:[data]).flatMap(r=>Array.isArray(r.results)?r.results:[r]);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(process.argv.length<3)throw new Error('Supply one or more Wrangler D1 JSON export files.');
  const args=process.argv.slice(2);
  const sql=args[0]==='--backfill-sql';
  if(sql)args.shift();
  if(!args.length)throw new Error('Supply Wrangler D1 export files.');
  const rows=args.flatMap(rowsFrom);
  console.log(sql?buildHistoryBackfillSql(rows):JSON.stringify(auditRaidHistory(rows),null,2));
}
