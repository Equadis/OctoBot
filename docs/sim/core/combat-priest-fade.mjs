import {REFERENCE_PRIORITIES as P} from './combat-timeline.mjs';
export function validateFade(p){
 if(!p||!Number.isFinite(p.flat)||p.flat<0||!Number.isFinite(p.fraction)||p.fraction<0||p.fraction>1||!['flat-then-percent','percent-then-flat'].includes(p.order)||![0,.25,.5].includes(p.permanentFraction))throw new Error('Explicit Fade threat reduction, order and return policy required');
 return p;
}
export function compileFade(build,rank,p){
 const r=Number(build.talents?.['208']??0);if(!Number.isSafeInteger(r)||r<0||r>2)throw new Error('Invalid Improved Fade rank');
 return validateFade({...p,flat:rank.record.fields.referenceFlat??rank.record.fields.flatThreatReduction,permanentFraction:[0,.25,.5][r]});
}
export function applyFade(e,actor,enemies,p){
 validateFade(p);
 if(e.auras.active(actor,'buff').some(a=>a.id==='priest:fade'&&a.ownerId===actor))return;
 const held=new Map();
 for(const enemyId of enemies){if(!e.unit(enemyId).alive)continue;const before=e.threat.current(enemyId,actor),after=Math.max(0,p.order==='flat-then-percent'?(before-p.flat)*(1-p.fraction):before*(1-p.fraction)-p.flat);const removed=before-after;if(removed>0){e.threat.adjust({enemyId,actorId:actor,delta:-removed});held.set(enemyId,removed);}}
 e.auras.apply({id:'priest:fade',name:'Fade',targetId:actor,ownerId:actor,kind:'buff',durationMs:10000,maxStacks:1,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh',modifiers:[]});
 e.timeline.schedule(e.timeline.now+10000,P.expire,()=>{for(const [enemyId,removed] of held)if(e.unit(actor).alive&&e.unit(enemyId).alive)e.threat.adjust({enemyId,actorId:actor,delta:removed*(1-p.permanentFraction)});});
}
