// Imported talent: 135% weapon damage, two combo points, 8s party benefit, no block/dodge/parry.
const num=(n,k,min=0,max=Infinity)=>{if(!Number.isFinite(n)||n<min||n>max)throw new Error('Explicit Mark for Death '+k+' required');return n;};
const schools=['arcane','fire','frost','holy','nature','shadow'];
export function markForDeathTemplate(){return {includeOwner:null,allies:[],attackPowerBasis:null,attackPowerFraction:null,magicMode:null,magicFraction:null};}
export function validateMarkForDeath(p){
 if(!p||typeof p.includeOwner!=='boolean'||!Array.isArray(p.allies)||p.allies.some(x=>typeof x!=='string'||!x)||new Set(p.allies).size!==p.allies.length||!['owner-snapshot','recipient-percent'].includes(p.attackPowerBasis)||p.magicMode!=='school-power')throw new Error('Explicit Mark for Death recipients and AP/magic basis required');
 num(p.attackPowerFraction,'AP fraction',0,1);num(p.magicFraction,'magic fraction',0,.18);return p;
}
export function applyMarkForDeath(e,owner,p,stats,allies){
 validateMarkForDeath(p);if(p.allies.some(x=>!allies.includes(x)||x===owner))throw new Error('Mark for Death recipient must be a configured party ally');
 const auraId='rogue:mark-for-death';const recipients=[...(p.includeOwner?[owner]:[]),...p.allies];
 // Remove the caster's previous application before taking AP snapshot; never compound from a prior self buff.
 for(const a of e.auras.active(undefined,'buff'))if(a.id===auraId&&a.ownerId===owner)e.auras.remove(a,'refresh');
 const ap=e.auras.stat(owner,'attackPower',stats.attackPower),magical=ap*p.magicFraction;
 const apModifier={stat:'attackPower',mode:p.attackPowerBasis==='owner-snapshot'?'flat':'multiplyPct',value:p.attackPowerBasis==='owner-snapshot'?ap*p.attackPowerFraction:100*p.attackPowerFraction};
 for(const target of recipients)if(e.unit(target).alive)e.auras.apply({id:auraId,name:'Mark for Death',targetId:target,ownerId:owner,kind:'buff',durationMs:8000,maxStacks:1,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh',modifiers:[apModifier,...schools.map(stat=>({stat,mode:'flat',value:magical}))]});
}
