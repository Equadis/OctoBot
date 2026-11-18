// Player-supplied in-game tooltip (2026-11-18): one learned rank, 3% AP + 30.
// Historical alternatives retained for reproduction; spell ID and timing unverified.
const legacy={1:[50,325],2:[75,425],3:[100,525]},archive={1:[30,3],2:[40,4],3:[55,5]};
export function validateTrueshot(p){
 if(!p||p.acceptSourceConflict!==true||!['legacy-flat','archived-scaling','observed-single-rank'].includes(p.sourceModel)||!Number.isInteger(p.rank)||p.rank<1||p.rank>3||(p.sourceModel==='observed-single-rank'?(p.rank!==1||!Number.isFinite(p.radiusYards)||p.radiusYards<=0||!Number.isSafeInteger(p.durationMs)||p.durationMs<=0):(p.radiusYards!==45||p.durationMs!==1800000))||!Array.isArray(p.recipients)||p.recipients.length<1||p.recipients.length>40||new Set(p.recipients).size!==p.recipients.length||p.recipients.some(id=>typeof id!=='string'||!id)||!p.recipientStats||typeof p.recipientStats!=='object'||Array.isArray(p.recipientStats)||!['snapshot'].includes(p.statBasis)||p.costPolicy!=='explicit-research'||!Number.isFinite(p.manaCost)||p.manaCost<0)throw Error('Trueshot requires explicit conflicting source, recipient snapshot and cost acknowledgement');
 for(const id of p.recipients){const r=p.recipientStats[id];if(!r||!Number.isFinite(r.meleeAP)||r.meleeAP<0||!Number.isFinite(r.rangedAP)||r.rangedAP<0)throw Error('Trueshot recipient attack power must be explicit');}
 return p;
}
export function trueshotBonuses(p,id){
 validateTrueshot(p);if(!p.recipients.includes(id))throw Error('Unknown Trueshot recipient');
 if(p.sourceModel==='legacy-flat'){const flat=legacy[p.rank][0];return {meleeAP:flat,rangedAP:flat};}
 const [flat,pct]=p.sourceModel==='observed-single-rank'?[30,3]:archive[p.rank],s=p.recipientStats[id];return {meleeAP:flat+s.meleeAP*pct/100,rangedAP:flat+s.rangedAP*pct/100};
}
export function applyTrueshotAura(e,{owner,allies,geometry,policy}){
 const p=validateTrueshot(policy);if(!p.recipients.includes(owner)||p.recipients.some(id=>id!==owner&&!allies.includes(id)))throw Error('Trueshot recipients must belong to explicit party');
 let applied=0;
 for(const id of p.recipients){if(!e.unit(id).alive||!geometry[owner]?.[id]||geometry[owner][id].distance>p.radiusYards)continue;const b=trueshotBonuses(p,id);
 e.auras.apply({id:'hunter:trueshot-aura',name:'Trueshot Aura',targetId:id,ownerId:owner,kind:'buff',durationMs:p.durationMs,maxStacks:1,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh',modifiers:[{stat:'attackPower',mode:'flat',value:b.meleeAP},{stat:'rangedAttackPower',mode:'flat',value:b.rangedAP}]});applied++;
 }
 return applied;
}
