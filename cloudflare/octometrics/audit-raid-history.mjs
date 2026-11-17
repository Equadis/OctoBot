/**
 * Read-only audit of retained production raid events exported as Wrangler D1 JSON.
 * Does not connect, write or delete anything. Accepts one or more paginated export files.
 */
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {cleanSession,endedEvents,latestSnapshots,learnAuthoritative,ZONE_HEAD} from './raid-sessions.mjs';
import {RAIDS} from './raid-intel.mjs';

export function auditRaidHistory(rows,now=Date.now()){
  const result=[];
  const realms=[...new Set(rows.map(r=>r.realm))].sort();
  for(const realm of realms)for(const zone of Object.keys(ZONE_HEAD)){
    const input=rows.filter(r=>r.realm===realm);
    const snapshots=[],ends=[],revisions=[],seen=new Set(),keys=new Set(),endKeys=new Set();
    let malformed=0,duplicates=0,legacyEnds=0,semanticDuplicates=0,untrusted=0,disbanded=0,interrupted=0;
    const addRevision=(s,r)=>{
      if(!cleanSession(s,now)){malformed++;return;}
      if(s.status==='ended' || s.resumed===true){
        const payload={schema:1,zone,session:s,...(s.status==='ended'?{durationMs:Date.parse(s.endedAt)-Date.parse(s.formedAt)}:{})};
        revisions.push({...r,payload_json:JSON.stringify(payload)});
      }
    };
    for(const r of input){
      let p;try{p=JSON.parse(r.payload_json);}catch{continue;}
      if(p?.zone!==zone)continue;
      const eid=p.eventId;
      if(eid&&seen.has(eid)){duplicates++;continue;}
      if(eid)seen.add(eid);
      if(r.type==='raid_sessions'){
        if(!Array.isArray(p.sessions)||p.schema!==1||!Number.isFinite(p.seq)){malformed++;continue;}
        snapshots.push(r);
        for(const s of p.sessions)addRevision(s,r);
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
    const snapshot=latestSnapshots(snapshots,now)[zone]??null;
    const reconciled=endedEvents(ends,zone,snapshot,revisions);
    const learned=learnAuthoritative(reconciled,RAIDS[ZONE_HEAD[zone]]);
    result.push({realm,zone,rows:{snapshots:snapshots.length,standaloneEnds:ends.length,revisions:revisions.length},malformed,duplicateEventIds:duplicates,duplicateEndTransitions:semanticDuplicates,legacyEndsWithoutConfirmation:legacyEnds,untrustedEndRows:untrusted,disbandedEndRows:disbanded,interruptedEndRows:interrupted,standaloneKeysExcluded:[...keys].filter(k=>!reconciled.some(p=>p.session.key===k)),retainedFinishes:reconciled.length,prediction:learned,lastFinished:reconciled[0]?{key:reconciled[0].session.key,at:reconciled[0].confirmedAt}:null});
  }
  return result;
}

function rowsFrom(file){
  const bytes=readFileSync(file);
  const text=(bytes[0]===255&&bytes[1]===254?bytes.toString('utf16le'):bytes.toString('utf8')).replace(/^\uFEFF/,'');
  const data=JSON.parse(text);
  return (Array.isArray(data)?data:[data]).flatMap(r=>Array.isArray(r.results)?r.results:[r]);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(process.argv.length<3)throw new Error('Supply one or more Wrangler D1 JSON export files.');
  console.log(JSON.stringify(auditRaidHistory(process.argv.slice(2).flatMap(rowsFrom)),null,2));
}
