# Hunter — talent effects audit

**Branch:** `audit/talent-effects-hunter` (isolated, no changes to main).

**Source:** [https://octowow.st/talents/hunter/](https://octowow.st/talents/hunter/) · snapshot 2026-11-11T23:29:44.044344+00:00 · SHA256 `5de146011a25875988790d305d181c8798dd371aa5d74d058fd2f4d81f0e0854`.

### Coverage status

| Measure | Count |
|---|---:|
| Imported talent definitions | 55 |
| Explicitly mapped/reviewed rules | 34 |
| Talents with an applied static/weapon effect | 7 |
| Additional talents with scoped tooltip contributions only | 26 |
| Talents without numeric rules (recorded but pending) | 21 |

Status labels: `proc-or-conditional`: 17; `partial`: 30; `sheet`: 4; `ability-specific`: 4.

**Interpretation:** Static and weapon effects may alter the character sheet. Scoped entries describe where published bonuses apply, but do not imply functioning ability damage, mana, cast-time, pet or DPS mechanics. Temporary and conditional effects are not automatically added to permanent totals. The existing calculator still relies on partially unverified Vanilla base coefficients.

### Talent-by-talent ledger

| ID | Talent | Ranks | Coverage | Mapped effects or outstanding mechanic |
|---:|---|---:|---|---|
| 373 | Swift Aspects | 5 | `proc-or-conditional` | Pending: While Aspect of the Hawk is active, all normal ranged attacks have a 10% chance of increasing ranged attack speed by 15% for 12 sec. While Aspect |
| 374 | Endurance Training | 5 | `partial` | pet  staminaFromOwnerPct (vector 0); pet  healthPct (vector 1) |
| 375 | Improved Eyes of the Beast | 2 | `partial` | scoped Eyes of the Beast durationIncreaseSeconds (vector 0); scoped Eyes of the Beast pet damagePct (vector 1); scoped Eyes of the Beast pet focusRegenPct (vector 2) |
| 376 | Improved Primal Aspects | 3 | `sheet` | global  dodge (vector 0), conditional on {"aspect":"Aspect of the Monkey"} |
| 377 | Thick Hide | 3 | `partial` | pet  armourFromOwnerPct (vector 0); pet  armourPct (vector 1) |
| 378 | Improved Revive Pet | 2 | `partial` | scoped Revive Pet castTimeReductionSeconds (vector 0); scoped Revive Pet manaCostReductionPct (vector 1); scoped Revived Pet healthPct (vector 2) |
| 379 | Pathfinding | 2 | `partial` | scoped Aspect of Cheetah/Pack movementSpeedPct (vector 0); pet  movementSpeedPct (vector 1) |
| 380 | Coordinated Assault | 1 | `ability-specific` | Pending: Hitting an enemy with Arcane Shot, Steady Shot, or Raptor Strike causes your pet's next attack within 6 sec to also strike for Physical damage eq |
| 381 | Unleashed Fury | 5 | `partial` | pet  damagePct (vector 0) |
| 382 | Bestial Discipline | 2 | `partial` | pet  focusRegenPerTick (vector 0); pet  specialCooldownReductionPct (vector 1) |
| 383 | Improved Mend Pet | 2 | `partial` | scoped Mend Pet healingPct (vector 0); Pending: Pet dispel effect is event-driven |
| 384 | Ferocity | 5 | `partial` | pet  crit (vector 0) |
| 385 | Scent of Blood | 3 | `proc-or-conditional` | Pending: Your attacks have a 15% chance to send your pet into a rage, causing it to deal 40% additional damage for 8 sec. |
| 386 | Bestial Wrath | 1 | `proc-or-conditional` | Pending: Sends your pet into a rage, granting it Scent of Blood for 18 sec. While enraged, the beast does not feel pity, remorse, or fear, and cannot be s |
| 387 | Intimidation | 1 | `proc-or-conditional` | Pending: Command your pet to intimidate the target on the next successful melee attack, stunning the target for 3 sec, and increasing the pet's threat gen |
| 388 | Bestial Precision | 2 | `partial` | pet  hit (vector 0); pet  spellHit (vector 1); pet  skill (vector 2) |
| 389 | Spirit Bond | 2 | `partial` | pet  attackPowerFromOwnerRangedPct (vector 0); pet  spellPowerFromOwnerRangedPct (vector 1) |
| 390 | Frenzy | 5 | `proc-or-conditional` | Pending: Gives your pet a 100% chance to gain a 30% attack speed increase for 8 sec after dealing a critical strike. |
| 391 | Kill Command | 1 | `proc-or-conditional` | Pending: Commands your pet to instantly attack for 80% of its Attack Power. Can only be used after the Hunter lands a critical strike on the target. |
| 412 | Improved Concussive Shot | 5 | `proc-or-conditional` | Pending: Gives your Concussive Shot a 20% chance to stun the target for 3 sec. |
| 413 | Efficiency | 5 | `partial` | scoped Shots and Stings manaCostReductionPct (vector 0) |
| 414 | Improved Stings | 5 | `partial` | scoped Serpent Sting damagePct (vector 0); scoped Viper Sting manaDrainPct (vector 1); scoped Scorpid Sting attackSpeedReductionPct (vector 2) |
| 415 | Lethal Shots | 5 | `partial` | ranged  crit (vector 0) |
| 416 | Hawk Eye | 2 | `partial` | scoped Ranged weapons rangeIncreaseYards (vector 0) |
| 417 | Aimed Shot | 1 | `ability-specific` | Pending: An aimed shot that increases ranged damage by 70. |
| 418 | Swiftshot | 3 | `partial` | scoped Arcane Shot cooldownReductionSeconds (vector 0); scoped Aimed Shot cooldownReductionSeconds (vector 1) |
| 419 | Endless Quiver | 2 | `proc-or-conditional` | Pending: Your Auto Shot, Arcane Shot, Steady Shot and Multi-Shot have a 6% chance to fire an additional normal ranged attack. This additional shot does no |
| 420 | Mortal Shots | 5 | `partial` | ranged  criticalDamagePct (vector 0) |
| 421 | Scatter Shot | 1 | `proc-or-conditional` | Pending: A short-range shot that deals 50% weapon damage and disorients the target for 4 sec. Any damage caused will remove the effect. Turns off your att |
| 422 | Experimental Ammunition | 1 | `proc-or-conditional` | Pending: Your Aimed Shot deals an additional 5% of its damage as Fire, Arcane, or Nature damage, based on the active effect. Grants a further benefit depe |
| 423 | Piercing Shots | 2 | `ability-specific` | Pending: Your critical strikes from Multi-Shot, Steady Shot and Aimed Shot cause the target to bleed, dealing 30% of the damage over 8 sec. This damage ge |
| 424 | Barrage | 3 | `partial` | scoped Multi-Shot/Volley damagePct (vector 0); scoped Volley castTimeReductionSeconds (vector 1) |
| 425 | Improved Marksmanship | 2 | `partial` | scoped Steady Shot/Aimed Shot damagePct (vector 0) |
| 426 | Ranged Weapon Specialization | 5 | `partial` | ranged  damagePct (vector 0) |
| 427 | Lock and Load | 1 | `proc-or-conditional` | Pending: Your Steady Shot, Aimed Shot, and Arcane Shot critical strikes have a 100% chance to reset the cooldown of Aimed Shot and trigger Lock and Load.  |
| 392 | Improved Slaying | 3 | `partial` | scoped Beast/Giant/Dragonkin/Humanoid targets damagePct (vector 0); scoped These targets criticalDamagePct (vector 1) |
| 393 | Resourcefulness | 5 | `partial` | scoped Traps and melee abilities manaCostReductionPct (vector 0) |
| 394 | Swift Reflexes | 2 | `sheet` | global  parry (vector 0); special  meleeHastePct (vector 0) |
| 395 | Entrapment | 3 | `proc-or-conditional` | Pending: Gives your Immolation Trap, Frost Trap, and Explosive Trap a 25% chance to entrap the target, preventing them from moving for 5 sec. |
| 396 | Savage Strikes | 2 | `partial` | offhand  damagePct (vector 0); spell Lacerate/Raptor Strike/Mongoose Bite/Carve/Wing Clip crit (vector 1) |
| 397 | Improved Wing Clip | 3 | `proc-or-conditional` | Pending: Gives your Wing Clip ability a 40% chance to immobilize the target for 5 sec. |
| 398 | Alone Against the World | 2 | `partial` | scoped All damage when no pet damagePct (vector 0), conditional on {"pet":"None"} |
| 399 | Planning Ahead | 2 | `proc-or-conditional` | Pending: The duration of Freezing and Frost Trap effects and the damage of Immolation and Explosive Trap effects are increased by 25% if the traps are not |
| 400 | Survivalist | 5 | `sheet` | special  maxHealthPct (vector 0) |
| 401 | Carve | 1 | `ability-specific` | Pending: A sweeping attack that strikes up to 5 enemies in a 10 yard cone in front of you, dealing 60% weapon damage. This ability shares a cooldown with  |
| 402 | Deterrence | 1 | `proc-or-conditional` | Pending: When activated, increases your Dodge and Parry chance by 25% for 10 sec. |
| 403 | Stinging Nettle | 2 | `proc-or-conditional` | Pending: Your Mongoose Bite and triggered Fire traps now apply your highest rank of Serpent Sting for 40% of the duration. Serpent Stings applied this way |
| 404 | Surefooted | 3 | `partial` | global  hit (vector 0); global  hit (vector 1), conditional on {"dualWield":true}; Pending: Movement-impairing resistance bonus is not a displayed combat stat |
| 405 | Improved Feign Death | 2 | `partial` | scoped Feign Death resistReductionPct (vector 0) |
| 406 | Killer Instinct | 3 | `partial` | global  crit (vector 0); ranged  crit (vector 0); scoped Melee attacks criticalDamagePct (vector 1) |
| 407 | Trap Mastery | 3 | `partial` | scoped Frost/Freezing Trap durationPct (vector 0); scoped Immolation/Explosive Trap damagePct (vector 1) |
| 408 | Lacerate | 1 | `proc-or-conditional` | Pending: Deepens the target's open wound, dealing damage equal to 40% of melee Attack Power and causing the target to bleed for 20% of that damage over 8  |
| 409 | Vicious Strikes | 2 | `partial` | scoped Raptor Strike/Mongoose Bite cooldownReductionSeconds (vector 0); scoped Raptor Strike/Mongoose Bite damagePct (vector 1) |
| 410 | Lightning Reflexes | 5 | `sheet` | percent  agi (vector 0); special  apFromAgiPct (vector 1) |
| 411 | Untamed Trapper | 1 | `partial` | Pending: Untamed Trapper is a passive with several cross-ability coefficients absent from the rankParameters snapshot; verify the full tooltip and live effect before mapping |

### Verification blockers

1. Compare all passive/weapon numbers and rounding with controlled OctoWoW client observations.
2. Verify stance, shield, form, aspect, pet, active buff and equipment eligibility.
3. Verify spell-family, ranged and individual-ability hit/crit tables, proc uptime and cast/resource timing before using DPS, TPS or HPS comparisons.
4. Complete mappings of remaining talents if the source indicates a permanent, testable sheet effect.
5. Re-run the branch Actions workflow and the baseline simulator regression suite after changes.

**Integration caution:** all class branches currently use `core/talent-rules.mjs`; their per-class registries need consolidation before multiple branches are merged. Never merge one registry over another.
