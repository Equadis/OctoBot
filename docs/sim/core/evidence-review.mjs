import {CLASS_RACES} from './class-rules.mjs';
// Only explicit, independently reviewed base rows may become candidates for
// later integration. This function never mutates the reference tables.
const nonempty=v=>typeof v==='string'&&v.trim().length>0;
const integer=v=>Number.isSafeInteger(v)&&v>=0;
export function reviewBaseEvidence(records){
 if(!Array.isArray(records))throw new TypeError('Evidence must be an array');
 const groups=new Map(),rejected=[];
 for(const r of records){
  const valid=r&&CLASS_RACES[r.classId]?.includes(r.race)&&Number.isInteger(r.level)&&r.level>=1&&r.level<=60&&Array.isArray(r.row)&&r.row.length===7&&r.row.every(integer)&&['realm','phase','clientBuild','captureId','observerId','method','rawEvidence'].every(k=>nonempty(r[k]))&&r.method==='verified-base-extraction'&&r.naked===true&&r.unbuffed===true&&r.talentNeutral===true;
  if(!valid){rejected.push({captureId:r?.captureId??null,reason:'incomplete or invalid base evidence'});continue;}
  const key=JSON.stringify([r.realm,r.phase,r.clientBuild,r.race,r.classId,r.level]);
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(r);
 }
 const rows=[];
 for(const [key,rs] of groups){
  const values=new Set(rs.map(r=>JSON.stringify(r.row)));
  const independent=rs.some(a=>rs.some(b=>a.observerId!==b.observerId&&a.captureId!==b.captureId&&a.rawEvidence!==b.rawEvidence));
  rows.push({coordinate:JSON.parse(key),status:values.size>1?'conflict':independent?'corroborated-candidate':'single-observation',row:values.size===1?[...rs[0].row]:null,captureIds:[...new Set(rs.map(r=>r.captureId))]});
 }
 return {rows,rejected,publicReady:false};
}
