import {attemptProc,REFERENCE_PRIORITIES as P} from './combat-timeline.mjs';
const id=v=>typeof v==='string'&&v.trim();
const validModifier=m=>m&&id(m.stat)&&['flat','addPct','multiplyPct'].includes(m.mode)&&Number.isFinite(m.value)&&(m.mode!=='multiplyPct'||m.value>=-100);
const validEffect=x=>x&&['aura','resource'].includes(x.kind)&&(x.kind==='aura'?Number.isSafeInteger(x.durationMs)&&x.durationMs>0&&Array.isArray(x.modifiers)&&x.modifiers.length>0&&x.modifiers.every(validModifier):id(x.resource)&&Number.isFinite(x.amount)&&x.amount>=0);
export function createEquipmentRuntime(config,owner,pools,duration){
 if(config==null)return null;
 if(!Array.isArray(config.effects))throw Error('Explicit equipment effect list required');
 const seen=new Set();
 for(const x of config.effects){
  if(!id(x.id)||seen.has(x.id)||!id(x.source)||!id(x.provenance)||!validEffect(x.effect)||!Number.isSafeInteger(x.cooldownMs)||x.cooldownMs<0)throw Error('Invalid explicit equipment effect');
  seen.add(x.id);
  if(x.effect.kind==='resource'&&!Object.hasOwn(pools,x.effect.resource))throw Error('Unknown equipment resource');
  if(x.sharedGroup!==undefined&&(!id(x.sharedGroup)||!Number.isSafeInteger(x.sharedCooldownMs)||x.sharedCooldownMs<0))throw Error('Invalid equipment shared cooldown');
  if(x.trigger==='use'){if(!Array.isArray(x.atMs)||new Set(x.atMs).size!==x.atMs.length||x.atMs.some(t=>!Number.isSafeInteger(t)||t<0||t>=duration))throw Error('Invalid equipment use times');}
  else if(!['landed','critical'].includes(x.trigger)||!Array.isArray(x.sources)||!x.sources.length||!x.sources.every(id)||!Number.isFinite(x.chance)||x.chance<0||x.chance>1)throw Error('Explicit equipment proc eligibility and rate required');
 }
 function activate(e,x,target){
  const cd=e.resources.cooldowns,shared=x.sharedGroup?[{id:'equipment-group:'+x.sharedGroup,duration:x.sharedCooldownMs}]:[];
  if(!e.unit(owner).alive||!cd.check(shared))return false;
  const p=attemptProc(cd,{id:'equipment:'+x.id,chance:x.trigger==='use'?1:x.chance,internalCooldownMs:x.cooldownMs},e.random);if(!p.triggered)return false;
  cd.start(shared);
  const f=x.effect;
  if(f.kind==='aura')e.auras.apply({id:'equipment:'+x.id,name:x.source,targetId:owner,ownerId:owner,kind:'buff',durationMs:f.durationMs,maxStacks:1,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh',exclusiveGroup:f.exclusiveGroup??null,modifiers:f.modifiers});
  else {const q=e.resources.change([{resource:f.resource,delta:f.amount}]);e.recordMechanic('resource-change',{actorId:owner,source:x.source,resource:f.resource,delta:f.amount-(q.suppressed?.[f.resource]??0),overflow:q.overflow[f.resource]??0});}
  e.recordMechanic('proc',{actorId:owner,targetId:target,source:x.source,procId:'equipment:'+x.id});return true;
 }
 return {install(e){for(const x of config.effects.filter(x=>x.trigger==='use'))for(const at of x.atMs)e.timeline.schedule(at,P.resource,()=>activate(e,x,owner));},attack(e,ev){if(ev.actorId!==owner||!ev.landed)return;for(const x of config.effects){if(x.trigger==='use'||!x.sources.includes(ev.source)||x.trigger==='critical'&&!ev.critical)continue;activate(e,x,ev.targetId);}}};
}
