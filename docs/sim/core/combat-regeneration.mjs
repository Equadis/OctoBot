// Opt-in reference timing; all rates and recovery window supplied by caller.
export function validateRegenPolicy(r){
 if(r.fiveSecondRule===undefined)return;
 const p=r.fiveSecondRule;
 if(r.resource!=='mana'||!p||!Number.isSafeInteger(p.windowMs)||p.windowMs<=0||!Number.isFinite(p.insideAmount)||p.insideAmount<0||!Number.isFinite(r.amount)||r.amount<0)throw new Error('Explicit mana regeneration window and inside/outside rates required');
}
export function regenerationAmount(r,now,lastSpent){
 validateRegenPolicy(r);
 if(!r.fiveSecondRule)return r.amount;
 if(lastSpent!==null&&now-lastSpent<r.fiveSecondRule.windowMs)return r.fiveSecondRule.insideAmount;
 return r.amount;
}

// Per-second marginal mana regeneration, scoped to one explicitly selected tick stream.
export function dynamicManaRegen(r,now,lastSpent,auras,actor){
 const base=regenerationAmount(r,now,lastSpent);if(!r.dynamicManaPolicy)return base;
 const p=r.dynamicManaPolicy;if(r.resource!=='mana'||!Number.isFinite(r.intervalMs)||r.intervalMs<=0||!r.fiveSecondRule||!Number.isFinite(p.insideSpiritFraction)||p.insideSpiritFraction<0||p.insideSpiritFraction>1||typeof p.provenance!=='string'||!p.provenance.trim())throw Error('Explicit dynamic mana regeneration policy required');
 const inside=lastSpent!==null&&now-lastSpent<r.fiveSecondRule.windowMs;
 const spirit=auras.stat(actor,'spiritManaRegenPerSecondDelta',0),mp5=auras.stat(actor,'mp5Delta',0),factor=auras.stat(actor,'manaRegenFactor',1);
 if(![spirit,mp5,factor].every(Number.isFinite)||factor<0)throw Error('Invalid dynamic mana regeneration modifier');
 return Math.max(0,(base+(spirit*(inside?p.insideSpiritFraction:1)+mp5/5)*r.intervalMs/1000)*factor);
}
