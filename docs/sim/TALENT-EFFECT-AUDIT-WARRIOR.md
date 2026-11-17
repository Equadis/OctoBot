# Warrior: talent calculation audit and implementation ledger

**Repository:** [Equadis/OctoBot](https://github.com/Equadis/OctoBot) · **branch:** `audit/talent-effects-warrior` · **source:** [OctoWoW published talent calculator](https://octowow.st/talents/warrior/) (2026-11-11T23:29:44.088091+00:00, SHA-256 `b8b800af1b9e2927d3fc7647a155fcf7fc87f216f520b8bf3d2782d2bf2879a2`).

## Coverage summary

| Measure | Count |
|---|---:|
| Imported talents | 54 |
| Talents with individual reviewed registry entries | 54 |
| At least one character-sheet or weapon-derived effect | 11 |
| Scoped numeric rules (not all have final absolute calculations) | 26 |
| Simulation/event-only records | 17 |

**Important:** The second and third categories are not completed DPS/TPS/HPS mechanics. A school, attack type or pet effect may be described numerically without being incorporated into a full combat outcome. The planner uses unverified base coefficients and must not be represented as a validated OctoWoW simulator.

## Phase 2: calculation integration

Exact off-hand hit rank vector, polearm range, shield-condition gating, Heroic Strike Rage reduction, Slam cast/GCD calculations.

The planner combines applicable talent modifiers across explicit ability profiles. Unknown base damage, cost, timing, pet stats and live stacking are not invented: relative multipliers/reductions and reference hit/crit estimates are shown. Scenario controls are inactive by default; event-only effects are not simulated. Additive percentage stacking in the isolated estimator is a provisional modelling choice pending live validation. Tests: `tests/sim/talent-calculations.test.mjs` and existing planner tests.

## Exact classification of all 54 talents

| ID | Talent | Ranks | Status | Effect / precise unresolved dependency |
|---:|---|---:|---|---|
| 56 | Improved Heroic Strike | 3 | Scoped numeric rule | scoped: Heroic Strike rageCostReduction; rank vector 0 |
| 57 | Tactical Mastery | 5 | Scoped numeric rule | scoped: Stance switching rageRetained; rank vector 0 |
| 58 | Improved Rend | 2 | Scoped numeric rule | scoped: Rend bleed damagePct; rank vector 0 |
| 59 | Improved Charge | 2 | Scoped numeric rule | scoped: Charge rageGained; rank vector 0 |
| 60 | Deflection | 5 | Sheet/weapon contribution | global:  parry; rank vector 0 |
| 61 | Improved Thunder Clap | 3 | Scoped numeric rule | scoped: Thunder Clap rageCostReduction; rank vector 0; scoped: Thunder Clap damagePct; rank vector 1 |
| 62 | Master Strike | 1 | Event pending | PENDING: Master Strike is an activated weapon-dependent ability: damage and mace/sword/axe/polearm outcomes require an attack and target-state model |
| 63 | Improved Overpower | 2 | Scoped numeric rule | scoped: Overpower criticalChance; rank vector 0 |
| 64 | Deep Wounds | 3 | Event pending | PENDING: Critical hits trigger Deep Wounds over time based on weapon average damage; uptime, tick and crit modelling pending |
| 65 | Two-Handed Weapon Specialization | 3 | Sheet/weapon contribution | weapon: twohand damagePct; rank vector 0; weapon: twohand skill; rank vector 1 |
| 66 | Impale | 2 | Scoped numeric rule | scoped: Battle/Defensive/Berserker abilities criticalDamage; rank vector 0 |
| 67 | Master of Arms | 5 | Sheet/weapon contribution | weapon: axe crit; rank vector 0; weapon: mace armorPen; rank vector 1; PENDING: Sword extra-attack proc and polearm range require combat/range support; weapon: polearm rangeYards; rank vector 3 |
| 68 | Sweeping Strikes | 1 | Event pending | PENDING: Sweeping Strikes is a five-charge on-use multi-target effect; requires target count and charge consumption |
| 69 | Boundless Anger | 3 | Sheet/weapon contribution | special:  maxRage; rank vector 0 |
| 70 | Improved Disciplines | 3 | Scoped numeric rule | scoped: Retaliation/Recklessness/Shield Wall cooldownReductionMinutes; rank vector 0 |
| 71 | Improved Slam | 2 | Scoped numeric rule | scoped: Slam castTimeReductionSeconds; rank vector 0; scoped: Slam globalCooldownReductionSeconds; rank vector 0 |
| 72 | Precision Cut | 3 | Scoped numeric rule | scoped: Execute per extra Rage damagePct; rank vector 0 |
| 73 | Mortal Strike | 1 | Event pending | PENDING: Mortal Strike active weapon strike plus target-healing reduction; no attack table or target healing model yet |
| 93 | Booming Voice | 5 | Scoped numeric rule | scoped: Shouts areaOfEffectPct; rank vector 0; scoped: Battle/Demoralizing Shout durationPct; rank vector 1 |
| 94 | Cruelty | 5 | Sheet/weapon contribution | global:  crit; rank vector 0 |
| 95 | Dual Wield Specialization | 5 | Sheet/weapon contribution | offhand:  damagePct; rank vector 0; offhand:  hit; rank vector 1 |
| 96 | Unbridled Wrath | 5 | Event pending | PENDING: Chance-based rage generated on weapon hits, doubled for two-handed weapons; requires attack event timing |
| 97 | Improved Shouts | 5 | Sheet/weapon contribution | PENDING: Increases the strength of selected shouts; buff source/stacking verification needed; scoped: Battle Shout attackPowerBonusPct; rank vector 0; scoped: Demoralizing Shout attackPowerReductionPct; rank vector 1; buff: battle-shout ap; rank vector 0 |
| 98 | Piercing Howl | 1 | Event pending | PENDING: Piercing Howl is an active nearby-area snare; no target movement or area combat engine |
| 99 | Blood Craze | 3 | Event pending | PENDING: Blood Craze heals after receiving a critical strike; needs incoming combat events |
| 100 | Battlefield Mobility | 2 | Scoped numeric rule | scoped: Intercept/Intervene cooldownReductionSeconds; rank vector 0; scoped: Charge cooldownReductionSeconds; rank vector 1 |
| 101 | Enrage | 5 | Event pending | PENDING: Enrage 8-second melee-damage proc requires received critical-hit events and uptime |
| 102 | Improved Pummel | 2 | Scoped numeric rule | scoped: Pummel school lockout durationIncreaseSeconds; rank vector 1; PENDING: Pummel slow is proc/ability-specific |
| 103 | Ravager | 3 | Scoped numeric rule | scoped: Whirlwind cooldownReductionSeconds; rank vector 0; scoped: Cleave rageCostReduction; rank vector 1 |
| 104 | Death Wish | 1 | Event pending | PENDING: Death Wish on-use temporary damage/fear/armour/resistance trade-off; must not count permanently |
| 105 | Improved Execute | 2 | Scoped numeric rule | scoped: Execute rageCostReduction; rank vector 0 |
| 106 | Improved Berserker Rage | 2 | Scoped numeric rule | scoped: Berserker Rage activation rageGenerated; rank vector 0; PENDING: Movement impairment break occurs when Berserker Rage is activated |
| 107 | Flurry | 5 | Event pending | PENDING: Flurry is a three-swing proc, not permanent attack speed |
| 108 | Blood Drinker | 3 | Event pending | PENDING: Blood Drinker restores health per melee strike only while Enrage/Death Wish/Recklessness is active; requires aura and attack events |
| 109 | Bloodthirst | 1 | Event pending | PENDING: Bloodthirst active physical strike and 6-second movement buff require attack and aura models |
| 74 | Improved Bloodrage | 2 | Scoped numeric rule | scoped: Bloodrage instantRageGained; rank vector 0 |
| 75 | Shield Specialization | 5 | Sheet/weapon contribution | special:  blockChance; rank vector 0; only {"shield":true}; PENDING: Rage generated after a successful block requires combat simulation |
| 76 | Anticipation | 3 | Sheet/weapon contribution | global:  defense; rank vector 0 |
| 77 | Iron Will | 5 | Scoped numeric rule | scoped: Stun/Charm resistChancePct; rank vector 0 |
| 78 | Toughness | 5 | Sheet/weapon contribution | special:  itemArmourPct; rank vector 0; special:  shieldBlockValuePct; rank vector 1; only {"shield":true} |
| 79 | Last Stand | 1 | Event pending | PENDING: Last Stand temporarily increases maximum health and later removes it; cannot count as baseline health |
| 80 | Improved Intervene | 2 | Event pending | PENDING: Temporary movement-impairment immunity follows active Intervene use |
| 81 | Improved Taunt | 2 | Scoped numeric rule | scoped: Taunt cooldownReductionSeconds; rank vector 0 |
| 82 | Improved Revenge | 3 | Scoped numeric rule | scoped: Revenge stunChancePct; rank vector 0; scoped: Revenge cooldownReductionSeconds; rank vector 1 |
| 83 | Gag Order | 2 | Event pending | PENDING: Shield Slam dispel and Shield Bash silence require successful active attacks and target auras |
| 84 | Improved Disarm | 2 | Scoped numeric rule | scoped: Disarm cooldownReductionSeconds; rank vector 0 |
| 85 | Defiance | 5 | Scoped numeric rule | scoped: Defensive Stance threatPct; rank vector 0; only {"stance":"Defensive"} |
| 86 | One-Handed Weapon Specialization | 5 | Sheet/weapon contribution | weapon: onehand damagePct; rank vector 0 |
| 87 | Shield Slam | 1 | Event pending | PENDING: Shield Slam is an active damage/threat/dispel ability; requires shield block value and ability attack resolution |
| 88 | Improved Shield Slam | 2 | Scoped numeric rule | scoped: Shield Slam cooldownReductionSeconds; rank vector 0; PENDING: Temporary next-attack block chance requires an event model |
| 89 | Reprisal | 2 | Scoped numeric rule | scoped: Revenge damagePct; rank vector 0; PENDING: Refund Rage on hit is event-dependent |
| 90 | Improved Shield Wall | 2 | Scoped numeric rule | scoped: Shield Wall durationIncreaseSeconds; rank vector 0; scoped: Shield Wall cooldownReductionMinutes; rank vector 1 |
| 91 | Defensive Tactics | 3 | Scoped numeric rule | scoped: Non-Defensive stance with shield retainedDefensiveThreatPct; rank vector 0; only {"shield":true,"stance":["Battle","Berserker"]} |
| 92 | Concussion Blow | 1 | Event pending | PENDING: Concussion Blow is an active shield-related strike with stun, threat, full armour penetration and rage generation |

## Known source and validation limitations

- **Master of Arms:** Axe crit is weapon-specific, while mace armour penetration scales with level. Sword extra-attacks and polearm range are deliberately separated from static crit/armour penetration.
- **Dual Wield Specialization:** Additional hit is for the equipped off-hand alone; main-hand hit must remain unchanged.
- The published calculator is a definition source, not a demonstration that the live server uses precisely the same mechanics.
- Abilities requiring attack outcomes, time, procs, cast resolution, cooldown reset, movement, party state or target debuffs must be validated in a combat engine.
- Gear, buffs, forms/stances and weapon choices require controlled in-game stacking and rounding comparisons.
- All existing and new regression tests are run by `.github/workflows/talent-branch-tests.yml` on this branch.

**Do not merge this branch directly together with another class branch without consolidating their separate `docs/sim/core/talent-rules.mjs` exports.** Each branch is isolated intentionally so independent class verification remains possible; `main` has not been altered by this audit.
