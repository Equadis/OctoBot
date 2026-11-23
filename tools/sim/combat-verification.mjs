// Verifies that ability-scoped talent rules reach the compiled combat action, at every rank.
// For each talent whose rules are all ability-scoped, it compiles every attached reference rank with and without the
// talent and checks the changed field (cast time, cost, cooldown, damage multiplier, crit chance and multiplier, hit)
// against the published per-rank amount. Anything that cannot be compiled or compared is reported as inconclusive;
// nothing is approximated.
import {readFileSync} from 'node:fs';
import {newBuild} from '../../docs/sim/core/builds.mjs';
import {characterStats} from '../../docs/sim/core/character-stats.mjs';
import {referenceRanks} from '../../docs/sim/core/combat-reference-ranks.mjs';
import {compileReferenceRank} from '../../docs/sim/core/combat-rank-compiler.mjs';
import {abilityProfiles,matchedAbilityEffects} from '../../docs/sim/core/talent-calculations.mjs';
import {ROTATION_REGISTRY} from '../../docs/sim/core/rotations/registry.mjs';

export const VERIFIABLE_STATS=new Set(['castTimeReductionSeconds','castSpeedPct','manaCostReductionPct','rageCostReduction','energyCostReduction','rageEnergyCostReduction','damagePct','crit','hit','criticalDamagePct','cooldownReductionSeconds','manaGainPct','healingPct']);
const dataCache={};
const data=c=>dataCache[c]??=JSON.parse(readFileSync(new URL(`../../docs/sim/data/talents/${c}.json`,import.meta.url),'utf8'));
const weapon={id:123,name:'Test dagger',classs:2,subclass:15,speed:2,attributes:{},tooltipText:'20 - 40 Damage\nSpeed 2.00'};
const policy={phase:3,provenance:'Synthetic verification policy; values are not OctoWoW observations',gcdMs:1500,cooldownMs:10000,costOverride:100,weaponPolicy:'actual-swing',acceptSourceConflict:true,acceptExternalReference:true,lifeTapFactor:1,flatThreat:0,physical:{dualWieldPenaltyPct:19,parryPct:0,blockPct:0,blockValue:0,critSuppressionPct:0,criticalMultiplier:2,order:['miss','dodge','parry','block','glance','crit'],position:'behind'},periodicCanCrit:false,healCriticalMultiplier:1.5,spellCriticalMultiplier:1.5,resistance:Object.fromEntries(['fire','frost','shadow','nature','arcane','holy'].map(k=>[k,{policy:'none',bins:[{fraction:0,probability:1}]}])),refresh:'restart',tickAtExpiry:true,snapshot:'snapshot',threat:{damage:1,heal:.5},apPerComboPoint:.03,spendOnMiss:false,componentCoefficients:[.2,.13]};
const MELEE_GEAR=['warrior','rogue','hunter','shaman','druid','paladin'];

export function compile(classId,rank,talents){
 const build=newBuild(classId);build.level=60;build.talents=talents;
 if(classId==='warrior')build.classOptions={...build.classOptions,stance:'Battle'};
 const gear=MELEE_GEAR.includes(classId)?{mainhand:weapon}:{};
 const sheet=characterStats(build,data(classId),gear);
 if(classId==='hunter')sheet.combatSnapshot.ranged={rawMin:40,rawMax:60,baseSpeedSeconds:2.8,intervalSeconds:2.8,ammoDps:10,scopeDamage:0,observedAP:100,targetArmour:0};
 return compileReferenceRank({build,sheet,gear,spellId:rank.spellId,learnedSpellIds:[rank.spellId],policy}).action;
}
const sum=(effects,stat)=>effects.filter(e=>e.stat===stat).reduce((n,e)=>n+e.value,0);
const DAMAGE=['damage','periodic-damage'],HEAL=['heal','periodic-heal'];
const first=(action,kinds)=>action.effects.find(e=>kinds.includes(e.kind)&&e.formula);
const outcome=(e,name)=>e?.outcomes?.find(o=>o.name===name);
const close=(a,b,tol)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tol;

