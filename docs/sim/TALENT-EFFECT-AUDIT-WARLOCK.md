# Warlock — talent effects audit

**Branch:** `audit/talent-effects-warlock` (isolated, no changes to main).

**Source:** [https://octowow.st/talents/warlock/](https://octowow.st/talents/warlock/) · snapshot 2026-11-11T23:29:44.072927+00:00 · SHA256 `d468b1c035cfcbb2572a508d84e37d184e17c009bcfe5db399db175a4c6ced81`.

### Coverage status

| Measure | Count |
|---|---:|
| Imported talent definitions | 52 |
| Explicitly mapped/reviewed rules | 34 |
| Talents with an applied static/weapon effect | 1 |
| Additional talents with scoped tooltip contributions only | 31 |
| Talents without numeric rules (recorded but pending) | 18 |

Status labels: `proc-or-conditional`: 12; `partial`: 33; `ability-specific`: 4; `active-or-non-stat`: 2; `sheet`: 1.

**Interpretation:** Static and weapon effects may alter the character sheet. Scoped entries describe where published bonuses apply, but do not imply functioning ability damage, mana, cast-time, pet or DPS mechanics. Temporary and conditional effects are not automatically added to permanent totals. The existing calculator still relies on partially unverified Vanilla base coefficients.

### Talent-by-talent ledger

| ID | Talent | Ranks | Coverage | Mapped effects or outstanding mechanic |
|---:|---|---:|---|---|
| 337 | Suppression | 5 | `partial` | spell Affliction hit (vector 0) |
| 338 | Improved Corruption | 5 | `partial` | scoped Corruption castTimeReductionSeconds (vector 0) |
| 339 | Improved Curse of Weakness | 2 | `partial` | scoped Curse of Weakness attackSpeedReductionPct (vector 0) |
| 340 | Resilient Shadows | 3 | `partial` | scoped Affliction dispel resistance chancePct (vector 0) |
| 341 | Improved Life Tap | 2 | `partial` | scoped Life Tap manaGainedPct (vector 0) |
| 342 | Improved Drains | 2 | `partial` | scoped Drain Soul/Life/Mana effectivenessPct (vector 0) |
| 343 | Improved Curse of Agony | 3 | `partial` | scoped Curse of Agony damagePct (vector 0) |
| 344 | Fel Concentration | 2 | `proc-or-conditional` | Pending: Gives your Affliction spells a 70% chance to not lose casting time when you take damage. |
| 345 | Curse of Exhaustion | 1 | `proc-or-conditional` | Pending: Reduces the target's movement speed by 10% for 12 sec. Only one Curse per Warlock can be active on any one target. |
| 346 | Grim Reach | 2 | `partial` | scoped Affliction spells rangeIncreasePct (vector 0) |
| 347 | Nightfall | 2 | `proc-or-conditional` | Pending: Gives your Corruption, Dark Harvest and Drain spells a 4% chance to cause you to enter a Shadow Trance state after damaging the opponent. The Sha |
| 348 | Soul Siphon | 3 | `partial` | scoped Drain Soul/Dark Harvest/Death Coil per Affliction effect damagePct (vector 0) |
| 349 | Rapid Deterioration | 2 | `partial` | spell Affliction castSpeedPct (vector explicit); Pending: DoT/channeled tick-speed efficiency increases from 50% to 100% with talent rank; this is not a permanent extra 6% cast speed |
| 350 | Siphon Life | 1 | `active-or-non-stat` | Pending: Transfers 150 Health from the target to the caster over 30 sec. |
| 351 | Improved Curse of Exhaustion | 2 | `partial` | scoped Curse of Exhaustion slowIncreasePct (vector 0) |
| 352 | Malediction | 1 | `active-or-non-stat` | Pending: Your Curse of Agony can be used alongside your other curses, except Curse of Doom. Applying Curse of Recklessness, Curse of Shadows, or Curse of  |
| 353 | Shadow Mastery | 5 | `partial` | spell Shadow damagePct (vector 0) |
| 354 | Dark Harvest | 1 | `proc-or-conditional` | Pending: Reaps the target's life, dealing 704 Shadow damage over 8 sec. While channeling, the time between periodic ticks of your Affliction spells on the |
| 355 | Sinister Pursuit | 2 | `partial` | pet  movementSpeedPct (vector 0) |
| 356 | Demonic Embrace | 5 | `sheet` | percent  sta (vector 0); percent  spi (vector 1) |
| 357 | Soul Entrapment | 3 | `partial` | scoped All damage when no pet damagePct (vector 0), conditional on {"pet":"None"} |
| 358 | Soul Funnel | 2 | `partial` | scoped Health Funnel healthTransferredPct (vector 0); scoped Mana Funnel manaTransferredPct (vector 1) |
| 359 | Demonic Aegis | 3 | `partial` | scoped Demon Armor effectivenessPct (vector 0) |
| 360 | Fel Intellect | 3 | `partial` | pet  intellectFromOwnerPct (vector 0); pet  manaRegenCastingPct (vector 1) |
| 361 | Fel Domination | 1 | `ability-specific` | Pending: Your next Common demon summoning spell has its casting time reduced by 4.5 sec and its Mana cost reduced by 40%. |
| 362 | Fel Stamina | 5 | `partial` | pet  staminaFromOwnerPct (vector 0); pet  reducedCriticalHitTakenPct (vector 1) |
| 363 | Demonic Sacrifice | 1 | `proc-or-conditional` | Pending: When activated, sacrifices your summoned demon to grant you an effect. The effect is canceled if any demon is summoned or enslaved. Imp: Increase |
| 364 | Improved Stones | 2 | `partial` | Pending: Stone enhancement and Firestone bonuses require an equipped stone-state check |
| 365 | Master Summoner | 2 | `ability-specific` | Pending: Reduces the casting time of your Imp, Voidwalker, Succubus, and Felhunter summoning spells by 4 sec and their mana cost by 60%. In addition, redu |
| 366 | Nether Studies | 3 | `partial` | scoped Pet seduction/taunt/buff spells effectivenessPct (vector 0) |
| 367 | Unholy Power | 3 | `partial` | pet  damagePct (vector 0) |
| 368 | Power Overwhelming | 1 | `proc-or-conditional` | Pending: Channel energy into your demon, breaking all crowd control effects and increasing its damage dealt by 20% for 10 sec. The demon takes 40% of its  |
| 369 | Demonic Precision | 3 | `partial` | pet  hit (vector 0); pet  crit (vector 0); Pending: Pet inheritance of owner spell hit and critical strike requires pet calculation |
| 370 | Master Demonologist | 5 | `partial` | Pending: Master Demonologist has five demon-specific rank vectors; bonuses need a controlled summon/active demon state and separate unit calculations |
| 371 | Unleashed Potential | 3 | `proc-or-conditional` | Pending: Your direct damage spell hits allow your demon to benefit from 15% of your Fire and Shadow spell bonus damage for 20 sec. Each tick of your funne |
| 372 | Soul Link | 1 | `proc-or-conditional` | Pending: While a demon is under your control, the damage dealt by you and your demon is increased by 5%. In addition, 20% of all damage you take is taken  |
| 321 | Shadow Vulnerability | 5 | `proc-or-conditional` | Pending: Your Shadow Bolt and Drain Soul have a 10% chance to increase Shadow damage dealt to the target by 20% for 10 sec, with a higher chance to trigge |
| 322 | Cataclysm | 5 | `partial` | scoped Destruction spells manaCostReductionPct (vector 0) |
| 323 | Demonic Swiftness | 2 | `partial` | scoped Imp Firebolt castTimeReductionSeconds (vector 0); scoped Succubus Lash of Pain cooldownReductionSeconds (vector 1) |
| 324 | Bane | 5 | `partial` | scoped Shadow Bolt/Searing Pain/Immolate castTimeReductionSeconds (vector 0); scoped Soul Fire castTimeReductionSeconds (vector 1) |
| 325 | Aftermath | 3 | `partial` | scoped Immolate periodic damagePct (vector 0); Pending: Destruction slow trigger requires combat event handling |
| 326 | Intensity | 2 | `proc-or-conditional` | Pending: Gives your Fire spells a 70% chance to not lose casting time when you take damage. |
| 327 | Shadowburn | 1 | `ability-specific` | Pending: Instantly blasts the target for 91 to 103 Shadow damage. If the target dies within 5 sec of Shadowburn, and yields experience or honor, the caste |
| 328 | Devastation | 5 | `partial` | spell Destruction crit (vector 0) |
| 329 | Pyroclasm | 2 | `proc-or-conditional` | Pending: Gives your Rain of Fire, Hellfire, Conflagrate, and Soul Fire spells a 26% chance to stun the target for 3 sec. |
| 330 | Destructive Reach | 2 | `partial` | scoped Destruction spells rangeIncreasePct (vector 0); scoped Hellfire radiusIncreasePct (vector 1) |
| 331 | Improved Searing Pain | 5 | `partial` | spell Searing Pain crit (vector 0) |
| 332 | Improved Soul Fire | 2 | `proc-or-conditional` | Pending: Your Soul Fire has a 100% chance to refund a Soul Shard and increase your Fire damage by 10% for 30 sec. |
| 333 | Improved Immolate | 5 | `partial` | scoped Immolate damagePct (vector 0) |
| 334 | Ruin | 1 | `partial` | spell Destruction criticalDamagePct (vector explicit) |
| 335 | Emberstorm | 5 | `partial` | spell Fire damagePct (vector 0) |
| 336 | Conflagrate | 1 | `ability-specific` | Pending: Ignites the target, dealing 249 to 315 Fire damage and consuming 3 sec of your Immolate spell to deal an amount of damage equal to it. |

### Rank-parameter exception

`Rapid Deterioration` increases Affliction cast speed by **6% at both ranks**. Its sole rank vector `[50,100]` instead describes the efficiency of haste-to-periodic-tick conversion. The registry therefore uses an explicit fixed `[6,6]` cast-speed value and tracks the periodic component separately.

### Verification blockers

1. Compare all passive/weapon numbers and rounding with controlled OctoWoW client observations.
2. Verify stance, shield, form, aspect, pet, active buff and equipment eligibility.
3. Verify spell-family, ranged and individual-ability hit/crit tables, proc uptime and cast/resource timing before using DPS, TPS or HPS comparisons.
4. Complete mappings of remaining talents if the source indicates a permanent, testable sheet effect.
5. Re-run the branch Actions workflow and the baseline simulator regression suite after changes.

**Integration caution:** all class branches currently use `core/talent-rules.mjs`; their per-class registries need consolidation before multiple branches are merged. Never merge one registry over another.
