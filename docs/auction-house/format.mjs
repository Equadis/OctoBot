/* Display formatting. UK English; prices in copper (1g = 10,000c, 1s = 100c). Nothing is invented: missing values stay missing. */
export function money(n){
  if(n==null||!Number.isFinite(Number(n)))return '–';
  const v=Number(n);
  if(v>0&&v<1)return '<1c';
  const c=Math.round(Math.max(0,v)),g=Math.floor(c/10000),s=Math.floor(c%10000/100),b=c%100;
  return [g?g+'g':null,s?s+'s':null,(b||(!g&&!s))?b+'c':null].filter(Boolean).join(' ');
}
/** "2g 50s", "50s", "1g20s5c" or a bare number of copper. Copper when valid, null when invalid, undefined when empty. */
export function parseMoney(text){
  const t=String(text??'').trim().toLowerCase();
  if(!t)return undefined;
  if(/^\d+$/.test(t))return Number(t)<=4294967295?Number(t):null;
  const m=/^(?:(\d+)\s*g)?\s*(?:(\d+)\s*s)?\s*(?:(\d+)\s*c)?$/.exec(t);
  if(!m||(m[1]===undefined&&m[2]===undefined&&m[3]===undefined))return null;
  const total=Number(m[1]||0)*10000+Number(m[2]||0)*100+Number(m[3]||0);
  return Number.isSafeInteger(total)&&total<=4294967295?total:null;
}
export const pct=n=>n==null||!Number.isFinite(Number(n))?'No data':Number(n).toFixed(1)+'%';
export function trend(n){
  if(n==null||!Number.isFinite(Number(n)))return {label:'–',className:'ah-change-neutral',text:'No previous completed scan to compare'};
  n=Number(n);
  if(Math.abs(n)<10)return {label:'→',className:'ah-change-neutral',text:'Little change since the previous scan'};
  return {label:(n>0?'↑':'↓').repeat(Math.abs(n)>=25?2:1),className:n>0?'ah-change-up':'ah-change-down',
    text:n>0?'Dearer than in the previous scan':'Cheaper than in the previous scan'};
}
/** Approximate remaining time: the scan's value minus time since observation. Never a guarantee. */
export function remaining(ms,capturedAt,now=Date.now()){
  if(ms==null||!Number.isFinite(Number(ms)))return null;
  const seen=Date.parse(capturedAt||'');
  if(!Number.isFinite(seen))return null;
  const left=Math.max(0,Number(ms)-Math.max(0,now-seen));
  return left>0?left:null;
}
export function left(ms,capturedAt,now=Date.now()){
  const r=remaining(ms,capturedAt,now);
  if(r===null)return 'Uncertain';
  const h=Math.floor(r/3600000),m=Math.floor(r%3600000/60000);
  return '≈ '+(h?h+'h ':'')+m+'m';
}
export const dateTime=s=>s?new Date(s).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'})+' UTC':'No data';
export const count=n=>n==null?'–':Number(n).toLocaleString('en-GB');


/** Copper split into gold, silver and copper pieces, for colouring each unit. */
export function moneyParts(n){
  if(n==null||!Number.isFinite(Number(n)))return null;
  const v=Number(n);
  if(v>0&&v<1)return [{unit:'c',amount:v,number:'<1',text:'<1c'}];
  const c=Math.round(Math.max(0,v)),g=Math.floor(c/10000),s=Math.floor(c%10000/100),b=c%100,out=[];
  // A denomination that is zero is not shown at all; a price of exactly nothing still shows 0 copper.
  if(g)out.push({unit:'g',amount:g,number:String(g),text:g+'g'});
  if(s)out.push({unit:'s',amount:s,number:String(s),text:s+'s'});
  if(b||(!g&&!s))out.push({unit:'c',amount:b,number:String(b),text:b+'c'});
  return out;
}
/** Colour class for the estimated time left: under 2h red, under 8h orange, under 24h yellow, under 72h green, otherwise none. */
export function timeClass(ms,capturedAt,now=Date.now()){
  const r=remaining(ms,capturedAt,now);
  if(r===null)return null;
  const hours=r/3600000;
  return hours<2?'ah-time-red':hours<8?'ah-time-orange':hours<24?'ah-time-yellow':hours<72?'ah-time-green':null;
}
/** The amount to show in a bid column, or null (shown as a hyphen) when it merely repeats the stack or unit buyout. */
export function bidAmount(current,start,stackBuyout,unitBuyout){
  const value=Number(current)>0?Number(current):Number(start);
  if(!Number.isFinite(value))return null;
  const same=x=>x!=null&&Number.isFinite(Number(x))&&Number(x)>0&&Math.abs(Number(x)-value)<1e-9;
  return same(stackBuyout)||same(unitBuyout)?null:value;
}


/** The collector pauses for this long after a scan completes before the next one starts. */
export const IDLE_SECONDS=300;
export const clock=seconds=>Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
/** Text and colour for the scan-status card: In Progress with a running timer, Idle with the 5:00 countdown, or plain Idle. */
export function scanStatus({completedAt=null,scanning=false,startedAt=null}={},now=Date.now()){
  if(scanning){
    const started=Date.parse(startedAt||'');
    if(!Number.isFinite(started))return {text:'In Progress',className:'ah-time-green'};
    const elapsed=Math.max(0,Math.floor((now-started)/1000));
    return {text:'In Progress '+Math.floor(elapsed/60)+'m:'+String(elapsed%60).padStart(2,'0')+'s',className:'ah-time-green'};
  }
  const done=Date.parse(completedAt||'');
  if(Number.isFinite(done)){
    const left=IDLE_SECONDS-Math.floor((now-done)/1000);
    if(Math.max(0,now-done)>=24*3600000)return {text:'Idle',className:'ah-time-red'};
   if(left>0&&left<=IDLE_SECONDS)return {text:'Idle - '+clock(left),className:'ah-time-yellow'};
  }
  return {text:'Idle',className:'ah-time-yellow'};
}
/** Last complete scan: green under 1 hour, yellow from 1 to under 24 hours, red thereafter. */
export function lastScanClass(completedAt,now=Date.now()){
  const done=Date.parse(completedAt||'');
  if(!Number.isFinite(done))return null;
  const hours=Math.max(0,now-done)/3600000;
  return hours<1?'ah-time-green':hours<24?'ah-time-yellow':'ah-time-red';
}

/** Share of auction item variants with verified catalogue metadata (not share of all WoW items). */
export function indexCoverage(itemsWithMetadata,totalItems){
  const indexed=Number(itemsWithMetadata),total=Number(totalItems);
  if(itemsWithMetadata==null||totalItems==null||!Number.isSafeInteger(indexed)||!Number.isSafeInteger(total)||
     indexed<0||total<=0||indexed>total)return null;
  return indexed/total;
}
/** Greater than 90% green, below 50% red, between those boundaries yellow. */
export function indexedClass(itemsWithMetadata,totalItems){
  const share=indexCoverage(itemsWithMetadata,totalItems);
  return share===null?null:share>0.9?'ah-time-green':share<0.5?'ah-time-red':'ah-time-yellow';
}
