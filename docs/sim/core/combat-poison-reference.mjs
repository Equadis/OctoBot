import {spellAttackTable,sampleAttack} from './combat-attack-tables.mjs';
import {REFERENCE_PRIORITIES as P} from './combat-timeline.mjs';
const finite=(v,n,min=0,max=Infinity)=>{if(!Number.isFinite(v)||v<min||v>max)throw new Error('Explicit poison '+n+' required');return v;};
const int=(v,n,min=0)=>{if(!Number.isSafeInteger(v)||v<min)throw new Error('Explicit poison '+n+' required');return v;};
const utilityStats={'Wound Poison IV':'healingReceivedReductionPct','Crippling Poison II':'movementSpeedReductionPct','Mind-numbing Poison III':'castTimeIncreasePct'};
const utilityOnly=name=>['Crippling Poison II','Mind-numbing Poison III'].includes(name);
const names=['Instant Poison VI','Deadly Poison V','Wound Poison IV','Agitating Poison','Crippling Poison II','Mind-numbing Poison III'];
export function poisonTemplate(name,abilityIds=[]){return {name,provenance:'',chance:null,charges:null,chargeOn:null,applicationMissPct:null,resistance:null,critPct:null,criticalMultiplier:null,min:null,max:null,apCoefficient:null,eligibleAbilityIds:abilityIds,white:true,envenomChanceMode:null,threatCoefficient:null,flatThreat:null,...(name==='Deadly Poison V'?{durationMs:null,intervalMs:null,maxStacks:null,tickResistance:null,refresh:null,snapshot:null}:{}),...(utilityStats[name]?{utility:{durationMs:null,maxStacks:null,perStackPct:null,refreshPolicy:null}}:{})};}
export function buildPoisonConfig(build,gear,policy,abilityIds){
 if(build.classId!=='rogue')return null;
 const configured={};for(const [hand,key] of [['mainhand','mhPoison'],['offhand','ohPoison']]){
  const name=build.classOptions[key];if(!name||name==='None')continue;
  if(gear[hand]?.classs!==2)throw new Error('Poison requires an equipped weapon: '+hand);
  if(!names.includes(name))throw new Error('Poison effect is not modelled: '+name);
  const p=policy?.[hand];if(!p||p.name!==name)throw new Error('Explicit poison rank model required for '+hand);
  configured[hand]={...p};
 }
 if(!Object.keys(configured).length)return null;
 const rank=id=>Number(build.talents?.[String(id)]??0);
 const talents={damagePct:10*rank(138),chancePct:[0,3,6,10][rank(139)],resistReductionPct:4*rank(140),freeChargeChance:.15*rank(140),vigorChance:.5*rank(143)};
 const out={hands:configured,talents};validatePoisonConfig(out,abilityIds);return out;
}
export function validatePoisonConfig(config,abilityIds){
 const t=config.talents;if(!t)throw new Error('Explicit poison talent policy required');
 finite(t.damagePct,'talent damage modifier');finite(t.chancePct,'talent chance',0,100);finite(t.resistReductionPct,'talent resistance reduction',0,100);finite(t.freeChargeChance,'free charge chance',0,1);finite(t.vigorChance,'Vigor chance',0,1);
 for(const [hand,p] of Object.entries(config.hands??{})){
  if(!['mainhand','offhand'].includes(hand)||!names.includes(p.name)||typeof p.provenance!=='string'||!p.provenance.trim())throw new Error('Explicit hand and poison provenance required');
  finite(p.chance,'base chance',0,1);int(p.charges,'starting charges');finite(p.applicationMissPct,'miss',0,100);finite(p.critPct,'crit',0,100);finite(p.criticalMultiplier,'crit multiplier',1);finite(p.min,'minimum damage');finite(p.max,'maximum damage',p.min);finite(p.apCoefficient,'AP coefficient');
  if(!['attempt','landed'].includes(p.chargeOn)||!['relative','percentage-points'].includes(p.envenomChanceMode)||typeof p.white!=='boolean'||!Array.isArray(p.eligibleAbilityIds)||p.eligibleAbilityIds.some(x=>!abilityIds.has(x)))throw new Error('Explicit poison trigger, charge and Envenom policies required');
  if(p.threatCoefficient!==null)finite(p.threatCoefficient,'threat coefficient');if(p.flatThreat!==null)finite(p.flatThreat,'flat threat');if((p.threatCoefficient===null)!==(p.flatThreat===null))throw new Error('Poison threat must be explicit or unknown');
  if(!p.resistance)throw new Error('Explicit poison resistance distribution required');
  spellAttackTable({missPct:0,resistance:p.resistance.bins,resistancePolicy:p.resistance.policy,criticalPct:p.critPct,criticalMultiplier:p.criticalMultiplier,provenance:p.provenance});
  if(utilityStats[p.name]){const u=p.utility;if(!u)throw new Error('Explicit poison utility model required');int(u.durationMs,'utility duration',1);int(u.maxStacks,'utility stack cap',1);finite(u.perStackPct,'utility percent',0);if((p.name!=='Mind-numbing Poison III'&&u.perStackPct*u.maxStacks>100)||!['refresh','preserve'].includes(u.refreshPolicy))throw new Error('Invalid poison utility stacking or refresh policy');}
  if(utilityOnly(p.name)&&(p.min!==0||p.max!==0||p.apCoefficient!==0||p.critPct!==0||p.threatCoefficient!==null||p.flatThreat!==null))throw new Error('Utility-only poison requires zero damage, no crit, and unknown threat');
  if(p.name==='Deadly Poison V'){int(p.durationMs,'duration',1);int(p.intervalMs,'interval',1);int(p.maxStacks,'stack cap',1);if(p.intervalMs>p.durationMs||!['restart','preserve-next-tick'].includes(p.refresh)||!['snapshot','dynamic'].includes(p.snapshot)||!p.tickResistance)throw new Error('Explicit Deadly Poison periodic policy required');spellAttackTable({missPct:0,resistance:p.tickResistance.bins,resistancePolicy:p.tickResistance.policy,criticalPct:p.critPct,criticalMultiplier:p.criticalMultiplier,provenance:p.provenance});}
 }
 const dots=Object.values(config.hands??{}).filter(p=>p.name==='Deadly Poison V');if(dots.length===2)for(const k of ['min','max','apCoefficient','maxStacks','durationMs','intervalMs','refresh','snapshot','critPct','criticalMultiplier','tickResistance'])if(JSON.stringify(dots[0][k])!==JSON.stringify(dots[1][k]))throw new Error('Both hands must agree on shared Deadly Poison tick mechanics');
 for(const name of Object.keys(utilityStats)){const both=Object.values(config.hands??{}).filter(p=>p.name===name);if(both.length===2&&['durationMs','maxStacks','perStackPct','refreshPolicy'].some(k=>both[0].utility[k]!==both[1].utility[k]))throw new Error('Both hands must agree on shared utility poison mechanics');}
 return config;
}
export function createPoisonRuntime(config,abilityIds){
 if(!config)return null;validatePoisonConfig(config,abilityIds);const t=config.talents,charges=Object.fromEntries(Object.entries(config.hands).map(([h,p])=>[h,p.charges]));
 const apply=(e,{actor,target,hand,abilityId,white,stats,forced=false})=>{
  const p=config.hands[hand];if(!p||charges[hand]<=0||!e.unit(target).alive||!forced&&!(white?p.white:p.eligibleAbilityIds.includes(abilityId)))return;
  const factor=e.auras.stat(actor,'poisonChanceFactor',1),base=p.chance+t.chancePct/100,chance=Math.min(1,p.envenomChanceMode==='relative'?base*factor:base+factor-1);
  if(!forced&&e.random()>=chance)return;
  const spend=()=>{if(e.random()<t.freeChargeChance)return;charges[hand]--;e.recordMechanic('poison-charge',{actorId:actor,targetId:target,hand,name:p.name,remaining:charges[hand]});};
  if(p.chargeOn==='attempt')spend();
  const dot=p.name==='Deadly Poison V',utility=utilityOnly(p.name),scale=()=>{const ap=finite(e.auras.stat(actor,'attackPower',finite(stats.attackPower??0,'attack power')),'effective attack power');const m=(1+t.damagePct/100)*e.auras.stat(actor,'poisonDamageFactor',1);return {min:(p.min+p.apCoefficient*ap)*m,max:(p.max+p.apCoefficient*ap)*m};};
  const outcomes=spellAttackTable({missPct:Math.max(0,p.applicationMissPct-t.resistReductionPct),resistance:p.resistance.bins,resistancePolicy:p.resistance.policy,criticalPct:dot||utility?0:p.critPct,criticalMultiplier:p.criticalMultiplier,provenance:p.provenance}).outcomes;
  const hit=sampleAttack({...(dot||utility)?{min:0,max:0}:scale(),outcomes,random:e.random});
  e.recordMechanic('attack-result',{actorId:actor,targetId:target,source:p.name,school:'nature',hand,...hit});if(!hit.landed)return;
  if(p.chargeOn==='landed')spend();
  e.recordMechanic('proc',{actorId:actor,targetId:target,source:p.name,procId:'poison:'+hand});
  const threat=p.threatCoefficient===null?null:{actorId:actor,coefficient:p.threatCoefficient,flat:p.flatThreat,multipliers:[],distribution:'each'};
  if(dot){const id=JSON.stringify([actor,target,'deadly-poison']),a=e.auras.apply({id,name:p.name,targetId:target,ownerId:actor,kind:'debuff',durationMs:p.durationMs,maxStacks:p.maxStacks,stacks:1,stackPolicy:'add',refreshPolicy:'refresh',modifiers:[]});const snapshot=scale();
   const tickOutcomes=spellAttackTable({missPct:0,resistance:p.tickResistance.bins,resistancePolicy:p.tickResistance.policy,criticalPct:p.critPct,criticalMultiplier:p.criticalMultiplier,provenance:p.provenance}).outcomes;
   e.periodic.apply({id,durationMs:p.durationMs,intervalMs:p.intervalMs,refresh:p.refresh,tickAtExpiry:true,tickPriority:P.tick,expirePriority:P.expire,snapshot:{...snapshot,stacks:a.stacks},onTick:event=>{if(!e.unit(target).alive||!e.unit(actor).alive){e.periodic.remove(id);return;}const r=p.snapshot==='snapshot'?event.snapshot:scale();const h=sampleAttack({min:r.min*event.snapshot.stacks,max:r.max*event.snapshot.stacks,outcomes:tickOutcomes,random:e.random});e.recordMechanic('attack-result',{actorId:actor,targetId:target,source:p.name+' (tick)',school:'nature',...h});if(h.landed)e.damage({actorId:actor,targetId:target,source:p.name,school:'nature',value:h.raw,threat});}});
  }else if(!utility)e.damage({actorId:actor,targetId:target,source:p.name,school:'nature',value:hit.raw,threat});
  if(p.utility&&utilityStats[p.name]&&e.unit(target).alive){const u=p.utility;e.auras.apply({id:'poison:'+p.name,name:p.name,targetId:target,ownerId:actor,kind:'debuff',durationMs:u.durationMs,maxStacks:u.maxStacks,stacks:1,stackPolicy:'add',refreshPolicy:u.refreshPolicy,modifiers:[{stat:utilityStats[p.name],mode:'flat',value:u.perStackPct}]});}
  if(t.vigorChance>0&&e.random()<t.vigorChance){const q=e.resources.change([{resource:'energy',delta:2}]);if(!q.ok)throw new Error('Vigor resource gain failed');e.recordMechanic('resource-change',{actorId:actor,source:'Vigor',resource:'energy',delta:2,overflow:q.overflow.energy??0});}
 };
 return {apply,remaining:()=>({...charges})};
}