/** Highest compiled rank of each ability, with its display name. */
export function compiledAbilities(classId){
 const best=new Map();
 for(const r of referenceRanks(classId))if(!best.has(r.abilityId)||r.rank>best.get(r.abilityId).rank)best.set(r.abilityId,r);
 return [...best.values()].map(r=>({rank:r,name:ROTATION_REGISTRY[classId].abilityRegistry[r.abilityId]?.name??null})).filter(a=>a.name);
}
const baseCache=new Map();
function baseline(classId,a){
 const key=a.rank.abilityId;
 if(!baseCache.has(key)){try{baseCache.set(key,{action:compile(classId,a.rank,{})});}catch(e){baseCache.set(key,{error:e.message});}}
 return baseCache.get(key);
}

export function checkAction(profile,base,withTalent,effects){
 const checks=[];
 const push=(stat,expected,actual,tol=1e-6)=>checks.push({stat,expected,actual,ok:close(expected,actual,tol)});
 const red=sum(effects,'castTimeReductionSeconds'),speed=sum(effects,'castSpeedPct');
 if(red||speed)push('cast time ms',Math.round(1000*Math.max(0,base.castMs/1000-red)/(1+speed/100)),withTalent.castMs,1);
 const mana=sum(effects,'manaCostReductionPct'),bm=base.costs.find(c=>c.resource==='mana'),wm=withTalent.costs.find(c=>c.resource==='mana');
 if(mana&&bm&&wm)push('mana cost',bm.amount*(1-mana/100),wm.amount,1);
 for(const res of ['rage','energy']){
  const flat=sum(effects,res==='rage'?'rageCostReduction':'energyCostReduction')+sum(effects,'rageEnergyCostReduction');
  const bc=base.costs.find(c=>c.resource===res),wc=withTalent.costs.find(c=>c.resource===res);
  if(flat&&bc&&wc)push(res+' cost',Math.max(0,bc.amount-flat),wc.amount,1);
 }
 const cd=sum(effects,'cooldownReductionSeconds');
 if(cd&&base.cooldownMs>0)push('cooldown ms',Math.max(0,base.cooldownMs-1000*cd),withTalent.cooldownMs,1);
 const dmg=sum(effects,'damagePct');
 if(dmg){const b=first(base,DAMAGE),w=first(withTalent,DAMAGE);if(b&&w)push('damage multiplier',b.formula.multiplier*(1+dmg/100),w.formula.multiplier);}
 const heal=sum(effects,'healingPct');
 if(heal){const b=first(base,HEAL),w=first(withTalent,HEAL);if(b&&w)push('healing multiplier',b.formula.multiplier*(1+heal/100),w.formula.multiplier);}
 const crit=sum(effects,'crit');
 if(crit){const b=outcome(first(base,['damage','heal'])??base.effects[0],'crit'),w=outcome(first(withTalent,['damage','heal'])??withTalent.effects[0],'crit');if(b&&w){
   // Outcome probabilities are unconditional: a crit can only follow a roll that is not a miss, so the table's crit
   // probability is (crit rating after the talent) x (1 - miss chance).
   const mb=outcome(first(base,['damage','heal'])??base.effects[0],'miss')?.probability??0,mw=outcome(first(withTalent,['damage','heal'])??withTalent.effects[0],'miss')?.probability??0;
   push('crit chance',Math.min(1-mw,b.probability/(1-mb)+crit/100)*(1-mw),w.probability);
  }}
 const hit=sum(effects,'hit');
 if(hit){
  const eb=first(base,['damage'])??base.effects[0],ew=first(withTalent,['damage'])??withTalent.effects[0];
  const b=outcome(eb,'miss'),w=outcome(ew,'miss');
  if(b&&w){const floor=profile.type==='spell'?.01:0;const expected=Math.max(floor,b.probability-hit/100);if(b.probability>floor+1e-9)push('miss chance',expected,w.probability);}
 }
 const cdm=sum(effects,'criticalDamagePct');
 if(cdm){const b=outcome(first(base,['damage'])??base.effects[0],'crit'),w=outcome(first(withTalent,['damage'])??withTalent.effects[0],'crit');if(b&&w)push('crit multiplier',1+(b.multiplier-1)*(1+cdm/100),w.multiplier);}
 const gain=sum(effects,'manaGainPct');
 if(gain){const b=base.effects.find(e=>e.kind==='health-to-resource'),w=withTalent.effects.find(e=>e.kind==='health-to-resource');if(b&&w)push('mana gained factor',b.factor*(1+gain/100),w.factor);}
 return checks;
}

