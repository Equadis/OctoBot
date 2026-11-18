export function validateInnerFocus(p){
 if(!p||!Number.isSafeInteger(p.durationMs)||p.durationMs<1||!Array.isArray(p.eligibleAbilityIds)||new Set(p.eligibleAbilityIds).size!==p.eligibleAbilityIds.length||p.eligibleAbilityIds.some(id=>typeof id!=='string'||!id.startsWith('priest:')||id==='priest:inner-focus')||!['consume-both','inner-focus-first'].includes(p.overlap)||!['direct-only','direct-and-channel'].includes(p.criticalScope))throw new Error('Explicit Inner Focus duration, eligible spells, critical scope and overlap required');
 return p;
}
export function applyInnerFocus(e,actor,p){validateInnerFocus(p);e.auras.apply({id:'priest:inner-focus',name:'Inner Focus',targetId:actor,ownerId:actor,kind:'buff',durationMs:p.durationMs,maxStacks:1,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh',modifiers:[]});}
