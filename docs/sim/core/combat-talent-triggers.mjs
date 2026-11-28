// Declarative talent triggers: "when <event> happens to the owner, (with chance) apply <effect>".
//
// Every number that the talent publishes (chance, magnitude) is read from the talent's rankParameters at plan time.
// Numbers that the parameters do not carry (an aura duration, a fixed amount, an internal cooldown) are read from the
// official description of the same rank through the spec's `description` pattern, so nothing is typed in twice, and
// tests/sim/combat-talent-triggers.test.mjs fails if a description stops matching. Nothing here is inferred from names.
// A mechanic whose event, duration or amount is not in the description does not belong in this table.
//
// Not a validation of OctoWoW behaviour: it applies the published numbers as published.
import {scheduleResourceRegen,REFERENCE_PRIORITIES as P} from './combat-timeline.mjs';

/** Event predicates over an 'attack-result' mechanic event as emitted by combat-class-runtime.mjs. */
export const TRIGGER_EVENTS=Object.freeze({
  // The owner is the target of an attack that landed as a critical strike.
  'owner-struck-crit':(owner,ev)=>ev.targetId===owner&&ev.landed===true&&ev.critical===true&&!ev.equipmentProc,
  // The owner lands a critical strike with a main or off hand melee contact (white swing or ability, not an equipment proc).
  'owner-melee-crit':(owner,ev)=>ev.actorId===owner&&ev.landed===true&&ev.critical===true&&ev.school==='physical'&&['mainhand','offhand'].includes(ev.hand)&&!ev.equipmentProc,
  // An attack against the owner was dodged.
  'owner-dodged':(owner,ev)=>ev.targetId===owner&&ev.outcome==='dodge'&&!ev.equipmentProc
});

/**
 * event, optional requires:{option,equals} (a planner class option such as form), chanceParam (rankParameters index, percent;
 * omitted means the description states no chance), description (must match descriptions[rank-1]; capture groups feed `group` references).
 * Effects: exactly one of
 *   aura:{id,name,kind,durationMs,maxStacks,modifiers:[{stat,mode,param}]}   (param = rankParameters index)
 *   resource:{resource,amount:{group}|{param},source}                           instant gain
 *   periodicResource:{id,resource,perTick:{param},intervalMs,duration:{group}, cooldown:{group}, source}
 *                                                                              gain per interval for a duration, with an internal cooldown
 */
export const TALENT_TRIGGER_SPECS=Object.freeze([
  Object.freeze({
    talentId:101,classId:'warrior',event:'owner-struck-crit',
    aura:Object.freeze({id:'warrior:enrage',name:'Enrage',kind:'buff',durationMs:8000,maxStacks:1,modifiers:Object.freeze([Object.freeze({stat:'warriorPhysicalDamagePct',mode:'flat',param:0})])}),
    description:/melee damage bonus for (\d+) sec after being the victim of a critical strike\./i
  }),
  Object.freeze({
    talentId:222,classId:'shaman',event:'owner-melee-crit',
    aura:Object.freeze({id:'talent:elemental-devastation',name:'Elemental Devastation',kind:'buff',durationMs:10000,maxStacks:1,modifiers:Object.freeze([Object.freeze({stat:'spellHitDeltaPct',mode:'flat',param:1})])}),
    description:/melee critical strikes increase your chance to hit with spells by additional \d+% for (\d+) sec\./i
  }),
  // Primal Fury, Bear Form half. The Cat Form half (extra combo point) is compiled with the Cat abilities in combat-rank-compiler.mjs.
  Object.freeze({
    talentId:276,classId:'druid',event:'owner-melee-crit',requires:Object.freeze({option:'form',equals:'Bear'}),chanceParam:0,
    resource:Object.freeze({resource:'rage',amount:Object.freeze({group:2}),source:'Primal Fury'}),
    description:/(\d+)% chance to gain an additional (\d+) Rage anytime you get a critical strike while in Bear and Dire Bear Form/i
  }),
  // Ancient Brutality, Bear Form half. The Cat Form half (bleed tick energy) is compiled with the Cat bleeds in combat-rank-compiler.mjs.
  Object.freeze({
    talentId:280,classId:'druid',event:'owner-dodged',requires:Object.freeze({option:'form',equals:'Bear'}),
    periodicResource:Object.freeze({id:'druid:ancient-brutality',resource:'rage',perTick:Object.freeze({param:0}),intervalMs:1000,duration:Object.freeze({group:2}),cooldown:Object.freeze({group:3}),source:'Ancient Brutality'}),
    description:/generating (\d+) Rage per second for (\d+) sec\. This effect can only occur once every (\d+) seconds\./i
  })
]);

const rankOf=(build,spec)=>{
  if(build.classId!==spec.classId)return 0;
  if(spec.requires&&build.classOptions?.[spec.requires.option]!==spec.requires.equals)return 0;
  const talent=Number(build.talents?.[String(spec.talentId)]??0);
  if(!Number.isInteger(talent)||talent<0)throw new Error(`Invalid rank for talent ${spec.talentId}`);
  return talent;
};

