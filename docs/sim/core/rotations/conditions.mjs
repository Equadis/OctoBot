// Numeric predicates retain the legacy {metric,operator,value,aura} wire format.
// "aura" is the named subject for advanced predicates, not executable source.
const metric=(label,kind='number',subject=null)=>({label,kind,subject});
export const CONDITION_DEFINITIONS=Object.freeze({
 rage:metric('Rage'),energy:metric('Energy'),comboPoints:metric('Combo Points'),mana:metric('Mana'),manaPercent:metric('Mana %'),petFocus:metric('Pet Focus'),soulShards:metric('Soul Shards'),
 predictedRage:metric('Predicted Rage'),predictedEnergy:metric('Predicted Energy'),predictedMana:metric('Predicted Mana'),healthPercent:metric('Player Health %'),snapshotUpgrade:metric('Snapshot Upgrade','boolean','ability'),safePowershift:metric('Favourable Powershift Window','boolean'),lowestAllyHealth:metric('Lowest Ally Health %'),petHealthSafe:metric('Pet Health Safe','boolean'),healingSupport:metric('External Healing Support','boolean'),threatSafe:metric('Threat Safe','boolean'),buffLastsThroughCast:metric('Buff Lasts Through Cast','boolean','ability'),autoShotActive:metric('Auto Shot Active','boolean'),meleeAutoActive:metric('Melee Auto Attack Active','boolean'),allyLevel:metric('Ally Level'),
 selfBuffActive:metric('Player Buff Active','boolean','aura'),selfBuffRemaining:metric('Player Buff Remaining (s)','number','aura'),ownDebuffRemaining:metric('Owned Debuff Remaining (s)','number','aura'),
 targetHealth:metric('Target Health %'),auraDuration:metric('Aura Duration (s)','number','aura'),combatTime:metric('Combat Time (s)'),
 buffActive:metric('Buff Active','boolean','aura'),buffRemaining:metric('Buff Remaining (s)','number','aura'),buffStacks:metric('Buff Stacks','number','aura'),
 debuffActive:metric('Debuff Active','boolean','aura'),debuffRemaining:metric('Debuff Remaining (s)','number','aura'),debuffStacks:metric('Debuff Stacks','number','aura'),procActive:metric('Proc Available','boolean','proc'),
 cooldownReady:metric('Ability Ready','boolean','ability'),cooldownRemaining:metric('Ability Cooldown (s)','number','ability'),sharedCooldownReady:metric('Shared Cooldown Ready','boolean','cooldown group'),burstWindow:metric('Burst Window','boolean'),
 targetTimeToDie:metric('Target Time to Die (s)'),targetCount:metric('Target Count'),targetImmune:metric('Target Immune','boolean','school or mechanic'),targetType:metric('Target Type','boolean','creature type'),
 positionBehind:metric('Behind Target','boolean'),inMelee:metric('In Melee Range','boolean'),inRange:metric('In Ability Range','boolean','ability'),stanceIs:metric('Stance','boolean','stance'),formIs:metric('Form','boolean','form'),
 casting:metric('Casting','boolean'),channeling:metric('Channeling','boolean'),channelSafe:metric('Safe to Interrupt Channel','boolean'),channelTickSafe:metric('Channel Tick Boundary','boolean'),
 nextSwingIn:metric('Next Melee Swing (s)'),timeSinceSwing:metric('Since Melee Swing (s)'),safeSwingWindow:metric('Safe Melee Cast Window','boolean','ability'),safeRangedWindow:metric('Safe Auto Shot Window','boolean','ability'),weaponIs:metric('Weapon Category','boolean','weapon'),weaponSpeed:metric('Weapon Speed (s)'),
 petAlive:metric('Pet Alive','boolean'),petEngaged:metric('Pet Engaged','boolean'),petInRange:metric('Pet In Range','boolean'),
 talentRank:metric('Talent Rank','number','talent'),setBonus:metric('Set Bonus Active','boolean','set bonus'),classOption:metric('Class Option Matches','boolean','option=value'),abilityKnown:metric('Ability Learned','boolean','ability'),abilityRank:metric('Ability Rank','number','ability'),
 injuredAllies:metric('Injured Allies'),allyHealth:metric('Ally Health %'),incomingDamage:metric('Incoming Damage'),healDeficit:metric('Healing Deficit'),gcdReady:metric('Global Cooldown Ready','boolean'),
});
export const CONDITION_OPERATORS=Object.freeze(['>=','<=','>','<','=']);
export class UnsupportedRotationState extends Error{}
const fail=name=>{throw new UnsupportedRotationState(`Rotation state unavailable: ${name}`);};
const need=(value,name)=>value===undefined||value===null?fail(name):value;
const named=(map,name,label,absent)=>{need(map,label);return Object.hasOwn(map,name)?map[name]:absent===undefined?fail(`${label}: ${name}`):absent;};
function auraValue(map,name,field){const entry=named(map,name,'aura tracker',{});return entry[field]??0;}
export function conditionValue(condition,context){
 const {metric:m,aura:name=''}=condition;
 if(!CONDITION_DEFINITIONS[m])return fail(m);
 if(['rage','energy','comboPoints','mana','manaPercent','petFocus','soulShards'].includes(m))return need(context.resources?.[m],m);
 if(m.startsWith('predicted'))return need(context.predictedResources?.[m.slice(9).toLowerCase()],m);
 if(m==='selfBuffActive'||m==='selfBuffRemaining'){const remaining=auraValue(context.selfBuffs,name,'remaining');return m==='selfBuffActive'?Number(remaining>0):remaining;}
 if(m==='ownDebuffRemaining'){const entry=named(context.debuffs,name,'owned debuff tracker',{});if(!entry.owner&&entry.remaining>0)return fail('debuff ownership');return entry.owner==='player'?entry.remaining:0;}
 if(m==='auraDuration'){need(context.auras,'legacy aura tracker');return auraValue(context.auras,name,'remaining');}
 if(/^(buff|debuff)(Active|Remaining|Stacks)$/.test(m)){const map=context[m.startsWith('debuff')?'debuffs':'buffs'];return m.endsWith('Active')?Number(auraValue(map,name,'remaining')>0):auraValue(map,name,m.endsWith('Stacks')?'stacks':'remaining');}
 if(m==='procActive')return Number(named(context.procs,name,'proc tracker',false));
 if(m==='cooldownReady'||m==='cooldownRemaining'){const state=need(named(context.cooldowns,name,'ability cooldowns'),'cooldown');const remaining=typeof state==='number'?state:need(state.remaining,'remaining cooldown');return m==='cooldownReady'?Number(remaining<=0):remaining;}
 if(m==='sharedCooldownReady')return Number(named(context.sharedCooldowns,name,'shared cooldowns')<=0);
 if(m==='stanceIs'||m==='formIs')return Number(need(context[m==='stanceIs'?'stance':'form'],m)===name);
 if(m==='weaponIs')return Number(need(context.weaponCategories,'weapon categories').includes(name));
 if(m==='targetType')return Number(need(context.creatureType,'creature type')===name);
 if(m==='targetImmune')return Number(need(context.immunities,'target immunities').includes(name));
 if(m==='inRange')return Number(named(context.ranges,name,'ability range'));
 if(m==='talentRank')return named(context.talents,name,'talents',0);
 if(m==='setBonus')return Number(named(context.setBonuses,name,'set bonuses',false));
 if(m==='classOption'){const at=name.indexOf('=');if(at<1)return fail('class option expression');return Number(String(named(context.classOptions,name.slice(0,at),'class options'))===name.slice(at+1));}
 if(m==='abilityKnown'||m==='abilityRank'){const rank=named(context.knownAbilities,name,'learned abilities',0);return m==='abilityKnown'?Number(rank>0):rank;}
 if(m==='buffLastsThroughCast'){const window=named(context.castBuffWindows,name,'empowerment cast windows');return Number(need(window.remaining,'buff duration')>=need(window.castTime,'cast duration')+need(context.latencySeconds,'latency'));}
 if(m==='snapshotUpgrade')return Number(named(context.snapshotUpgrades,name,'verified snapshot policy'));
 if(m==='safeSwingWindow'||m==='safeRangedWindow'){
  const timer=need(context[m==='safeSwingWindow'?'meleeSwing':'rangedSwing'],'swing timer');
  if(named(context.castWindowPolicies,name,'verified swing-reset/clip policies')!=='verified-safe')return fail(`swing policy: ${name}`);
  const cast=named(context.castTimes,name,'cast times');return Number(cast+need(context.latencySeconds,'latency')<need(timer.nextIn,'next swing')&&need(timer.sinceLast,'last swing')>=0);
 }
 if(m==='nextSwingIn')return need(context.meleeSwing?.nextIn,m);
 if(m==='timeSinceSwing')return need(context.meleeSwing?.sinceLast,m);
 const value=need(context[m],m);return CONDITION_DEFINITIONS[m].kind==='boolean'?Number(value):value;
}
export function evaluateCondition(condition,context){
 const actual=conditionValue(condition,context);if(!Number.isFinite(actual))return fail(condition.metric);
 return ({'>=':()=>actual>=condition.value,'<=':()=>actual<=condition.value,'>':()=>actual>condition.value,'<':()=>actual<condition.value,'=':()=>actual===condition.value})[condition.operator]?.()??fail('operator');
}
/** Chooses an action, never executes combat or guesses GCD/resource semantics. */
export function evaluatePriority(rows,context){
 const prepared=rows.flatMap(row=>{
  for(const c of row.conditions)if(!CONDITION_DEFINITIONS[c.metric])return fail(c.metric);
  const frames=row.target==='cycle'?need(context.targets,'cycle targets'):row.target==='ally'?need(context.allies,'healing targets'):row.target==='self'?[need(context.self,'self target')]:row.target==='pet'?[need(context.pet,'pet target')]:[{}];
  if(!Array.isArray(frames))return fail('target collection');
  return frames.map(frame=>{const state={...context,...frame};const action=named(context.actions,row.abilityId||row.ability,'action adapter');
   if(!['instant','cast','channel','queued-melee','ranged-auto','pet','cooldown','form-transition','command'].includes(action.kind))return fail('action kind');
   if(typeof action.ready!=='boolean'||typeof action.available!=='boolean')return fail('action availability');
   const conditions=row.conditions.map(c=>evaluateCondition(c,state));
   return {row,targetId:frame.id??context.targetId,kind:action.kind,valid:action.ready&&action.available&&conditions.every(Boolean)};
  });
 });
 const match=prepared.find(row=>row.valid);return match?{row:match.row,targetId:match.targetId,kind:match.kind}:null;
}
