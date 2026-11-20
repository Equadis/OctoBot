import {HUNTER_FAMILIES,DEMON_TYPES} from './pet-training-audit.mjs';

const identityPlans={
 'paladin:holy-strike':{
  name:'Holy Strike',ranks:8,
  published:[
   {source:'https://forge.octowow.st/paladin',kind:'class-guide',rankCount:8,firstLevel:4,lastLevel:60,cooldownMs:6000,endpointManaCosts:[5,90]},
   {source:'https://octowow.st/forum/viewtopic.php?t=20',kind:'official-hotfix',date:'2026-04-29',rank:1,trainable:true},
   {source:'https://octowow.st/forum/viewtopic.php?p=21212',kind:'player-report',date:'2026-11-18',healingReported:true},
   {source:'https://forge.octowow.st/database/?spell=13953',kind:'incompatible-record',spellId:13953,level:1},
   {source:'https://forge.octowow.st/database/?spell=20216',kind:'different-spell-record',spellId:20216,name:'Divine Favor'},
   {source:'https://octowow.st/db/?spell=679',kind:'obsolete-record',spellId:679,level:99},
   {source:'https://octowow.st/db/?spell=17284',kind:'incompatible-record',spellId:17284,level:1},
  ],
 },
 'hunter:trueshot-aura':{
  name:'Trueshot Aura',ranks:1,reviewUpToRank:3,
  published:[
   {source:'https://octowow.st/index.php/hunter',kind:'guide-removal-claim'},
   {source:'https://octowow.st/db/?spell=19506',kind:'legacy-rank-record',spellId:19506,rank:1,level:40,flatAttackPower:50},
   {source:'https://octowow.st/db/?spell=20905',kind:'legacy-rank-record',spellId:20905,rank:2,level:50,flatAttackPower:75},
   {source:'https://octowow.st/db/?spell=20906',kind:'legacy-rank-record',spellId:20906,rank:3,level:60,flatAttackPower:100},
  ],
 },
};

export function identityEvidencePlan(abilityId){
 return structuredClone(identityPlans[abilityId]??null);
}

export function companionEvidencePlan(){
 return [['hunter',HUNTER_FAMILIES],['warlock',DEMON_TYPES]].flatMap(([classId,pets])=>pets.map(pet=>({
  classId,pet,level:60,
  requiredFields:['maxHealth','attackPower','spellPower'],
  optionalFields:['armour','arcaneResistance','fireResistance','frostResistance','natureResistance','shadowResistance'],
 })));
}

const nonempty=v=>typeof v==='string'&&v.trim().length>0;
const metadata=r=>r&&['captureId','observerId','rawEvidence'].every(key=>nonempty(r[key]));
function reviewObservations(records,accept,coordinate,measurement){
 const groups=new Map(),rejected=[];
 for(const record of records){
  if(!metadata(record)||!accept(record)){
   rejected.push({captureId:record?.captureId??null,reason:'Invalid or unsupported controlled evidence'});
   continue;
  }
  const key=JSON.stringify(coordinate(record));
  const observations=groups.get(key)??[];
  observations.push(record);
  groups.set(key,observations);
 }
 return {rejected,rows:[...groups].map(([key,rs])=>{
  const values=new Map(rs.map(r=>{const value=measurement(r);return [JSON.stringify(value),value];}));
  const independent=rs.some(a=>rs.some(b=>a.observerId!==b.observerId&&a.captureId!==b.captureId&&a.rawEvidence!==b.rawEvidence));
  return {coordinate:JSON.parse(key),status:values.size>1?'conflict':independent?'corroborated-candidate':'single-observation',
   values:[...values.values()],captureIds:[...new Set(rs.map(r=>r.captureId))]};
 })};
}

