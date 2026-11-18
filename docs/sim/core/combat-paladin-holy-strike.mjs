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
