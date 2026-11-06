/* Shared pure calculations: browser and Node tests. No third-party dependencies. */
(function(root){
 'use strict';
 const GAP=600000;
 function normalise(data){
  const rows=new Map();
  for(const r of data){const t=Date.parse(r.timestamp);if(!Number.isFinite(t)||!Number.isInteger(r.online)||r.online<0)throw Error('Invalid observation');rows.set(t,{t,value:r.online});}
  return [...rows.values()].sort((a,b)=>a.t-b.t);
 }
 function intervals(rows,start,end){
  const missing=[];let cursor=start,area=0,duration=0;
  for(let i=1;i<rows.length;i++){const a=rows[i-1],b=rows[i],span=b.t-a.t,left=Math.max(start,a.t),right=Math.min(end,b.t);if(span>GAP||span<=0||left>=right)continue;
   if(left>cursor)missing.push([cursor,left]);cursor=Math.max(cursor,right);
   const va=a.value+(b.value-a.value)*(left-a.t)/span,vb=a.value+(b.value-a.value)*(right-a.t)/span;
   area+=(va+vb)/2*(right-left);duration+=right-left;
  }
  if(cursor<end)missing.push([cursor,end]);
  return {missing,average:duration?area/duration:null,coverage:(end>start?duration/(end-start):0)};
 }
 function nearest(rows,time){if(!rows.length)return null;let lo=0,hi=rows.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(rows[mid].t<time)lo=mid+1;else hi=mid;}return lo>0&&time-rows[lo-1].t<rows[lo].t-time?rows[lo-1]:rows[lo];}
 function at(rows,time){
  if(!rows.length||time<rows[0].t||time>rows.at(-1).t)return null;
  let lo=0,hi=rows.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(rows[mid].t<time)lo=mid+1;else hi=mid;}
  const b=rows[lo];if(b.t===time)return b.value;const a=rows[lo-1];if(!a||b.t-a.t>GAP)return null;
  return a.value+(b.value-a.value)*(time-a.t)/(b.t-a.t);
 }
 function downsample(rows,limit=1600){if(rows.length<=limit)return rows;const result=[rows[0]],size=Math.ceil(rows.length/(limit/2));for(let i=0;i<rows.length;i+=size){const group=rows.slice(i,i+size);let min=group[0],max=group[0];for(const r of group){if(r.value<min.value)min=r;if(r.value>max.value)max=r;}result.push(...[min,max].sort((a,b)=>a.t-b.t));}result.push(rows.at(-1));return result.filter((r,i)=>!i||r.t!==result[i-1].t);}
 // Estimates are display-only, never persisted as raw observations.
 const MAX_ESTIMATE_GAP=86400000;
 function estimatedGaps(rows,start,end){
  const result=[];
  for(let i=1;i<rows.length;i++){
   const a=rows[i-1],b=rows[i],span=b.t-a.t;
   if(span<=GAP||span>MAX_ESTIMATE_GAP)continue;
   const left=Math.max(start,a.t),right=Math.min(end,b.t);
   if(left<right)result.push([left,right]);
  }
  return result;
 }
 function estimateAt(rows,time){
  if(rows.length<2||time<rows[0].t||time>rows[rows.length-1].t)return null;
  let lo=0,hi=rows.length-1;
  while(lo<hi){const mid=(lo+hi)>>1;if(rows[mid].t<time)lo=mid+1;else hi=mid;}
  const b=rows[lo],a=rows[lo-1];
  if(b.t===time)return b.value;
  if(!a||b.t-a.t<=GAP||b.t-a.t>MAX_ESTIMATE_GAP)return null;
  return a.value+(b.value-a.value)*(time-a.t)/(b.t-a.t);
 }
 function subtractIntervals(missing,estimated){
  const unknown=[];
  for(const [left,right]of missing){
   let cursor=left;
   for(const [a,b]of estimated){
    if(b<=cursor||a>=right)continue;
    if(cursor<a)unknown.push([cursor,Math.min(a,right)]);
    cursor=Math.min(right,Math.max(cursor,b));
    if(cursor>=right)break;
   }
   if(cursor<right)unknown.push([cursor,right]);
  }
  return unknown;
 }
 function smooth(rows,bandwidth){
  if(rows.length<3||bandwidth<=0)return rows;
  const radius=bandwidth*3;
  return rows.map((r,i)=>{
   let value=0,weight=0;
   for(let j=i;j>=0&&r.t-rows[j].t<=radius;j--){
    const d=(r.t-rows[j].t)/bandwidth,w=Math.exp(-d*d/2);
    value+=rows[j].value*w;weight+=w;
   }
   for(let j=i+1;j<rows.length&&rows[j].t-r.t<=radius;j++){
    const d=(rows[j].t-r.t)/bandwidth,w=Math.exp(-d*d/2);
    value+=rows[j].value*w;weight+=w;
   }
   return {t:r.t,value:value/weight};
  });
 }
 function combine(histories){
  // Only totals from three real, near-synchronous realm observations.
  // Never treat a missing realm as zero or duplicate the same source.
  if(histories.length!==3||histories.some(h=>!h.length))return [];
  const base=histories.reduce((a,b)=>a.length<=b.length?a:b);
  const result=[];
  for(const r of base){
   const matches=histories.map(h=>nearest(h,r.t));
   if(matches.some(p=>!p||Math.abs(p.t-r.t)>180000))continue;
   result.push({t:r.t,value:matches.reduce((sum,p)=>sum+p.value,0)});
  }
  return result;
 }
 const originalIntervals=intervals;
 function intervalsWithEstimates(rows,start,end){
  const observed=originalIntervals(rows,start,end);
  const estimated=estimatedGaps(rows,start,end);
  const unknown=subtractIntervals(observed.missing,estimated);
  const estimatedDuration=estimated.reduce((n,[a,b])=>n+b-a,0);
  return {...observed,estimated,unknown,estimatedCoverage:end>start?estimatedDuration/(end-start):0};
 }
 // Continuous mouse-wheel zoom centred on the hovered time, with hard timeline bounds.
 // One common wheel tick (~100 px) changes the visible duration by about 30%.
 const MIN_VIEW_MS=10*60*1000;
 function zoomRange(start,end,anchorRatio,wheelDelta,minTime,maxTime){
  if(![start,end,anchorRatio,wheelDelta,minTime,maxTime].every(Number.isFinite)||end<=start||maxTime<=minTime)throw Error('Invalid zoom range');
  const bounds=maxTime-minTime,minSpan=Math.min(MIN_VIEW_MS,bounds);
  const current=end-start;
  const delta=Math.max(-250,Math.min(250,wheelDelta));
  const span=Math.max(minSpan,Math.min(bounds,current*Math.exp(delta*0.0035)));
  const ratio=Math.max(0,Math.min(1,anchorRatio));
  const time=start+current*ratio;
  let left=time-span*ratio,right=left+span;
  if(left<minTime){left=minTime;right=left+span;}
  if(right>maxTime){right=maxTime;left=right-span;}
  return {start:left,end:right};
 }
 const api={GAP,MAX_ESTIMATE_GAP,MIN_VIEW_MS,zoomRange,normalise,intervals:intervalsWithEstimates,nearest,at,downsample,estimatedGaps,estimateAt,smooth,combine};root.PopulationData=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
