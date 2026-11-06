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
 const api={GAP,normalise,intervals,nearest,at,downsample};root.PopulationData=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
