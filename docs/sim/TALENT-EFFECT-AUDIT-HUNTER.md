# Hunter: talent calculation audit and implementation ledger

**Repository:** [Equadis/OctoBot](https://github.com/Equadis/OctoBot) · **branch:** `audit/talent-effects-hunter` · **source:** [OctoWoW published talent calculator](https://octowow.st/talents/hunter/) (2026-11-11T23:29:44.044344+00:00, SHA-256 `5de146011a25875988790d305d181c8798dd371aa5d74d058fd2f4d81f0e0854`).

## Coverage summary

| Measure | Count |
|---|---:|
| Imported talents | 55 |
| Talents with individual reviewed registry entries | 55 |
| At least one character-sheet or weapon-derived effect | 7 |
| Scoped reference contributions only | 26 |
| Simulation/event-only records | 22 |

**Important:** The second and third categories are not completed DPS/TPS/HPS mechanics. A school, attack type or pet effect may be described numerically without being incorporated into a full combat outcome. The planner uses unverified base coefficients and must not be represented as a validated OctoWoW simulator.

## Exact classification of all 55 talents

| ID | Talent | Ranks | Status | Effect / precise unresolved dependency |
|---:|---|---:|---|---|
| 373 | Swift Aspects | 5 | Event pending | SIMULATION PENDING — Swift Aspects procs timed ranged or melee attack-speed buffs while the corresponding Hawk/Wolf aspect is active |
| 374 | Endurance Training | 5 | Scoped/pending | SCOPED ONLY pet  staminaFromOwnerPct (rank vector 0); SCOPED ONLY pet  healthPct (rank vector 1) |
| 375 | Improved Eyes of the Beast | 2 | Scoped/pending | SCOPED ONLY scoped Eyes of the Beast durationIncreaseSeconds (rank vector 0); SCOPED ONLY scoped Eyes of the Beast pet damagePct (rank vector 1); SCOPED ONLY scoped Eyes of the Beast pet focusRegenPct (rank vector 2) |
| 376 | Improved Primal Aspects | 3 | Sheet contribution | CHARACTER-SHEET global  dodge (rank vector 0); only if {"aspect":"Aspect of the Monkey"} |
| 377 | Thick Hide | 3 | Scoped/pending | SCOPED ONLY pet  armourFromOwnerPct (rank vector 0); SCOPED ONLY pet  armourPct (rank vector 1) |
| 378 | Improved Revive Pet | 2 | Scoped/pending | SCOPED ONLY scoped Revive Pet castTimeReductionSeconds (rank vector 0); SCOPED ONLY scoped Revive Pet manaCostReductionPct (rank vector 1); SCOPED ONLY scoped Revived Pet healthPct (rank vector 2) |
| 379 | Pathfinding | 2 | Scoped/pending | SCOPED ONLY scoped Aspect of Cheetah/Pack movementSpeedPct (rank vector 0); SCOPED ONLY pet  movementSpeedPct (rank vector 1) |
| 380 | Coordinated Assault | 1 | Event pending | SIMULATION PENDING — Coordinated Assault grants a limited-timing pet extra strike after Arcane/Steady Shot or Raptor Strike |
| 381 | Unleashed Fury | 5 | Scoped/pending | SCOPED ONLY pet  damagePct (rank vector 0) |
| 382 | Bestial Discipline | 2 | Scoped/pending | SCOPED ONLY pet  focusRegenPerTick (rank vector 0); SCOPED ONLY pet  specialCooldownReductionPct (rank vector 1) |
| 383 | Improved Mend Pet | 2 | Scoped/pending | SCOPED ONLY scoped Mend Pet healingPct (rank vector 0); SIMULATION PENDING — Pet dispel effect is event-driven |
| 384 | Ferocity | 5 | Scoped/pending | SCOPED ONLY pet  crit (rank vector 0) |
| 385 | Scent of Blood | 3 | Event pending | SIMULATION PENDING — Scent of Blood is an owner-hit-triggered temporary pet damage bonus |
| 386 | Bestial Wrath | 1 | Event pending | SIMULATION PENDING — Bestial Wrath is an on-use timed pet damage/CC immunity effect |
| 387 | Intimidation | 1 | Event pending | SIMULATION PENDING — Intimidation applies a stun and threat benefit on the pet's next successful melee attack |
| 388 | Bestial Precision | 2 | Scoped/pending | SCOPED ONLY pet  hit (rank vector 0); SCOPED ONLY pet  spellHit (rank vector 1); SCOPED ONLY pet  skill (rank vector 2) |
| 389 | Spirit Bond | 2 | Scoped/pending | SCOPED ONLY pet  attackPowerFromOwnerRangedPct (rank vector 0); SCOPED ONLY pet  spellPowerFromOwnerRangedPct (rank vector 1) |
| 390 | Frenzy | 5 | Event pending | SIMULATION PENDING — Frenzy temporarily increases pet attack speed after pet critical strike; not permanent pet haste |
| 391 | Kill Command | 1 | Event pending | SIMULATION PENDING — Kill Command is an active pet attack enabled by the owner's critical strike |
| 412 | Improved Concussive Shot | 5 | Event pending | SIMULATION PENDING — Improved Concussive Shot adds a chance-based stun from a successful Concussive Shot |
| 413 | Efficiency | 5 | Scoped/pending | SCOPED ONLY scoped Shots and Stings manaCostReductionPct (rank vector 0) |
| 414 | Improved Stings | 5 | Scoped/pending | SCOPED ONLY scoped Serpent Sting damagePct (rank vector 0); SCOPED ONLY scoped Viper Sting manaDrainPct (rank vector 1); SCOPED ONLY scoped Scorpid Sting attackSpeedReductionPct (rank vector 2) |
| 415 | Lethal Shots | 5 | Scoped/pending | SCOPED ONLY ranged  crit (rank vector 0) |
| 416 | Hawk Eye | 2 | Scoped/pending | SCOPED ONLY scoped Ranged weapons rangeIncreaseYards (rank vector 0) |
| 417 | Aimed Shot | 1 | Event pending | SIMULATION PENDING — Aimed Shot is an active ranged attack with +70 damage; requires ranged weapon and attack table |
| 418 | Swiftshot | 3 | Scoped/pending | SCOPED ONLY scoped Arcane Shot cooldownReductionSeconds (rank vector 0); SCOPED ONLY scoped Aimed Shot cooldownReductionSeconds (rank vector 1) |
| 419 | Endless Quiver | 2 | Event pending | SIMULATION PENDING — Endless Quiver triggers an extra ranged attack after selected shot hits with no ammo cost |
| 420 | Mortal Shots | 5 | Scoped/pending | SCOPED ONLY ranged  criticalDamagePct (rank vector 0) |
| 421 | Scatter Shot | 1 | Event pending | SIMULATION PENDING — Scatter Shot is an active short-range ranged strike and disorient |
| 422 | Experimental Ammunition | 1 | Event pending | SIMULATION PENDING — Experimental Ammunition switches Aimed Shot secondary element and additional next-attack effects; requires active ammo choice |
| 423 | Piercing Shots | 2 | Event pending | SIMULATION PENDING — Piercing Shots creates a timed bleed from critical shots; cannot add bleed DPS without event simulation |
| 424 | Barrage | 3 | Scoped/pending | SCOPED ONLY scoped Multi-Shot/Volley damagePct (rank vector 0); SCOPED ONLY scoped Volley castTimeReductionSeconds (rank vector 1) |
| 425 | Improved Marksmanship | 2 | Scoped/pending | SCOPED ONLY scoped Steady Shot/Aimed Shot damagePct (rank vector 0) |
| 426 | Ranged Weapon Specialization | 5 | Scoped/pending | SCOPED ONLY ranged  damagePct (rank vector 0) |
| 427 | Lock and Load | 1 | Event pending | SIMULATION PENDING — Lock and Load resets Aimed Shot after critical shot and grants a temporary cast-speed buff |
| 392 | Improved Slaying | 3 | Scoped/pending | SCOPED ONLY scoped Beast/Giant/Dragonkin/Humanoid targets damagePct (rank vector 0); SCOPED ONLY scoped These targets criticalDamagePct (rank vector 1) |
| 393 | Resourcefulness | 5 | Scoped/pending | SCOPED ONLY scoped Traps and melee abilities manaCostReductionPct (rank vector 0) |
| 394 | Swift Reflexes | 2 | Sheet contribution | CHARACTER-SHEET global  parry (rank vector 0); CHARACTER-SHEET special  meleeHastePct (rank vector 0) |
| 395 | Entrapment | 3 | Event pending | SIMULATION PENDING — Entrapment gives active trap effects a chance to immobilise their target |
| 396 | Savage Strikes | 2 | Sheet contribution | CHARACTER-SHEET offhand  damagePct (rank vector 0); SCOPED ONLY spell Lacerate/Raptor Strike/Mongoose Bite/Carve/Wing Clip crit (rank vector 1) |
| 397 | Improved Wing Clip | 3 | Event pending | SIMULATION PENDING — Improved Wing Clip gives Wing Clip a chance to immobilise the target |
| 398 | Alone Against the World | 2 | Scoped/pending | SCOPED ONLY scoped All damage when no pet damagePct (rank vector 0); only if {"pet":"None"} |
| 399 | Planning Ahead | 2 | Event pending | SIMULATION PENDING — Planning Ahead modifies traps only if their trigger is delayed more than 5 seconds after placement |
| 400 | Survivalist | 5 | Sheet contribution | CHARACTER-SHEET special  maxHealthPct (rank vector 0) |
| 401 | Carve | 1 | Event pending | SIMULATION PENDING — Carve is an active cone attack sharing cooldown with Multi-Shot and requires a multi-target model |
| 402 | Deterrence | 1 | Event pending | SIMULATION PENDING — Deterrence grants temporary dodge/parry on use; must never affect permanent sheet stats |
| 403 | Stinging Nettle | 2 | Event pending | SIMULATION PENDING — Stinging Nettle applies a short Serpent Sting via Mongoose Bite or triggered Fire traps, requiring effect duration and resist handling |
| 404 | Surefooted | 3 | Sheet contribution | CHARACTER-SHEET global  hit (rank vector 0); CHARACTER-SHEET global  hit (rank vector 1); only if {"dualWield":true}; SIMULATION PENDING — Movement-impairing resistance bonus is not a displayed combat stat |
| 405 | Improved Feign Death | 2 | Scoped/pending | SCOPED ONLY scoped Feign Death resistReductionPct (rank vector 0) |
| 406 | Killer Instinct | 3 | Sheet contribution | CHARACTER-SHEET global  crit (rank vector 0); SCOPED ONLY ranged  crit (rank vector 0); SCOPED ONLY scoped Melee attacks criticalDamagePct (rank vector 1) |
| 407 | Trap Mastery | 3 | Scoped/pending | SCOPED ONLY scoped Frost/Freezing Trap durationPct (rank vector 0); SCOPED ONLY scoped Immolation/Explosive Trap damagePct (rank vector 1) |
| 408 | Lacerate | 1 | Event pending | SIMULATION PENDING — Lacerate requires a prior critical hit and then deals direct and periodic melee-AP-based damage |
| 409 | Vicious Strikes | 2 | Scoped/pending | SCOPED ONLY scoped Raptor Strike/Mongoose Bite cooldownReductionSeconds (rank vector 0); SCOPED ONLY scoped Raptor Strike/Mongoose Bite damagePct (rank vector 1) |
| 410 | Lightning Reflexes | 5 | Sheet contribution | CHARACTER-SHEET percent  agi (rank vector 0); CHARACTER-SHEET special  apFromAgiPct (rank vector 1) |
| 411 | Untamed Trapper | 1 | Event pending | SIMULATION PENDING — Untamed Trapper is a passive with several cross-ability coefficients absent from the rankParameters snapshot; verify the full tooltip and live effect before mapping |

## Known source and validation limitations

- **Owner vs pet stats:** Pet bonuses are tracked in a separate scope; they must not increase the Hunter's own spell hit, crit or attack power. Pet simulation remains outstanding.
- The published calculator is a definition source, not a demonstration that the live server uses precisely the same mechanics.
- Abilities requiring attack outcomes, time, procs, cast resolution, cooldown reset, movement, party state or target debuffs must be validated in a combat engine.
- Gear, buffs, forms/stances and weapon choices require controlled in-game stacking and rounding comparisons.
- All existing and new regression tests are run by `.github/workflows/talent-branch-tests.yml` on this branch.

**Do not merge this branch directly together with another class branch without consolidating their separate `docs/sim/core/talent-rules.mjs` exports.** Each branch is isolated intentionally so independent class verification remains possible; `main` has not been altered by this audit.
