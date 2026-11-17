# Phase 3 — talent calculation validation

This branch remains a planner, not a verified damage simulator. Only its named class has the audited talent registry. Never merge class ledgers sequentially without consolidating the registry.

## Sources and checks

- Primary source: https://octowow.st/talents/ — existing imported calculator snapshot, rank vectors, descriptions.
- Independent representation: https://octowow.st/git/Ade/AdeTalents/src/branch/main/Data — public AdeTalents data dated 12 Nov 2026; author reports client/database tooltip extraction. This is corroboration of selected tooltip numbers, not an independent combat sample. Shaman client coverage has a stated limitation, and wand mana-per-proc values are explicitly level-dependent.
- Tests: `tests/sim/talent-validation.test.mjs`. 34 selected independent rank vectors across nine branches (not a cross-check of all 476 talent tooltips); every mapped numeric rule evaluated at every nonzero rank, with matching equipment/context and separately disabled conditions; rank zero checked for every talent; legal allocations using the planner's point/prerequisite validator at levels 10, 30, 60 on every supported race and each of the three primary-tree priorities (531 cases across nine classes).
- Conditional event chances and refunds remain isolated modifiers, not guaranteed events. Periodic crit is not asserted without a specific periodic-critical model.
- Exact weapon-hand requirements, shield item tooltip parsing, source buff selection, pet presence, target-dependent scope, and unknown inputs are explicitly tested. Source type names and condition inputs are not independently verified combat mechanics.

## Phase 3 fixes

| Class | Scope |
|---|---|
| Warrior | Shield tooltip block amount, two-weapon requirement, Pummel/Revenge scoped control |
| Paladin | Holy Seal/Judgement Sanctity scope, Righteous Fury gate, Lay on Hands armour contribution |
| Rogue | Extra combo point chance and noncritical Ambush refund, without automatic grants |
| Druid | Rank-by-rank bleed-count isolation; periodic Moonfire distinct from direct damage |
| Shaman | Fire Totem profiles, Searing Totem range and interval modifiers |
| Hunter | Trap-specific resistance reductions |
| Mage | Wand-only damage/hit, Frost Ward conditional reflect contribution |
| Warlock | Greater demon spell crit scoped separately from melee crit; Soul Link transfer preview |
| Priest | Instant Shadow Word: Pain, Psychic Scream, Fade; Vampiric Embrace explicitly enabled |

## Unverified and blocking final certification

All absolute ability base damage, spell ranks, coefficients, actual target hit/crit/resist and attack tables, pet base stats and inheritance, stacking/rounding, cooldown floors, source-buff caster ownership, and event ordering need source or combat-log validation. Some imported stat baselines are unavailable; retain unknown values rather than invent them. Additive stacking of scoped percentage modifiers is a provisional estimate, not confirmed live mechanics. The two greater demon options currently offered are Felguard and Doomguard; Infernal/other controlled demons are not covered. A full item, enchant, set bonus, buff, debuff and consumable audit is separate. No live game client or combat logs were accessed. Passing tests demonstrate behaviour of this implementation, not proof of server parity.
