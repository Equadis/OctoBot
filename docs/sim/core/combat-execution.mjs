import {CombatTimeline,CombatResources,PeriodicEffects,seededRandom,REFERENCE_PRIORITIES as P} from './combat-timeline.mjs';
import {resourceLedger,effectiveHealing} from './combat-math.mjs';
import {CombatAuras} from './combat-auras.mjs';
import {ThreatLedger} from './combat-threat.mjs';
import {aggregateCombatAttribution} from './combat-attribution.mjs';
import {ComboPointBank} from './combat-class-state.mjs';
import {evaluatePriority} from './rotations/conditions.mjs';
// Generic execution primitives. No default spell ranks, attack tables, or class-specific actions.
export const EXECUTION_REVISION='octo-combat-execution-20261117-mvp6';
const integer=(n,label,min=0)=>{if(!Number.isSafeInteger(n)||n<min)throw new RangeError(label+' must be an integer >= '+min);return n;};
const positive=(n,label)=>{if(!Number.isFinite(n)||n<=0)throw new RangeError(label+' must be positive');return n;};
const amount=(n,label)=>{if(!Number.isFinite(n)||n<0)throw new RangeError(label+' must be nonnegative');return n;};
const key=(s)=>{if(typeof s!=='string'||!s.trim())throw new TypeError('Nonempty identifier required');return s;};
const fn=(v,label)=>{if(typeof v!=='function')throw new TypeError(label+' must be a function');return v;};
const copy=structuredClone;
export class CombatEncounter{
 #units=new Map();#actions=new Map();#rows;#primary;#player;#pet;#allies;#targets;#duration;#cadence;#context;#cast=null;#log=[];#decision=null;#finishedAt=null;#started=false;#swings=new Map();#queued=new Map();#done=false;#shields=new Map();#shieldSeq=0;#onDamage;
 constructor({durationMs,decisionIntervalMs,seed,pools,units,playerId,primaryId,targetIds,allyIds=[],petId=null,rows,actions,context=()=>({}),manageAuras=false,comboPoints=null,onDamage=()=>{}}){
  this.#duration=integer(durationMs,'duration',1);this.#cadence=integer(decisionIntervalMs,'decision interval',1);this.random=seededRandom(seed);
  this.timeline=new CombatTimeline();this.resources=new CombatResources(this.timeline,pools);this.periodic=new PeriodicEffects(this.timeline);this.#context=fn(context,'context adapter');this.#onDamage=fn(onDamage,'damage observer');
  for(const u of units){const id=key(u.id),max=positive(u.maxHealth,'max health'),health=amount(u.health??max,'health');if(health>max||this.#units.has(id))throw new Error('Invalid or duplicate unit: '+id);this.#units.set(id,{id,maxHealth:max,health});}
  const check=id=>{if(!this.#units.has(id))throw new Error('Unknown unit: '+id);return id;};
  this.#player=check(playerId);this.#primary=check(primaryId);this.#pet=petId===null?null:check(petId);
  this.#targets=targetIds.map(check);this.#allies=allyIds.map(check);
  if(!this.#targets.includes(this.#primary)||new Set(this.#targets).size!==this.#targets.length||new Set(this.#allies).size!==this.#allies.length||this.#targets.some(id=>id===this.#player||id===this.#pet||this.#allies.includes(id)))throw new Error('Invalid encounter unit roles');
  this.manageAuras=manageAuras===true;
  if(comboPoints&&Object.hasOwn(pools,'comboPoints'))throw new Error('Target-banked combo points must not share a global resource pool');
  this.comboPoints=comboPoints===null?null:new ComboPointBank({...comboPoints,validateTarget:id=>this.#targets.includes(id)});
  this.auras=new CombatAuras(this.timeline,{validateUnit:id=>this.#units.has(id),onChange:e=>{if(this.#active()){this.#record(e.type,e);this.#updateSwingHaste(e.targetId);}}});
  this.threat=new ThreatLedger(this.timeline,{enemyIds:this.#targets,actorIds:[...new Set([this.#player,...this.#allies,...(this.#pet?[this.#pet]:[])])],onChange:e=>{if(this.#active())this.#record('threat',e);}});
  for(const a of actions){
   key(a.id);key(a.name);if(this.#actions.has(a.id)||[...this.#actions.values()].some(x=>x.name===a.name))throw new Error('Duplicate action');
   if(!['instant','cast','channel','queued-melee'].includes(a.kind))throw new Error('Unsupported execution action kind: '+a.kind);
   integer(a.castMs,'cast duration',['cast','channel'].includes(a.kind)?1:0);
   if(['instant','queued-melee'].includes(a.kind)&&a.castMs!==0)throw new Error('Instant or queued action cannot have a cast duration');
   if(a.kind==='channel'){if(!Number.isSafeInteger(a.tickMs)||a.tickMs<=0||a.tickMs>a.castMs||typeof a.tickAtEnd!=='boolean'||typeof a.onTick!=='function')throw new Error('Unsupported execution action kind: channel requires explicit interval, final-tick policy and resolver');}
   if(a.kind==='queued-melee'){key(a.swingId);if(a.targets.length!==1||a.targets[0]!=='enemy')throw new Error('Queued melee requires enemy target');}
   if(!Array.isArray(a.costs)||!Array.isArray(a.cooldowns)||!Array.isArray(a.targets)||!a.targets.length||a.targets.some(x=>!['enemy','ally','self','pet'].includes(x)))throw new Error('Explicit action costs, cooldowns and targets required');
   for(const c of a.costs){key(c.resource);if(!Number.isFinite(c.delta)||c.delta>0)throw new Error('Start costs must be nonpositive');}if(a.costsWhenAuraActive){key(a.costsWhenAuraActive.id);if(!Array.isArray(a.costsWhenAuraActive.costs))throw new Error('Explicit alternate costs required');for(const c of a.costsWhenAuraActive.costs){key(c.resource);if(!Number.isFinite(c.delta)||c.delta>0)throw new Error('Start costs must be nonpositive');}resourceLedger(this.resources.snapshot(),a.costsWhenAuraActive.costs);}
   if(a.onChannelStart!==undefined||a.onChannelEnd!==undefined){if(a.kind!=='channel')throw new Error('Channel lifecycle requires channel action');fn(a.onChannelStart,'channel start hook');fn(a.onChannelEnd,'channel end hook');}
   if(a.resetCooldownOnTargetDeath!==undefined&&(a.kind!=='channel'||typeof a.resetCooldownOnTargetDeath!=='boolean'))throw new Error('Invalid channel death cooldown policy');
   if(a.tickCosts!==undefined){if(a.kind!=='channel'||!Array.isArray(a.tickCosts))throw new Error('Tick costs require channel');for(const c of a.tickCosts){key(c.resource);if(!Number.isFinite(c.delta)||c.delta>0)throw new Error('Tick costs must be nonpositive');}resourceLedger(this.resources.snapshot(),a.tickCosts);}
   if(a.deathReward){const p=a.deathReward;if(a.kind!=='channel'||!Array.isArray(p.eligibleTargets)||p.eligibleTargets.some(id=>!this.#targets.includes(id))||typeof p.requiresDamage!=='boolean')throw new Error('Invalid channel death reward');key(p.resource);positive(p.amount,'channel death reward');resourceLedger(this.resources.snapshot(),[{resource:p.resource,delta:p.amount}]);}
   this.resources.cooldowns.check(a.cooldowns);resourceLedger(this.resources.snapshot(),a.costs);
   if(a.kind!=='channel'||a.resolve!==undefined)fn(a.resolve,'action resolver');if(a.available!==undefined)fn(a.available,'availability predicate');if(a.availableForTarget!==undefined)fn(a.availableForTarget,'target availability predicate');this.#actions.set(a.id,{...a,costs:copy(a.costs),cooldowns:copy(a.cooldowns),targets:[...a.targets]});
  }
  if(!Array.isArray(rows)||!rows.length)throw new Error('Explicit rotation rows required');
  this.#rows=copy(rows);
  for(const r of rows){const a=this.#action(r.abilityId||r.ability);if(!a||a.name!==r.ability)throw new Error('Unsupported rotation ability: '+r.ability);if(!Array.isArray(r.conditions)||!['primary','cycle','ally','self','pet'].includes(r.target??'primary'))throw new Error('Invalid rotation row');}
 }
 #action(id){return this.#actions.get(id)||[...this.#actions.values()].find(a=>a.name===id);}
  #effectiveAction(a){if(a.castTimeFactorStat&&a.kind==='cast'){const factor=positive(this.auras.stat(this.#player,a.castTimeFactorStat,1),'dynamic cast duration factor');a={...a,castMs:Math.max(1,Math.round(a.castMs*factor))};}if(a.costsWhenAuraActive&&this.auras.active(this.#player,'buff').some(x=>x.id===a.costsWhenAuraActive.id&&x.ownerId===this.#player))a={...a,costs:a.costsWhenAuraActive.costs,arcaneRuptureActive:a.costsWhenAuraActive.id==='mage:arcane-rupture'};if(!a.castProc)return a;const p=a.castProc,buff=this.auras.active(this.#player,'buff').find(x=>x.id===p.id&&x.ownerId===this.#player);if(!buff)return a;if(!['instant','cast'].includes(a.kind))throw new Error('Cast proc cannot modify queued or channeled action');const castMs=p.instant?0:Math.max(0,a.castMs-p.castReductionMsPerStack*buff.stacks);return {...a,kind:castMs===0?'instant':'cast',castMs,costs:a.costs.map(c=>c.resource==='mana'?{...c,delta:c.delta*p.manaCostFactor}:c),procAura:buff,guaranteeHit:p.guaranteeHit};}
 unit(id){const u=this.#units.get(id);if(!u)throw new Error('Unknown unit: '+id);return {...u,alive:u.health>0,healthPercent:u.health/u.maxHealth*100};}
 #alive(id){return this.#units.get(id).health>0;}
 #record(type,details){this.#log.push({time:this.timeline.now,type,...details});}
 recordMechanic(type,details){if(!['attack-result','proc','resource-change','combo-change','action-ineligible','class-state-change','cooldown-reset','poison-charge','companion-action','companion-threat','utility-threat'].includes(type)||!details||typeof details!=='object'||Object.hasOwn(details,'type')||Object.hasOwn(details,'time'))throw new Error('Invalid mechanic event');if(this.#active())this.#record(type,copy(details));}
 #active(){return this.#finishedAt===null&&this.#alive(this.#player)&&this.#targets.some(id=>this.#alive(id));}
 absorbRemaining(id,targetId,actorId){const s=this.#shields.get(JSON.stringify([actorId,targetId,id]));return s&&s.expiresAt>this.timeline.now?s.remaining:0;}
 applyAbsorb({id,targetId,actorId,source,amount:capacity,durationMs,schools=null,refresh='replace',fraction=1,capacityCap=null}){
  key(id);key(source);if(!this.#units.has(targetId)||!this.#units.has(actorId))throw new Error('Unknown absorb unit');positive(capacity,'absorb capacity');integer(durationMs,'absorb duration',1);if(!Number.isFinite(fraction)||fraction<=0||fraction>1||!['replace','keep-stronger','add-capped'].includes(refresh)||refresh==='add-capped'&&(!Number.isFinite(capacityCap)||capacityCap<=0)||schools!==null&&(!Array.isArray(schools)||!schools.length||schools.some(s=>typeof s!=='string'||!s)))throw new Error('Invalid absorb policy');
  const k=JSON.stringify([actorId,targetId,id]),old=this.#shields.get(k);if(old&&old.expiresAt>this.timeline.now&&refresh==='keep-stronger'&&old.remaining>=capacity)return false;
  if(refresh==='add-capped')capacity=Math.min(capacityCap,capacity+(old&&old.expiresAt>this.timeline.now?old.remaining:0));if(old)this.timeline.cancel(old.ticket);const shield={id,targetId,actorId,source,remaining:capacity,fraction,expiresAt:this.timeline.now+durationMs,schools:schools===null?null:[...schools],order:++this.#shieldSeq,ticket:null};
  shield.ticket=this.timeline.schedule(shield.expiresAt,P.expire,()=>{if(this.#shields.get(k)===shield){this.#shields.delete(k);if(this.#active())this.#record('absorb-expire',{id,actorId,targetId,source,remaining:shield.remaining});}});this.#shields.set(k,shield);this.#record('absorb-apply',{id,targetId,actorId,source,capacity,durationMs,replaced:old?.remaining??0});return true;
 }
 #absorb(targetId,school,value){let remaining=value;const shields=[...this.#shields.entries()].filter(([k,s])=>s.targetId===targetId&&s.expiresAt>this.timeline.now&&(!s.schools||s.schools.includes(school))).sort((a,b)=>a[1].order-b[1].order);for(const [k,s] of shields){if(remaining<=0)break;const used=Math.min(remaining*s.fraction,s.remaining);if(used<=0)continue;s.remaining-=used;remaining-=used;this.#record('absorb',{id:s.id,targetId,actorId:s.actorId,source:s.source,school,amount:used,remaining:s.remaining});if(s.remaining===0){this.timeline.cancel(s.ticket);this.#shields.delete(k);}}return value-remaining;}
 spendHealth({actorId,amount:value,source}){key(source);amount(value,'health cost');const u=this.#units.get(actorId);if(!u)throw new Error('Unknown health cost actor');if(u.health<=value||!this.#active())return false;u.health-=value;this.#record('health-spend',{actorId,source,amount:value,remaining:u.health});return true;}
 #recordCosts(a,targetId){for(const c of a.costs)if(c.delta!==0)this.#record('resource-change',{actorId:this.#player,targetId,source:a.name,resource:c.resource,delta:c.delta,overflow:0});}
 #checkFinish(){if(this.#finishedAt===null&&!this.#active()){this.#finishedAt=this.timeline.now;this.interrupt('encounter ended');this.#queued.clear();}}
 damage({targetId,value,source,actorId=null,threat=null,school=null,leech=null}){key(source);if(actorId!==null&&!this.#units.has(actorId))throw new Error('Unknown damage actor');amount(value,'damage');if(leech!==null){if(actorId===null||this.#targets.includes(actorId)||!['effective','post-mitigation'].includes(leech.basis))throw new Error('Invalid leech policy');amount(leech.fraction,'leech fraction');}const u=this.#units.get(targetId);if(!u)throw new Error('Unknown damage target');if(!this.#active()||u.health<=0)return {effective:0,overkill:0,ignored:true};const absorbed=this.#absorb(targetId,school,value),remaining=value-absorbed,effective=Math.min(remaining,u.health);let generatedThreat=null;if(threat){if(!this.#targets.includes(targetId))throw new Error('Damage threat requires enemy target');if(actorId!==null&&threat.actorId!==actorId)throw new Error('Damage and threat actor mismatch');generatedThreat=this.threat.apply({...threat,enemyIds:[targetId],effective,distribution:'each'}).reduce((n,x)=>n+x.value,0);}const channel=this.#cast?.action.kind==='channel'&&this.#cast.targetId===targetId?this.#cast:null;if(channel&&actorId===this.#player&&source===channel.action.name&&effective>0)channel.dealtDamage=true;u.health-=effective;this.#record('damage',{targetId,source,actorId,raw:value,effective,overkill:remaining-effective,...(absorbed?{absorbed}:{}),generatedThreat});if(leech&&this.#alive(actorId)){const a=this.#units.get(actorId),r=this.#healingResult(actorId,(leech.basis==='effective'?effective:value)*leech.fraction);a.health+=r.effective;this.#record('heal',{targetId:actorId,actorId,source:source+' (leech)',...r,generatedThreat:null});}if(channel&&u.health<=0){if(channel.action.resetCooldownOnTargetDeath){const id=channel.action.id,remainingMs=this.resources.cooldowns.remaining(id);this.resources.cooldowns.reset(id);this.#record('cooldown-reset',{actorId:this.#player,targetId,source:channel.action.name,abilityId:id,remainingMs});}const p=channel.action.deathReward;if(p&&p.eligibleTargets.includes(targetId)&&(!p.requiresDamage||channel.dealtDamage)){const before=this.resources.snapshot()[p.resource].current;const gained=this.resources.change([{resource:p.resource,delta:p.amount}]);if(!gained.ok)throw new Error('Channel death reward failed');const actual=this.resources.snapshot()[p.resource].current-before;this.#record('resource-change',{actorId:this.#player,targetId,source:channel.action.name+' (death reward)',resource:p.resource,delta:actual,overflow:p.amount-actual});}this.interrupt('target died');}this.#onDamage(this,{targetId,source,actorId,raw:value,effective,overkill:remaining-effective,school});this.#checkFinish();return {effective,overkill:remaining-effective,...(absorbed?{absorbed}:{})};}
 #healingResult(targetId,raw){const u=this.#units.get(targetId);const reduction=Math.min(100,Math.max(0,...this.auras.active(targetId,'debuff').map(a=>a.modifiers.filter(m=>m.stat==='healingReceivedReductionPct'&&m.mode==='flat').reduce((n,m)=>n+m.value*a.stacks,0))));const adjusted=raw*(1-reduction/100);return {...effectiveHealing(adjusted,u.maxHealth-u.health),...(reduction>0?{beforeReduction:raw,healingPrevented:raw-adjusted}:{})};}
 heal({targetId,value,source,actorId=null,threat=null}){key(source);if(actorId!==null&&!this.#units.has(actorId))throw new Error('Unknown healing actor');amount(value,'healing');const u=this.#units.get(targetId);if(!u)throw new Error('Unknown healing target');if(!this.#active()||u.health<=0)return {effective:0,overheal:0,ignored:true};const r=this.#healingResult(targetId,value);let generatedThreat=null;if(threat){if(actorId!==null&&threat.actorId!==actorId)throw new Error('Healing and threat actor mismatch');if(this.#targets.includes(targetId))throw new Error('Healing threat requires friendly target');if(threat.enemyIds?.some(id=>!this.#targets.includes(id)||!this.#alive(id)))throw new Error('Healing threat requires living enemy targets');generatedThreat=this.threat.apply({...threat,effective:r.effective}).reduce((n,x)=>n+x.value,0);}u.health+=r.effective;this.#record('heal',{targetId,source,actorId,...r,generatedThreat});return r;}
 interrupt(reason='interrupted'){if(!this.#cast)return false;const c=this.#cast;this.#cast=null;for(const ticket of c.tickets||[c.ticket])this.timeline.cancel(ticket);c.action.onChannelEnd?.(this,c.targetId,reason);this.#record(c.action.kind==='channel'?'channel-interrupted':'cast-interrupted',{ability:c.action.name,targetId:c.targetId,reason});if(this.#active()&&this.timeline.now<this.#duration)this.#scheduleDecision(this.timeline.now+this.#cadence);return true;}
 #role(id){return id===this.#player?'self':id===this.#pet?'pet':this.#targets.includes(id)?'enemy':this.#allies.includes(id)?'ally':null;}
 #allows(a,id){return id!=null&&this.#alive(id)&&a.targets.includes(this.#role(id));}
 #state(){
  const primary=this.#alive(this.#primary)?this.#primary:this.#targets.find(id=>this.#alive(id));
  const pool=this.resources.snapshot();const resources=Object.fromEntries(Object.entries(pool).map(([k,v])=>[k,v.current]));if(pool.mana&&pool.mana.max>0)resources.manaPercent=pool.mana.current/pool.mana.max*100;
  if(this.comboPoints)resources.comboPoints=this.comboPoints.points(primary);
  const cooldowns={},actions={},targetFrame=id=>{const u=this.unit(id);return {id,targetId:id,targetHealth:u.healthPercent,allyHealth:u.healthPercent,...(this.comboPoints&&this.#targets.includes(id)?{resources:{...resources,comboPoints:this.comboPoints.points(id)}}:{})};};
  const aliveTargets=this.#targets.filter(id=>this.#alive(id)),aliveAllies=this.#allies.filter(id=>this.#alive(id));
  const base={resources,targetId:primary,targetHealth:this.unit(primary).healthPercent,targetCount:aliveTargets.length,healthPercent:this.unit(this.#player).healthPercent,combatTime:this.timeline.now/1000,casting:this.#cast?.action.kind==='cast',channeling:this.#cast?.action.kind==='channel',targets:aliveTargets.map(targetFrame),allies:aliveAllies.map(targetFrame),self:targetFrame(this.#player),...(this.#pet&&this.#alive(this.#pet)?{pet:targetFrame(this.#pet),petAlive:true}:this.#pet?{petAlive:false}:{}),cooldowns,actions};
  // Adapter may supply only missing mechanics (auras, reach, known ranks, etc.).
  // Built-in resource and health values cannot be overwritten.
  const extra=this.#context(this);const state={...extra,...base};
  if(extra?.targets)state.targets=base.targets.map(t=>({...extra.targets.find(x=>x.id===t.id),...t}));
  if(extra?.allies)state.allies=base.allies.map(t=>({...extra.allies.find(x=>x.id===t.id),...t}));
  if(this.manageAuras){const buffs=this.auras.frame(this.#player,'buff',null);state.buffs=buffs;state.selfBuffs=buffs;const debuffsFor=id=>({debuffs:this.auras.frame(id,'debuff',null),ownDebuffs:this.auras.frame(id,'debuff',this.#player)});Object.assign(state,debuffsFor(primary));state.targets=state.targets.map(t=>({...t,...debuffsFor(t.id)}));}
  for(const original of this.#actions.values()){
   const a=this.#effectiveAction(original);const remaining=Math.max(0,...a.cooldowns.map(c=>this.resources.cooldowns.remaining(c.id)),...(a.requiresGcdReady?[this.resources.cooldowns.remaining('gcd')]:[]))/1000;
   const available=resourceLedger(pool,a.costs).ok&&(a.kind!=='queued-melee'||this.#swings.has(a.swingId)&&!this.#queued.has(a.swingId))&&(!a.available||a.available(this,state)===true);
   cooldowns[a.name]=remaining;cooldowns[a.id]=remaining;actions[a.id]=actions[a.name]={kind:a.kind,ready:remaining===0,available};
  }
  return state;
 }
 #scheduleDecision(at){if(at>this.#duration||!this.#active())return;if(this.#decision&&this.#decision.at<=at)return;if(this.#decision)this.timeline.cancel(this.#decision.ticket);const ticket=this.timeline.schedule(at,P.decision,()=>{this.#decision=null;this.#decide();});this.#decision={at,ticket};}
 #decide(){
  if(!this.#active()||this.#cast||this.timeline.now>=this.#duration)return;
  const state=this.#state();
  // Evaluate per row and eligible target, preserving priority, with unsupported
  // conditions on otherwise eligible rows throwing rather than defaulting.
  let chosen=null;
  for(const row of this.#rows){
   const a=this.#action(row.abilityId||row.ability),action=state.actions[a.id];if(!action.ready||!action.available)continue;
   const type=row.target??'primary';let frame=type==='cycle'?state.targets:type==='ally'?state.allies:type==='self'?[state.self]:type==='pet'?(state.pet?[state.pet]:[]):[{id:state.targetId}];
   frame=frame.filter(x=>this.#allows(a,x.id)&&(!a.availableForTarget||a.availableForTarget(this,x.id,{...state,...x})===true));if(!frame.length)continue;
   // Existing evaluator receives target-specific frames; primary row stays primary.
   const context={...state,...(type==='cycle'?{targets:frame}:type==='ally'?{allies:frame}:type==='self'?{self:frame[0]}:type==='pet'?{pet:frame[0]}:{targetId:frame[0].id})};
   const result=evaluatePriority([row],context);if(result){chosen={a,targetId:result.targetId,state};break;}
  }
  if(!chosen){this.#scheduleDecision(this.timeline.now+this.#cadence);return;}
  const {targetId}=chosen,a=this.#effectiveAction(chosen.a);
  if(a.kind==='queued-melee'){
   this.#queued.set(a.swingId,{action:a,targetId});this.#record('attack-queued',{ability:a.name,targetId,swingId:a.swingId});this.#scheduleDecision(this.timeline.now+this.#cadence);return;
  }
  const started=this.resources.startAction({changes:a.costs,cooldowns:a.cooldowns});if(!started.ok)throw new Error('Action availability changed during decision');
  this.#record('action-start',{ability:a.name,targetId,castMs:a.castMs});this.#recordCosts(a,targetId);if(a.procAura)this.auras.remove(a.procAura,'consumed');
  if(a.kind==='instant'){a.resolve(this,targetId,{guaranteeHit:a.guaranteeHit===true});this.#scheduleDecision(this.timeline.now+this.#cadence);return;}
  const completeAt=this.timeline.now+a.castMs;
  if(a.kind==='channel'){
   const c={action:a,targetId,completeAt,tickets:[]};this.#cast=c;a.onChannelStart?.(this,targetId);
   // Same-priority insertion order makes any exact-end tick precede completion.
   for(let offset=a.tickMs;offset<a.castMs||(a.tickAtEnd&&offset===a.castMs);offset+=a.tickMs){
    const tickIndex=offset/a.tickMs;
    c.tickets.push(this.timeline.after(offset,P.cast,()=>{
     if(this.#cast!==c)return;
     if(!this.#active()||!this.#allows(a,targetId)){this.interrupt('target unavailable');return;}
     if(a.tickCosts?.length){const paid=this.resources.change(a.tickCosts);if(!paid.ok){this.interrupt('insufficient channel resource');return;}for(const c of a.tickCosts)if(c.delta)this.#record('resource-change',{actorId:this.#player,targetId,source:a.name,resource:c.resource,delta:c.delta,overflow:0});}
     this.#record('channel-tick',{ability:a.name,targetId,tickIndex});a.onTick(this,targetId,tickIndex,{arcaneRuptureActive:a.arcaneRuptureActive===true});
    }));
   }
   c.tickets.push(this.timeline.schedule(completeAt,P.cast,()=>{
    if(this.#cast!==c)return;this.#cast=null;a.onChannelEnd?.(this,targetId,'complete');
    if(this.#active()&&this.#allows(a,targetId)){this.#record('channel-complete',{ability:a.name,targetId});a.resolve?.(this,targetId);}
    else this.#record('channel-failed',{ability:a.name,targetId,reason:'target unavailable'});
    this.#scheduleDecision(this.timeline.now);
   }));return;
  }
  const ticket=this.timeline.schedule(completeAt,P.cast,()=>{
   this.#cast=null;
   if(this.#active()&&this.#allows(a,targetId)){this.#record('cast-complete',{ability:a.name,targetId});a.resolve(this,targetId,{guaranteeHit:a.guaranteeHit===true});}else this.#record('cast-failed',{ability:a.name,targetId,reason:'target unavailable'});
   this.#scheduleDecision(this.timeline.now);
  });this.#cast={ticket,action:a,targetId,completeAt};
 }
 addAutoAttack({id,intervalMs,firstAtMs,castPolicy,resolve,actorId=null,hasteStat=null,hastePolicy=null}){
  if(this.#started)throw new Error('Configure auto-attacks before run');key(id);integer(intervalMs,'auto interval',1);integer(firstAtMs,'first auto');fn(resolve,'auto resolver');if(!['continue','skip-during-cast'].includes(castPolicy)||this.#swings.has(id))throw new Error('Invalid auto policy or duplicate hand');
  if(hasteStat!==null){key(hasteStat);if(!this.#units.has(actorId)||!['preserve-progress','reset','next-swing'].includes(hastePolicy))throw new Error('Explicit dynamic haste policy required');}
  const s={id,intervalMs,baseIntervalMs:intervalMs,actorId,hasteStat,hastePolicy,nextAt:firstAtMs,lastAt:null,castPolicy,resolve,ticket:null,firing:false};this.#swings.set(id,s);this.#scheduleSwing(s);
 }
 #updateSwingHaste(actorId){for(const s of this.#swings.values()){if(s.actorId!==actorId||s.hasteStat===null)continue;const haste=this.auras.stat(actorId,s.hasteStat,1);positive(haste,'dynamic haste factor');const ms=Math.max(1,Math.round(s.baseIntervalMs/haste));if(ms!==s.intervalMs)this.setSwingInterval(s.id,ms,s.hastePolicy);}}
 #scheduleSwing(s){
  if(s.nextAt>this.#duration||!this.#active())return;
  s.ticket=this.timeline.schedule(s.nextAt,P.tick,()=>{
   s.ticket=null;if(!this.#active())return;
   const targetId=this.#alive(this.#primary)?this.#primary:this.#targets.find(x=>this.#alive(x));
   s.firing=true;try{
    if(!this.#cast||s.castPolicy==='continue'){
     s.lastAt=this.timeline.now;const queued=this.#queued.get(s.id);this.#queued.delete(s.id);
     let replaced=false;
     if(queued){
      const a=queued.action;
      // Cost and cooldown belong to the swing, not the reservation. No
      // retargeting and no automatic refunds; failed queues fall back to white.
      if(queued.targetId===targetId&&this.#allows(a,targetId)&&(!a.available||a.available(this,this.#state())===true)&&(!a.availableForTarget||a.availableForTarget(this,targetId,this.#state())===true)){
       const paid=this.resources.startAction({changes:a.costs,cooldowns:a.cooldowns});
       if(paid.ok){replaced=true;this.#record('queued-attack',{ability:a.name,targetId,swingId:s.id});this.#recordCosts(a,targetId);a.resolve(this,targetId);}
      }
      if(!replaced)this.#record('queued-attack-failed',{ability:a.name,targetId:queued.targetId,swingId:s.id});
     }
     if(!replaced){this.#record('auto-attack',{id:s.id,targetId});s.resolve(this,targetId);}
    }else this.#record('auto-skipped',{id:s.id,targetId,reason:'casting'});
   }finally{s.firing=false;}
   s.nextAt=this.timeline.now+s.intervalMs;this.#scheduleSwing(s);
  });
 }
 // Explicit haste/reset policies. Fractional progress, ceiling to ms, and
 // already-due swings remaining due are chosen reference conventions.
 setSwingInterval(id,intervalMs,policy){
  integer(intervalMs,'auto interval',1);const s=this.#swings.get(key(id));if(!s)throw new Error('Unknown swing');
  if(!['preserve-progress','reset','next-swing'].includes(policy))throw new Error('Explicit swing timing policy required');
  const old=s.intervalMs;s.intervalMs=intervalMs;
  if(s.firing||policy==='next-swing'||s.nextAt<=this.timeline.now)return this.swing(id);
  const remaining=s.nextAt-this.timeline.now;
  s.nextAt=this.timeline.now+(policy==='reset'?intervalMs:Math.ceil(remaining*intervalMs/old));
  if(s.ticket!==null)this.timeline.cancel(s.ticket);s.ticket=null;this.#scheduleSwing(s);return this.swing(id);
 }
 cancelQueuedAttack(id){key(id);const q=this.#queued.get(id);if(!q)return false;this.#queued.delete(id);this.#record('queue-cancelled',{ability:q.action.name,targetId:q.targetId,swingId:id});return true;}
 swing(id){const s=this.#swings.get(id);return s?{nextAt:s.nextAt,lastAt:s.lastAt}:null;}
 run({maxEvents=100000}={}){
  if(this.#started)throw new Error('Encounter instances are single-use');for(const a of this.#actions.values())if(a.kind==='queued-melee'&&!this.#swings.has(a.swingId))throw new Error('Queued action requires configured swing: '+a.swingId);this.#started=true;this.#checkFinish();this.#scheduleDecision(0);
  this.timeline.runUntil(this.#duration,{maxEvents,stopWhen:()=>this.#finishedAt!==null});if(this.#cast)this.interrupt('time limit');this.#done=true;
  const durationMs=this.#finishedAt??this.#duration;const totals={damage:0,overkill:0,healing:0,overheal:0,enemyDamage:0,allyHealing:0};
  for(const e of this.#log){if(e.type==='damage'){totals.damage+=e.effective;totals.overkill+=e.overkill;if(this.#targets.includes(e.targetId))totals.enemyDamage+=e.effective;}if(e.type==='heal'){totals.healing+=e.effective;totals.overheal+=e.overheal;if(!this.#targets.includes(e.targetId))totals.allyHealing+=e.effective;}}
  return {revision:EXECUTION_REVISION,durationMs,finished:this.#finishedAt!==null,units:[...this.#units.keys()].map(id=>this.unit(id)),resources:this.resources.snapshot(),...(this.comboPoints?{comboPoints:this.comboPoints.snapshot()}:{}),totals,attribution:aggregateCombatAttribution(this.#log,{unitIds:[...this.#units.keys()],targetIds:this.#targets}),events:copy(this.#log),auras:this.auras.uptime(durationMs),threat:this.threat.snapshot(),engineValidated:false};
 }
}
