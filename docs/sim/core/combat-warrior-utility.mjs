import {expectedOutcome} from './combat-math.mjs';
import {sampleAttack} from './combat-attack-tables.mjs';
const n=(x,k,min=0,max=Infinity)=>{if(!Number.isFinite(x)||x<min||x>max)throw new Error('Explicit Warrior '+k+' required');return x;};
const integer=(x,k,min=0,max=Infinity)=>{if(!Number.isSafeInteger(x)||x<min||x>max)throw new Error('Explicit Warrior '+k+' required');return x;};
const talent=(b,id,max)=>integer(Number(b.talents?.[String(id)]??0),'talent rank '+id,0,max);
export function validateWarriorUtility(x){
 if(!x||!['sunder-armor','battle-shout'].includes(x.kind))throw new Error('Explicit Warrior utility required');
 n(x.amount,'amount');integer(x.durationMs,'duration',1);
 if(x.kind==='sunder-armor'){integer(x.maxStacks,'stack cap',1,5);expectedOutcome({min:0,max:0,outcomes:x.outcomes});if(x.outcomes.some(o=>typeof o.landed!=='boolean'))throw new Error('Explicit Sunder landed outcomes required');if(x.threat!==null)n(x.threat,'flat threat');}
 else {n(x.radius,'shout radius');if(!Array.isArray(x.allies)||new Set(x.allies).size!==x.allies.length||x.allies.some(a=>typeof a!=='string'||!a))throw new Error('Explicit Battle Shout recipients required');if(typeof x.includeOwner!=='boolean')throw new Error('Explicit Battle Shout owner eligibility required');}
 return x;
}
export function compileWarriorUtility(build,rank,policy){const kind=rank.components[0].kind,p=policy.warriorUtilityModel;if(!p)throw new Error('Explicit Warrior utility model required');
 const durationMs=integer(p.durationMs,'duration',1),amount=n(p.amount,'amount');
 if(kind==='sunder-armor')return validateWarriorUtility({kind,when:'always',amount,durationMs,maxStacks:p.maxStacks,outcomes:p.outcomes,threat:p.threat});
 const improved=talent(build,97,5),booming=talent(build,93,5);
 return validateWarriorUtility({kind,when:'always',amount:amount*(1+.05*improved),durationMs:Math.round(durationMs*(1+.12*booming)),radius:n(p.radius,'radius')*(1+.12*booming),includeOwner:p.includeOwner,allies:p.allies});
}
export function executeSunder(e,actor,target,x,source){
 const h=sampleAttack({min:0,max:0,outcomes:x.outcomes,random:e.random});e.recordMechanic('attack-result',{actorId:actor,targetId:target,source,school:'physical',...h});if(!h.landed)return h;
 e.auras.apply({id:'warrior:sunder-armor',name:'Sunder Armor',targetId:target,ownerId:actor,kind:'debuff',durationMs:x.durationMs,maxStacks:x.maxStacks,stacks:1,stackPolicy:'add',refreshPolicy:'refresh',modifiers:[{stat:'majorArmourReduction',mode:'flat',value:x.amount}]});
 if(x.threat!==null){e.threat.add({enemyId:target,actorId:actor,value:x.threat});e.recordMechanic('utility-threat',{actorId:actor,targetId:target,source,delta:x.threat});}
 return h;
}
export function executeBattleShout(e,actor,x,allies,geometry){
 for(const target of x.allies){const d=geometry?.[actor]?.[target]?.distance;if(!allies.includes(target)||!Number.isFinite(d)||d>x.radius)throw new Error('Battle Shout recipient outside explicit party range');}
 for(const target of [...(x.includeOwner?[actor]:[]),...x.allies])if(e.unit(target).alive)e.auras.apply({id:'warrior:battle-shout',name:'Battle Shout',targetId:target,ownerId:actor,kind:'buff',durationMs:x.durationMs,maxStacks:1,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh',modifiers:[{stat:'attackPower',mode:'flat',value:x.amount}]});
}
