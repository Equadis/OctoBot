import {expectedOutcome} from './combat-math.mjs';
import {sampleAttack} from './combat-attack-tables.mjs';
import {REFERENCE_PRIORITIES as P} from './combat-timeline.mjs';
const n=(x,k,min=0,max=Infinity)=>{if(!Number.isFinite(x)||x<min||x>max)throw new Error('Explicit Warrior activation '+k+' required');return x;};
const i=(x,k,min=0,max=Infinity)=>{if(!Number.isSafeInteger(x)||x<min||x>max)throw new Error('Explicit Warrior activation '+k+' required');return x;};
const talent=(b,id,max)=>i(Number(b.talents?.[String(id)]??0),'talent rank '+id,0,max);
const stances=['Battle','Defensive','Berserker'];
export function validateWarriorActivation(x){
 if(!x||!['demoralizing-shout','bloodrage','death-wish','berserker-rage'].includes(x.kind))throw new Error('Explicit Warrior activation required');
 i(x.durationMs,'duration',1);
 if(!Array.isArray(x.stances)||!x.stances.length||new Set(x.stances).size!==x.stances.length||x.stances.some(s=>!stances.includes(s)))throw new Error('Explicit Warrior stance eligibility required');
 if(x.kind==='demoralizing-shout'){n(x.radius,'radius');n(x.amount,'AP reduction');if(x.threat!==null)n(x.threat,'flat threat');expectedOutcome({min:0,max:0,outcomes:x.outcomes});if(x.outcomes.some(o=>typeof o.landed!=='boolean'))throw new Error('Explicit shout hit outcomes required');}
 if(x.kind==='bloodrage'){n(x.healthCostPct,'health cost',0,100);n(x.instantRage,'instant rage');n(x.tickRage,'periodic rage');i(x.intervalMs,'tick interval',1);if(x.intervalMs>x.durationMs||typeof x.tickAtExpiry!=='boolean')throw new Error('Explicit Bloodrage tick policy required');if(typeof x.activateEnrage!=='boolean')throw new Error('Explicit Bloodrage Enrage policy required');i(x.enrageRank,'Enrage rank',0,5);}
 if(x.kind==='berserker-rage'){n(x.instantRage,'instant rage');n(x.incomingRageFactor,'incoming rage factor',1);}
 return x;
}
export function compileWarriorActivation(b,rank,p){
 if(!p)throw new Error('Explicit Warrior activation model required');const kind=rank.components[0].kind,base={kind,when:'always',stances:p.stances,durationMs:p.durationMs};
 if(kind==='demoralizing-shout'){const voice=talent(b,93,5),improved=talent(b,97,5);return validateWarriorActivation({...base,durationMs:Math.round(n(p.durationMs,'duration',1)*(1+.12*voice)),radius:n(p.radius,'radius')*(1+.12*voice),amount:n(p.amount,'AP reduction')*(1+.08*improved),outcomes:p.outcomes,threat:p.threat});}
 if(kind==='bloodrage')return validateWarriorActivation({...base,healthCostPct:p.healthCostPct,instantRage:n(p.instantRage,'instant rage')+5*talent(b,74,2),tickRage:p.tickRage,intervalMs:p.intervalMs,tickAtExpiry:p.tickAtExpiry,activateEnrage:p.activateEnrage,enrageRank:talent(b,101,5)});
 if(kind==='death-wish'){if(!talent(b,104,1))throw new Error('Death Wish requires its talent');return validateWarriorActivation({...base,durationMs:30000});}
 return validateWarriorActivation({...base,instantRage:5*talent(b,106,2),incomingRageFactor:p.incomingRageFactor});
}
const aura=(e,actor,id,name,durationMs,modifiers=[])=>e.auras.apply({id,name,targetId:actor,ownerId:actor,kind:'buff',durationMs,maxStacks:1,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh',modifiers});
const rage=(e,actor,source,delta)=>{if(delta<=0)return;const r=e.resources.change([{resource:'rage',delta}]);if(!r.ok)throw new Error('Rage activation failed');e.recordMechanic('resource-change',{actorId:actor,source,resource:'rage',delta,overflow:r.overflow.rage??0});};
export function executeWarriorActivation(e,actor,x,source,enemies,geometry){
 if(x.kind==='demoralizing-shout'){
  for(const target of enemies){if(!e.unit(target).alive)continue;const distance=geometry?.[actor]?.[target]?.distance;if(!Number.isFinite(distance))throw new Error('Explicit shout enemy geometry required');if(distance>x.radius)continue;const h=sampleAttack({min:0,max:0,outcomes:x.outcomes,random:e.random});e.recordMechanic('attack-result',{actorId:actor,targetId:target,source,school:'physical',...h});if(!h.landed)continue;e.auras.apply({id:'warrior:demoralizing-shout',name:source,targetId:target,ownerId:actor,kind:'debuff',durationMs:x.durationMs,maxStacks:1,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh',modifiers:[{stat:'enemyAttackPowerReduction',mode:'flat',value:x.amount}]});if(x.threat!==null){e.threat.add({enemyId:target,actorId:actor,value:x.threat});e.recordMechanic('utility-threat',{actorId:actor,targetId:target,source,delta:x.threat});}}
  return;
 }
 if(x.kind==='bloodrage'){
  const cost=e.unit(actor).maxHealth*x.healthCostPct/100;if(cost>0&&!e.spendHealth({actorId:actor,amount:cost,source}))throw new Error('Insufficient health for Bloodrage');
  rage(e,actor,source,x.instantRage);aura(e,actor,'warrior:bloodrage',source,x.durationMs);
  e.periodic.apply({id:'bloodrage:'+actor,durationMs:x.durationMs,intervalMs:x.intervalMs,refresh:'restart',tickAtExpiry:x.tickAtExpiry,tickPriority:P.resource,expirePriority:P.expire,snapshot:null,onTick:()=>{if(e.unit(actor).alive)rage(e,actor,source,x.tickRage);}});
  if(x.activateEnrage&&x.enrageRank)aura(e,actor,'warrior:enrage','Enrage',8000,[{stat:'warriorPhysicalDamagePct',mode:'flat',value:4*x.enrageRank}]);return;
 }
 if(x.kind==='death-wish'){aura(e,actor,'warrior:death-wish',source,x.durationMs,[{stat:'warriorPhysicalDamagePct',mode:'flat',value:20},{stat:'armourFactor',mode:'multiplyPct',value:-20},{stat:'resistanceFactor',mode:'multiplyPct',value:-20}]);return;}
 aura(e,actor,'warrior:berserker-rage',source,x.durationMs,[{stat:'incomingRageFactor',mode:'multiplyPct',value:(x.incomingRageFactor-1)*100}]);rage(e,actor,source,x.instantRage);
}
