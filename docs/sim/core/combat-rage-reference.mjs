// The OctoWoW Warrior guide describes damage and weapon-speed contributions,
 // but does not publish the full coefficients. No coefficients are defaulted.
const num=(v,n)=>{if(!Number.isFinite(v)||v<0)throw new Error('Explicit nonnegative '+n+' required');return v;};
const basis=(p)=>{if(!['effective','post-mitigation'].includes(p.damageBasis))throw new Error('Explicit rage damage basis required');return p.damageBasis;};
export function validateSwingRage(p){
 if(!p||typeof p.provenance!=='string'||!p.provenance.trim())throw new Error('Rage policy provenance required');
 basis(p);num(p.perDamage,'rage per damage');num(p.perWeaponSecond,'rage per weapon second');num(p.weaponSeconds,'weapon speed');num(p.handFactor,'hand rage factor');num(p.criticalFactor,'critical rage factor');
 if(!['none','floor','round'].includes(p.rounding))throw new Error('Explicit rage rounding required');
 if(typeof p.allowZeroDamage!=='boolean')throw new Error('Explicit zero damage rage policy required');
 return p;
}
const rounding=(n,p)=>p.rounding==='floor'?Math.floor(n):p.rounding==='round'?Math.round(n):n;
export function swingRage(p,hit,damage){
 validateSwingRage(p);if(!hit.landed||damage.ignored)return 0;
 const dealt=num(p.damageBasis==='effective'?damage.effective:hit.raw,'rage basis damage');
 if(dealt===0&&!p.allowZeroDamage)return 0;
 return rounding((dealt*p.perDamage+p.weaponSeconds*p.perWeaponSecond)*p.handFactor*(hit.critical?p.criticalFactor:1),p);
}
export function validateIncomingRage(p){if(!p||typeof p.provenance!=='string'||!p.provenance.trim())throw new Error('Incoming rage provenance required');basis(p);num(p.perDamage,'incoming rage per damage');if(!['none','floor','round'].includes(p.rounding))throw new Error('Explicit incoming rage rounding required');return p;}
export function incomingRage(p,raw,damage){validateIncomingRage(p);if(damage.ignored)return 0;return rounding(num(p.damageBasis==='effective'?damage.effective:raw,'incoming damage')*p.perDamage,p);}