const positiveInteger=v=>Number.isSafeInteger(v)&&v>0;
export function reviewIdentityEvidence(records,identityRows){
 const targets=new Set(identityRows.map(row=>row.abilityId));
 const result=reviewObservations(records,r=>{
  const plan=identityPlans[r.abilityId];
  return targets.has(r.abilityId)&&plan&&r.method==='learned-cast-identity'&&r.learned===true&&r.spellName===plan.name&&
   positiveInteger(r.rank)&&r.rank<=(plan.reviewUpToRank??plan.ranks)&&positiveInteger(r.spellId)&&positiveInteger(r.characterLevel)&&r.characterLevel<=60&&
   ['client-spell-link','cast-event-id'].includes(r.idSource);
 },r=>[r.abilityId,r.rank],r=>r.spellId);
 const assigned=new Map();
 for(const row of result.rows){
  for(const id of row.values){
   const matches=assigned.get(id)??[];
   matches.push(row);
   assigned.set(id,matches);
  }
 }
 for(const matches of assigned.values())if(matches.length>1)for(const row of matches)row.status='conflict';

 return {rejected:result.rejected,tasks:identityRows.map(task=>{
  const plan=identityEvidencePlan(task.abilityId);
  if(!plan)return {...task,status:'no-observation',ranks:[]};
  const ranks=Array.from({length:plan.ranks},(_,i)=>{
   const rank=i+1;
   const observation=result.rows.find(row=>row.coordinate[0]===task.abilityId&&row.coordinate[1]===rank)??null;
   const disagreement=observation?.values.some(id=>plan.published.some(p=>p.spellId===id&&['obsolete-record','incompatible-record','different-spell-record'].includes(p.kind)));
   return {rank,observation,status:disagreement?'conflict':observation?.status??'no-observation'};
  });
  const unexpectedRanks=result.rows.filter(row=>row.coordinate[0]===task.abilityId&&row.coordinate[1]>plan.ranks);
  const status=(unexpectedRanks.length>0||ranks.some(r=>r.status==='conflict'))?'conflict':ranks.every(r=>r.status==='corroborated-candidate')?'candidate-needs-authentication':ranks.some(r=>r.observation)?'partial-observation':'no-observation';
  return {...task,plan,ranks,unexpectedRanks,status};
 })};
}

const nonnegative=v=>Number.isFinite(v)&&v>=0;
export function reviewCompanionEvidence(baselines,inheritance){
 const plan=companionEvidencePlan();
 const eligible=r=>Number.isSafeInteger(r.level)&&r.level>=1&&r.level<=60&&r.level<=r.ownerLevel&&
  Number.isSafeInteger(r.ownerLevel)&&r.ownerLevel<=60&&plan.some(p=>p.classId===r.classId&&p.pet===r.pet)&&nonempty(r.conditions);
 const fields=[...plan[0].requiredFields,...plan[0].optionalFields];
 const baseline=reviewObservations(baselines,r=>eligible(r)&&r.method==='clean-companion-observation'&&
  r.ownerUnbuffed===true&&r.companionUnbuffed===true&&r.trainingRecorded===true&&positiveInteger(r.stats?.maxHealth)&&
  plan[0].requiredFields.every(key=>nonnegative(r.stats[key]))&&Object.keys(r.stats).every(key=>fields.includes(key)&&nonnegative(r.stats[key])),
 r=>[r.classId,r.pet,r.level,r.ownerLevel,r.conditions],r=>Object.fromEntries(fields.filter(key=>Object.hasOwn(r.stats,key)).map(key=>[key,r.stats[key]])));
 const inheritanceReport=reviewObservations(inheritance,r=>eligible(r)&&r.method==='controlled-companion-stat-pair'&&
  r.oneVariableChanged===true&&fields.includes(r.petStat)&&['attackPower','rangedAP','spellPower','stamina'].includes(r.ownerStat)&&
  [r.ownerBefore,r.ownerAfter,r.petBefore,r.petAfter].every(nonnegative)&&r.ownerBefore!==r.ownerAfter,
 r=>[r.classId,r.pet,r.level,r.ownerLevel,r.conditions,r.ownerStat,r.petStat,r.ownerBefore,r.ownerAfter],
 r=>r.petAfter-r.petBefore);
 return {plan,baselines:baseline,inheritance:inheritanceReport};
}
