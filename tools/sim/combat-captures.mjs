// Parse marked records only; never evaluate Lua saved-variable content.
const record=/^OCTOCOMBAT1\|([1-9]\d*)\|([1-9]\d*)\|(\d+)\|([A-Z0-9_]+)\|([a-f0-9]*)$/;
export function parseCombatCaptures(raw){
 if(typeof raw!=='string')throw new Error('Saved-variable text required');
 const sessions=new Map(),rejected=[];let marked=0;
 for(const line of raw.split(/\r?\n/)){
  if(!line.includes('OCTOCOMBAT1|'))continue;
  marked++;
  const trimmed=line.trim();const q=trimmed.match(/^"([^"]+)"[,]?$/);const m=(q?q[1]:trimmed).match(record);
  if(!m){rejected.push({line:marked,reason:'Malformed record'});continue;}
  const [,session,seq,timestamp,kind,hex]=m,n=Number(seq),ms=Number(timestamp);
  if(!Number.isSafeInteger(n)||!Number.isSafeInteger(ms)||hex.length%2){rejected.push({line:marked,reason:'Invalid sequence, time or payload'});continue;}
  let s=sessions.get(session);if(!s){s={session,records:[],issues:[]};sessions.set(session,s);}
  const last=s.records.at(-1);
  if(n!==(last?.sequence??0)+1||ms<(last?.ms??0))s.issues.push('Non-contiguous sequence or backwards clock at '+seq);
  if(!last&&kind!=='START')s.issues.push('Missing first START');
  if(last&&(last.kind==='END'||kind==='START'))s.issues.push('Unexpected boundary at '+seq);
  if(!['START','END'].includes(kind)&&!kind.startsWith('CHAT_MSG_'))s.issues.push('Unexpected event kind at '+seq);
  s.records.push({sequence:n,ms,kind,text:Buffer.from(hex,'hex').toString('utf8')});
 }
 return {format:'octocombat-raw-v1',markedRecords:marked,rejected,sessions:[...sessions.values()].map(s=>({...s,complete:s.issues.length===0&&s.records[0]?.kind==='START'&&s.records.at(-1)?.kind==='END'&&s.records.at(-1)?.text==='manual',normalized:false})),normalized:false};
}
