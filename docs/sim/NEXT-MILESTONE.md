# OctoSim next combat-engine milestone

Written 28 November 2026 against `feat/octosim-merge-main` (PR #79). Figures come from `node tools/sim/audit-talents.mjs`, `docs/sim/data/talents/audit-report.json` and the existing audit scripts. Run Simulation stays disabled. Nothing here is a claim that any DPS number matches OctoWoW.

## What "verified" means in the talent audit

`verified-functioning` (72 of 476) means all of the following, observed by running the planner and combat-adapter code (see `docs/sim/TALENT-AUDIT.md`):

1. Every rule of the talent is applied (no `pending` rule).
2. The effect scales in proportion to the published per-rank parameter.
3. It reaches combat input (sheet or snapshot), or a deterministic combat test is named in the report.

It is a consistency check against the talent data. It is **not** a comparison with OctoWoW combat. `combatVerification` currently has 54 confirmed and 422 inconclusive: the with/without-talent compile check could only confirm 54.

Where the other 404 stand:

| Group | Count | Meaning |
|---|---|---|
| Hard-wired combat hook, not verified | 83 (70 unverified, 13 partial) | An engine module reads the talent by numeric ID, but no named deterministic test exists, so the audit cannot promote it. |
| Has published rank parameters | 308 of 404 | Numbers exist in `data/talents/*.json`. |
| Pending rule | 215 talents (216 rules) | Mechanic is event-, aura- or ability-state-driven and has no model. |
| Unattached scope | 46 talents / 53 rules | Rule's scope matches no ability profile, so it never applies. |
| Recorded, not computed | 48 talents / 55 rules | Stat is stored but no calculator reads it. |
| Out of DPS scope (currently counted as missing) | 84 findings | `unsupported-dimension`: survivability 17, buff provider strength 14, crowd control 12, pet and summon 10, resource generation 10, casting interruption 9, area geometry 6, threat 6, and others. |

Chronicle evidence is identity only: a catalogue entry records that a spell ID and name were seen, with no claim about rank, cooldown or coefficient. Only one reviewed Chronicle spell maps straight to a talent spell ID (Power Overwhelming, 51714). Chronicle does support that these talent-driven effects are live and frequent in OctoWoW raid logs: Deep Wound (1,470 hits), Piercing Shots (302), Arcane Instability (1,362), Surprise Attack (191), Soul Link (1,375), Strike Together (467), Ancient Accord (317), Midnight Comet (169). That raises their priority; it does not supply formulas.

## Class-readiness matrix (28 November 2026)

Abilities: executable / registered, with source conflicts. "Executable" means the reference engine runs it under explicit policies. Validated abilities: 0 of 187. Validated classes: 0 of 9.

| Class | Abilities | Talents V / U / P / M | Resources | Rotation | Equipment effects | Validation | Overall |
|---|---|---|---|---|---|---|---|
| Warrior | 22/22, 11 conflicts | 5 / 19 / 8 / 22 | Rage: explicit-policy model | Presets + configured rotation | Shared adapters | None | Implemented, unverified |
| Rogue | 17/17, 9 | 9 / 14 / 11 / 22 | Energy and combo points; max energy now single-source (Vigor) | Presets + configured rotation | Shared adapters, poisons | None | Implemented, unverified |
| Paladin | 16/16, 6 | 6 / 21 / 7 / 15 | Mana; seals as timed auras | Presets + configured rotation | Shared adapters | None | Implemented, unverified; Holy Strike identity disputed |
| Druid | 23/23, 7 | 9 / 20 / 9 / 16 | Mana, energy (cap 100), rage by form | Presets + configured rotation | Shared adapters | None | Implemented, unverified |
| Shaman | 20/21, 6 | 9 / 18 / 8 / 14 | Mana; imbues, totems | Presets + configured rotation | Shared adapters | None | Implemented, unverified |
| Hunter | 23/24, 11 | 4 / 32 / 6 / 13 | Mana, ammunition, pet focus | Presets + configured rotation | Shared adapters, pet | None | Implemented, unverified; Steady Shot identity disputed |
| Mage | 21/21, 6 | 8 / 23 / 3 / 21 | Mana | Presets + configured rotation | Shared adapters | None | Implemented, unverified |
| Warlock | 24/24, 12 | 11 / 17 / 6 / 18 | Mana, shards, pet | Presets + configured rotation | Shared adapters, pet | None | Implemented, unverified |
| Priest | 18/19, 8 | 11 / 15 / 5 / 21 | Mana | Presets + configured rotation | Shared adapters | None | Implemented, unverified |

Readiness status for every class is the same: no trustworthy DPS yet. UI and data completeness are ahead of mechanical accuracy, and nothing is production-ready.

## Outstanding core combat-engine mechanics

Implementable now from existing data (no new in-game evidence needed to build, only to validate):

| # | Mechanic | Why it matters |
|---|---|---|
| E1 | Generic event-trigger to temporary-aura binding for talents (own hit/crit/dodge/block, received crit, spell cast, kill; chance or guaranteed; duration, stacks, charges, internal cooldown) | Most of the 216 pending rules describe a proc, temporary buff or state change of this kind, across all nine classes. Engine pieces exist (`combat-buff-runtime.mjs`, `combat-cast-procs.mjs`, `combat-proc-rates.mjs`); the talent rules are not bound to them. |
| E2 | Resource-on-event effects (rage on hit or block, energy and combo on crit or dodge, mana refund on shield break or crit) | Rage, energy and mana classes. Uses `combat-resource-reference.mjs`, `combat-rage-reference.mjs`, `combat-regeneration.mjs`. |
| E3 | Crit-triggered periodic damage from weapon damage (Deep Wounds, Piercing Shots, Lacerate, Taste for Blood) | Existing periodic engine; Chronicle shows these are live. |
| E4 | Extra-attack procs (Hack and Slash, Master of Arms sword, Endless Quiver) | Extra-attack runtime already exists for equipment (`combat-equipment-runtime.mjs`). |
| E5 | Next-cast modifiers consumed on use (Holy Judgement, Lock and Load, Searing Light, Purifying Flames) | `combat-cast-procs.mjs` already does Hot Streak, Searing Light, Nightfall as research. |
| E6 | Scope-to-ability mapping for 46 unattached and 48 recorded-not-computed rules (regenPct, castTimeReductionSeconds, manaCostReductionPct, effectivenessPct, damagePct) | Mostly label and calculator wiring (`talent-calculations.mjs`, `ABILITY_STAT_ALIASES`). The Improved Life Tap bug (e3505d66) was this class of defect. |

Need game evidence before they can be accurate:

| # | Mechanic | Evidence needed |
|---|---|---|
| G1 | Partial resistance distribution (reference only today) | Controlled spell-resist samples against a known-resistance target. |
| G2 | Mana regeneration, Spirit coefficients, five-second rule | Out-of-combat and casting regen measurements per class and level. |
| G3 | Haste and GCD floor | Measured cast times and GCD under known haste. |
| G4 | Proc rates and internal cooldowns (weapons, sets, talent procs) | Swing and cast logs, large samples. |
| G5 | Attack-table values at level 63 (miss, dodge, glance, crit suppression) | Combat log samples with known skill and gear (OctoCombatCapture addon, untested on the real client). |
| G6 | Rage and energy coefficients; Vigor and Adrenaline Rush interactions | Resource logs. |
| G7 | Elusiveness has conflicting units (45 min vs 1.5 min) | Tooltip and behaviour check on the live server. |
| G8 | Spell identity disputes: Holy Strike (10333, 10332), Steady Shot (3668), Hand of Sacrifice (20729) | In-game spell lookup. |

Not applicable to the current DPS scope, to be classified instead of counted as missing (needs your approval, see M9): crowd control, movement, interrupts and pushback, survivability and threat-only effects, party-provider buffs.

## Missing and partially implemented talent mechanics

Grouped by the shared mechanic that unlocks them. Counts are talents from `audit-report.json` pending rules.

| Group | Examples | Unlocked by |
|---|---|---|
| Procs to temporary buffs | Flurry, Enrage, Redoubt, Vengeance, Swift Aspects, Frenzy, Scent of Blood, Setup, Unbridled Wrath, Blood Craze | E1 |
| Resource on event | Unbridled Wrath, Reprisal, Shield Specialization (Warrior, Paladin), Ruthlessness, Seal Fate, Relentless Strikes, Initiative, Improved Ambush, Improved Backstab, Resurgent Shield, Illumination | E2 |
| Crit-triggered periodic | Deep Wounds, Piercing Shots, Lacerate, Taste for Blood | E3 |
| Extra attacks | Hack and Slash, Master of Arms, Endless Quiver | E4 |
| Next-cast modifiers | Holy Judgement, Lock and Load, Searing Light, Purifying Flames, Inner Focus, Cold Blood | E5 |
| Active abilities needing an ability model | Mortal Strike, Bloodthirst, Aimed Shot, Shield Slam, Holy Shock, Hemorrhage, Envenom, Preparation | Ability and rank compilation; several already compile as reference ranks, so the talent half is what is missing |
| Multi-target | Sweeping Strikes, Carve, Blast Wave | Target list in the planner (the engine supports multiple targets) |
| Pet | Coordinated Assault, Bestial Wrath, Intimidation, Kill Command and pet talents | Pet engine exists and several pet talents are already hard-wired; the remaining talent rules are unbound |

## Equipment effects and proc implementation gaps

From `ITEM-EFFECT-AUDIT.md` and `BUFF-CONSUMABLE-AUDIT.md` (phase 3 figures, not re-run here):

- 9,010 item effect lines: 7,708 passive, 375 scoped, 789 event-dependent, 92 utility, 30 conditional, 16 unmapped. Passive plus scoped is 89.7%. The 789 event-dependent lines (procs, on-use) are the main gap. Tooltip-to-runtime mapping exists for simple patterns only (`combat-item-tooltip-runtime.mjs`); how many of the 789 actually compile has not been measured.
- Set bonuses: 179 patterns, 119 passive or scoped (66.5%), 46 event, 6 unmapped.
- Enchants: 95 listed, 56 reference-only (not source-confirmed).
- Consumables: 84 of 1,302 tooltip-verified; item cooldowns unresolved (`cooldownVerified: false`).
- Buffs: world buffs and weapon masteries are in the list; several buff icons are missing (tracked in `INTEGRATION-FOLLOWUPS.md`).
- Trinket swaps: only AP and spell or healing power changes are supported.
- Proc rates and ICDs for items and sets are explicit research inputs, not verified.

## Mechanics requiring controlled in-game testing

All of G1 to G8 above, plus: base stats for the 1,140 missing race, class and level combinations (`tools/sim/OctoStatCapture`), consumable and potion cooldowns, Deep Wounds and Piercing Shots duration and tick interval, Judgement and seal proc behaviour (Seal of Wisdom ranks 4 and 5 reported missing), weapon-skill book caps. Suggested method for each: fixed gear and talents, a stationary level-63 target, at least 1,000 samples, saved with the capture addon output so `tools/sim/review-*.mjs` can ingest them.

## Prioritised backlog

Effort: S small, M medium, L large. "Evidence" says whether game data is needed to complete the task as written. Tasks M1 to M6 need none.

| ID | Pri | Task | Files | Depends | Eff. | Evidence |
|---|---|---|---|---|---|---|
| M1 | P0 | Deterministic with/without-talent combat tests for the 83 hooked talents | `tools/sim/combat-verification.mjs`, `tools/sim/audit-talents.mjs`, `tests/sim/talent-integration.test.mjs` | none | M | No |
| M2 | P0 | E1: declarative talent trigger to aura binding | `docs/sim/core/combat-conditional-talents.mjs`, `combat-buff-runtime.mjs`, `combat-cast-procs.mjs`, `talent-calculations.mjs` | M1 helps | L | No (chance and duration from `rankParameters`; missing values stay explicit inputs) |
| M3 | P1 | E6: fix unattached scopes and recorded-not-computed stats | `talent-calculations.mjs`, `talent-effects.mjs`, `talent-audits.mjs` | none | S to M | No |
| M4 | P1 | E3: crit-triggered periodic damage (Deep Wounds, Piercing Shots, Lacerate) | `combat-class-runtime.mjs`, `combat-hunter-ranged-talents.mjs`, `combat-rank-compiler.mjs` | M2 | M | Duration and tick values need confirming |
| M5 | P1 | E2: resource-on-event effects | `combat-resource-reference.mjs`, `combat-rage-reference.mjs`, `combat-class-state.mjs` | M2 | M | Coefficients stay explicit |
| M6 | P1 | Measure how many of the 789 event-dependent item lines compile through the tooltip runtime; report by pattern | `tools/sim/audit-equipment-runtime.mjs` | none | S | No |
| M7 | P1 | E4 and E5: extra-attack procs and next-cast modifiers | `combat-equipment-runtime.mjs`, `combat-cast-procs.mjs` | M2 | M | Proc rates explicit |
| M8 | P1 | Capture plan: write the controlled test scripts for G1 to G8 and the 1,140 base-stat rows | `tools/sim/OctoCombatCapture`, `OctoStatCapture`, `SPELL-EVIDENCE-PROTOCOL.md` | none | M | Produces evidence; needs a game session to run |
| M9 | P2 | Add a "not applicable to DPS scope" classification to the audit, reclassify the 84 out-of-scope findings (with your approval) | `tools/sim/audit-talents.mjs`, `docs/sim/TALENT-AUDIT.md` | none | S | No |
| M10 | P2 | Refresh stale docs (`CLASS-AUDIT.md` says no engine; `VALIDATION.md` lists 5 tests) | `docs/sim/*.md` | none | S | No |
| M11 | P2 | Active-ability talent halves (Mortal Strike, Bloodthirst, Aimed Shot, Holy Shock) | `combat-rank-compiler.mjs`, `combat-ability-modifiers.mjs` | M2 | L | Some coefficients disputed |
| M12 | P3 | Pet talent rules (Bestial Wrath, Coordinated Assault) | `combat-companion-reference.mjs`, `combat-pet-stats.mjs` | M2 | M | Pet values explicit |

## Recommended first implementation batch

M1, M3 and M2 (in that order), all without game evidence.

- M1 is the cheapest measurable gain: up to 83 talents can move from unverified or partial toward verified without new mechanics. The result may be lower than 83: any mismatch is a defect to fix, not a test to skip.
- M3 removes about 100 rules that currently never apply.
- M2 is the shared mechanic that unlocks the largest pending group, and later tasks reuse it.

### Acceptance criteria and regression tests

| Task | Acceptance | Tests |
|---|---|---|
| M1 | Each hooked talent has a named deterministic test comparing combat input at ranks 0 to max with the published `rankParameters`. Audit counts regenerate; every change in classification is listed in the PR. | `tests/sim/talent-integration.test.mjs`; the audit drift check `tests/sim/talent-audit.test.mjs` stays green. |
| M3 | Unattached-scope count 46 to 0 or each remaining one has a stated reason; recorded-not-computed 48 to 0 or explained. No change in any compiled ability value that was already verified. | Per-rank tests for each mapped scope; existing `combat-ability-modifiers.test.mjs`. |
| M2 | A trigger spec (event, chance, effect, duration, stacks, charges, ICD) drives at least Flurry, Redoubt and Swift Aspects. Seeded runs are reproducible; proc counts and uptime match chance and duration within statistical bounds; no recursion. Missing parameters fail closed with a named input. | New `tests/sim/combat-talent-triggers.test.mjs` plus existing `combat-buff-runtime`, `combat-cast-procs`, `combat-proc-rates` tests. |
| M4 | Crit-triggered periodic effects refresh, stack and expire per explicit policy; damage scales with the data's rank values. | Periodic-engine tests with seeded crits. |
| M5 | Resource gains never exceed the cap and wasted overflow is reported; spending never goes negative. | Extend `tests/vigor-and-saved-builds.test.mjs` energy tests and `tests/sim/energy-cap.test.mjs`. |
| M6 | Report gives compiled, rejected and unrecognised counts by pattern. | Snapshot-style test on the audit output. |

Every task: the sim suite (696 tests at this checkpoint) and the Python suite stay green, `node tests/sim/browser-smoke.mjs` passes, and Run Simulation stays disabled. Passing these tests proves the implementation matches the data it was given, not that it matches OctoWoW.

## Immediate versus blocked

- **Can start now:** M1, M2, M3, M4, M5, M6, M7, M9, M10, M12, and writing M8.
- **Blocked on game evidence for accuracy:** G1 to G8, base-stat rows, proc rates, regeneration, any final DPS comparison (M11 partly).
