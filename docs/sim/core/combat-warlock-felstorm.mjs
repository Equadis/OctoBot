import {REFERENCE_PRIORITIES as P} from './combat-timeline.mjs';
export function validateFelstorm(p){
 if(!p||p.petType!=='Felguard'||p.resource!=='petMana'||p.petCost!==1200||p.durationMs!==6000||p.tickMs!==1000||p.cooldownMs!==45000||p.targeting!=='ordered-radius'||p.petAutoPolicy!=='pause'||!Number.isInteger(p.cap)||p.cap<1||p.cap>40||!Number.isFinite(p.radius)||p.radius<=0||!Number.isFinite(p.weaponMin)||p.weaponMin<0||!Number.isFinite(p.weaponMax)||p.weaponMax<p.weaponMin||!Number.isFinite(p.shadowFlat)||p.shadowFlat<0||!Number.isFinite(p.shadowCoefficient)||p.shadowCoefficient<0||!['none','owner','pet'].includes(p.shadowPowerBasis)||!Array.isArray(p.outcomes)||!p.outcomes.length||Math.abs(p.outcomes.reduce((n,x)=>n+x.probability,0)-1)>1e-8||p.outcomes.some(x=>typeof x.landed!=='boolean'||!Number.isFinite(x.multiplier)||x.multiplier<0))throw Error('Explicit Felstorm pet channel, mana, damage and target policy required');
 return p;
}
export function createFelstormRuntime({owner,pet,targets,geometry,roll}){
 let until=0;
 return {busy:e=>until>e.timeline.now,activate(e,p,stats){
  validateFelstorm(p);
  if(!pet||!e.unit(owner).alive||!e.unit(pet).alive||until>e.timeline.now)return false;
  if(!e.resources.snapshot().petMana)throw Error('Felstorm requires demon mana, not owner mana');
  const paid=e.resources.startAction({changes:[{resource:'petMana',delta:-p.petCost}],cooldowns:[{id:'pet:felstorm',duration:p.cooldownMs}]});if(!paid.ok)return false;
  e.recordMechanic('resource-change',{actorId:pet,source:'Felstorm',resource:'petMana',delta:-p.petCost,overflow:0});
  until=e.timeline.now+p.durationMs;
  e.auras.apply({id:'warlock:felstorm-root',name:'Felstorm',targetId:pet,ownerId:pet,kind:'buff',durationMs:p.durationMs,maxStacks:1,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh',modifiers:[{stat:'rooted',mode:'flat',value:1}]});
  const power=p.shadowPowerBasis==='owner'?stats.owner:p.shadowPowerBasis==='pet'?stats.pet:0;if(!Number.isFinite(power)||power<0)throw Error('Explicit Felstorm scaling power required');
  const pulse=()=>{if(!e.unit(owner).alive||!e.unit(pet).alive)return;for(const t of targets.filter(t=>e.unit(t).alive&&geometry[pet]?.[t]?.distance<=p.radius).slice(0,p.cap)){for(const [school,min,max] of [['physical',p.weaponMin,p.weaponMax],['shadow',p.shadowFlat+power*p.shadowCoefficient,p.shadowFlat+power*p.shadowCoefficient]]){const hit=roll({min,max,outcomes:p.outcomes,random:e.random});e.recordMechanic('attack-result',{actorId:pet,targetId:t,source:'Felstorm ('+school+')',school,...hit});if(hit.landed)e.damage({actorId:pet,targetId:t,source:'Felstorm ('+school+')',school,value:hit.raw});}}};
  for(let ms=1000;ms<=6000;ms+=1000)e.timeline.schedule(e.timeline.now+ms,P.tick,pulse);
  e.recordMechanic('proc',{actorId:pet,source:'Felstorm',procId:'warlock:felstorm:activated'});return true;
 }};
}
