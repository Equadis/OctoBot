import {abilityDamageFactor} from './combat-ability-modifiers.mjs';
// Research-only fire totem model. Rank damage, timing, and threat require explicit policy.
const finite=(x,name,min=0)=>{if(!Number.isFinite(x)||x<min)throw Error('Invalid fire totem '+name);return x};
const integer=(x,name)=>{if(!Number.isSafeInteger(x)||x<1)throw Error('Invalid fire totem '+name);return x};
export function validateFireTotem(p){
 if(!p||!['searing','magma','fire-nova'].includes(p.kind)||p.slot!=='fire'||p.targeting!=='ordered-living-in-radius'||p.threatRouting!=='owner-reference'||!Array.isArray(p.outcomes)||!p.outcomes.length)throw Error('Explicit fire totem kind, slot, targeting and threat routing required');
 for(const k of ['durationMs','firstPulseMs','intervalMs','cap'])integer(p[k],k);for(const k of ['rangeYards','baseMin','baseMax','coefficient','damageFactor','threatFactor'])finite(p[k],k);
 if(p.rangeYards<=0||p.baseMax<p.baseMin||p.cap>40||p.firstPulseMs>p.durationMs||p.kind==='searing'&&p.cap!==1||p.kind==='fire-nova'&&p.durationMs!==p.firstPulseMs||p.outcomes.some(x=>typeof x.landed!=='boolean'||!Number.isFinite(x.probability)||x.probability<0||!Number.isFinite(x.multiplier)||x.multiplier<0)||Math.abs(p.outcomes.reduce((s,x)=>s+x.probability,0)-1)>1e-8)throw Error('Invalid totem pulse schedule, targeting or outcomes');
 if(p.spellPowerTiming!==undefined&&!['baseline','pulse'].includes(p.spellPowerTiming))throw Error('Explicit fire totem spell power timing required');
 if(p.threat!==null&&(!p.threat||!Number.isFinite(p.threat.coefficient)||p.threat.coefficient<0||!Number.isFinite(p.threat.flat)||p.threat.flat<0||!Array.isArray(p.threat.multipliers)||!['each','split'].includes(p.threat.distribution)))throw Error('Explicit totem threat policy required');
 return p;
}
export function compileFireTotem(build,abilityId,policy){
 const kind={'shaman:searing-totem':'searing','shaman:magma-totem':'magma','shaman:fire-nova-totem':'fire-nova'}[abilityId];
 if(!kind)throw Error('Unknown fire totem');
 const rank=(id,cap)=>{const n=Number(build.talents?.[id]??0);if(!Number.isSafeInteger(n)||n<0||n>cap)throw Error('Invalid fire totem talent rank');return n};
 const imp=rank('227',2),flame=rank('229',3),fury=rank('232',2),align=rank('253',2),tidal=rank('236',5);
 if(!policy)throw Error('Explicit fire totem model required');
 const p={...policy,kind,slot:'fire',durationMs:kind==='fire-nova'?policy.durationMs-imp*1000:policy.durationMs,firstPulseMs:policy.firstPulseMs-(kind==='fire-nova'?imp*1000:0),intervalMs:kind==='searing'?Math.max(1,Math.round(policy.intervalMs/(1+.1*imp))):policy.intervalMs,rangeYards:policy.rangeYards+(kind==='searing'?imp*5:0),damageFactor:policy.damageFactor*(1+.05*flame+.05*fury),threatFactor:policy.threatFactor*(kind==='magma'?1-.25*imp:1),talents:{imp,flame,fury,align,tidal}};
 if(p.outcomes)p.outcomes=p.outcomes.map(o=>o.critical?{...o,multiplier:1+(o.multiplier-1)*(1+.5*fury)}:{...o});
 if(p.threat!==null&&p.threat)p.threat={...p.threat,multipliers:[...p.threat.multipliers,p.threatFactor]};
 return validateFireTotem(p);
}
export function fireTotemPulseRange(auras,owner,action,baselineFirePower){
 const p=action.fireTotem;
 if(!Number.isFinite(baselineFirePower))throw Error('Fire totem requires explicit Fire spell power');
 const power=p.spellPowerTiming==='pulse'?auras.stat(owner,'fire',baselineFirePower):baselineFirePower;
 const factor=p.damageFactor*abilityDamageFactor(auras,owner,action.abilityId);
 return {min:(p.baseMin+power*p.coefficient)*factor,max:(p.baseMax+power*p.coefficient)*factor};
}
export function createFireTotemRuntime({owner,targetIds,geometry,resolve,priority}){
 let current=null;
 return {cast(e,a){
  const p=validateFireTotem(a.fireTotem),token={};current=token;
  e.auras.apply({id:'shaman:fire-totem-slot',name:a.name,targetId:owner,ownerId:owner,kind:'buff',durationMs:p.durationMs,maxStacks:1,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh',modifiers:[]});
  const pulse=()=>{if(current!==token||!e.unit(owner).alive)return;const ids=targetIds.filter(id=>e.unit(id).alive&&geometry[owner]?.[id]?.distance<=p.rangeYards),focus=ids.find(id=>e.auras.active(id,'debuff').some(x=>x.ownerId===owner&&x.name==='Flame Shock')),targets=p.kind==='searing'?(focus?[focus]:ids.slice(0,1)):ids.slice(0,p.cap);for(const id of targets)if(e.unit(id).alive&&e.unit(owner).alive)resolve(e,id,a);};
  for(let ms=p.firstPulseMs;ms<=p.durationMs;ms+=p.intervalMs){const last=p.kind==='fire-nova'||ms+p.intervalMs>p.durationMs;e.timeline.schedule(e.timeline.now+ms,priority,()=>{if(current!==token)return;pulse();if(last){current=null;e.auras.remove({id:'shaman:fire-totem-slot',targetId:owner,ownerId:owner,kind:'buff'},'totem-finished');}});if(p.kind==='fire-nova')break;}
  e.recordMechanic('proc',{actorId:owner,source:a.name,procId:a.abilityId+':placed'});
 }};
}
