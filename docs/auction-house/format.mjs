/* Display formatting. UK English; prices in copper (1g = 10,000c, 1s = 100c). Nothing is invented: missing values stay missing. */
export function money(n){
  if(n==null||!Number.isFinite(Number(n)))return '–';
  const v=Number(n);
  if(v>0&&v<1)return '<1c';
  const c=Math.round(Math.max(0,v)),g=Math.floor(c/10000),s=Math.floor(c%10000/100),b=c%100;
  return [g?g+'g':null,(g||s)?s+'s':null,b+'c'].filter(Boolean).join(' ');
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
