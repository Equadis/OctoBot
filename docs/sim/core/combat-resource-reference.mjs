// Configurable reference rates: no class or server coefficient is inferred.
const n=(x,label)=>{if(!Number.isFinite(x)||x<0)throw new Error('Invalid '+label);return x;};
export function manaRegenReference({spirit,spiritCoefficient,flatManaPerSecond,mp5,insideSpiritFraction,intervalMs,windowMs,provenance}){
 if(typeof provenance!=='string'||!provenance.trim())throw new Error('Explicit mana formula provenance required');
 if(!Number.isSafeInteger(intervalMs)||intervalMs<=0||!Number.isSafeInteger(windowMs)||windowMs<=0)throw new Error('Explicit mana timing required');
 const fraction=n(insideSpiritFraction,'inside fraction');if(fraction>1)throw new Error('Inside fraction exceeds one');
 const spiritRate=n(spirit,'spirit')*n(spiritCoefficient,'spirit coefficient')+n(flatManaPerSecond,'flat spirit formula term');
 const itemRate=n(mp5,'MP5')/5, secs=intervalMs/1000;
 return {resource:'mana',intervalMs,amount:(spiritRate+itemRate)*secs,fiveSecondRule:{windowMs,insideAmount:(spiritRate*fraction+itemRate)*secs},provenance,liveVerified:false};
}
