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
