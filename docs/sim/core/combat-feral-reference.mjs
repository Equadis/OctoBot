// Explicit form-specific measured paw damage. Never substitute item tooltip
// damage or weapon skill from the equipped stat stick.
const n=(x,k,min=0)=>{if(!Number.isFinite(x)||x<min)throw new Error('Explicit feral '+k+' required');return x;};
export function feralWeapon(snap,form,model){
 if(!['Cat','Bear'].includes(form)||model?.form!==form)throw new Error('Matching explicit feral form model required');
 if(typeof model.provenance!=='string'||!model.provenance.trim())throw new Error('Feral observation provenance required');
 const min=n(model.min,'paw minimum'),max=n(model.max,'paw maximum',min),speed=n(model.speedSeconds,'paw base speed',.01),interval=n(model.intervalSeconds,'paw effective swing speed',.01);
 const skill=n(model.skill,'skill'),critPct=n(model.critPct,'crit'),hitPct=n(model.hitPct,'hit'),targetDodgePct=n(model.targetDodgePct,'target dodge');
 const glanceMultiplier=n(model.glanceMultiplier,'glance multiplier'),glanceChancePct=n(model.glanceChancePct,'glance chance');
 if(critPct>100||hitPct>100||targetDodgePct>100||glanceChancePct>100||glanceMultiplier>1)throw new Error('Invalid feral attack percentage');
 return {...snap.melee.mainhand,min,max,intervalSeconds:interval,baseSpeedSeconds:speed,skill,critPct,hitPct,targetDodgePct,glanceMultiplier,glanceChancePct};
}
export function feralTemplate(form){return {form,provenance:'',min:null,max:null,speedSeconds:null,intervalSeconds:null,skill:null,critPct:null,hitPct:null,targetDodgePct:null,glanceMultiplier:null,glanceChancePct:null};}