/**
 * Resolves the specs that apply to a build into plain data for the combat runtime.
 * @param build a validated build ({classId,talents,classOptions})
 * @param talentData the class talent JSON ({talents:[{id,maxRanks,rankParameters,descriptions}]})
 */
export function talentTriggerPlan(build,talentData,specs=TALENT_TRIGGER_SPECS){
  const plan=[];
  for(const spec of specs){
    const rank=rankOf(build,spec);if(!rank)continue;
    const talent=talentData?.talents?.find(t=>t.id===spec.talentId);
    if(!talent)throw new Error(`Talent ${spec.talentId} is not in the supplied talent data`);
    if(rank>talent.maxRanks)throw new Error(`Rank ${rank} exceeds the maximum for talent ${spec.talentId}`);
    const read=index=>{const value=talent.rankParameters?.[index]?.[rank-1];if(!Number.isFinite(value))throw new Error(`Talent ${spec.talentId} has no published parameter ${index} at rank ${rank}`);return value;};
    const groups=spec.resource||spec.periodicResource?(()=>{const m=String(talent.descriptions?.[rank-1]??'').match(spec.description);if(!m)throw new Error(`Talent ${spec.talentId} rank ${rank}: description no longer matches the trigger spec`);return m;})():null;
    const group=ref=>{const value=Number(groups[ref.group]);if(!Number.isFinite(value)||value<=0)throw new Error(`Talent ${spec.talentId} rank ${rank}: description group ${ref.group} is not a positive number`);return value;};
    const entry={talentId:spec.talentId,rank,event:spec.event,chance:spec.chanceParam===undefined?null:read(spec.chanceParam)/100};
    if(spec.aura)entry.aura={id:spec.aura.id,name:spec.aura.name,kind:spec.aura.kind,durationMs:spec.aura.durationMs,maxStacks:spec.aura.maxStacks,modifiers:spec.aura.modifiers.map(m=>({stat:m.stat,mode:m.mode,value:read(m.param)}))};
    if(spec.resource)entry.resource={resource:spec.resource.resource,amount:spec.resource.amount.group!==undefined?group(spec.resource.amount):read(spec.resource.amount.param),source:spec.resource.source};
    if(spec.periodicResource){const p=spec.periodicResource;entry.periodicResource={id:p.id,resource:p.resource,perTick:read(p.perTick.param),intervalMs:p.intervalMs,durationMs:group(p.duration)*1000,cooldownMs:group(p.cooldown)*1000,source:p.source};}
    plan.push(entry);
  }
  return plan;
}

const gain=(e,ownerId,resource,delta,source)=>{
  if(!Object.hasOwn(e.resources.snapshot(),resource))throw new Error(`Talent trigger ${source} needs a ${resource} pool in the scenario`);
  const result=e.resources.change([{resource,delta}]);
  if(!result.ok)throw new Error(`Talent trigger ${source} could not add ${resource}`);
  e.recordMechanic?.('resource-change',{actorId:ownerId,source,resource,delta,overflow:result.overflow?.[resource]??0});
};

/**
 * Called for every attack-result event. Returns the plan entries that fired.
 * `e` is the CombatEncounter (needs e.random; e.auras for auras; e.resources and e.periodic for resources).
 * A chance is rolled with the encounter's seeded random once per matching event.
 */
export function applyTalentTriggers(e,ownerId,ev,plan){
  const fired=[];
  for(const entry of plan??[]){
    const matches=TRIGGER_EVENTS[entry.event];if(!matches)throw new Error(`Unknown trigger event ${entry.event}`);
    if(!matches(ownerId,ev))continue;
    if(entry.periodicResource){
      // The internal cooldown is checked before anything is rolled or started, and starts only when the effect fires.
      const p=entry.periodicResource;
      if(!e.resources.cooldowns.start([{id:`talent:${entry.talentId}:internal-cooldown`,duration:p.cooldownMs}]))continue;
      scheduleResourceRegen(e.periodic,e.resources,{id:p.id,resource:p.resource,amount:p.perTick,durationMs:p.durationMs,intervalMs:p.intervalMs,priority:P.resource,tickAtExpiry:true,refresh:'restart',
        onTick:x=>e.recordMechanic?.('resource-change',{actorId:ownerId,source:p.source,resource:p.resource,delta:x.actualAmount-(x.result?.suppressed?.[p.resource]??0),overflow:x.result?.overflow?.[p.resource]??0})});
      fired.push(entry);continue;
    }
    if(entry.chance!==null&&!(e.random()<entry.chance))continue;
    if(entry.aura)e.auras.apply({id:entry.aura.id,name:entry.aura.name,targetId:ownerId,ownerId,kind:entry.aura.kind,durationMs:entry.aura.durationMs,maxStacks:entry.aura.maxStacks,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh',modifiers:entry.aura.modifiers.map(m=>({...m}))});
    else if(entry.resource)gain(e,ownerId,entry.resource.resource,entry.resource.amount,entry.resource.source);
    else throw new Error('Trigger plan entry has no effect');
    fired.push(entry);
  }
  return fired;
}
