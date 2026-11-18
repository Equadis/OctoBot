// Scoped aura stat keys use stable ability IDs, not translated labels.
export function abilityDamageFactor(auras,actor,abilityId){
 if(!abilityId)return 1;
 const v=auras.stat(actor,'abilityDamageFactor:'+abilityId,1);
 if(!Number.isFinite(v)||v<0)throw Error('Invalid ability damage factor');
 return v;
}
export function abilityCosts(auras,actor,abilityId,costs){
 if(!abilityId)return costs;
 return costs.map(c=>{
  if(!['mana','energy','rage'].includes(c.resource)||c.delta===0)return c;
  const factor=auras.stat(actor,'abilityCostFactor:'+abilityId+':'+c.resource,1);
  const reduction=auras.stat(actor,'abilityCostReduction:'+abilityId+':'+c.resource,0);
  if(!Number.isFinite(factor)||factor<0||!Number.isFinite(reduction))throw Error('Invalid ability resource modifier');
  return {...c,delta:-Math.max(0,-c.delta*factor-reduction)};
 });
}

export function abilityCooldowns(auras,actor,abilityId,cooldowns){return cooldowns.map(c=>{if(c.id!==abilityId||c.id==='gcd'||c.id.startsWith('shared:'))return c;const f=auras.stat(actor,'abilityCooldownFactor:'+abilityId,1),r=auras.stat(actor,'abilityCooldownReductionMs:'+abilityId,0);if(!Number.isFinite(f)||f<0||!Number.isFinite(r))throw Error('Invalid ability cooldown modifier');const duration=Math.max(0,Math.round(c.duration*f-r));if(!Number.isSafeInteger(duration))throw Error('Invalid modified cooldown duration');return {...c,duration};});}
export function periodicAbilityFactor(auras,actor,abilityId,snapshot=null){return snapshot?.abilityDamageFactor??abilityDamageFactor(auras,actor,abilityId);}
