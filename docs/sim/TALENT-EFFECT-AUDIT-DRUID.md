# Druid: talent calculation audit and implementation ledger

**Repository:** [Equadis/OctoBot](https://github.com/Equadis/OctoBot) · **branch:** `audit/talent-effects-druid` · **source:** [OctoWoW published talent calculator](https://octowow.st/talents/druid/) (2026-11-11T23:29:44.058837+00:00, SHA-256 `7137a9837ef004335ceefa79899e196be18fcdde24f303cbbd4615deb26d5bdc`).

## Coverage summary

| Measure | Count |
|---|---:|
| Imported talents | 54 |
| Talents with individual reviewed registry entries | 54 |
| At least one character-sheet or weapon-derived effect | 7 |
| Scoped reference contributions only | 28 |
| Simulation/event-only records | 19 |

**Important:** The second and third categories are not completed DPS/TPS/HPS mechanics. A school, attack type or pet effect may be described numerically without being incorporated into a full combat outcome. The planner uses unverified base coefficients and must not be represented as a validated OctoWoW simulator.

## Exact classification of all 54 talents

| ID | Talent | Ranks | Status | Effect / precise unresolved dependency |
|---:|---|---:|---|---|
| 301 | Improved Wrath | 5 | Scoped/pending | SCOPED ONLY scoped Wrath castTimeReductionSeconds (rank vector 0); SCOPED ONLY scoped Wrath globalCooldownReductionSeconds (rank vector 0) |
| 302 | Nature's Grasp | 1 | Event pending | SIMULATION PENDING — Nature's Grasp is an outdoor active one-charge reactive root; requires incoming attack and outdoor context |
| 303 | Improved Nature's Grasp | 4 | Event pending | SIMULATION PENDING — Improved Nature's Grasp increases chance of root application from active Nature's Grasp charges, not passive dodge |
| 304 | Sylvan Blessing | 2 | Event pending | SIMULATION PENDING — Sylvan Blessing triggers full while-casting mana regeneration only after killing an eligible target |
| 305 | Guidance of the Dream | 3 | Scoped/pending | SCOPED ONLY scoped Balance spell casting pushbackAvoidancePct (rank vector 0) |
| 306 | Improved Moonfire | 2 | Scoped/pending | SCOPED ONLY spell Moonfire crit (rank vector 0) |
| 307 | Natural Weapons | 3 | Sheet contribution | CHARACTER-SHEET global  hit (rank vector 1); CHARACTER-SHEET global  spellHit (rank vector 1); SCOPED ONLY scoped All physical attacks damagePct (rank vector 0) |
| 308 | Natural Shapeshifter | 3 | Scoped/pending | SCOPED ONLY scoped Shapeshifting manaCostReductionPct (rank vector 0) |
| 309 | Moonfury | 3 | Scoped/pending | SCOPED ONLY scoped Starfire/Moonfire/Hurricane/Insect Swarm/Wrath damagePct (rank vector 0) |
| 310 | Omen of Clarity | 1 | Event pending | SIMULATION PENDING — Omen of Clarity triggers Clearcasting from melee hits/spell casts and consumes a later ability cost |
| 311 | Nature's Reach | 2 | Scoped/pending | SCOPED ONLY scoped Balance/utility spells rangeIncreasePct (rank vector 0) |
| 312 | Vengeance | 5 | Scoped/pending | SCOPED ONLY scoped Starfire/Moonfire/Wrath criticalDamagePct (rank vector 0) |
| 313 | Moonglow | 3 | Scoped/pending | SCOPED ONLY scoped Balance and healing spells manaCostReductionPct (rank vector 0) |
| 314 | Owlkin Frenzy | 3 | Event pending | SIMULATION PENDING — Owlkin Frenzy can trigger only after taking damage in Moonkin form; mana regeneration and pushback aura require incoming events |
| 315 | Moonkin Form | 1 | Event pending | SIMULATION PENDING — The Moonkin form armour multiplier is implemented by the existing form calculator. Remaining spell mana/damage effects need modelling. |
| 316 | Nature's Grace | 1 | Event pending | SIMULATION PENDING — Nature's Grace shortens only the next cast following a spell critical |
| 317 | Improved Starfire | 3 | Scoped/pending | SCOPED ONLY scoped Starfire castTimeReductionSeconds (rank vector 0); SIMULATION PENDING — Starfire stun chance requires hit/event resolution |
| 318 | Balance of All Things | 3 | Event pending | SIMULATION PENDING — Balance of All Things refunds mana only for Wrath against Insect Swarm targets and raises Starfire crit only against Moonfire targets |
| 319 | Gale Winds | 2 | Scoped/pending | SCOPED ONLY scoped Hurricane manaCostReductionPct (rank vector 0); SCOPED ONLY scoped Hurricane target slow attackSpeedReductionPct (rank vector 1) |
| 320 | Eclipse | 1 | Event pending | SIMULATION PENDING — Eclipse is two triggered Arcane/Nature damage auras from Wrath/Starfire; proc and spell-family modelling pending |
| 267 | Ferocity | 5 | Scoped/pending | SCOPED ONLY scoped Feral abilities rageEnergyCostReduction (rank vector 0) |
| 268 | Feral Aggression | 5 | Scoped/pending | SCOPED ONLY scoped Demoralizing Roar attackPowerReductionPct (rank vector 0); SCOPED ONLY scoped Ferocious Bite damagePct (rank vector 1) |
| 269 | Feral Instinct | 3 | Scoped/pending | SCOPED ONLY scoped Bear Form threatPct (rank vector 0); only if {"form":"Bear"} |
| 270 | Brutal Impact | 2 | Scoped/pending | SCOPED ONLY scoped Bash/Pounce stunDurationIncreaseSeconds (rank vector 0) |
| 271 | Thick Hide | 3 | Sheet contribution | CHARACTER-SHEET special  itemArmourPct (rank vector 0) |
| 272 | Open Wounds | 3 | Scoped/pending | SCOPED ONLY scoped Rip damagePct (rank vector 0); SCOPED ONLY scoped Claw per active Bleed damagePct (rank vector 1) |
| 273 | Feral Swiftness | 2 | Sheet contribution | CHARACTER-SHEET global  dodge (rank vector 1); only if {"form":["Cat","Bear"]}; SIMULATION PENDING — Outdoor Cat Form movement speed is not a permanent combat stat |
| 274 | Feral Charge | 1 | Event pending | SIMULATION PENDING — Feral Charge is an active charge/interrupt/immobilise ability with range and target context |
| 275 | Sharpened Claws | 3 | Sheet contribution | CHARACTER-SHEET global  crit (rank vector 0); only if {"form":["Cat","Bear"]} |
| 276 | Primal Fury | 2 | Event pending | SIMULATION PENDING — Primal Fury generates Rage after Bear critical hits or extra combo points after Cat critical builders |
| 277 | Predatory Strikes | 3 | Sheet contribution | CHARACTER-SHEET special  apPct (rank vector 0); only if {"form":["Cat","Bear"]}; SCOPED ONLY scoped Claw/Rake/Maul/Swipe/Savage Bite damagePct (rank vector 1) |
| 278 | Blood Frenzy | 2 | Scoped/pending | SCOPED ONLY scoped Tiger's Fury durationIncreaseSeconds (rank vector 0); SCOPED ONLY scoped Enrage instantRageGained (rank vector 1); SIMULATION PENDING — Attack speed increase from active Tiger's Fury/Enrage is not passive |
| 279 | Improved Shred | 2 | Scoped/pending | SCOPED ONLY scoped Shred damagePct (rank vector 0); SCOPED ONLY scoped Shred energyCostReduction (rank vector 1) |
| 280 | Ancient Brutality | 2 | Event pending | SIMULATION PENDING — Ancient Brutality triggers Rage on Bear dodge and modifies Cat periodic-bleed mechanics; event and aura modelling pending |
| 281 | Berserk | 1 | Event pending | SIMULATION PENDING — Berserk is a temporary form-specific on-use buff; Cat Energy regeneration or Bear maximum health must not be permanently inflated |
| 282 | Heart of the Wild | 5 | Sheet contribution | CHARACTER-SHEET percent  int (rank vector 0); CHARACTER-SHEET percent  sta (rank vector 1); only if {"form":"Bear"}; CHARACTER-SHEET percent  str (rank vector 2); only if {"form":"Cat"} |
| 283 | Carnage | 2 | Event pending | SIMULATION PENDING — Carnage returns ability damage as healing and conditionally refreshes bleeds from Ferocious Bite; needs target and attack events |
| 284 | Leader of the Pack | 1 | Scoped/pending | SCOPED ONLY scoped Leader of the Pack partyCritPct (explicit [3]); only if {"form":["Cat","Bear"]}; SIMULATION PENDING — Aura self-application/party eligibility not independently validated |
| 285 | Improved Mark of the Wild | 5 | Sheet contribution | SCOPED ONLY scoped Mark/Gift of the Wild buffEffectivenessPct (rank vector 0); CHARACTER-SHEET buff wild str (rank vector 0); CHARACTER-SHEET buff wild agi (rank vector 0); CHARACTER-SHEET buff wild sta (rank vector 0) |
| 286 | Furor | 5 | Event pending | SIMULATION PENDING — Furor gains Rage/Energy on changing to Bear/Cat forms, rather than adding a passive resource cap |
| 287 | Improved Healing Touch | 5 | Scoped/pending | SCOPED ONLY scoped Healing Touch castTimeReductionSeconds (rank vector 0) |
| 288 | Nature's Focus | 5 | Scoped/pending | SCOPED ONLY scoped Healing Touch/Regrowth/Tranquility pushbackAvoidancePct (rank vector 0) |
| 289 | Subtlety | 5 | Scoped/pending | SCOPED ONLY scoped Spells threatReductionPct (rank vector 0) |
| 290 | Swiftmend | 1 | Event pending | SIMULATION PENDING — Swiftmend consumes existing Rejuvenation/Regrowth on the chosen target; needs a target HoT model |
| 291 | Genesis | 3 | Scoped/pending | SCOPED ONLY scoped Periodic magic damageAndHealingPct (rank vector 0) |
| 292 | Reflection | 3 | Scoped/pending | SCOPED ONLY scoped Mana regeneration while casting regenPct (rank vector 0) |
| 293 | Gift of Nature | 5 | Scoped/pending | SCOPED ONLY scoped Healing spells healingPct (rank vector 0) |
| 294 | Tranquil Spirit | 5 | Scoped/pending | SCOPED ONLY scoped Healing Touch/Regrowth/Tranquility manaCostReductionPct (rank vector 0) |
| 295 | Aessina's Bloom | 2 | Event pending | SIMULATION PENDING — Aessina's Bloom requires a target with Regrowth/Rejuvenation and grants a temporary Healing Touch cast-cost effect |
| 296 | Nature's Swiftness | 1 | Event pending | SIMULATION PENDING — Nature's Swiftness is an on-use next-Nature-spell instant cast |
| 297 | Preservation | 3 | Scoped/pending | SCOPED ONLY scoped Regrowth with Rejuvenation periodicHealingPct (rank vector 0) |
| 298 | Improved Regrowth | 5 | Scoped/pending | SCOPED ONLY spell Regrowth crit (rank vector 0) |
| 299 | Improved Tranquility | 2 | Scoped/pending | SCOPED ONLY scoped Tranquility healingPct (rank vector 0) |
| 300 | Tree of Life Form | 1 | Event pending | SIMULATION PENDING — Tree of Life cannot currently be selected in class form options; do not assume its aura or armour effect is active |

## Known source and validation limitations

- **Form eligibility:** Feral dodge/crit and attribute modifiers must apply only in the matching Cat or Bear form. A selected form does not imply a proc is active.
- The published calculator is a definition source, not a demonstration that the live server uses precisely the same mechanics.
- Abilities requiring attack outcomes, time, procs, cast resolution, cooldown reset, movement, party state or target debuffs must be validated in a combat engine.
- Gear, buffs, forms/stances and weapon choices require controlled in-game stacking and rounding comparisons.
- All existing and new regression tests are run by `.github/workflows/talent-branch-tests.yml` on this branch.

**Do not merge this branch directly together with another class branch without consolidating their separate `docs/sim/core/talent-rules.mjs` exports.** Each branch is isolated intentionally so independent class verification remains possible; `main` has not been altered by this audit.
