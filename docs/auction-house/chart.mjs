/* Compact price-history chart built from real daily observations (lowest unit buyout per day).
 * Pure geometry plus a small SVG builder; fewer than two real days draws nothing rather than a made-up line. */
import {money} from './format.mjs';
const NS='http://www.w3.org/2000/svg';
export const MIN_POINTS=2;

/** Oldest-first points scaled into the viewBox. Returns null when there is not enough real data. */
export function layout(history,{width=520,height=140,pad={l:8,r:8,t:12,b:20},average=null}={}){
  const rows=(history||[]).filter(h=>h&&Number.isFinite(Number(h.representative_unit))&&typeof h.day==='string').map(h=>({day:h.day,value:Number(h.representative_unit)}))
    .sort((a,b)=>a.day<b.day?-1:a.day>b.day?1:0);
  if(rows.length<MIN_POINTS)return null;
  const values=rows.map(r=>r.value).concat(average!=null&&Number.isFinite(average)?[average]:[]);
  let lo=Math.min(...values),hi=Math.max(...values);
  if(hi===lo){lo=Math.max(0,lo-1);hi=hi+1;}
  const w=width-pad.l-pad.r,h=height-pad.t-pad.b;
  const x=i=>pad.l+(rows.length===1?0:i*w/(rows.length-1));
  const y=v=>pad.t+h-(v-lo)/(hi-lo)*h;
  return {width,height,pad,lo,hi,points:rows.map((r,i)=>({...r,x:x(i),y:y(r.value)})),averageY:average!=null&&Number.isFinite(average)?y(average):null};
}
export function buildChart(doc,history,average=null){
  const g=layout(history,{average});
  if(!g)return null;
  const svg=doc.createElementNS(NS,'svg');
  svg.setAttribute('viewBox','0 0 '+g.width+' '+g.height);
  svg.setAttribute('class','ah-chart');
  svg.setAttribute('role','img');
  const first=g.points[0],last=g.points.at(-1);
  svg.setAttribute('aria-label','Daily lowest unit buyout from '+first.day+' ('+money(first.value)+') to '+last.day+' ('+money(last.value)+'), '+g.points.length+' days of observations.');
  const el=(tag,attrs,text)=>{const n=doc.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs||{}))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=text;return n;};
  for(const f of [0,.5,1]){const yy=g.pad.t+(g.height-g.pad.t-g.pad.b)*f;svg.append(el('line',{x1:g.pad.l,x2:g.width-g.pad.r,y1:yy,y2:yy,class:'ah-chart-grid'}));}
  if(g.averageY!==null)svg.append(el('line',{x1:g.pad.l,x2:g.width-g.pad.r,y1:g.averageY,y2:g.averageY,class:'ah-chart-average'}));
  svg.append(el('polyline',{points:g.points.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' '),class:'ah-chart-line',fill:'none'}));
  for(const p of g.points){const c=el('circle',{cx:p.x.toFixed(1),cy:p.y.toFixed(1),r:3,class:'ah-chart-dot'});c.append(el('title',{},p.day+': '+money(p.value)));svg.append(c);}
  svg.append(el('text',{x:g.pad.l,y:g.height-5,class:'ah-chart-label'},first.day));
  svg.append(el('text',{x:g.width-g.pad.r,y:g.height-5,'text-anchor':'end',class:'ah-chart-label'},last.day));
  svg.append(el('text',{x:g.width-g.pad.r,y:g.pad.t-2,'text-anchor':'end',class:'ah-chart-label'},'High '+money(g.hi)+' · Low '+money(g.lo)));
  return svg;
}
