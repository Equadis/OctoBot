# Paladin — talent effects audit

**Branch:** `audit/talent-effects-paladin` (isolated, no changes to main).

**Source:** [https://octowow.st/talents/paladin/](https://octowow.st/talents/paladin/) · snapshot 2026-11-11T23:29:44.018448+00:00 · SHA256 `16f76bfbdb4faba8636986e58db45a38ccc6ef84e83395d99ce7c7849de35ee4`.

### Coverage status

| Measure | Count |
|---|---:|
| Imported talent definitions | 49 |
| Explicitly mapped/reviewed rules | 26 |
| Talents with an applied static/weapon effect | 9 |
| Additional talents with scoped tooltip contributions only | 17 |
| Talents without numeric rules (recorded but pending) | 23 |

Status labels: `partial`: 17; `ability-specific`: 6; `sheet`: 9; `active-or-non-stat`: 2; `proc-or-conditional`: 15.

**Interpretation:** Static and weapon effects may alter the character sheet. Scoped entries describe where published bonuses apply, but do not imply functioning ability damage, mana, cast-time, pet or DPS mechanics. Temporary and conditional effects are not automatically added to permanent totals. The existing calculator still relies on partially unverified Vanilla base coefficients.

### Talent-by-talent ledger

| ID | Talent | Ranks | Coverage | Mapped effects or outstanding mechanic |
|---:|---|---:|---|---|
| 444 | Divine Strength | 5 | `sheet` | percent  str (vector 0) |
| 445 | Divine Intellect | 5 | `sheet` | percent  int (vector 0) |
| 446 | Holy Judgement | 3 | `active-or-non-stat` | Pending: Casting Judgement reduces the casting time of your next Holy Light by 1 sec. |
| 447 | Spiritual Focus | 2 | `proc-or-conditional` | Pending: Gives your Flash of Light and Holy Light spells a 70% chance to not lose casting time when you take damage. |
| 448 | Improved Seal of Righteousness | 5 | `partial` | scoped Seal/Judgement of Righteousness damagePct (vector 0) |
| 449 | Healing Light | 3 | `partial` | scoped Holy Light / Flash of Light / Holy Shock healingPct (vector 0) |
| 450 | Sanctity Aura | 1 | `partial` | scoped Sanctity Aura holyDamagePct (vector explicit), conditional on {"aura":"Sanctity Aura"} |
| 451 | Improved Lay on Hands | 2 | `ability-specific` | Pending: Gives the target of your Lay on Hands spell a 30% bonus to their armor value from items for 2 min. In addition, the cooldown for your Lay on Hand |
| 452 | Unyielding Faith | 2 | `partial` | scoped Fear/Disorient resistChancePct (vector 0) |
| 453 | Improved Concentration Aura | 3 | `partial` | scoped Concentration Aura effectivenessPct (vector 0); scoped Concentration Aura resistSilenceInterruptPct (vector 1); Pending: The planner does not offer Concentration Aura as a selectable aura |
| 454 | Illumination | 5 | `proc-or-conditional` | Pending: After getting a critical effect from your Flash of Light, Holy Light, or Holy Shock heal spell, you regain Mana equal to 60% of the base cost of  |
| 455 | Ironclad | 2 | `sheet` | special  healingFromItemArmourPct (vector 0) |
| 456 | Divine Favor | 5 | `partial` | spell Holy Shock crit (vector 0) |
| 457 | Holy Shock | 1 | `proc-or-conditional` | Pending: Blasts the target with Holy energy, causing 97 to 104 Holy damage to an enemy, or 311 to 320 healing to an ally. Casting Holy Shock has a chance  |
| 458 | Holy Power | 3 | `partial` | spell Holy Light/Flash of Light crit (vector 0) |
| 459 | Blessed Strikes | 5 | `proc-or-conditional` | Pending: Crusader Strike has a 100% chance to reset the cooldown of your Holy Shock. In addition, the healing effect of your Holy Strike is increased by 1 |
| 460 | Daybreak | 1 | `proc-or-conditional` | Pending: Critically healing an ally applies Daybreak for 30 sec. When the ally takes damage, Daybreak is consumed to heal them for 248 to 289. |
| 461 | Improved Devotion Aura | 5 | `partial` | scoped Devotion Aura armourBonusPct (vector 0) |
| 462 | Redoubt | 5 | `proc-or-conditional` | Pending: Successful melee and ranged attacks against you have a 10% chance to increase your chance to block by 15%. Lasts 10 sec or 5 blocks. |
| 463 | Precision | 3 | `sheet` | global  hit (vector 0); global  spellHit (vector 0) |
| 464 | Guardian's Favor | 2 | `ability-specific` | Pending: Reduces the cooldown of your Hand of Protection by 120 sec and increases the duration of your Hand of Freedom by 6 sec. |
| 465 | Toughness | 5 | `sheet` | special  itemArmourPct (vector 0) |
| 466 | Improved Righteous Fury | 3 | `partial` | scoped Righteous Fury threatPct (vector 0) |
| 467 | Blessing of Sanctuary | 1 | `proc-or-conditional` | Pending: Places a Blessing on the friendly target, reducing damage taken from all sources by up to 10 for 10 min. In addition, when the target blocks a me |
| 468 | Shield Specialization | 3 | `partial` | scoped Shield blockValuePct (vector 0), conditional on {"shield":true}; Pending: Mana restoration on blocking is conditional |
| 469 | Anticipation | 3 | `sheet` | global  defense (vector 0) |
| 470 | Improved Hand of Reckoning | 2 | `partial` | scoped Hand of Reckoning hit (vector 0) |
| 471 | Improved Hammer of Justice | 3 | `ability-specific` | Pending: Decreases the cooldown of your Hammer of Justice spell by 15 sec. |
| 472 | Righteous Defense | 3 | `proc-or-conditional` | Pending: While Righteous Fury is active, your damage taken is reduced by 10%. |
| 473 | Holy Shield | 1 | `proc-or-conditional` | Pending: Increases chance to block by 45% for 10 sec. While active, each blocked attack deals 35 Holy damage to the attacker. Damage caused by Holy Shield |
| 474 | Reckoning | 5 | `proc-or-conditional` | Pending: Gives you a 50% chance after blocking an attack to generate an additional attack. |
| 475 | Righteous Strikes | 5 | `ability-specific` | Pending: Increases the threat generated by your Holy Strike by 25% and its damage by 25%. In addition, Crusader Strike grants Zealous Defense, reducing th |
| 476 | Bulwark of the Righteous | 1 | `proc-or-conditional` | Pending: Bash the target with your shield, dealing 274 to 301 Holy damage and reducing the damage you take by 30% for 12 sec. |
| 428 | Improved Blessings | 5 | `partial` | scoped Blessing of Might/Wisdom effectivenessPct (vector 0) |
| 429 | Benediction | 5 | `partial` | scoped Judgement/Seals manaCostReductionPct (vector 0) |
| 430 | Improved Judgement | 2 | `ability-specific` | Pending: Decreases the cooldown of your Judgement spell by 2 sec. |
| 431 | Improved Seal of the Crusader | 3 | `partial` | scoped Seal of the Crusader attackPowerBonusPct (vector 0), conditional on {"seal":"Seal of the Crusader"}; scoped Judgement of the Crusader holyDamageIncreasePct (vector 0) |
| 432 | Deflection | 5 | `sheet` | global  parry (vector 0) |
| 433 | Improved Retribution Aura | 2 | `partial` | scoped Retribution Aura damagePct (vector 0), conditional on {"aura":"Retribution Aura"} |
| 434 | Conviction | 5 | `sheet` | global  crit (vector 0) |
| 435 | Blessing of Kings | 1 | `active-or-non-stat` | Pending: Places a Blessing on the friendly target, increasing total stats by 10% for 10 min. Players may only have one Blessing on them per Paladin at any |
| 436 | Pursuit of Justice | 2 | `partial` | scoped Movement/Mounted movementSpeedPct (vector 0) |
| 437 | Two-Handed Weapon Specialization | 3 | `sheet` | weapon twohand-sword-mace-axe skill (vector 1); weapon twohand damagePct (vector 0) |
| 438 | Vindication | 3 | `proc-or-conditional` | Pending: Gives the Paladin's damaging melee attacks a chance to reduce the target's damage dealt by 9% for 10 sec. Only affects targets of level 62 or low |
| 439 | Eye for an Eye | 2 | `ability-specific` | Pending: All spell criticals against you cause 30% of the damage taken to the caster as well. The damage caused by Eye for an Eye will not exceed 50% of t |
| 440 | Vengeance | 5 | `proc-or-conditional` | Pending: Gives you a 5% bonus to all damage you deal and decreases threat you generate by 10% for 30 sec after dealing a critical strike from a weapon swi |
| 441 | Seal of Command | 1 | `proc-or-conditional` | Pending: Gives the Paladin a chance to deal additional Holy damage equal to 70% of melee damage. Only one Seal can be active on the Paladin at any one tim |
| 442 | Vengeful Strikes | 5 | `partial` | scoped Crusader Strike damagePct (vector 0); scoped Zeal per stack attackCastSpeedPct (vector 1); Pending: Zeal stack generation/duration requires an aura engine |
| 443 | Repentance | 1 | `proc-or-conditional` | Pending: Puts the enemy target in a state of meditation, incapacitating them for up to 6 sec. Any damage caused will awaken the target. If the target is i |

### Verification blockers

1. Compare all passive/weapon numbers and rounding with controlled OctoWoW client observations.
2. Verify stance, shield, form, aspect, pet, active buff and equipment eligibility.
3. Verify spell-family, ranged and individual-ability hit/crit tables, proc uptime and cast/resource timing before using DPS, TPS or HPS comparisons.
4. Complete mappings of remaining talents if the source indicates a permanent, testable sheet effect.
5. Re-run the branch Actions workflow and the baseline simulator regression suite after changes.

**Integration caution:** all class branches currently use `core/talent-rules.mjs`; their per-class registries need consolidation before multiple branches are merged. Never merge one registry over another.
