# Druid: talent calculation audit and implementation ledger

**Repository:** [Equadis/OctoBot](https://github.com/Equadis/OctoBot) · **branch:** `audit/talent-effects-druid` · **source:** [OctoWoW published talent calculator](https://octowow.st/talents/druid/) (2026-11-11T23:29:44.058837+00:00, SHA-256 `7137a9837ef004335ceefa79899e196be18fcdde24f303cbbd4615deb26d5bdc`).

## Coverage summary

| Measure | Count |
|---|---:|
| Imported talents | 54 |
| Talents with individual reviewed registry entries | 54 |
| At least one character-sheet or weapon-derived effect | 9 |
| Scoped numeric rules (not all have final absolute calculations) | 28 |
| Simulation/event-only records | 17 |

**Important:** The second and third categories are not completed DPS/TPS/HPS mechanics. A school, attack type or pet effect may be described numerically without being incorporated into a full combat outcome. The planner uses unverified base coefficients and must not be represented as a validated OctoWoW simulator.

## Phase 2: calculation integration

Moonfire school and individual damage, Moonkin item-only armour and mana cost, Cat bleed count, gated target Moonfire/Insect Swarm/Rejuvenation effects, and nonduplicated Feral aura.

The planner combines applicable talent modifiers across explicit ability profiles. Unknown base damage, cost, timing, pet stats and live stacking are not invented: relative multipliers/reductions and reference hit/crit estimates are shown. Scenario controls are inactive by default; event-only effects are not simulated. Additive percentage stacking in the isolated estimator is a provisional modelling choice pending live validation. Tests: `tests/sim/talent-calculations.test.mjs` and existing planner tests.

## Exact classification of all 54 talents

| ID | Talent | Ranks | Status | Effect / precise unresolved dependency |
|---:|---|---:|---|---|
| 301 | Improved Wrath | 5 | Scoped numeric rule | scoped: Wrath castTimeReductionSeconds; rank vector 0; scoped: Wrath globalCooldownReductionSeconds; rank vector 0 |
| 302 | Nature's Grasp | 1 | Event pending | PENDING: Nature's Grasp is an outdoor active one-charge reactive root; requires incoming attack and outdoor context |
| 303 | Improved Nature's Grasp | 4 | Event pending | PENDING: Improved Nature's Grasp increases chance of root application from active Nature's Grasp charges, not passive dodge |
| 304 | Sylvan Blessing | 2 | Event pending | PENDING: Sylvan Blessing triggers full while-casting mana regeneration only after killing an eligible target |
| 305 | Guidance of the Dream | 3 | Scoped numeric rule | scoped: Balance spell casting pushbackAvoidancePct; rank vector 0 |
| 306 | Improved Moonfire | 2 | Scoped numeric rule | spell: Moonfire crit; rank vector 0; spell: Moonfire damagePct; rank vector 0 |
| 307 | Natural Weapons | 3 | Sheet/weapon contribution | global:  hit; rank vector 1; global:  spellHit; rank vector 1; scoped: All physical attacks damagePct; rank vector 0; special:  weaponDamagePct; rank vector 0 |
| 308 | Natural Shapeshifter | 3 | Scoped numeric rule | scoped: Shapeshifting manaCostReductionPct; rank vector 0 |
| 309 | Moonfury | 3 | Scoped numeric rule | scoped: Starfire/Moonfire/Hurricane/Insect Swarm/Wrath damagePct; rank vector 0 |
| 310 | Omen of Clarity | 1 | Event pending | PENDING: Omen of Clarity triggers Clearcasting from melee hits/spell casts and consumes a later ability cost |
| 311 | Nature's Reach | 2 | Scoped numeric rule | scoped: Balance/utility spells rangeIncreasePct; rank vector 0 |
| 312 | Vengeance | 5 | Scoped numeric rule | scoped: Starfire/Moonfire/Wrath criticalDamagePct; rank vector 0 |
| 313 | Moonglow | 3 | Scoped numeric rule | scoped: Balance and healing spells manaCostReductionPct; rank vector 0 |
| 314 | Owlkin Frenzy | 3 | Event pending | PENDING: Owlkin Frenzy can trigger only after taking damage in Moonkin form; mana regeneration and pushback aura require incoming events |
| 315 | Moonkin Form | 1 | Sheet/weapon contribution | PENDING: The Moonkin form armour multiplier is implemented by the existing form calculator. Remaining spell mana/damage effects need modelling.; special:  formItemArmourPct; explicit [180]; only {"form":"Moonkin"}; scoped: Balance spells manaCostReductionPct; explicit [20]; only {"form":"Moonkin"} |
| 316 | Nature's Grace | 1 | Event pending | PENDING: Nature's Grace shortens only the next cast following a spell critical |
| 317 | Improved Starfire | 3 | Scoped numeric rule | scoped: Starfire castTimeReductionSeconds; rank vector 0; PENDING: Starfire stun chance requires hit/event resolution |
| 318 | Balance of All Things | 3 | Scoped numeric rule | scoped: Wrath manaRefundPct; rank vector 0; only {"targetInsectSwarm":"On"}; scoped: Starfire crit; rank vector 1; only {"targetMoonfire":"On"}; PENDING: Wrath mana refund requires damage to land; scenario preview is not a net unconditional cast cost |
| 319 | Gale Winds | 2 | Scoped numeric rule | scoped: Hurricane manaCostReductionPct; rank vector 0; scoped: Hurricane target slow attackSpeedReductionPct; rank vector 1 |
| 320 | Eclipse | 1 | Event pending | PENDING: Eclipse is two triggered Arcane/Nature damage auras from Wrath/Starfire; proc and spell-family modelling pending |
| 267 | Ferocity | 5 | Scoped numeric rule | scoped: Feral abilities rageEnergyCostReduction; rank vector 0 |
| 268 | Feral Aggression | 5 | Scoped numeric rule | scoped: Demoralizing Roar attackPowerReductionPct; rank vector 0; scoped: Ferocious Bite damagePct; rank vector 1 |
| 269 | Feral Instinct | 3 | Scoped numeric rule | scoped: Bear Form threatPct; rank vector 0; only {"form":"Bear"} |
| 270 | Brutal Impact | 2 | Scoped numeric rule | scoped: Bash/Pounce stunDurationIncreaseSeconds; rank vector 0 |
| 271 | Thick Hide | 3 | Sheet/weapon contribution | special:  itemArmourPct; rank vector 0 |
| 272 | Open Wounds | 3 | Scoped numeric rule | scoped: Rip damagePct; rank vector 0; scoped: Claw per active Bleed damagePct; rank vector 1; per activeBleeds |
| 273 | Feral Swiftness | 2 | Sheet/weapon contribution | global:  dodge; rank vector 1; only {"form":["Cat","Bear"]}; PENDING: Outdoor Cat Form movement speed is not a permanent combat stat; scoped: Cat outdoor movement movementSpeedPct; rank vector 0; only {"form":"Cat","outdoors":"Yes"} |
| 274 | Feral Charge | 1 | Event pending | PENDING: Feral Charge is an active charge/interrupt/immobilise ability with range and target context |
| 275 | Sharpened Claws | 3 | Sheet/weapon contribution | global:  crit; rank vector 0; only {"form":["Cat","Bear"]} |
| 276 | Primal Fury | 2 | Event pending | PENDING: Primal Fury generates Rage after Bear critical hits or extra combo points after Cat critical builders |
| 277 | Predatory Strikes | 3 | Sheet/weapon contribution | special:  apPct; rank vector 0; only {"form":["Cat","Bear"]}; scoped: Claw/Rake/Maul/Swipe/Savage Bite damagePct; rank vector 1 |
| 278 | Blood Frenzy | 2 | Scoped numeric rule | scoped: Tiger's Fury durationIncreaseSeconds; rank vector 0; scoped: Enrage instantRageGained; rank vector 1; PENDING: Attack speed increase from active Tiger's Fury/Enrage is not passive |
| 279 | Improved Shred | 2 | Scoped numeric rule | scoped: Shred damagePct; rank vector 0; scoped: Shred energyCostReduction; rank vector 1 |
| 280 | Ancient Brutality | 2 | Event pending | PENDING: Ancient Brutality triggers Rage on Bear dodge and modifies Cat periodic-bleed mechanics; event and aura modelling pending |
| 281 | Berserk | 1 | Event pending | PENDING: Berserk is a temporary form-specific on-use buff; Cat Energy regeneration or Bear maximum health must not be permanently inflated |
| 282 | Heart of the Wild | 5 | Sheet/weapon contribution | percent:  int; rank vector 0; percent:  sta; rank vector 1; only {"form":"Bear"}; percent:  str; rank vector 2; only {"form":"Cat"} |
| 283 | Carnage | 2 | Event pending | PENDING: Carnage returns ability damage as healing and conditionally refreshes bleeds from Ferocious Bite; needs target and attack events |
| 284 | Leader of the Pack | 1 | Sheet/weapon contribution | scoped: Leader of the Pack partyCritPct; explicit [3]; only {"form":["Cat","Bear"]}; PENDING: Aura self-application/party eligibility not independently validated; special:  feralPackCrit; explicit [3]; only {"form":["Cat","Bear"]} |
| 285 | Improved Mark of the Wild | 5 | Sheet/weapon contribution | scoped: Mark/Gift of the Wild buffEffectivenessPct; rank vector 0; buff: wild str; rank vector 0; buff: wild agi; rank vector 0; buff: wild sta; rank vector 0 |
| 286 | Furor | 5 | Event pending | PENDING: Furor gains Rage/Energy on changing to Bear/Cat forms, rather than adding a passive resource cap |
| 287 | Improved Healing Touch | 5 | Scoped numeric rule | scoped: Healing Touch castTimeReductionSeconds; rank vector 0 |
| 288 | Nature's Focus | 5 | Scoped numeric rule | scoped: Healing Touch/Regrowth/Tranquility pushbackAvoidancePct; rank vector 0 |
| 289 | Subtlety | 5 | Scoped numeric rule | scoped: Spells threatReductionPct; rank vector 0 |
| 290 | Swiftmend | 1 | Event pending | PENDING: Swiftmend consumes existing Rejuvenation/Regrowth on the chosen target; needs a target HoT model |
| 291 | Genesis | 3 | Scoped numeric rule | scoped: Periodic magic damageAndHealingPct; rank vector 0 |
| 292 | Reflection | 3 | Scoped numeric rule | scoped: Mana regeneration while casting regenPct; rank vector 0 |
| 293 | Gift of Nature | 5 | Scoped numeric rule | scoped: Healing spells healingPct; rank vector 0 |
| 294 | Tranquil Spirit | 5 | Scoped numeric rule | scoped: Healing Touch/Regrowth/Tranquility manaCostReductionPct; rank vector 0 |
| 295 | Aessina's Bloom | 2 | Event pending | PENDING: Aessina's Bloom requires a target with Regrowth/Rejuvenation and grants a temporary Healing Touch cast-cost effect |
| 296 | Nature's Swiftness | 1 | Event pending | PENDING: Nature's Swiftness is an on-use next-Nature-spell instant cast |
| 297 | Preservation | 3 | Scoped numeric rule | scoped: Regrowth with Rejuvenation periodicHealingPct; rank vector 0; only {"targetRejuvenation":"On"} |
| 298 | Improved Regrowth | 5 | Scoped numeric rule | spell: Regrowth crit; rank vector 0 |
| 299 | Improved Tranquility | 2 | Scoped numeric rule | scoped: Tranquility healingPct; rank vector 0 |
| 300 | Tree of Life Form | 1 | Event pending | PENDING: Tree of Life cannot currently be selected in class form options; do not assume its aura or armour effect is active |

## Known source and validation limitations

- **Form eligibility:** Feral dodge/crit and attribute modifiers must apply only in the matching Cat or Bear form. A selected form does not imply a proc is active.
- The published calculator is a definition source, not a demonstration that the live server uses precisely the same mechanics.
- Abilities requiring attack outcomes, time, procs, cast resolution, cooldown reset, movement, party state or target debuffs must be validated in a combat engine.
- Gear, buffs, forms/stances and weapon choices require controlled in-game stacking and rounding comparisons.
- All existing and new regression tests are run by `.github/workflows/talent-branch-tests.yml` on this branch.

**Do not merge this branch directly together with another class branch without consolidating their separate `docs/sim/core/talent-rules.mjs` exports.** Each branch is isolated intentionally so independent class verification remains possible; `main` has not been altered by this audit.
