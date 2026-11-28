// Pet effects are scoped contributions; this module never produces pet DPS.
export const PET_DAMAGE_STACKING_SOURCE='https://octowow.st/forum/viewtopic.php?t=1603';
export const HAPPINESS_REFERENCE='https://www.warcrafttavern.com/wow-classic/guides/hunter-pets/';
export const AVOIDANCE_REPORT='https://forge.octowow.st/bug-report?id=77';
export const HAPPINESS_VALUES=Object.freeze({Unknown:null,Unhappy:.75,Content:1,Happy:1.25});
const statLabels={damagePct:'Damage bonuses (listed sum)',healthPct:'Maximum health bonuses (listed sum)',critPct:'Critical strike contribution',armourPct:'Armour bonuses (listed sum)',attackPower:'Attack power contribution',stamina:'Stamina contribution',allResistance:'Resistance contribution (each school)'};
const DIRECT_BUFF_CANDIDATES=new Set(['battle-shout','might','wild','kings','fortitude','intellect','divine-spirit','wisdom','earth','air','trueshot','pack','tricks','windfury','flametongue','fengus','slipkik']);
export function petContextAudit(build,profile,scoped=[],gear={},buffAudit={}){
 if(!profile)return null;
 const eligible=profile.active===true;
 const equipment=[];
 for(const r of scoped){
  if(r.scope!=='Pet'||!Number.isFinite(r.amount))continue;
  equipment.push({stat:r.stat,label:statLabels[r.stat]||r.stat,amount:r.amount,unit:r.stat.endsWith('Pct')?'%':'',active:eligible&&r.active,sources:[...new Set(r.sources||[])],status:'tooltip-contribution',note:r.stat==='damagePct'?'August 16 patch confirms pet damage items stack; listed sum is not a verified additive damage multiplier.':'Tooltip contribution only; order, multiplicative stacking and final pet totals unresolved.'});
 }
 const events=[];
 if(eligible&&build.classId==='warlock'&&Object.values(gear).some(x=>x?.id===19337))events.push({name:'The Black Book',source:'https://octowow.st/db/?item=19337',durationSeconds:30,damagePct:100,armourPct:100,status:'on-use-not-simulated',note:'Activated effect only. No permanent damage or armour, cooldown and stacking need verification.'});
 const happiness=eligible&&build.classId==='hunter'?{state:Object.hasOwn(HAPPINESS_VALUES,build.classOptions?.petHappiness)?build.classOptions.petHappiness:'Unknown',source:HAPPINESS_REFERENCE,status:'classic-reference',appliedToDamage:false}:null;
 if(happiness)happiness.referenceDamageMultiplier=HAPPINESS_VALUES[happiness.state];
 // Even active owner buffs do not establish pet recipient eligibility. Source
 // facts about player stats are not interpreted as pet auras.
 const directBuffs={applied:[],status:'unverified',candidates:eligible?(buffAudit.entries||[]).filter(e=>DIRECT_BUFF_CANDIDATES.has(e.id)).map(e=>({id:e.id,name:e.name||e.id,ownerActive:e.active===true,ownerEventEligible:e.eventEligible===true,petStatus:'unverified',applied:false})):[]};
 const avoidance=eligible?{status:'unresolved',source:AVOIDANCE_REPORT,reportedAoEReductionPct:80,reportedPhysicalCleaveReductionPct:40,applied:false,note:'Historical intended values; open OctoWoW bug #77 reports avoidance not working. No universal raid reduction or guaranteed uptime.'}:null;
 return {equipment,events,happiness,directBuffs,avoidance,baseTotals:null,damageMultiplier:null};
}
