// Declarative talent triggers: "when <event> happens to the owner, (with chance) apply <aura>".
//
// Every number that the talent publishes (chance, magnitude) is read from the talent's rankParameters at plan time.
// What the parameters do not carry (the event, the aura duration) is declared here once, copied from the official
// description, and checked against that description by tests/sim/combat-talent-triggers.test.mjs. A spec whose
// description no longer matches fails that test, so a change in the data cannot silently change combat.
// Nothing here is inferred from names. A mechanic whose duration, chance or event is not in the description does not belong in this table.
//
// Not a validation of OctoWoW behaviour: it applies the published numbers as published.

/** Event predicates over an 'attack-result' mechanic event as emitted by combat-class-runtime.mjs. */
export const TRIGGER_EVENTS=Object.freeze({
  // The owner is the target of an attack that landed as a critical strike.
  'owner-struck-crit':(owner,ev)=>ev.targetId===owner&&ev.landed===true&&ev.critical===true&&!ev.equipmentProc,
  // The owner lands a critical strike with a main or off hand melee contact (not an equipment proc).
  'owner-melee-crit':(owner,ev)=>ev.actorId===owner&&ev.landed===true&&ev.critical===true&&ev.school==='physical'&&['mainhand','offhand'].includes(ev.hand)&&!ev.equipmentProc
});

/**
 * param: [parameterIndex] reads rankParameters[parameterIndex][rank-1].
 * chanceParam (optional): the same, as a percentage. Omitted means the description states no chance (always triggers).
 * description: must match descriptions[rank-1]; the first capture group is the aura duration in seconds.
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
  })
]);

const rankOf=(build,spec)=>{
  if(build.classId!==spec.classId)return 0;
  const talent=Number(build.talents?.[String(spec.talentId)]??0);
  if(!Number.isInteger(talent)||talent<0)throw new Error(`Invalid rank for talent ${spec.talentId}`);
  return talent;
};

/**
 * Resolves the specs that apply to a build into plain data for the combat runtime.
 * @param build a validated build ({classId,talents})
 * @param talentData the class talent JSON ({talents:[{id,maxRanks,rankParameters}]})
 */
export function talentTriggerPlan(build,talentData,specs=TALENT_TRIGGER_SPECS){
  const plan=[];
  for(const spec of specs){
    const rank=rankOf(build,spec);if(!rank)continue;
    const talent=talentData?.talents?.find(t=>t.id===spec.talentId);
    if(!talent)throw new Error(`Talent ${spec.talentId} is not in the supplied talent data`);
    if(rank>talent.maxRanks)throw new Error(`Rank ${rank} exceeds the maximum for talent ${spec.talentId}`);
    const read=index=>{const value=talent.rankParameters?.[index]?.[rank-1];if(!Number.isFinite(value))throw new Error(`Talent ${spec.talentId} has no published parameter ${index} at rank ${rank}`);return value;};
    plan.push({
      talentId:spec.talentId,rank,event:spec.event,
      chance:spec.chanceParam===undefined?null:read(spec.chanceParam)/100,
      aura:{id:spec.aura.id,name:spec.aura.name,kind:spec.aura.kind,durationMs:spec.aura.durationMs,maxStacks:spec.aura.maxStacks,
        modifiers:spec.aura.modifiers.map(m=>({stat:m.stat,mode:m.mode,value:read(m.param)}))}
    });
  }
  return plan;
}

/**
 * Called for every attack-result event. Returns the plan entries that fired.
 * `e` is the CombatEncounter (needs e.auras and e.random); chance is rolled with the encounter's seeded random, once per matching event.
 */
export function applyTalentTriggers(e,ownerId,ev,plan){
  const fired=[];
  for(const entry of plan??[]){
    const matches=TRIGGER_EVENTS[entry.event];if(!matches)throw new Error(`Unknown trigger event ${entry.event}`);
    if(!matches(ownerId,ev))continue;
    if(entry.chance!==null&&!(e.random()<entry.chance))continue;
    e.auras.apply({id:entry.aura.id,name:entry.aura.name,targetId:ownerId,ownerId,kind:entry.aura.kind,durationMs:entry.aura.durationMs,maxStacks:entry.aura.maxStacks,stacks:1,stackPolicy:'replace',refreshPolicy:'refresh',modifiers:entry.aura.modifiers.map(m=>({...m}))});
    fired.push(entry);
  }
  return fired;
}
