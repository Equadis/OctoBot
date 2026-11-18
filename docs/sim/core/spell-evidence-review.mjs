import {buildIntegrityQueue} from './data-integrity.mjs';
const nonempty=v=>typeof v==='string'&&v.trim().length>0;
const numeric=v=>typeof v==='number'&&Number.isFinite(v);
// Accept exact deterministic observations only. Damage ranges, proc rates and
// inferred coefficients require a separate controlled statistical protocol.
export function reviewSpellEvidence(records,queue=buildIntegrityQueue()){
 if(!Array.isArray(records))throw new TypeError('Evidence must be an array');
 const groups=new Map(),rejected=[];
 const ranks=new Map();
 for(const r of queue.spellRows){
  const key=JSON.stringify([r.abilityId,r.spellId,r.rank]);
  const fields=ranks.get(key)||new Set();
  for(const c of r.conflicts)if(nonempty(c.field))fields.add(c.field);
  ranks.set(key,fields);
 }
 for(const r of records){
  const fields=r&&ranks.get(JSON.stringify([r.abilityId,r.spellId,r.rank]));
  const valid=fields?.has(r.field)&&numeric(r.value)&&['unit','realm','phase','clientBuild','conditions','captureId','observerId','rawEvidence'].every(k=>nonempty(r[k]))&&r.method==='controlled-exact-observation'&&r.learnedIdentityConfirmed===true;
  if(!valid){rejected.push({captureId:r?.captureId??null,reason:'not a controlled observation of a queued rank conflict'});continue;}
  const key=JSON.stringify([r.abilityId,r.spellId,r.rank,r.field,r.unit,r.realm,r.phase,r.clientBuild,r.conditions]);
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(r);
 }
 const rows=[];
 for(const [key,rs] of groups){
  const vals=new Set(rs.map(r=>r.value));
  const independent=rs.some(a=>rs.some(b=>a.observerId!==b.observerId&&a.captureId!==b.captureId&&a.rawEvidence!==b.rawEvidence));
  rows.push({coordinate:JSON.parse(key),status:vals.size>1?'conflict':independent?'corroborated-candidate':'single-observation',value:vals.size===1?rs[0].value:null,captureIds:[...new Set(rs.map(r=>r.captureId))]});
 }
 return {rows,rejected,publicReady:false};
}
