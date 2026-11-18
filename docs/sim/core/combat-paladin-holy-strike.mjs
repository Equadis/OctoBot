// Research-only Holy Strike rank descriptors. These are not spell identities.
// Current guide confirms eight ranks, endpoint costs, Holy weapon damage,
// restoration and 6s cooldown. Archived Turtle tables are candidates only.
export const HOLY_STRIKE_REFERENCE=Object.freeze([
 [4,5,.25,11,13],[12,12,.25,22,28],[20,25,.30,34,38],[28,38,.30,52,58],
 [36,51,.35,71,77],[44,64,.35,91,98],[52,75,.40,106,118],[60,90,.40,129,146]
].map(([level,cost,weaponCoefficient,min,max],i)=>Object.freeze({rank:i+1,level,cost,weaponCoefficient,min,max,status:'archived-reference-only'})));
const n=(v,k)=>{if(!Number.isFinite(v)||v<0)throw new Error('Explicit Holy Strike '+k+' required');return v;};
export function holyStrikeRange(p){
 if(!p||p.acceptSourceConflict!==true)throw new Error('Holy Strike source conflict acknowledgement required');
 for(const k of ['weaponMin','weaponMax','weaponCoefficient','baseMin','baseMax','spellPower','spellCoefficient','damageMultiplier','threatMultiplier','baseHeal','healingPower','healingCoefficient','healingMultiplier','selfHealingMultiplier','manaRestore'])n(p[k],k);
 if(p.weaponMax<p.weaponMin||p.baseMax<p.baseMin)throw new Error('Reversed Holy Strike damage range');
 const damageMin=(p.weaponMin*p.weaponCoefficient+p.baseMin+p.spellPower*p.spellCoefficient)*p.damageMultiplier;
 const damageMax=(p.weaponMax*p.weaponCoefficient+p.baseMax+p.spellPower*p.spellCoefficient)*p.damageMultiplier;
 const allyHealing=(p.baseHeal+p.healingPower*p.healingCoefficient)*p.healingMultiplier;
 return {school:'holy',damageMin,damageMax,threatMultiplier:p.threatMultiplier,allyHealing,selfHealing:allyHealing*p.selfHealingMultiplier,manaRestore:p.manaRestore};
}

export function executeHolyStrike(e,{owner,target,enemyIds,geometry,recipients,manaPools,model,outcomes,roll,refreshJudgements}){
 const values=holyStrikeRange(model);
 if(!Array.isArray(recipients)||!recipients.includes(owner)||recipients.length<1||recipients.length>5||new Set(recipients).size!==recipients.length||!manaPools||typeof manaPools!=='object'||Array.isArray(manaPools)||!Array.isArray(outcomes)||!outcomes.length||Math.abs(outcomes.reduce((n,o)=>n+o.probability,0)-1)>1e-8||outcomes.some(o=>typeof o.landed!=='boolean'))throw new Error('Explicit Holy Strike party, distinct mana pools and outcomes required');
 for(const [id,pool] of Object.entries(manaPools))if(!recipients.includes(id)||pool!==(id===owner?'mana':'partyMana:'+id)||!e.resources.snapshot()[pool])throw new Error('Holy Strike mana recipient lacks distinct configured pool');
 if(!e.unit(owner).alive||!e.unit(target).alive)return;
 const hit=roll({min:values.damageMin,max:values.damageMax,outcomes,random:e.random});
 e.recordMechanic('attack-result',{actorId:owner,targetId:target,source:'Holy Strike',school:'holy',...hit});
 if(hit.landed){e.damage({actorId:owner,targetId:target,source:'Holy Strike',school:'holy',value:hit.raw,threat:values.threatMultiplier===0?null:{actorId:owner,coefficient:values.threatMultiplier,flat:0,multipliers:[],distribution:'each'}});refreshJudgements?.(e,owner,target,true);}
 const livingEnemies=enemyIds.filter(id=>e.unit(id).alive);
 for(const id of recipients){if(!e.unit(id).alive||!geometry[owner]?.[id]||geometry[owner][id].distance>10)continue;
 const healing=id===owner?values.selfHealing:values.allyHealing;
 e.heal({actorId:owner,targetId:id,source:'Holy Strike (party)',value:healing,threat:livingEnemies.length?{actorId:owner,enemyIds:livingEnemies,coefficient:0,flat:0,multipliers:[],distribution:'split'}:null});
 const resource=manaPools[id];if(resource&&values.manaRestore>0){const before=e.resources.snapshot()[resource].current;const change=e.resources.change([{resource,delta:values.manaRestore}]);if(!change.ok)throw new Error('Holy Strike mana return failed');const actual=e.resources.snapshot()[resource].current-before;e.recordMechanic('resource-change',{actorId:owner,targetId:id,source:'Holy Strike (mana)',resource,delta:actual,overflow:values.manaRestore-actual});}
 }
}
