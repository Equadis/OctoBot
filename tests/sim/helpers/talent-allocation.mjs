// Builds the smallest legal talent allocation that contains a target talent at a given rank.
// "Legal" means validateTalents() accepts it at level 60: every prerequisite is met and every tier gate is paid for
// with points from clean filler talents (no prerequisites, strictly lower tier). Used by the talent audit tests.
import {validateTalents} from '../../../docs/sim/core/talents.mjs';

export function legalAllocation(data,target,rank=target.maxRanks){
 const alloc={};
 const byPosition=t=>data.talents.find(x=>x.tree===t.tree&&x.position===t.requires);
 const lowerPoints=t=>data.talents.reduce((n,x)=>x.tree===t.tree&&x.row<t.row?n+(alloc[x.id]??0):n,0);
 const fillers=t=>data.talents.filter(x=>x.tree===t.tree&&x.row<t.row&&x.requires===null).sort((a,b)=>a.row-b.row||a.position-b.position);
 const add=(t,r,depth=0)=>{
  if(depth>8)throw new Error('Allocation recursion too deep for '+t.name);
  if((alloc[t.id]??0)>=r)return;
  if(t.requires!==null){const parent=byPosition(t);add(parent,t.requiresRanks,depth+1);}
  while(lowerPoints(t)<t.row*5){
   const next=fillers(t).find(x=>(alloc[x.id]??0)<x.maxRanks);
   if(!next)throw new Error('Not enough filler talents below '+t.name);
   alloc[next.id]=(alloc[next.id]??0)+1;
  }
  alloc[t.id]=r;
 };
 add(target,rank);
 return alloc;
}

export function allocationErrors(data,alloc,level=60){return validateTalents(data,alloc,level);}
