// Explicit capacity transitions; no assumption about server buff behaviour.
export function resizeCapacity(current,maximum,next,policy,minimum=0){
 if(![current,maximum,next,minimum].every(Number.isFinite)||minimum<0||current<0||maximum<current||next<minimum||!['clamp','preserve-deficit','preserve-ratio'].includes(policy))throw Error('Invalid capacity transition');
 const value=policy==='preserve-deficit'?current+next-maximum:policy==='preserve-ratio'&&maximum>0?current/maximum*next:current;
 return {current:Math.min(next,Math.max(minimum,value)),max:next};
}
export function validateCapacityPolicy(p,pools){
 if(!p||typeof p.provenance!=='string'||!p.provenance.trim()||!p.resources||typeof p.resources!=='object'||Array.isArray(p.resources)||!['clamp','preserve-deficit','preserve-ratio'].includes(p.health))throw Error('Explicit capacity policy required');
 for(const [k,v] of Object.entries(p.resources))if(!['mana','rage','energy'].includes(k)||!Object.hasOwn(pools,k)||!['clamp','preserve-deficit','preserve-ratio'].includes(v))throw Error('Invalid resource capacity policy: '+k);
 return p;
}
