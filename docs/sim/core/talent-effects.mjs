/**
 * Audited talent effects for the selected class branch.
 * The source talent JSON is authoritative for rank values; this file maps
 * individual parameter vectors to explicitly reviewed effects. No generic
 * percentage scraping: position zero can mean different things on each talent.
 *
 * Combat effects not represented on the character sheet stay in coverage as
 * pending, instead of being treated as permanent or silently dropped.
 */
import {AUDITED_CLASS,TALENT_RULES,TALENT_COVERAGE} from './talent-rules.mjs?v=20261117-talent-audit2';
import {BUFF_STATS,normaliseBuffs} from './buffs.mjs?v=20261112-stats1';

const WEAPONS={
  axe:[0,1], mace:[4,5], sword:[7,8], dagger:[15], fist:[13],
  polearm:[6], twohand:[1,5,6,8,10], onehand:[0,4,7,13,15],
  'twohand-sword-mace-axe':[1,5,8], 'expertise-weapons':[0,1,4,5,7,8,13,15]
};
const add=(map,key,value)=>{map[key]=(map[key]||0)+value;};
const matches=(item,type)=>Boolean(item&&item.classs===2&&WEAPONS[type]?.includes(item.subclass));
const satisfies=(when,build,gear)=>{
 if(!when)return true;
 for(const [key,expected] of Object.entries(when)){
  const actual=key==='dualWield'
    ?Boolean(gear.mainhand?.classs===2&&gear.offhand?.classs===2)
    :key==='shield'
      ?Boolean(gear.offhand?.classs===4&&gear.offhand?.subclass===6)
      :build.classOptions?.[key];
  if(key==='dualWield'||key==='shield'){if(Boolean(expected)!==actual)return false;}
  else if(Array.isArray(expected)?!expected.includes(actual):expected!==actual)return false;
 }
 return true;
};
const numberFor=(talent,rule,rank)=>{
 const n=rule.values?.[rank-1]??talent.rankParameters?.[rule.param??0]?.[rank-1];
 if(!Number.isFinite(n))throw new Error('Unmapped rank parameter for '+talent.name+' rank '+rank);
 return n*(rule.factor??1);
};
export function resolveTalentEffects(build,talentData,gear={}){
 const blank=()=>({flat:{},percent:{},special:{},weapon:{mainhand:{},offhand:{}},
   offhand:{},ranged:{},spell:{},pet:{},scoped:{},abilityEffects:[],pending:[],details:[],active:false});
 const output=blank();
 if(build.classId!==AUDITED_CLASS)return output;
 output.active=true;
 if(!talentData||talentData.classId!==AUDITED_CLASS)
   throw new Error('Talent audit requires matching official talent metadata.');
 for(const talent of talentData.talents){
  const rank=build.talents[talent.id]||0;
  if(!rank)continue;
  if(rank<0||rank>talent.maxRanks||!Number.isInteger(rank))throw new Error('Invalid rank for '+talent.name);
  const audit=TALENT_COVERAGE[talent.id];
  if(!audit)throw new Error('Talent is missing its audit record: '+talent.name);
  const rules=TALENT_RULES[talent.id]||[];
  let applied=0;
  for(const rule of rules){
   if(rule.kind==='pending'){output.pending.push({name:talent.name,note:rule.note||'Requires combat simulation'});continue;}
   if((rule.kind==='pet'&&build.classOptions?.pet==='None')||!satisfies(rule.when,build,gear)||(rule.kind==='buff'&&!normaliseBuffs(build.controls?.buffIds||[]).includes(rule.source))){
    output.details.push({name:talent.name,stat:rule.stat,scope:rule.scope||rule.source||'',status:'inactive',note:rule.note||'Condition is not active'});
    continue;
   }
   const scenarioValue=rule.perOption?build.classOptions?.[rule.perOption]:1;
   const optionFactor=Number.isFinite(rule.maxOption)?Math.min(scenarioValue,rule.maxOption):scenarioValue;
   if(!Number.isFinite(optionFactor)||optionFactor<0||optionFactor===0){output.details.push({name:talent.name,stat:rule.stat,status:'inactive',note:'Requires an explicitly selected applicable scenario'});continue;}
   const amount=numberFor(talent,rule,rank)*(rule.perLevel?build.level:1)*optionFactor;
   if(rule.kind==='global')add(output.flat,rule.stat,amount);
   else if(rule.kind==='buff'){
    const base=BUFF_STATS[rule.source]?.[rule.stat];
    if(!Number.isFinite(base))throw new Error('Unmapped buff source '+rule.source+' for '+talent.name);
    add(output.flat,rule.stat,base*amount/100);
   }
   else if(rule.kind==='percent')add(output.percent,rule.stat,amount);
   else if(rule.kind==='special')add(output.special,rule.stat,amount);
   else if(rule.kind==='offhand'){
    if(matches(gear.offhand,'onehand'))add(output.offhand,rule.stat,amount);
    else {output.details.push({name:talent.name,stat:rule.stat,scope:'Off Hand',status:'inactive',note:'Requires an off-hand weapon'});continue;}
   }else if(rule.kind==='weapon'){
    let matched=false;
    for(const slot of ['mainhand','offhand']){
     if(matches(gear[slot],rule.weapon)){
      add(output.weapon[slot],rule.stat,amount);matched=true;
     }
    }
    if(!matched){output.details.push({name:talent.name,stat:rule.stat,scope:rule.weapon,status:'inactive',note:'Requires a matching equipped weapon'});continue;}
   }else if(rule.kind==='ranged')add(output.ranged,rule.stat,amount);
   else if(rule.kind==='spell'){
    for(const scope of (Array.isArray(rule.scope)?rule.scope:[rule.scope])){
     if(!output.spell[scope])output.spell[scope]={};
     add(output.spell[scope],rule.stat,amount);
    }
   }else if(rule.kind==='pet')add(output.pet,rule.stat,amount);
   else if(rule.kind==='scoped')add(output.scoped,rule.scope+' '+rule.stat,amount);
   else throw new Error('Unrecognised talent effect kind for '+talent.name);
   if(['spell','scoped','ranged'].includes(rule.kind))output.abilityEffects.push({name:talent.name,kind:rule.kind,scope:rule.scope,stat:rule.stat,amount});
   applied++;
   output.details.push({name:talent.name,stat:rule.stat,amount,scope:rule.scope||rule.weapon||rule.kind,status:'calculated',note:rule.note||'Published rank effect; server mechanics not independently validated'});
  }
  if(audit.status!=='sheet' || (rules.length===0&&applied===0))
   output.pending.push({name:talent.name,note:audit.note||'Requires combat-engine or contextual support',status:audit.status});
 }
 return output;
}
export const auditClass=()=>AUDITED_CLASS;
export const auditCoverage=()=>TALENT_COVERAGE;
export const auditRules=()=>TALENT_RULES;
