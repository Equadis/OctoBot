import {resourceLedger} from './combat-math.mjs';
// Infrastructure, not server rules. Integer milliseconds; adapters choose
// priorities, cooldown start timing, tick phase, proc triggers and coefficients.
export const TIMELINE_REVISION='octo-combat-timeline-20261117-1';
export const REFERENCE_PRIORITIES=Object.freeze({resource:0,cast:10,tick:20,expire:30,decision:40});
const int=(x,label,min=0)=>{if(!Number.isSafeInteger(x)||x<min)throw new RangeError(label+' must be a safe integer >= '+min);return x;};
const keyOf=id=>{if(typeof id!=='string'||!id.trim())throw new TypeError('Nonempty key required');return id;};
const callable=(fn,label)=>{if(typeof fn!=='function')throw new TypeError(label+' must be a function');return fn;};
const addTime=(a,b)=>int(a+b,'event time');
const earlier=(a,b)=>a.at<b.at||a.at===b.at&&(a.priority<b.priority||a.priority===b.priority&&a.seq<b.seq);
export class CombatTimeline{
 #queue=[];#pending=new Set();#seq=0;#now=0;#dispatch=null;#running=false;
 get now(){return this.#now;}
 get pending(){return this.#pending.size;}
 #push(e){const q=this.#queue;q.push(e);let i=q.length-1;while(i>0){const p=(i-1)>>1;if(!earlier(q[i],q[p]))break;[q[i],q[p]]=[q[p],q[i]];i=p;}}
 #pop(){const q=this.#queue,root=q[0],tail=q.pop();if(q.length){q[0]=tail;let i=0;while(true){let j=i*2+1;if(j>=q.length)break;if(j+1<q.length&&earlier(q[j+1],q[j]))j++;if(!earlier(q[j],q[i]))break;[q[i],q[j]]=[q[j],q[i]];i=j;}}return root;}
 #prune(){while(this.#queue.length&&!this.#pending.has(this.#queue[0].seq))this.#pop();}
 schedule(at,priority,fn){
  int(at,'event time');int(priority,'priority');callable(fn,'event');
  if(at<this.#now)throw new RangeError('Cannot schedule in the past');
  if(this.#dispatch&&at===this.#now&&priority<this.#dispatch.priority)throw new RangeError('Cannot reverse same-time event priority');
  const seq=int(this.#seq+1,'event sequence');this.#seq=seq;this.#pending.add(seq);this.#push({at,priority,seq,fn});return seq;
 }
 after(delay,priority,fn){return this.schedule(addTime(this.#now,int(delay,'delay')),priority,fn);}
 cancel(ticket){const removed=this.#pending.delete(ticket);if(removed&&this.#queue.length>this.#pending.size*2+64){const live=this.#queue.filter(e=>this.#pending.has(e.seq));this.#queue=[];for(const e of live)this.#push(e);}return removed;}
 runUntil(end,{maxEvents=100000,stopWhen=()=>false}={}){
  int(end,'end time');int(maxEvents,'event limit',1);callable(stopWhen,'stop predicate');if(end<this.#now)throw new RangeError('Cannot rewind time');if(this.#running)throw new Error('Nested runUntil is not supported');
  let processed=0;this.#running=true;
  try{
   while(true){if(stopWhen())return {time:this.#now,processed,pending:this.pending,stopped:true};this.#prune();const next=this.#queue[0];if(!next||next.at>end)break;if(processed>=maxEvents)throw new Error('Event limit exceeded');const e=this.#pop();this.#pending.delete(e.seq);this.#now=e.at;this.#dispatch=e;processed++;try{e.fn({time:this.#now,timeline:this});}finally{this.#dispatch=null;}}
   this.#now=end;return {time:this.#now,processed,pending:this.pending};
  }finally{this.#running=false;}
 }
}
// Seeds are explicit, repeatable, and isolated per simulation iteration.
export function seededRandom(seed){
 if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw new RangeError('Seed must be uint32');
 let state=seed>>>0;return ()=>{state=(state+0x6D2B79F5)>>>0;let t=state;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
}
export class Cooldowns{
 #ready=new Map();
 constructor(timeline){this.timeline=timeline;}
 readyAt(id){return this.#ready.get(keyOf(id))??0;}
 remaining(id){return Math.max(0,this.readyAt(id)-this.timeline.now);}
 ready(id){return this.remaining(id)===0;}
 check(specs){
  const seen=new Set();
  for(const s of specs){keyOf(s.id);int(s.duration,'cooldown duration');addTime(this.timeline.now,s.duration);if(seen.has(s.id))throw new Error('Duplicate cooldown key');seen.add(s.id);}
  return specs.every(s=>this.ready(s.id));
 }
 start(specs){if(!this.check(specs))return false;for(const s of specs)this.#ready.set(s.id,addTime(this.timeline.now,s.duration));return true;}
 reset(id){this.#ready.delete(keyOf(id));}
}
// Resource pools and cooldowns are committed atomically at action start.
// Cast-end costs, refunds, GCD policies and generated resources belong to adapters.
export class CombatResources{
 #pools;
 constructor(timeline,pools){this.timeline=timeline;this.cooldowns=new Cooldowns(timeline);this.#pools=resourceLedger(pools,[]).pools;}
 snapshot(){return structuredClone(this.#pools);}
 change(changes){const r=resourceLedger(this.#pools,changes);if(r.ok)this.#pools=r.pools;return structuredClone(r);}
 startAction({changes=[],cooldowns=[]}={}){
  if(!this.cooldowns.check(cooldowns))return {ok:false,reason:'Cooldown'};
  const r=resourceLedger(this.#pools,changes);if(!r.ok)return structuredClone(r);
  this.cooldowns.start(cooldowns);this.#pools=r.pools;return structuredClone(r);
 }
}
// Explicit internal cooldown and probability, no automatic proc eligibility.
export function attemptProc(cooldowns,{id,chance,internalCooldownMs},random){
 keyOf(id);int(internalCooldownMs,'internal cooldown');if(!Number.isFinite(chance)||chance<0||chance>1)throw new RangeError('Proc chance must be in [0,1]');callable(random,'RNG');
 const spec=[{id,duration:internalCooldownMs}];
 if(!cooldowns.check(spec))return {triggered:false,reason:'Cooldown'};
 const roll=random();if(!Number.isFinite(roll)||roll<0||roll>=1)throw new RangeError('RNG must return [0,1)');
 if(roll>=chance)return {triggered:false,reason:'Roll',roll};
 cooldowns.start(spec);return {triggered:true,roll};
}
// Periodic effects are keyed by an explicit actor/target/ability identity.
// Refresh requires an explicit policy and a replacement snapshot (or undefined).
export class PeriodicEffects{
 #effects=new Map();
 constructor(timeline){this.timeline=timeline;}
 has(id){return this.#effects.has(keyOf(id));}
 #cancel(e){if(e.tickTicket!==null)this.timeline.cancel(e.tickTicket);if(e.expiryTicket!==null)this.timeline.cancel(e.expiryTicket);}
 remove(id){keyOf(id);const e=this.#effects.get(id);if(!e)return false;this.#cancel(e);this.#effects.delete(id);return true;}
 #public(e){return {id:e.id,appliedAt:e.appliedAt,expiresAt:e.expiresAt,nextTick:e.nextTick,tickIndex:e.tickIndex,snapshot:structuredClone(e.snapshot)};}
 get(id){const e=this.#effects.get(keyOf(id));return e?this.#public(e):null;}
 shorten(id,ms){keyOf(id);int(ms,'periodic shortening',1);const e=this.#effects.get(id);if(!e)return false;const now=this.timeline.now;e.expiresAt=Math.max(now,e.expiresAt-ms);if(e.expiryTicket!==null)this.timeline.cancel(e.expiryTicket);if(e.tickTicket!==null&&(e.nextTick>e.expiresAt||e.nextTick===e.expiresAt&&!e.tickAtExpiry)){this.timeline.cancel(e.tickTicket);e.tickTicket=null;}const expire=()=>{if(this.#effects.get(id)!==e)return;this.#effects.delete(id);e.expiryTicket=null;if(e.tickTicket!==null)this.timeline.cancel(e.tickTicket);e.onExpire({...this.#public(e),time:this.timeline.now});};if(e.expiresAt===now)expire();else e.expiryTicket=this.timeline.schedule(e.expiresAt,e.expirePriority,expire);return true;}
 apply({id,durationMs,intervalMs,refresh,tickAtExpiry,tickPriority,expirePriority,snapshot,onTick,onExpire=()=>{}}){
  keyOf(id);int(durationMs,'duration',1);int(intervalMs,'interval',1);int(tickPriority,'tick priority');int(expirePriority,'expiry priority');
  if(!['restart','preserve-next-tick'].includes(refresh))throw new Error('Explicit refresh policy required');
  if(typeof tickAtExpiry!=='boolean')throw new TypeError('Explicit expiry tick policy required');
  if(tickAtExpiry&&tickPriority>=expirePriority)throw new RangeError('Final tick must precede expiry');
  callable(onTick,'onTick');callable(onExpire,'onExpire');
  const old=this.#effects.get(id),now=this.timeline.now,expiresAt=addTime(now,durationMs);
  const nextTick=refresh==='preserve-next-tick'&&old&&old.nextTick>now?old.nextTick:addTime(now,intervalMs);
  const e={id,appliedAt:now,expiresAt,nextTick,tickIndex:0,intervalMs,tickAtExpiry,tickPriority,expirePriority,snapshot:structuredClone(snapshot),onTick,onExpire,tickTicket:null,expiryTicket:null};
  if(old)this.remove(id);this.#effects.set(id,e);
  const tickEligible=()=>e.nextTick<e.expiresAt||e.tickAtExpiry&&e.nextTick===e.expiresAt;
  const scheduleTick=()=>{
   if(!tickEligible())return;
   e.tickTicket=this.timeline.schedule(e.nextTick,e.tickPriority,()=>{
    if(this.#effects.get(id)!==e)return;
    e.tickTicket=null;e.tickIndex++;
    // Advance before callback so a refresh from its own tick preserves phase.
    e.nextTick=addTime(e.nextTick,e.intervalMs);
    e.onTick({...this.#public(e),time:this.timeline.now});
    if(this.#effects.get(id)===e)scheduleTick();
   });
  };
  scheduleTick();e.expiryTicket=this.timeline.schedule(expiresAt,expirePriority,()=>{
   if(this.#effects.get(id)!==e)return;this.#effects.delete(id);e.expiryTicket=null;if(e.tickTicket!==null)this.timeline.cancel(e.tickTicket);e.onExpire({...this.#public(e),time:this.timeline.now});
  });
  return this.get(id);
 }
}
// Periodic regeneration is an ordinary effect with explicit gain and interval;
// no hidden 2-second ticks or five-second rule assumed.
export function scheduleResourceRegen(effects,resources,{id,resource,amount,durationMs,intervalMs,priority,tickAtExpiry,refresh='restart',onTick=()=>{},amountForTick=x=>x}){
 if(typeof resource!=='string'||!Object.hasOwn(resources.snapshot(),resource))throw new Error('Unknown regeneration resource');
 if(!Number.isFinite(amount)||amount<0)throw new RangeError('Regeneration must be nonnegative');int(priority,'regen priority');callable(onTick,'regen callback');callable(amountForTick,'regen amount callback');
 return effects.apply({id,durationMs,intervalMs,refresh,tickAtExpiry,tickPriority:priority,expirePriority:int(priority+1,'regen expiry priority'),snapshot:{resource,amount},onTick:e=>{const actualAmount=amountForTick(e.snapshot.amount);if(!Number.isFinite(actualAmount)||actualAmount<0)throw new Error('Invalid adjusted regeneration');const r=resources.change([{resource:e.snapshot.resource,delta:actualAmount}]);onTick({...e,actualAmount,result:r});}});
}
