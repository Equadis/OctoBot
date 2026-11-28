import {sampleAttack} from './combat-attack-tables.mjs';
import {expectedOutcome} from './combat-math.mjs';
import {REFERENCE_PRIORITIES as P} from './combat-timeline.mjs';
const num=(x,k,min=0,max=Infinity)=>{if(!Number.isFinite(x)||x<min||x>max)throw new Error('Explicit Shadow of Death '+k+' required');return x;};
const checkOutcomes=(a)=>{expectedOutcome({min:0,max:0,outcomes:a});if(a.some(o=>typeof o.landed!=='boolean'))throw new Error('Explicit Shadow of Death landed outcomes required');};
export function shadowOfDeathTemplate(){return {applicationOutcomes:null,releaseOutcomes:null,basis:null,eligibleActors:null,replace:null,mitigation:null,flatReduction:null,threat:null};}
export function validateShadowOfDeath(p){
 if(!p||!['effective','post-mitigation'].includes(p.basis)||!['owner','all-friendly','all'].includes(p.eligibleActors)||!['discard','release'].includes(p.replace))throw new Error('Explicit Shadow of Death damage basis, actors and replacement required');
 checkOutcomes(p.applicationOutcomes);checkOutcomes(p.releaseOutcomes);num(p.mitigation,'release mitigation',0,1);num(p.flatReduction,'release flat reduction');
 if(p.threat!==null){num(p.threat?.coefficient,'threat coefficient');num(p.threat?.flat,'flat threat');}return p;
}
export function createShadowOfDeathRuntime(owner,friendlies,targets){
 const marks=new Map();const eligible=new Set(friendlies),enemies=new Set(targets);
 const finish=(e,target,mark,reason)=>{
  if(marks.get(target)!==mark)return;marks.delete(target);e.timeline.cancel(mark.ticket);
  e.auras.remove({id:'rogue:shadow-of-death',targetId:target,ownerId:owner,kind:'debuff'},reason);
  if(!e.unit(owner).alive||!e.unit(target).alive||mark.stored<=0)return;
  const p=mark.model,h=sampleAttack({min:mark.stored,max:mark.stored,outcomes:p.releaseOutcomes,mitigation:p.mitigation,flatReduction:p.flatReduction,random:e.random});e.recordMechanic('attack-result',{actorId:owner,targetId:target,source:'Shadow of Death (release)',school:'physical',...h});
  if(h.landed)e.damage({actorId:owner,targetId:target,source:'Shadow of Death (release)',school:'physical',value:h.raw,threat:p.threat===null?null:{actorId:owner,...p.threat,multipliers:[],distribution:'each'}});
 };
 const apply=(e,target,p,stats)=>{
  const h=sampleAttack({min:0,max:0,outcomes:p.applicationOutcomes,random:e.random});e.recordMechanic('attack-result',{actorId:owner,targetId:target,source:'Shadow of Death (apply)',school:'physical',...h});if(!h.landed)return h;
  const old=marks.get(target);if(old){if(p.replace==='release')finish(e,target,old,'replaced');else{marks.delete(target);e.timeline.cancel(old.ticket);e.auras.remove({id:'rogue:shadow-of-death',targetId:target,ownerId:owner,kind:'debuff'},'replaced');}}
  const cp=e.comboPoints.points(target),ap=e.auras.stat(owner,'attackPower',stats.attackPower);if(cp<1||cp>5)throw new Error('Shadow of Death requires target combo points');if(!e.unit(target).alive)return h;
  const mark={model:p,stored:0,fraction:cp*.1,cap:ap*cp*.5,expiresAt:e.timeline.now+6000,ticket:null};marks.set(target,mark);
  e.auras.apply({id:'rogue:shadow-of-death',name:'Shadow of Death',targetId:target,ownerId:owner,kind:'debuff',durationMs:6000,maxStacks:1,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh',modifiers:[]});
  mark.ticket=e.timeline.schedule(mark.expiresAt,P.expire,()=>finish(e,target,mark,'expired'));return h;
 };
 const onDamage=(e,ev)=>{const m=marks.get(ev.targetId);if(!m||!enemies.has(ev.targetId)||!e.unit(ev.targetId).alive||e.timeline.now>m.expiresAt||ev.source==='Shadow of Death (release)')return;if(m.model.eligibleActors==='owner'&&ev.actorId!==owner||m.model.eligibleActors==='all-friendly'&&!eligible.has(ev.actorId))return;const gain=(m.model.basis==='effective'?ev.effective:ev.raw)*m.fraction;if(gain<=0)return;m.stored=Math.min(m.cap,m.stored+gain);if(m.stored>=m.cap)finish(e,ev.targetId,m,'capacity-reached');};
 return {apply,onDamage};
}
