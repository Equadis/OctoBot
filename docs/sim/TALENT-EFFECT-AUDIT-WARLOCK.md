# Warlock: talent calculation audit and implementation ledger

**Repository:** [Equadis/OctoBot](https://github.com/Equadis/OctoBot) · **branch:** `audit/talent-effects-warlock` · **source:** [OctoWoW published talent calculator](https://octowow.st/talents/warlock/) (2026-11-11T23:29:44.072927+00:00, SHA-256 `d468b1c035cfcbb2572a508d84e37d184e17c009bcfe5db399db175a4c6ced81`).

## Coverage summary

| Measure | Count |
|---|---:|
| Imported talents | 52 |
| Talents with individual reviewed registry entries | 52 |
| At least one character-sheet or weapon-derived effect | 2 |
| Scoped reference contributions only | 35 |
| Simulation/event-only records | 15 |

**Important:** The second and third categories are not completed DPS/TPS/HPS mechanics. A school, attack type or pet effect may be described numerically without being incorporated into a full combat outcome. The planner uses unverified base coefficients and must not be represented as a validated OctoWoW simulator.

## Exact classification of all 52 talents

| ID | Talent | Ranks | Status | Effect / precise unresolved dependency |
|---:|---|---:|---|---|
| 337 | Suppression | 5 | Scoped/pending | SCOPED ONLY spell Affliction hit (rank vector 0) |
| 338 | Improved Corruption | 5 | Scoped/pending | SCOPED ONLY scoped Corruption castTimeReductionSeconds (rank vector 0) |
| 339 | Improved Curse of Weakness | 2 | Scoped/pending | SCOPED ONLY scoped Curse of Weakness attackSpeedReductionPct (rank vector 0) |
| 340 | Resilient Shadows | 3 | Scoped/pending | SCOPED ONLY scoped Affliction dispel resistance chancePct (rank vector 0) |
| 341 | Improved Life Tap | 2 | Scoped/pending | SCOPED ONLY scoped Life Tap manaGainedPct (rank vector 0) |
| 342 | Improved Drains | 2 | Scoped/pending | SCOPED ONLY scoped Drain Soul/Life/Mana effectivenessPct (rank vector 0) |
| 343 | Improved Curse of Agony | 3 | Scoped/pending | SCOPED ONLY scoped Curse of Agony damagePct (rank vector 0) |
| 344 | Fel Concentration | 2 | Scoped/pending | SCOPED ONLY scoped Affliction spell casting pushbackAvoidancePct (rank vector 0) |
| 345 | Curse of Exhaustion | 1 | Event pending | SIMULATION PENDING — Curse of Exhaustion is an active movement curse with one-curse-per-target rules |
| 346 | Grim Reach | 2 | Scoped/pending | SCOPED ONLY scoped Affliction spells rangeIncreasePct (rank vector 0) |
| 347 | Nightfall | 2 | Event pending | SIMULATION PENDING — Nightfall is a chance-on-periodic-affliction-damage Shadow Trance affecting next Shadow Bolt |
| 348 | Soul Siphon | 3 | Scoped/pending | SCOPED ONLY scoped Drain Soul/Dark Harvest/Death Coil per Affliction effect damagePct (rank vector 0) |
| 349 | Rapid Deterioration | 2 | Scoped/pending | SCOPED ONLY spell Affliction castSpeedPct (explicit [6,6]); SIMULATION PENDING — DoT/channeled tick-speed efficiency increases from 50% to 100% with talent rank; this is not a permanent extra 6% cast speed |
| 350 | Siphon Life | 1 | Event pending | SIMULATION PENDING — Siphon Life is an active Shadow damage-over-time and healing drain; needs target timing |
| 351 | Improved Curse of Exhaustion | 2 | Scoped/pending | SCOPED ONLY scoped Curse of Exhaustion slowIncreasePct (rank vector 0) |
| 352 | Malediction | 1 | Event pending | SIMULATION PENDING — Malediction changes curse co-existence and automates Curse of Agony application, requiring target curse state |
| 353 | Shadow Mastery | 5 | Scoped/pending | SCOPED ONLY spell Shadow damagePct (rank vector 0) |
| 354 | Dark Harvest | 1 | Event pending | SIMULATION PENDING — Dark Harvest is a channeled Shadow ability accelerating Affliction periodic effects and interacting with target deaths |
| 355 | Sinister Pursuit | 2 | Scoped/pending | SCOPED ONLY pet  movementSpeedPct (rank vector 0) |
| 356 | Demonic Embrace | 5 | Sheet contribution | CHARACTER-SHEET percent  sta (rank vector 0); CHARACTER-SHEET percent  spi (rank vector 1) |
| 357 | Soul Entrapment | 3 | Scoped/pending | SCOPED ONLY scoped All damage when no pet damagePct (rank vector 0); only if {"pet":"None"} |
| 358 | Soul Funnel | 2 | Scoped/pending | SCOPED ONLY scoped Health Funnel healthTransferredPct (rank vector 0); SCOPED ONLY scoped Mana Funnel manaTransferredPct (rank vector 1) |
| 359 | Demonic Aegis | 3 | Scoped/pending | SCOPED ONLY scoped Demon Armor effectivenessPct (rank vector 0) |
| 360 | Fel Intellect | 3 | Scoped/pending | SCOPED ONLY pet  intellectFromOwnerPct (rank vector 0); SCOPED ONLY pet  manaRegenCastingPct (rank vector 1) |
| 361 | Fel Domination | 1 | Event pending | SIMULATION PENDING — Fel Domination temporarily changes the next demon summoning cast time and mana cost |
| 362 | Fel Stamina | 5 | Scoped/pending | SCOPED ONLY pet  staminaFromOwnerPct (rank vector 0); SCOPED ONLY pet  reducedCriticalHitTakenPct (rank vector 1) |
| 363 | Demonic Sacrifice | 1 | Event pending | SIMULATION PENDING — Demonic Sacrifice consumes a selected demon and grants a demon-dependent temporary/persistent aura which ends on new summons; no sacrifice state control |
| 364 | Improved Stones | 2 | Event pending | SIMULATION PENDING — Stone enhancement and Firestone bonuses require an equipped stone-state check |
| 365 | Master Summoner | 2 | Scoped/pending | SCOPED ONLY scoped Common demon summon castTimeReductionSeconds (rank vector 0); SCOPED ONLY scoped Common demon summon manaCostReductionPct (rank vector 1); SCOPED ONLY scoped Greater demon abilities cooldownReductionPct (rank vector 2) |
| 366 | Nether Studies | 3 | Scoped/pending | SCOPED ONLY scoped Pet seduction/taunt/buff spells effectivenessPct (rank vector 0) |
| 367 | Unholy Power | 3 | Scoped/pending | SCOPED ONLY pet  damagePct (rank vector 0) |
| 368 | Power Overwhelming | 1 | Event pending | SIMULATION PENDING — Power Overwhelming is an on-use demon damage/CC modifier with self-damage to the pet |
| 369 | Demonic Precision | 3 | Scoped/pending | SCOPED ONLY pet  hit (rank vector 0); SCOPED ONLY pet  crit (rank vector 0); SIMULATION PENDING — Pet inheritance of owner spell hit and critical strike requires pet calculation |
| 370 | Master Demonologist | 5 | Sheet contribution | SIMULATION PENDING — Master Demonologist has five demon-specific rank vectors; bonuses need a controlled summon/active demon state and separate unit calculations; SCOPED ONLY scoped Imp spellCostReductionPct (rank vector 0); only if {"pet":"Imp"}; SCOPED ONLY scoped Voidwalker physicalDamageReductionPct (rank vector 1); only if {"pet":"Voidwalker"}; SCOPED ONLY scoped Succubus damagePct (rank vector 2); only if {"pet":"Succubus"}; CHARACTER-SHEET global  arcaneRes (rank vector 3); only if {"pet":"Felhunter"}; CHARACTER-SHEET global  fireRes (rank vector 3); only if {"pet":"Felhunter"}; CHARACTER-SHEET global  frostRes (rank vector 3); only if {"pet":"Felhunter"}; CHARACTER-SHEET global  natureRes (rank vector 3); only if {"pet":"Felhunter"}; CHARACTER-SHEET global  shadowRes (rank vector 3); only if {"pet":"Felhunter"}; SIMULATION PENDING — Greater Demon spell-crit category and pet aura duplication require explicit live pet type verification |
| 371 | Unleashed Potential | 3 | Event pending | SIMULATION PENDING — Unleashed Potential temporarily transfers some Fire/Shadow bonus spell damage into a demon after owner hits and can stack |
| 372 | Soul Link | 1 | Scoped/pending | SCOPED ONLY scoped All damage while Soul Link demon active damagePct (explicit [5]); only if {"pet":["Imp","Voidwalker","Succubus","Felhunter","Felguard","Doomguard"]}; SIMULATION PENDING — Soul Link shares incoming owner damage with an active demon and requires unit health/timing mechanics |
| 321 | Shadow Vulnerability | 5 | Event pending | SIMULATION PENDING — Shadow Vulnerability applies a chance-based timed target Shadow-damage debuff after certain spells |
| 322 | Cataclysm | 5 | Scoped/pending | SCOPED ONLY scoped Destruction spells manaCostReductionPct (rank vector 0) |
| 323 | Demonic Swiftness | 2 | Scoped/pending | SCOPED ONLY scoped Imp Firebolt castTimeReductionSeconds (rank vector 0); SCOPED ONLY scoped Succubus Lash of Pain cooldownReductionSeconds (rank vector 1) |
| 324 | Bane | 5 | Scoped/pending | SCOPED ONLY scoped Shadow Bolt/Searing Pain/Immolate castTimeReductionSeconds (rank vector 0); SCOPED ONLY scoped Soul Fire castTimeReductionSeconds (rank vector 1) |
| 325 | Aftermath | 3 | Scoped/pending | SCOPED ONLY scoped Immolate periodic damagePct (rank vector 0); SIMULATION PENDING — Destruction slow trigger requires combat event handling |
| 326 | Intensity | 2 | Scoped/pending | SCOPED ONLY scoped Fire spell casting pushbackAvoidancePct (rank vector 0) |
| 327 | Shadowburn | 1 | Event pending | SIMULATION PENDING — Shadowburn is an active direct Shadow spell granting a Soul Shard only after qualifying target death |
| 328 | Devastation | 5 | Scoped/pending | SCOPED ONLY spell Destruction crit (rank vector 0) |
| 329 | Pyroclasm | 2 | Event pending | SIMULATION PENDING — Pyroclasm stun chance depends on particular Fire ability hits |
| 330 | Destructive Reach | 2 | Scoped/pending | SCOPED ONLY scoped Destruction spells rangeIncreasePct (rank vector 0); SCOPED ONLY scoped Hellfire radiusIncreasePct (rank vector 1) |
| 331 | Improved Searing Pain | 5 | Scoped/pending | SCOPED ONLY spell Searing Pain crit (rank vector 0) |
| 332 | Improved Soul Fire | 2 | Event pending | SIMULATION PENDING — Improved Soul Fire refunds a Soul Shard and applies temporary Fire bonus after Soul Fire resolves |
| 333 | Improved Immolate | 5 | Scoped/pending | SCOPED ONLY scoped Immolate damagePct (rank vector 0) |
| 334 | Ruin | 1 | Scoped/pending | SCOPED ONLY spell Destruction criticalDamagePct (explicit [100]) |
| 335 | Emberstorm | 5 | Scoped/pending | SCOPED ONLY spell Fire damagePct (rank vector 0) |
| 336 | Conflagrate | 1 | Event pending | SIMULATION PENDING — Conflagrate is an active Fire spell consuming remaining Immolate duration for extra damage |

## Known source and validation limitations

- **Rapid Deterioration:** Both ranks grant +6% Affliction casting speed. Source rank parameters [50,100] describe periodic tick-speed conversion efficiency, not +50%/+100% casting haste.
- **Master Demonologist:** Felhunter resistance bonuses are conditional on a selected Felhunter, while the other demon effects stay appropriately scoped. Demon inheritance and damage require a separate pet model.
- The published calculator is a definition source, not a demonstration that the live server uses precisely the same mechanics.
- Abilities requiring attack outcomes, time, procs, cast resolution, cooldown reset, movement, party state or target debuffs must be validated in a combat engine.
- Gear, buffs, forms/stances and weapon choices require controlled in-game stacking and rounding comparisons.
- All existing and new regression tests are run by `.github/workflows/talent-branch-tests.yml` on this branch.

**Do not merge this branch directly together with another class branch without consolidating their separate `docs/sim/core/talent-rules.mjs` exports.** Each branch is isolated intentionally so independent class verification remains possible; `main` has not been altered by this audit.