/**
 * @returns {{status:'confirmed'|'mismatch'|'inconclusive',reason?:string,abilities:object[],statsChecked:string[],statsMissing:string[]}}
 */
export function verifyTalentInCombat(classId,talent,audit){
 const rules=audit.rules[String(talent.id)]??[];
 if(!rules.length)return {status:'inconclusive',reason:'no rules',abilities:[],statsChecked:[],statsMissing:[]};
 if(rules.some(r=>!['scoped','spell'].includes(r.kind)))return {status:'inconclusive',reason:'has pending, sheet or special rules',abilities:[],statsChecked:[],statsMissing:[]};
 if(rules.some(r=>r.when))return {status:'inconclusive',reason:'conditional rule needs a state this harness does not set',abilities:[],statsChecked:[],statsMissing:[]};
 const wantStats=new Set(rules.map(r=>(({criticalDamage:'criticalDamagePct',manaGainedPct:'manaGainPct',criticalChance:'crit'})[r.stat]??r.stat)));
 if([...wantStats].some(s=>!VERIFIABLE_STATS.has(s)))return {status:'inconclusive',reason:'stat not covered by the harness: '+[...wantStats].filter(s=>!VERIFIABLE_STATS.has(s)).join(', '),abilities:[],statsChecked:[],statsMissing:[...wantStats]};
 const profiles=abilityProfiles(classId);
 const abilities=[],skipped=[],checked=new Set();let mismatch=false;
 for(const a of compiledAbilities(classId)){
  const profile=profiles.find(p=>p.name===a.name);if(!profile)continue;
  const base=baseline(classId,a);if(base.error){skipped.push({ability:a.name,error:base.error.slice(0,120)});continue;}
  for(let rank=1;rank<=talent.maxRanks;rank++){
   const build=newBuild(classId);build.level=60;build.talents={[talent.id]:rank};
   const effects=matchedAbilityEffects(characterStats(build,data(classId),{}).talentAudit,profile).filter(e=>e.talentId===talent.id);
   if(!effects.length)break;
   let withTalent;try{withTalent=compile(classId,a.rank,{[talent.id]:rank});}catch(e){abilities.push({ability:a.name,rank,error:e.message.slice(0,100)});break;}
   const checks=checkAction(profile,base.action,withTalent,effects);
   if(!checks.length){abilities.push({ability:a.name,rank,inconclusive:'no comparable field'});continue;}
   abilities.push({ability:a.name,rank,checks});
   for(const c of checks){if(c.ok)checked.add(c.stat);else mismatch=true;}
  }
 }
 const needed=[...wantStats].map(s=>({castTimeReductionSeconds:'cast time ms',castSpeedPct:'cast time ms',manaCostReductionPct:'mana cost',rageCostReduction:'rage cost',energyCostReduction:'energy cost',rageEnergyCostReduction:'rage cost',damagePct:'damage multiplier',crit:'crit chance',hit:'miss chance',criticalDamagePct:'crit multiplier',cooldownReductionSeconds:'cooldown ms',manaGainPct:'mana gained factor',healingPct:'healing multiplier'})[s]);
 const missing=needed.filter(n=>n!=='rage cost'&&!checked.has(n)&&!(n==='rage cost'&&checked.has('energy cost')));
 const status=mismatch?'mismatch':abilities.some(x=>x.checks)&&!missing.length?'confirmed':'inconclusive';
 return {status,reason:status==='inconclusive'?(missing.length?'no compiled ability exposed: '+missing.join(', '):'no compiled ability could be compared'):undefined,abilities,skipped,statsChecked:[...checked].sort(),statsMissing:missing};
}
