// Disposition of every talent rule that the ability calculator cannot apply (state "recorded-not-computed" or
// "unattached-scope"). A rule is never approximated: each one is either covered by another rule, or tied to the
// simulation dimension that does not exist yet, with the reason in plain words.
// A finding with no entry here is reported as "unclassified" and fails tests/sim/talent-audit.test.mjs, so a new
// unapplied rule cannot slip in without a recorded decision.
const D=(disposition,dimension,why)=>({disposition,dimension,why});
const NO_DEFENCE='The reference encounter has no general incoming-avoidance or mitigation table, so defensive effects cannot change a simulated result.';
const BUFF_PROVIDER='Changes a buff or aura the talent owner casts on others. The simulator models one build; buffs from other players are explicit external inputs, not their casters talents.';
const CC='Crowd-control, slow and enemy attack-debuff strength is not simulated; no enemy behaviour depends on it.';
const EVENT='Needs a proc or resource-event rule in the combat engine, and OctoWoW trigger data has not been verified.';
const THREAT='Threat is tracked per ability, but stance- or aura-gated threat modifiers are not modelled.';
const REGEN='A five-second-rule helper exists, but reference scenarios pass no regeneration and the OctoWoW base fraction is unverified.';
const AREA='Area targets come from explicit target lists; no radius geometry exists.';

