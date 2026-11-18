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
