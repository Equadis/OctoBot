/* Independent one-minute realm-status telemetry via the existing population Worker.
 * Explicit official labels only: a failed page fetch or ambiguous markup is unknown,
 * never counted as an offline server or an online observation.
 */
const OFFICIAL='https://octowow.st/';
const NAMES={
  nzoth: "N'Zoth (Normal)",
  yshaarj: "Y'Shaarj (PvP)",
  cthun: "C'Thun (Hardcore)"
};
const EMPTY={nzoth:'unknown',yshaarj:'unknown',cthun:'unknown'};
const MAX_STATUS_PAGE=10000;
export function parseRealmStatuses(html){
  if(typeof html!=='string')return {...EMPTY};
  const matches=[...html.matchAll(/class\s*=\s*["'][^"']*\brealm-name\b[^"']*["'][^>]*>/gi)];
  const result={...EMPTY};
  const clean=value=>value.replace(/<[^>]*>/g,' ').replace(/&(?:#0*39|#x0*27|apos|rsquo);/gi,"'")
    .replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim().toLowerCase();
  for(let i=0;i<matches.length;i++){
    const from=matches[i].index,to=Math.min(html.length,from+1500,
      i+1<matches.length?matches[i+1].index:html.length);
    const section=html.slice(from,to);
    const nameEnd=section.indexOf('realm-status');
    if(nameEnd<0)continue;
    const name=clean(section.slice(0,nameEnd));
    const key=Object.keys(NAMES).find(k=>name.includes(NAMES[k].toLowerCase()));
    if(!key)continue;
    const after=section.slice(nameEnd);
    const match=after.match(/(?:^|>)\s*(online|offline)\s*(?:<|$)/i);
    if(match)result[key]=match[1].toLowerCase();
  }
  return result;
}
export function confirmRealm(first,second){
  if(second==='online')return 'online';
  if(first==='offline'&&second==='offline')return 'offline';
  return 'unknown';
}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function officialOnce(){
  const response=await fetch(OFFICIAL,{headers:{Accept:'text/html','Cache-Control':'no-cache'},cf:{cacheTtl:0}});
  if(!response.ok)throw Error('Official website HTTP '+response.status);
  const html=await response.text();
  if(html.length>2500000)throw Error('Unexpected official page size');
  if(/verifying your browser|<title>just a moment please/i.test(html))throw Error('Official website presented browser verification');
  return parseRealmStatuses(html);
}
async function officialStatus(){
  try{
    const first=await officialOnce();
    if(Object.values(first).every(v=>v==='online'))return {website:'available',realms:first,source_error:null};
    await delay(2000);
    const second=await officialOnce();
    const realms=Object.fromEntries(Object.keys(EMPTY).map(k=>[k,confirmRealm(first[k],second[k])]));
    return {website:'available',realms,source_error:Object.values(realms).includes('unknown')?'Unconfirmed or unparseable official state':null};
  }catch(error){
    // Retry a network/verification error as well as a suspicious realm label.
    // A real healthy second response resolves a transient source outage.
    await delay(2000);
    try{
      const recovered=await officialOnce();
      const realms=Object.fromEntries(Object.keys(EMPTY).map(k=>
        [k,confirmRealm('unknown',recovered[k])]));
      return {website:'available',realms,source_error:
        Object.values(realms).includes('unknown')?'Official realm state unconfirmed after source retry':null};
    }catch(repeated){
      return {website:'unavailable',realms:{...EMPTY},
        source_error:String(repeated?.message||'Official website unavailable').slice(0,180)};
    }
  }
}
function buildLogonChallenge(){
  const account=new TextEncoder().encode('OCTOTRACKERPROBE'),body=new Uint8Array(4+3+2+4+4+4+4+4+1+account.length);
  let p=0;
  const put=(...bytes)=>{for(const b of bytes)body[p++]=b};
  put(87,111,87,0,1,12,1,0xf3,0x16);
  put(54,56,120,0,110,105,87,0,66,71,110,101);
  put(0,0,0,0,127,0,0,1,account.length);
  body.set(account,p);
  const packet=new Uint8Array(4+body.length);
  packet.set([0,3,body.length&255,(body.length>>8)&255]);packet.set(body,4);
  return packet;
}
export function validateAuthReply(data){
  if(data.length<3)return null;
  if(data[0]!==0||data[1]!==0||data[2]>15)return false;
  if(data[2]!==0)return true; // Valid negative logon result is still responsive.
  let p=3+32;if(data.length<=p)return null;
  const generator=data[p++];if(generator<1||generator>32)return false;
  p+=generator;if(data.length<=p)return null;
  const prime=data[p++];if(prime<1||prime>32)return false;
  p+=prime+32+16;
  if(data.length<=p)return null;
  const flag=data[p++];
  if(flag!==0&&flag!==1)return false;
  if(flag===1)p+=20;
  return data.length>=p?true:null;
}
async function authOnce(){
  let socket,wasConnected=false;
  const started=Date.now();
  try{
    // Lazy load leaves the Worker testable in Node, which lacks this runtime API.
    const {connect}=await import('cloudflare:sockets');
    socket=connect({hostname:'play.octowow.st',port:3724});
    const result=await Promise.race([
      (async()=>{
        await socket.opened;wasConnected=true;
        const writer=socket.writable.getWriter();
        await writer.write(buildLogonChallenge());writer.releaseLock();
        const reader=socket.readable.getReader();let bytes=new Uint8Array(0);
        while(bytes.length<512){
          const item=await reader.read();
          if(item.done)break;
          const joined=new Uint8Array(bytes.length+item.value.length);
          joined.set(bytes);joined.set(item.value,bytes.length);bytes=joined;
          const valid=validateAuthReply(bytes);
          if(valid!==null)return {tcp:'reachable',auth:valid?'responsive':'unknown',
            latency_ms:valid?Date.now()-started:null};
        }
        return {tcp:'reachable',auth:'unknown',latency_ms:null};
      })(),
      delay(8000).then(()=>({tcp:wasConnected?'reachable':'unknown',auth:'unknown',latency_ms:null}))
    ]);
    return result;
  }catch(error){
    return {tcp:'unknown',auth:'unknown',latency_ms:null};
  }finally{
    if(socket)try{socket.close()}catch{}
  }
}
async function authenticationStatus(){
  const first=await authOnce();
  if(first.auth==='responsive')return first;
  await delay(2000);
  const second=await authOnce();
  // A successful real protocol reply proves responsiveness. Worker-side network
  // failures are not proof of a public outage (Cloudflare egress may be blocked).
  return second.auth==='responsive'?second:first.auth==='responsive'?first:{
    tcp:first.tcp==='reachable'||second.tcp==='reachable'?'reachable':'unknown',
    auth:'unknown',latency_ms:null
  };
}
export async function collectStatus(env){
  if(!env.DB)throw Error('D1 binding missing');
  const [official,auth]=await Promise.all([officialStatus(),authenticationStatus()]);
  const timestamp=Date.now();
  const sample={timestamp:new Date(timestamp).toISOString(),website:official.website,
    realms:official.realms,tcp:auth.tcp,auth:auth.auth,latency_ms:auth.latency_ms,
    source_error:official.source_error};
  await env.DB.prepare(
    'INSERT OR IGNORE INTO status_readings (timestamp_ms,website,nzoth,yshaarj,cthun,tcp,auth,latency_ms,source_error) VALUES (?,?,?,?,?,?,?,?,?)'
  ).bind(timestamp,sample.website,sample.realms.nzoth,sample.realms.yshaarj,sample.realms.cthun,
    sample.tcp,sample.auth,sample.latency_ms,sample.source_error).run();
  return sample;
}
function fromRow(row){
  return {timestamp:new Date(row.timestamp_ms).toISOString(),website:row.website,
    realms:{nzoth:row.nzoth,yshaarj:row.yshaarj,cthun:row.cthun},
    tcp:row.tcp,auth:row.auth,latency_ms:row.latency_ms,source_error:row.source_error};
}
export async function statusLatest(env){
  const row=await env.DB.prepare('SELECT * FROM status_readings ORDER BY timestamp_ms DESC LIMIT 1').first();
  return {schema:1,source:'cloudflare-minute',sample:row?fromRow(row):null};
}
export async function statusHistory(env,since){
  const {results}=await env.DB.prepare(
    'SELECT * FROM status_readings WHERE timestamp_ms>? ORDER BY timestamp_ms ASC LIMIT ?'
  ).bind(since,MAX_STATUS_PAGE+1).all();
  const all=results||[],has_more=all.length>MAX_STATUS_PAGE,rows=all.slice(0,MAX_STATUS_PAGE);
  return {schema:1,source:'cloudflare-minute',samples:rows.map(fromRow),has_more,
    next_since:rows.length?rows.at(-1).timestamp_ms:since};
}
export async function cleanOldStatus(env){
  return env.DB.prepare('DELETE FROM status_readings WHERE timestamp_ms<?')
    .bind(Date.now()-90*86400000).run();
}