export const STAT_DISPOSITIONS={
 pushbackAvoidancePct:D('unsupported-dimension','casting interruption','Spell pushback from incoming damage is not simulated.'),
 pushbackResistancePct:D('unsupported-dimension','casting interruption','Spell pushback from incoming damage is not simulated.'),
 radiusIncreasePct:D('unsupported-dimension','area geometry',AREA),
 areaOfEffectPct:D('unsupported-dimension','area geometry',AREA),
 movementSpeedPct:D('unsupported-dimension','movement','No movement model exists.'),
 resistChancePct:D('unsupported-dimension','survivability',NO_DEFENCE),
 damageReductionPct:D('unsupported-dimension','survivability',NO_DEFENCE),
 physicalDamageReductionPct:D('unsupported-dimension','survivability',NO_DEFENCE),
 armourBonusPct:D('unsupported-dimension','survivability',NO_DEFENCE),
 reflectChancePct:D('unsupported-dimension','survivability',NO_DEFENCE),
 manaLossReductionPct:D('unsupported-dimension','survivability',NO_DEFENCE),
 resistSilenceInterruptPct:D('unsupported-dimension','survivability',NO_DEFENCE),
 targetItemArmourPct:D('unsupported-dimension','survivability',NO_DEFENCE),
 healthPct:D('unsupported-dimension','survivability','Totem and pet health do not feed a simulated result.'),
 returnedHealthManaPct:D('unsupported-dimension','survivability','Reincarnation return is not a simulated action.'),
 chancePct:D('unsupported-dimension','survivability','Dispel resistance is not simulated.'),
 meleeDamageHealingPct:D('unsupported-dimension','self-healing','Self-healing from melee damage is not a simulated healing source.'),
 transferredDamagePct:D('unsupported-dimension','survivability','Damage transfer to a demon needs an incoming-damage model.'),
 threatPct:D('unsupported-dimension','threat',THREAT),
 retainedDefensiveThreatPct:D('unsupported-dimension','threat',THREAT),
 threatReturnReductionPct:D('unsupported-dimension','threat',THREAT),
 transferredToOwnerPct:D('unsupported-dimension','threat',THREAT),
 stunChancePct:D('unsupported-dimension','crowd control',CC),
 stunDurationSeconds:D('unsupported-dimension','crowd control',CC),
 stunDurationIncreaseSeconds:D('unsupported-dimension','crowd control',CC),
 slowChancePct:D('unsupported-dimension','crowd control',CC),
 slowIncreasePct:D('unsupported-dimension','crowd control',CC),
 attackSpeedReductionPct:D('unsupported-dimension','crowd control',CC),
 attackPowerReductionPct:D('unsupported-dimension','crowd control',CC),
 buffEffectivenessPct:D('unsupported-dimension','buff provider strength',BUFF_PROVIDER),
 effectivenessPct:D('unsupported-dimension','buff provider strength',BUFF_PROVIDER),
 attackPowerBonusPct:D('unsupported-dimension','buff provider strength',BUFF_PROVIDER),
 armourReductionPct:D('needs-debuff-model','enemy debuff','Enemy armour reduction by Expose Armor is not modelled; target armour is a fixed input.'),
 damageBonusPct:D('needs-debuff-model','enemy debuff','Physical-damage vulnerability on the target is not modelled.'),
 holyDamageIncreasePct:D('needs-debuff-model','enemy debuff','Judgement of the Crusader is a target debuff the engine does not apply.'),
 coefficientBonusPct:D('disputed-identity','disputed ability','Holy Strike identity (10333/10332) is disputed; nothing is changed until authoritative evidence resolves it.'),
 manaDrainPct:D('unsupported-dimension','enemy mana','Enemy mana pools are not simulated.'),
 energyRefundOnNonCrit:D('needs-event-model','resource generation',EVENT),
 extraComboPointChancePct:D('needs-event-model','resource generation',EVENT),
 manaRefundPct:D('needs-event-model','resource generation',EVENT),
 instantRageGained:D('needs-event-model','resource generation',EVENT),
 rageGained:D('needs-event-model','resource generation',EVENT),
 rageGenerated:D('needs-event-model','resource generation',EVENT),
 rageRetained:D('needs-event-model','resource generation','Stance changes are not simulated actions, so retained rage has no trigger.'),
 partyManaReturnPct:D('needs-event-model','resource generation',EVENT),
 healthTransferredPct:D('unsupported-dimension','pet and summon','Health Funnel is not a simulated action.'),
 manaTransferredPct:D('unsupported-dimension','pet and summon','Mana Funnel is not a simulated action.'),
 focusRegenPct:D('unsupported-dimension','pet and summon','Eyes of the Beast pet control is not simulated.'),
 regenPct:D('needs-resource-model','mana regeneration while casting',REGEN),
 extraRegenPct:D('needs-resource-model','mana regeneration while casting',REGEN),
 attackCastSpeedPct:D('needs-event-model','aura stacks','Zeal stack generation and duration need an aura engine and the stack data is unverified.'),
 maximumCharges:D('unsupported-dimension','shield charges','Shield charge counts are not simulated.'),
 activationDelayReductionSeconds:D('unsupported-dimension','totem timing','Fire Nova Totem activation delay is not modelled.')
};
// Per-talent decisions where the stat name alone is not enough. Key: "<class>:<talent id>".
export const TALENT_DISPOSITIONS={
 'druid:284':D('covered-by-another-rule','party aura','The self aura is applied by the sheet rule feralPackCrit; the scoped party rule would only duplicate it.'),
 'paladin:450':D('covered-by-another-rule','party aura','The Holy damage aura is applied by the spell rule when the Sanctity Aura option is selected.'),
 'warrior:72':D('needs-ability-model','execute rage scaling','Execute compiles only with an explicit base-damage policy and has no per-extra-rage term.'),
 'warlock:365':D('unsupported-dimension','pet and summon','Demon summoning is not a simulated action.'),
 'warlock:323':D('needs-pet-model','pet ability timing','Imp Firebolt and Succubus Lash of Pain are explicit companion fixtures; applying the reduction to an observed value could double count it. Custom OctoWoW talent, unverified.'),
 'warlock:366':D('unsupported-dimension','pet and summon','Pet control spells are not simulated.'),
 'hunter:375':D('unsupported-dimension','pet and summon','Eyes of the Beast pet control is not simulated.'),
 'hunter:378':D('unsupported-dimension','pet and summon','Revive Pet is not a simulated action.'),
 'mage:24':D('unsupported-dimension','crowd control',CC),
 'druid:319':D('unsupported-dimension','crowd control',CC),
 'mage:43':D('unsupported-dimension','buff provider strength',BUFF_PROVIDER)
};
export function classifyFinding(classId,talentId,rule){
 return TALENT_DISPOSITIONS[`${classId}:${talentId}`]??STAT_DISPOSITIONS[rule.stat]??D('unclassified','unclassified','No recorded decision for this stat.');
}
// Integration defects found by this audit and fixed. Each names the test that pins the corrected behaviour.
export const INTEGRATION_FIXES=[
 {classId:'warlock',talentId:341,name:'Improved Life Tap',defect:'The talent rule records its bonus as manaGainedPct, but the Life Tap compiler reads manaGainPct, so the +10/20% mana award never reached combat.',fix:'Alias manaGainedPct to manaGainPct in talent-calculations.mjs (ABILITY_STAT_ALIASES).',test:'tests/sim/talent-integration.test.mjs'},
 {classId:'warlock',talentId:341,name:'Resource overflow check (exposed by the Improved Life Tap fix)',defect:'With a fractional mana award (424 x 1.1) on a large pool, overflow computed as (current + gain) - max exceeded the gain by floating-point rounding and resourceThroughput rejected the event as invalid.',fix:'combat-statistics.mjs accepts overflow within 1e-9 relative of the gain and clamps it to the gain; genuinely larger overflow is still rejected.',test:'tests/sim/talent-integration.test.mjs'}
];
