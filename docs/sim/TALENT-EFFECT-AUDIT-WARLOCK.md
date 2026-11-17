# Warlock — talent effect audit

**Independent branch:** `audit/talent-effects-warlock`; source [official class calculator](https://octowow.st/talents/warlock/) (retrieved 2026-11-11T23:29:44.072927+00:00, HTML SHA256 `d468b1c035cfcbb2572a508d84e37d184e17c009bcfe5db399db175a4c6ced81`).

**Review coverage:** all 52 talents have a classification; 12 have explicitly mapped effect rules. Counts: {"proc-or-conditional":17,"ability-specific":16,"active-or-non-stat":7,"partial":11,"sheet":1}. These are calculator-derived estimates, not verified live combat formulas.

**Status guide:** `sheet` contributes to static or weapon-derived numbers, `partial` tracks a subset with remaining combat work, and other categories are intentionally excluded from blanket stats. Every unimplemented entry is a tracked verification gap.

| ID | Talent | Max ranks | Status | Mapped / outstanding effect |
|---:|---|---:|---|---|
| 337 | Suppression | 5 | `partial` | spell Affliction hit (rank vector 0) |
| 338 | Improved Corruption | 5 | `active-or-non-stat` | Not in character-sheet calculation: Reduces the casting time of your Corruption spell by 1.5 sec. |
| 339 | Improved Curse of Weakness | 2 | `ability-specific` | Not in character-sheet calculation: Increases the attack speed reduction of your Curse of Weakness by 5%. |
| 340 | Resilient Shadows | 3 | `proc-or-conditional` | Not in character-sheet calculation: Reduces the chance your Affliction spells will be dispelled by an additional 15%. |
| 341 | Improved Life Tap | 2 | `active-or-non-stat` | Not in character-sheet calculation: Increases the amount of Mana awarded by your Life Tap spell by 20%. |
| 342 | Improved Drains | 2 | `partial` | scoped Drain Soul/Life/Mana effectivenessPct (rank vector 0) |
| 343 | Improved Curse of Agony | 3 | `ability-specific` | Not in character-sheet calculation: Increases the damage done by your Curse of Agony by 10%. |
| 344 | Fel Concentration | 2 | `proc-or-conditional` | Not in character-sheet calculation: Gives your Affliction spells a 70% chance to not lose casting time when you take damage. |
| 345 | Curse of Exhaustion | 1 | `proc-or-conditional` | Not in character-sheet calculation: Reduces the target's movement speed by 10% for 12 sec. Only one Curse per Warlock can be active on any one target. |
| 346 | Grim Reach | 2 | `ability-specific` | Not in character-sheet calculation: Increases the range of your Affliction spells by 20%. |
| 347 | Nightfall | 2 | `proc-or-conditional` | Not in character-sheet calculation: Gives your Corruption, Dark Harvest and Drain spells a 4% chance to cause you to enter a Shadow Trance state after damaging the op |
| 348 | Soul Siphon | 3 | `ability-specific` | Not in character-sheet calculation: Increases the damage of your Drain Soul, Dark Harvest and Death Coil by an additional 6% for each of your Affliction effects on th |
| 349 | Rapid Deterioration | 2 | `partial` | spell Affliction castSpeedPct (rank vector explicit) |
| 350 | Siphon Life | 1 | `active-or-non-stat` | Not in character-sheet calculation: Transfers 150 Health from the target to the caster over 30 sec. |
| 351 | Improved Curse of Exhaustion | 2 | `ability-specific` | Not in character-sheet calculation: Increases the speed reduction of your Curse of Exhaustion by 30%. |
| 352 | Malediction | 1 | `active-or-non-stat` | Not in character-sheet calculation: Your Curse of Agony can be used alongside your other curses, except Curse of Doom. Applying Curse of Recklessness, Curse of Shadow |
| 353 | Shadow Mastery | 5 | `partial` | spell Shadow damagePct (rank vector 0) |
| 354 | Dark Harvest | 1 | `proc-or-conditional` | Not in character-sheet calculation: Reaps the target's life, dealing 704 Shadow damage over 8 sec. While channeling, the time between periodic ticks of your Afflictio |
| 355 | Sinister Pursuit | 2 | `ability-specific` | Not in character-sheet calculation: Increases the movement speed of your demons by 10%. |
| 356 | Demonic Embrace | 5 | `sheet` | percent  sta (rank vector 0); percent  spi (rank vector 1) |
| 357 | Soul Entrapment | 3 | `partial` | scoped All damage when no pet damagePct (rank vector 0); active only under {"pet":"None"} |
| 358 | Soul Funnel | 2 | `active-or-non-stat` | Not in character-sheet calculation: Increases the amount of Health transferred by your Health Funnel by 20% of your demon's missing Health and the Mana transferred by |
| 359 | Demonic Aegis | 3 | `ability-specific` | Not in character-sheet calculation: Increases the effectiveness of your Demon Armor spell by 60%. |
| 360 | Fel Intellect | 3 | `proc-or-conditional` | Not in character-sheet calculation: Increases your demon's Intellect by 30% of your total Intellect and allows 15% of its Mana regeneration to continue while casting. |
| 361 | Fel Domination | 1 | `ability-specific` | Not in character-sheet calculation: Your next Common demon summoning spell has its casting time reduced by 4.5 sec and its Mana cost reduced by 40%. |
| 362 | Fel Stamina | 5 | `proc-or-conditional` | Not in character-sheet calculation: Increases your demon's Stamina by 50% of your total Stamina and reduces its chance to be critically struck by 5%. |
| 363 | Demonic Sacrifice | 1 | `proc-or-conditional` | Not in character-sheet calculation: When activated, sacrifices your summoned demon to grant you an effect. The effect is canceled if any demon is summoned or enslaved |
| 364 | Improved Stones | 2 | `partial` | Proc/event awaiting combat simulation: Stone enhancement and Firestone bonuses require an equipped stone-state check |
| 365 | Master Summoner | 2 | `ability-specific` | Not in character-sheet calculation: Reduces the casting time of your Imp, Voidwalker, Succubus, and Felhunter summoning spells by 4 sec and their mana cost by 60%. In |
| 366 | Nether Studies | 3 | `active-or-non-stat` | Not in character-sheet calculation: Increases the effect of your Succubus' Seduction, your Voidwalker's Torment, your Imp's Blood Pact, and your Felhunter's Tainted B |
| 367 | Unholy Power | 3 | `ability-specific` | Not in character-sheet calculation: Increases the damage done by your demons by 15%. |
| 368 | Power Overwhelming | 1 | `proc-or-conditional` | Not in character-sheet calculation: Channel energy into your demon, breaking all crowd control effects and increasing its damage dealt by 20% for 10 sec. The demon ta |
| 369 | Demonic Precision | 3 | `partial` | pet  hit (rank vector 0); pet  crit (rank vector 0); Proc/event awaiting combat simulation: Pet inheritance of owner spell hit and critical strike requires pet calculation |
| 370 | Master Demonologist | 5 | `proc-or-conditional` | Not in character-sheet calculation: Grants both the Warlock and the summoned demon an effect as long as that demon is active. Imp - Reduces spell costs by 15%. Voidwa |
| 371 | Unleashed Potential | 3 | `proc-or-conditional` | Not in character-sheet calculation: Your direct damage spell hits allow your demon to benefit from 15% of your Fire and Shadow spell bonus damage for 20 sec. Each tic |
| 372 | Soul Link | 1 | `proc-or-conditional` | Not in character-sheet calculation: While a demon is under your control, the damage dealt by you and your demon is increased by 5%. In addition, 20% of all damage you |
| 321 | Shadow Vulnerability | 5 | `proc-or-conditional` | Not in character-sheet calculation: Your Shadow Bolt and Drain Soul have a 10% chance to increase Shadow damage dealt to the target by 20% for 10 sec, with a higher c |
| 322 | Cataclysm | 5 | `ability-specific` | Not in character-sheet calculation: Reduces the Mana cost of your Destruction spells by 10%. |
| 323 | Demonic Swiftness | 2 | `ability-specific` | Not in character-sheet calculation: Reduces the casting time of your Imp's Firebolt spell by 0.5 sec and reduces the cooldown of your Succubus' Lash of Pain spell by  |
| 324 | Bane | 5 | `active-or-non-stat` | Not in character-sheet calculation: Reduces the casting time of your Shadow Bolt, Searing Pain, and Immolate spells by 0.5 sec and your Soul Fire spell by 2 sec. |
| 325 | Aftermath | 3 | `proc-or-conditional` | Not in character-sheet calculation: Increases the periodic damage of your Immolate spell by 6% and gives your Destruction spells a 10% chance to slow the target by 50 |
| 326 | Intensity | 2 | `proc-or-conditional` | Not in character-sheet calculation: Gives your Fire spells a 70% chance to not lose casting time when you take damage. |
| 327 | Shadowburn | 1 | `ability-specific` | Not in character-sheet calculation: Instantly blasts the target for 91 to 103 Shadow damage. If the target dies within 5 sec of Shadowburn, and yields experience or h |
| 328 | Devastation | 5 | `partial` | spell Destruction crit (rank vector 0) |
| 329 | Pyroclasm | 2 | `proc-or-conditional` | Not in character-sheet calculation: Gives your Rain of Fire, Hellfire, Conflagrate, and Soul Fire spells a 26% chance to stun the target for 3 sec. |
| 330 | Destructive Reach | 2 | `ability-specific` | Not in character-sheet calculation: Increases the range of your Destruction spells by 20% and the radius of your Hellfire by 20%. |
| 331 | Improved Searing Pain | 5 | `partial` | spell Searing Pain crit (rank vector 0) |
| 332 | Improved Soul Fire | 2 | `proc-or-conditional` | Not in character-sheet calculation: Your Soul Fire has a 100% chance to refund a Soul Shard and increase your Fire damage by 10% for 30 sec. |
| 333 | Improved Immolate | 5 | `ability-specific` | Not in character-sheet calculation: Increases the damage of your Immolate spell by 20%. |
| 334 | Ruin | 1 | `partial` | spell Destruction criticalDamagePct (rank vector explicit) |
| 335 | Emberstorm | 5 | `partial` | spell Fire damagePct (rank vector 0) |
| 336 | Conflagrate | 1 | `ability-specific` | Not in character-sheet calculation: Ignites the target, dealing 249 to 315 Fire damage and consuming 3 sec of your Immolate spell to deal an amount of damage equal to |

### Validation still required

1. Reconcile effect values, rounding and buff stacking with controlled in-game tests.
2. Verify spell family, weapon subtype, form, shield, aura and pet conditions.
3. Implement simulated abilities, procs, resources, encounter targets and rotation effects without adding temporary bonuses permanently.
4. Expand the explicit mapping for any remaining genuinely permanent character-sheet effects.

The class-specific registry is `docs/sim/core/talent-rules.mjs`; `tests/sim/talent-effects-audit.test.mjs` verifies rank vectors, class coverage and key regressions. **Merging note:** each class branch uses the same registry filename; consolidate the per-class exports before merging multiple branches, rather than allowing later changes to overwrite earlier class rules.
