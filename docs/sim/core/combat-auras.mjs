import {REFERENCE_PRIORITIES as P} from './combat-timeline.mjs';
export const AURA_REVISION='octo-auras-20261117-1';
const key=v=>{if(typeof v!=='string'||!v.trim())throw new TypeError('Nonempty aura identifier required');return v;};
const integer=(v,k,min=0)=>{if(!Number.isSafeInteger(v)||v<min)throw new RangeError(k);return v;};
const identity=(a)=>JSON.stringify([a.targetId,a.ownerId,a.id,a.kind]);
const copy=structuredClone;
// No global stat mutation. Modifiers are scoped and explicitly combined by the adapter.
export class CombatAuras{
 #active=new Map();#history=[];#onChange;
 constructor(timeline,{onChange=()=>{},validateUnit=()=>true}={}){this.timeline=timeline;this.#onChange=onChange;this.validateUnit=validateUnit;}
 #close(a,reason){this.timeline.cancel(a.ticket);this.#active.delete(identity(a));this.#history.push({...this.#public(a),endAt:this.timeline.now,reason});this.#onChange({type:'aura-remove',...this.#public(a),reason});}
 #public(a){const {ticket,...r}=a;return copy(r);}
 apply(spec){
  const {id,name=id,targetId,ownerId,kind,durationMs,maxStacks,stacks,stackPolicy,refreshPolicy,exclusiveGroup=null,modifiers=[]}=spec;
  [id,name,targetId,ownerId].forEach(key);if(!this.validateUnit(targetId)||!this.validateUnit(ownerId))throw new Error('Unknown aura unit');if(!['buff','debuff'].includes(kind))throw new Error('Invalid aura kind');
  integer(durationMs,'Invalid aura duration',1);integer(maxStacks,'Invalid aura cap',1);integer(stacks,'Invalid stacks',1);
  if(!['replace','add','max'].includes(stackPolicy)||!['refresh','preserve'].includes(refreshPolicy))throw new Error('Explicit aura policies required');
  if(exclusiveGroup!==null)key(exclusiveGroup);
  if(!Array.isArray(modifiers))throw new TypeError('Invalid aura modifiers');for(const m of modifiers){key(m.stat);if(!['flat','addPct','multiplyPct'].includes(m.mode)||!Number.isFinite(m.value)||m.mode==='multiplyPct'&&m.value< -100)throw new Error('Invalid aura modifier');}
  const now=this.timeline.now,ident=identity({id,targetId,ownerId,kind}),old=this.#active.get(ident);const expiresAt=old&&refreshPolicy==='preserve'?old.expiresAt:now+durationMs;
  integer(expiresAt,'Invalid expiration');
  const nextStacks=Math.min(maxStacks,old?(stackPolicy==='add'?old.stacks+stacks:stackPolicy==='max'?Math.max(old.stacks,stacks):stacks):stacks);
  // At the expiry timestamp an aura is no longer active; do not resurrect its stacks.
  if(old&&old.expiresAt<=now){this.#close(old,'expired');return this.apply(spec);}
  for(const a of [...this.#active.values()])if(a!==old&&exclusiveGroup&&a.targetId===targetId&&a.kind===kind&&a.exclusiveGroup===exclusiveGroup)this.#close(a,'exclusive-replacement');
  if(old)this.#close(old,'refresh');
  const a={id,name,targetId,ownerId,kind,appliedAt:now,expiresAt,stacks:nextStacks,maxStacks,exclusiveGroup,modifiers:copy(modifiers),ticket:null};
  a.ticket=this.timeline.schedule(expiresAt,P.expire,()=>{if(this.#active.get(ident)===a)this.#close(a,'expired');});this.#active.set(ident,a);this.#onChange({type:'aura-apply',...this.#public(a)});return this.#public(a);
 }
 remove({id,targetId,ownerId,kind},reason='removed'){const a=this.#active.get(identity({id,targetId,ownerId,kind}));if(!a)return false;this.#close(a,reason);return true;}
 consume(spec,count=1){integer(count,'Invalid consumed stacks',1);const a=this.#active.get(identity(spec));if(!a||a.expiresAt<=this.timeline.now)return false;if(count>=a.stacks)return this.remove(spec,'consumed');
  const remaining=a.expiresAt-this.timeline.now;this.apply({...a,durationMs:remaining,stacks:a.stacks-count,stackPolicy:'replace',refreshPolicy:'preserve'});return true;
 }
 active(targetId,kind){return [...this.#active.values()].filter(a=>a.expiresAt>this.timeline.now&&(targetId===undefined||a.targetId===targetId)&&(kind===undefined||a.kind===kind)).map(a=>this.#public(a));}
 // Named rotation predicates choose the longest remaining instance; owned
 // debuffs have their own map, so another caster cannot mask the player's DoT.
 frame(targetId,kind,ownerId=null){const out=Object.create(null);for(const a of this.active(targetId,kind)){if(ownerId!==null&&a.ownerId!==ownerId)continue;const entry={remaining:(a.expiresAt-this.timeline.now)/1000,stacks:a.stacks,ownerId:a.ownerId,owner:a.ownerId===ownerId&&ownerId!==null?'player':a.ownerId};if(!Object.hasOwn(out,a.name)||entry.remaining>out[a.name].remaining)out[a.name]=entry;}return out;}
 modifiers(targetId){const out=Object.create(null);for(const a of this.active(targetId))for(const m of a.modifiers){const s=out[m.stat]??={flat:0,addPct:0,multiplier:1};if(m.mode==='flat')s.flat+=m.value*a.stacks;else if(m.mode==='addPct')s.addPct+=m.value*a.stacks;else s.multiplier*=Math.pow(1+m.value/100,a.stacks);}return out;}
 stat(targetId,stat,base){if(!Number.isFinite(base))throw new Error('Explicit base stat required');const m=this.modifiers(targetId)[stat];return m?(base+m.flat)*(1+m.addPct/100)*m.multiplier:base;}
 uptime(endAt){integer(endAt,'Invalid encounter end');if(endAt>this.timeline.now)throw new Error('Uptime cannot extend past current time');const by=new Map();for(const a of [...this.#history,...[...this.#active.values()].map(a=>({...this.#public(a),endAt:Math.min(this.timeline.now,a.expiresAt)}))]){const ms=Math.max(0,Math.min(endAt,a.endAt)-a.appliedAt);if(!ms)continue;const k=identity(a),r=by.get(k)??{id:a.id,name:a.name,targetId:a.targetId,ownerId:a.ownerId,kind:a.kind,activeMs:0,stackMs:0};r.activeMs+=ms;r.stackMs+=ms*a.stacks;by.set(k,r);}return [...by.values()].map(r=>({...r,uptimePct:endAt?100*r.activeMs/endAt:0,averageStacks:endAt?r.stackMs/endAt:0}));}
}
