const ids=new Set(['warrior:overpower','warrior:revenge']);
const n=(v,k,min=0)=>{if(!Number.isFinite(v)||v<min)throw new Error('Explicit reactive '+k+' required');return v;};
export function validateReactive(id,p){
 if(!ids.has(id)||!p||!Number.isSafeInteger(p.windowMs)||p.windowMs<=0||!['cast','landed'].includes(p.consume)||!Array.isArray(p.stances)||!p.stances.length||p.stances.some(s=>!['Battle','Defensive','Berserker'].includes(s))||typeof p.targetBound!=='boolean')throw new Error('Explicit reactive window, consumption, stance and target policy required');
 if(id==='warrior:overpower'&&!p.targetBound)throw new Error('Overpower requires target-bound dodge');
 if(id==='warrior:revenge'){n(p.min,'minimum damage');n(p.max,'maximum damage',p.min);n(p.apCoefficient,'AP coefficient');}
 return p;
}
export function reactiveTemplate(id){return {windowMs:null,consume:null,stances:null,targetBound:id==='warrior:overpower'?true:null,...(id==='warrior:revenge'?{min:null,max:null,apCoefficient:null}:{})};}
export function createReactiveRuntime(actions,owner){
 const models=new Map(actions.filter(a=>a.reactive).map(a=>[a.abilityId,validateReactive(a.abilityId,a.reactive)])),windows=new Map();
 const key=(id,t)=>id+'|'+(models.get(id).targetBound?t:'*');
 const open=(e,id,t)=>{const p=models.get(id);if(!p||!e.unit(t).alive)return;windows.set(key(id,t),e.timeline.now+p.windowMs);e.recordMechanic('proc',{actorId:owner,targetId:t,source:id+' available',procId:id+'-ready'});};
 return {outgoing(e,actor,target,kind,school,hit){if(actor===owner&&kind==='damage'&&school==='physical'&&hit.outcome==='dodge')open(e,'warrior:overpower',target);},incoming(e,attack){if(attack.targetId===owner&&['dodge','parry','block'].includes(attack.outcome))open(e,'warrior:revenge',attack.actorId);},available(e,id,target,stance){const p=models.get(id);return p.stances.includes(stance??'Battle')&&(windows.get(key(id,target))??-1)>e.timeline.now;},consume(e,id,target,landed){const p=models.get(id);if(p.consume==='cast'||landed)windows.delete(key(id,target));}};
}
