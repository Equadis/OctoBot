const num=(x,k,min=0,max=Infinity)=>{if(!Number.isFinite(x)||x<min||x>max)throw new Error('Explicit Rogue stealth '+k+' required');return x;};
const id='rogue:stealth';
export function validateVanish(p){
 if(!p||!Number.isSafeInteger(p.durationMs)||p.durationMs<=0||!Number.isSafeInteger(p.reagentCost)||p.reagentCost<0||!Array.isArray(p.cloakedAllies)||new Set(p.cloakedAllies).size!==p.cloakedAllies.length)throw new Error('Explicit Vanish duration, reagent and Cloaked ally IDs required');
 num(p.threatReduction,'threat reduction',0,1);num(p.cloakedRank??0,'Cloaked rank',0,2);return p;
}
export function compileVanish(build,p){const rank=Number(build.talents?.['156']??0);if(!Number.isInteger(rank)||rank<0||rank>2)throw new Error('Invalid Cloaked in Shadows rank');return validateVanish({...p,cloakedRank:rank});}
export function createStealthRuntime(owner,enemies,allies,policy,duration,geometry){
 if(!policy||typeof policy.initial!=='boolean'||typeof policy.breakOnIncoming!=='boolean'||!['skip','break'].includes(policy.autoPolicy))throw new Error('Explicit stealth scenario policy required');
 const active=e=>e.auras.active(owner,'buff').find(a=>a.id===id&&a.ownerId===owner);
 const enter=(e,ms)=>e.auras.apply({id,name:'Stealth',targetId:owner,ownerId:owner,kind:'buff',durationMs:ms,maxStacks:1,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh',modifiers:[]});
 const leave=(e,reason)=>{const a=active(e);if(a)e.auras.remove(a,reason);};
 return {active,initialize(e){if(policy.initial)enter(e,duration+1);},
 beforeAction(e,a){if(a.targets.includes('enemy'))leave(e,'offensive-action');},
 auto(e){if(!active(e))return true;if(policy.autoPolicy==='skip')return false;leave(e,'auto-attack');return true;},
 incoming(e,ev){if(policy.breakOnIncoming&&ev.targetId===owner&&ev.effective>0)leave(e,'incoming-damage');},
 vanish(e,p){validateVanish(p);for(const target of enemies)if(e.unit(target).alive&&p.threatReduction>0)e.threat.reduce({enemyId:target,actorId:owner,fraction:p.threatReduction});
 enter(e,p.durationMs);if(p.cloakedRank>0){const capacity=e.unit(owner).maxHealth*.06*p.cloakedRank;for(const target of [owner,...p.cloakedAllies]){if(target!==owner&&(!allies.includes(target)||!Number.isFinite(geometry?.[owner]?.[target]?.distance)||geometry[owner][target].distance>20))throw new Error('Cloaked in Shadows target outside explicit party range');if(e.unit(target).alive)e.applyAbsorb({id:'rogue:cloaked-in-shadows',targetId:target,actorId:owner,source:'Cloaked in Shadows',amount:capacity,durationMs:20000});}}}
 };
}
