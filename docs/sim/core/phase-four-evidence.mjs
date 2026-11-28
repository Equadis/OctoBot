import {HUNTER_FAMILIES,DEMON_TYPES} from './pet-training-audit.mjs';

function chronicleReport(slug,instanceId,realm,startedAt,instance="Blackwing Lair"){
 return {source:'https://octo.chronicleclassic.com/instances/'+slug,instanceId,realm,instance,startedAt,
  clientBuild:'7272',clientVersion:'1.18.1',castStream:'spell_go'};
}
const solstice=chronicleReport('LIGCnEjGyLkG4cXS','e4e180a0-3fc7-4069-aa38-512f26e3c907',"N'Zoth",'2026-11-20T02:26:28.048Z');
const earlierNzoth=chronicleReport('DU_nwbg0KMg5F6Tu','48bb6599-5b19-43a8-8936-7e114af70ec0',"N'Zoth",'2026-11-19T19:31:25.719Z');
const laterNzoth=chronicleReport('BxyfpdEyw8hyvdL3','959d6508-99c9-4a62-9e3a-b226bfa72d75',"N'Zoth",'2026-11-20T14:02:02.913Z');
const cthun=chronicleReport('HAme0Cm5IJqEKU3y','c520eeac-bf06-4c04-927a-c9905a90bdee',"C'Thun",'2026-11-19T19:06:31.833Z');
const deadmines=chronicleReport('c8TGKZ2oYnqtjdGr','1da671cb-e112-4fa1-af17-bed30b2e5be4',"N'Zoth",'2026-10-15T08:55:32.733Z','Deadmines');
const monasteryCthun=chronicleReport('l9WkN_cB8PTQMEPv','45d4ce53-fafa-459d-9b7a-66c5d45671e3',"C'Thun",'2026-10-05T09:12:53.93Z','Scarlet Monastery');
const monasteryNzoth=chronicleReport('ZOXW5zhuaMi9dEAv','c9e6cd00-c125-40f2-9a2b-def9de4c0118',"N'Zoth",'2026-08-16T08:54:20.364Z','Scarlet Monastery');
const earlierMonastery=chronicleReport('JQQPOfYUiW9qWvhq','349f1daf-a010-4ab6-b5de-d64fb803b481',"N'Zoth",'2026-08-05T18:32:55.194Z','Scarlet Monastery');
const blackfathom=chronicleReport('Q2-PuHyeMzrpZlDB','7e0f3d4b-ee5c-42f3-b34a-04f0153078f1',"C'Thun",'2026-09-27T11:28:43.688Z','Blackfathom Deeps');
const earlierFarrak=chronicleReport('QT-XQZ0oqk5Ki98R','0793d609-2f3e-4aff-ad0e-f338514961a7',"N'Zoth",'2026-10-22T16:54:03.723Z',"Zul'Farrak");
const laterFarrak=chronicleReport('z2PipNMNe2gTlxXn','bcba65fc-e935-4c0f-9ed7-a6846639f7f4',"N'Zoth",'2026-11-17T18:24:32.908Z',"Zul'Farrak");
const laterSeptemberDeadmines=chronicleReport('OwRNF9yDH07WRIZ3','4467fa5f-b06b-478b-a25b-48873d0d8750',"N'Zoth",'2026-09-06T11:44:06.204Z','Deadmines');
const earlierSeptemberDeadmines=chronicleReport('llcKKrOpSxIzAlEN','a760edd8-de05-4307-9019-0a155974bdb3',"N'Zoth",'2026-09-06T10:39:17.761Z','Deadmines');
const identityPlans={
 'paladin:holy-strike':{
  name:'Holy Strike',ranks:8,
  raidCastObservations:[
   {...solstice,spellId:10333,classId:'paladin',casts:443,distinctCasters:2,reportedCasterLevels:[60],damageEvents:464},
   {...earlierNzoth,spellId:10332,classId:'paladin',casts:2,distinctCasters:1,reportedCasterLevels:[60]},
   {...earlierNzoth,spellId:10333,classId:'paladin',casts:732,distinctCasters:5,reportedCasterLevels:[60]},
   {...laterNzoth,spellId:10333,classId:'paladin',casts:539,distinctCasters:5,reportedCasterLevels:[60]},
   {...cthun,spellId:10333,classId:'paladin',casts:30,distinctCasters:3,reportedCasterLevels:[60]},
   {...deadmines,spellId:1866,classId:'paladin',casts:249,distinctCasters:1,reportedCasterLevels:[25]},
   {...laterSeptemberDeadmines,spellId:1866,classId:'paladin',casts:17,distinctCasters:1,reportedCasterLevels:[21]},
   {...earlierSeptemberDeadmines,spellId:1866,classId:'paladin',casts:265,distinctCasters:1,reportedCasterLevels:[21]},
   {...monasteryCthun,spellId:2495,classId:'paladin',casts:6,distinctCasters:1,reportedCasterLevels:[50]},
   {...monasteryNzoth,spellId:680,classId:'paladin',casts:1,distinctCasters:1,reportedCasterLevels:[48]},
   {...monasteryNzoth,spellId:2495,classId:'paladin',casts:3,distinctCasters:2,reportedCasterLevels:[39,48]},
   {...earlierMonastery,spellId:680,classId:'paladin',casts:2,distinctCasters:1,reportedCasterLevels:[35]},
   {...earlierMonastery,spellId:2495,classId:'paladin',casts:2,distinctCasters:1,reportedCasterLevels:[40]},
   {...blackfathom,spellId:680,classId:'paladin',casts:199,distinctCasters:1,reportedCasterLevels:[30]},
   {...earlierFarrak,spellId:5569,classId:'paladin',casts:119,distinctCasters:1,reportedCasterLevels:[46]},
   {...laterFarrak,spellId:10333,classId:'paladin',casts:521,distinctCasters:1,reportedCasterLevels:[60]},
  ],
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
  raidCastObservations:[
   {...solstice,spellId:19506,classId:'hunter',casts:4,distinctCasters:3,reportedCasterLevels:[60],explicitCasterAuraEvents:4},
   {...earlierNzoth,spellId:19506,classId:'hunter',casts:1,distinctCasters:1,reportedCasterLevels:[60]},
  ],
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
