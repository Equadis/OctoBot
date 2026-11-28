import {REFERENCE_PRIORITIES as P} from './combat-timeline.mjs';
const piercingIds=new Set(['hunter:multi-shot','hunter:steady-shot','hunter:aimed-shot']);
const quiverIds=new Set(['hunter:arcane-shot','hunter:steady-shot','hunter:multi-shot']);
const rank=(n,label)=>{if(!Number.isSafeInteger(n)||n<0||n>2)throw new Error('Invalid '+label+' rank');return n;};
export function createHunterRangedTalents(sc,rangedAuto){
 const p=sc.hunterRangedTalents;if(!p)return null;if(sc.classId!=='hunter')throw new Error('Hunter ranged talents require Hunter');
 const piercing=rank(p.piercingRank,'Piercing Shots'),quiver=rank(p.quiverRank,'Endless Quiver');
 if(piercing&&(!p.piercing||!['post-mitigation','effective'].includes(p.piercing.basis)||!['replace','independent'].includes(p.piercing.overlap)||!Number.isSafeInteger(p.piercing.tickMs)||p.piercing.tickMs<=0||8000%p.piercing.tickMs!==0))throw new Error('Explicit Piercing Shots damage basis, tick and overlap policy required');
 if(quiver&&(!p.quiver||!['landed-per-target','landed-once-per-cast'].includes(p.quiver.trigger)||p.quiver.extraProcPolicy!=='no-recursion'||!rangedAuto||rangedAuto.effects?.length!==1||rangedAuto.effects[0].kind!=='damage'||rangedAuto.effects[0].school!=='physical'))throw new Error('Explicit Endless Quiver policy and configured normal ranged attack required');
 const owner=sc.playerId;let seq=0;
 return {onHit(e,{actor,target,hit,damage,context,kind},fireExtra){
  if(actor!==owner||kind!=='damage'||!hit.landed||damage.ignored||!e.unit(target).alive)return;
  if(piercing&&hit.critical&&piercingIds.has(context.abilityId)){
   const basis=p.piercing.basis==='effective'?damage.effective:hit.raw,total=basis*.15*piercing;
   if(total>0){const intervalMs=p.piercing.tickMs,id=JSON.stringify([owner,target,'hunter:piercing-shots',p.piercing.overlap==='independent'?++seq:0]),aura={id,name:'Piercing Shots',targetId:target,ownerId:owner,kind:'debuff',durationMs:8000,maxStacks:1,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh'};e.auras.apply(aura);e.recordMechanic('proc',{actorId:owner,targetId:target,source:'Piercing Shots',procId:'hunter:piercing-shots'});e.periodic.apply({id,durationMs:8000,intervalMs,refresh:'restart',tickAtExpiry:true,tickPriority:P.tick,expirePriority:P.expire,snapshot:{value:total/(8000/intervalMs)},onTick:q=>{if(!e.unit(owner).alive||!e.unit(target).alive){e.periodic.remove(id);e.auras.remove(aura,'unit-dead');return;}e.damage({actorId:owner,targetId:target,source:'Piercing Shots',school:'physical',value:q.snapshot.value,threat:null});}});}
  }
  if(!quiver||!(context.white===true&&context.hand==='ranged'||quiverIds.has(context.abilityId)))return;
  if(p.quiver.trigger==='landed-once-per-cast'&&context.white!==true){if(!context.actionState)throw new Error('Missing Endless Quiver action tracking');if(context.actionState.endlessQuiverRolled)return;context.actionState.endlessQuiverRolled=true;}
  if(e.random()>=.03*quiver)return;
  e.recordMechanic('proc',{actorId:owner,targetId:target,source:'Endless Quiver',procId:'hunter:endless-quiver'});fireExtra(rangedAuto.effects);
 }};
}
