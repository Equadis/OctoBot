# Mage — talent effect audit

**Independent branch:** `audit/talent-effects-mage`; source [official class calculator](https://octowow.st/talents/mage/) (retrieved 2026-11-11T23:29:44.004273+00:00, HTML SHA256 `7ad369269087cf74092696a5f10e3115d660a8b0fdbf36af0009fc9815de6ad1`).

**Review coverage:** all 55 talents have a classification; 15 have explicitly mapped effect rules. Counts: {"active-or-non-stat":3,"proc-or-conditional":26,"ability-specific":11,"partial":13,"sheet":2}. These are calculator-derived estimates, not verified live combat formulas.

**Status guide:** `sheet` contributes to static or weapon-derived numbers, `partial` tracks a subset with remaining combat work, and other categories are intentionally excluded from blanket stats. Every unimplemented entry is a tracked verification gap.

| ID | Talent | Max ranks | Status | Mapped / outstanding effect |
|---:|---|---:|---|---|
| 37 | Arcane Subtlety | 2 | `sheet` | global  spellPen (rank vector 0) |
| 38 | Magic Absorption | 3 | `sheet` | global  arcaneRes (rank vector 0); global  fireRes (rank vector 0); global  frostRes (rank vector 0); global  natureRes (rank vector 0); global  shadowRes (rank vector 0) |
| 39 | Improved Arcane Missiles | 5 | `proc-or-conditional` | Not in character-sheet calculation: Gives you a 100% chance to avoid interruption caused by damage while channeling Arcane Missiles. |
| 40 | Wand Specialization | 2 | `partial` | scoped Wand damagePct (rank vector 0); scoped Wand hit (rank vector 1) |
| 41 | Arcane Focus | 5 | `partial` | spell Arcane hit (rank vector 0) |
| 42 | Arcane Concentration | 5 | `proc-or-conditional` | Not in character-sheet calculation: Gives you a 10% chance of entering a Clearcasting state after any damage spell hits a target. The Clearcasting state reduces the m |
| 43 | Magic Attunement | 1 | `active-or-non-stat` | Not in character-sheet calculation: Increases the effect of your Amplify Magic and Dampen Magic spells by 100% and allows them to be cast on enemies. Only affects tar |
| 44 | Arcane Impact | 3 | `partial` | spell Arcane crit (rank vector 0) |
| 45 | Arcane Rupture | 1 | `proc-or-conditional` | Not in character-sheet calculation: Rupture your target with the force of concentrated arcane energy, dealing 101 to 114 Arcane damage and increasing the damage and m |
| 46 | Improved Mana Shield | 2 | `proc-or-conditional` | Not in character-sheet calculation: Decreases the mana lost per point of damage taken when Mana Shield is active by 25%. |
| 47 | Improved Counterspell | 2 | `proc-or-conditional` | Not in character-sheet calculation: Gives your Counterspell a 100% chance to silence the target for 4 sec. |
| 48 | Temporal Convergence | 3 | `proc-or-conditional` | Not in character-sheet calculation: Your Arcane Missiles have a chance of 15% to reset the cooldown of Arcane Rupture and cause it to return its base mana cost on its |
| 49 | Arcane Meditation | 3 | `proc-or-conditional` | Not in character-sheet calculation: Allows 20% of your Mana regeneration to continue while casting. This effect is tripled while below 35% total mana. |
| 50 | Arcane Instability | 3 | `proc-or-conditional` | Not in character-sheet calculation: Your successful damaging Arcane spells have an 25% chance to uncontrollably erupt, consuming 2% of your base mana to deal 25% more |
| 51 | Presence of Mind | 1 | `proc-or-conditional` | Not in character-sheet calculation: When activated, your next Mage spell with a casting time less than 10 sec becomes an instant cast spell. |
| 52 | Accelerated Arcana | 1 | `partial` | spell Arcane castSpeedPct (rank vector explicit) |
| 53 | Arcane Potency | 2 | `partial` | spell Arcane criticalDamagePct (rank vector 0) |
| 54 | Resonance Cascade | 5 | `proc-or-conditional` | Not in character-sheet calculation: Your successful damaging Arcane spells have a 20% chance to duplicate for 50% of the damage. This effect can trigger off of itself |
| 55 | Arcane Power | 1 | `proc-or-conditional` | Not in character-sheet calculation: When activated, your casting speed is increased by 30% while draining 1% of your maximum mana every second and reducing all mana g |
| 1 | Improved Fireball | 5 | `active-or-non-stat` | Not in character-sheet calculation: Reduces the casting time of your Fireball spell by 0.5 sec. |
| 2 | Impact | 5 | `proc-or-conditional` | Not in character-sheet calculation: Gives your Fire spells a 10% chance to stun the target for 2 sec. |
| 3 | Ignite | 5 | `ability-specific` | Not in character-sheet calculation: Your critical strikes from Fire damage spells cause the target to burn for an additional 40% of your spell's damage over 4 sec. |
| 4 | Flame Throwing | 2 | `ability-specific` | Not in character-sheet calculation: Increases the range of your Fire spells by 6 yards and the radius of your Blast Wave by 20%. |
| 5 | Improved Fire Blast | 3 | `ability-specific` | Not in character-sheet calculation: Reduces the cooldown of your Fire Blast spell by 1.5 sec and its global cooldown by 1 sec. |
| 6 | Incinerate | 2 | `partial` | spell Fire Blast/Scorch crit (rank vector 0) |
| 7 | Improved Flamestrike | 3 | `partial` | spell Flamestrike crit (rank vector 0) |
| 8 | Pyroblast | 1 | `ability-specific` | Not in character-sheet calculation: Hurls an immense fiery boulder that causes 148 to 194 Fire damage and an additional 56 Fire damage over 12 sec. |
| 9 | Burning Soul | 2 | `proc-or-conditional` | Not in character-sheet calculation: Gives your Fire spells a 70% chance to not lose casting time when you take damage and reduces the threat caused by your Fire spell |
| 10 | Fire Vulnerability | 3 | `proc-or-conditional` | Not in character-sheet calculation: Your Scorch and Fire Blast spells have a 100% chance to cause your target to be vulnerable to Fire damage. This vulnerability incr |
| 11 | Improved Fire Ward | 2 | `proc-or-conditional` | Not in character-sheet calculation: Causes your Fire Ward to have a 20% chance to reflect Fire spells while active. |
| 12 | Master of Elements | 3 | `ability-specific` | Not in character-sheet calculation: Your Fire and Frost spell criticals will refund 45% of their base mana cost. |
| 13 | Blast Wave | 1 | `proc-or-conditional` | Not in character-sheet calculation: A wave of flame radiates outward from the caster, damaging all enemies caught within the 10 yard blast for 160 to 192 Fire damage, |
| 14 | Critical Mass | 3 | `partial` | spell Fire crit (rank vector 0) |
| 15 | Hot Streak | 2 | `proc-or-conditional` | Not in character-sheet calculation: Gives your Fireball and Fire Blast critical strikes a 100% chance to grant Hot Streak, reducing the cast time of your next Pyrobla |
| 16 | Fire Power | 5 | `partial` | spell Fire damagePct (rank vector 0) |
| 17 | Combustion | 1 | `proc-or-conditional` | Not in character-sheet calculation: When activated, this spell causes each of your Fire damage spell hits to increase your critical strike chance with Fire damage spe |
| 18 | Frost Warding | 2 | `proc-or-conditional` | Not in character-sheet calculation: Increases the armor and resistances given by your Frost Armor and Ice Armor spells by 30%. In addition, gives your Frost Ward a 20 |
| 19 | Improved Frostbolt | 5 | `active-or-non-stat` | Not in character-sheet calculation: Reduces the casting time of your Frostbolt spell by 0.5 sec. |
| 20 | Elemental Precision | 3 | `partial` | spell Fire/Frost hit (rank vector 0) |
| 21 | Piercing Ice | 3 | `partial` | spell Frost damagePct (rank vector 0) |
| 22 | Frostbite | 3 | `proc-or-conditional` | Not in character-sheet calculation: Gives your Chill effects a 15% chance to freeze the target for 5 sec. |
| 23 | Improved Frost Nova | 2 | `ability-specific` | Not in character-sheet calculation: Reduces the cooldown of your Frost Nova spell by 4 sec. |
| 24 | Permafrost | 3 | `ability-specific` | Not in character-sheet calculation: Increases the duration of your Chill effects by 3 sec and reduces the target's speed by an additional 10%. |
| 25 | Ice Shards | 5 | `partial` | spell Frost criticalDamagePct (rank vector 0) |
| 26 | Cold Snap | 1 | `proc-or-conditional` | Not in character-sheet calculation: When activated, this spell finishes the cooldown on all of your Frost spells. |
| 27 | Improved Blizzard | 3 | `ability-specific` | Not in character-sheet calculation: Adds a chill effect to your Blizzard spell. This effect lowers the target's movement speed by 40%. Lasts 1.5 sec. |
| 28 | Arctic Reach | 2 | `ability-specific` | Not in character-sheet calculation: Increases the range of your Frostbolt, Icicles and Blizzard spells and the radius of your Frost Nova and Cone of Cold spells by 20 |
| 29 | Frost Channeling | 3 | `ability-specific` | Not in character-sheet calculation: Reduces the mana cost of your Frost spells by 15% and reduces the threat caused by your Frost spells by 30%. |
| 30 | Shatter | 5 | `partial` | Proc/event awaiting combat simulation: Shatter's critical bonus only applies to frozen targets |
| 31 | Ice Block | 1 | `proc-or-conditional` | Not in character-sheet calculation: You become encased in a block of ice, protecting you from all physical attacks and spells for 10 sec, but during that time you can |
| 32 | Icicles | 1 | `proc-or-conditional` | Not in character-sheet calculation: Draw upon frost leylines, becoming frozen in place, and launch icicles at the enemy, dealing 101 Frost damage every 1 sec for 5 se |
| 33 | Improved Cone of Cold | 3 | `ability-specific` | Not in character-sheet calculation: Increases the damage dealt by your Cone of Cold spell by 35%. |
| 34 | Winter's Chill | 5 | `proc-or-conditional` | Not in character-sheet calculation: Gives your Frost damage spells a 100% chance to apply the Winter's Chill effect, which increases the chance a Frost spell will cri |
| 35 | Flash Freeze | 2 | `proc-or-conditional` | Not in character-sheet calculation: If an effect that causes a target to freeze is not applied due to the target being permanently immune to freeze effects, you have  |
| 36 | Ice Barrier | 1 | `proc-or-conditional` | Not in character-sheet calculation: Instantly shields you, absorbing 454 damage and increasing your Frost damage by 10% for 1 min. While the shield holds, spells will |

### Validation still required

1. Reconcile effect values, rounding and buff stacking with controlled in-game tests.
2. Verify spell family, weapon subtype, form, shield, aura and pet conditions.
3. Implement simulated abilities, procs, resources, encounter targets and rotation effects without adding temporary bonuses permanently.
4. Expand the explicit mapping for any remaining genuinely permanent character-sheet effects.

The class-specific registry is `docs/sim/core/talent-rules.mjs`; `tests/sim/talent-effects-audit.test.mjs` verifies rank vectors, class coverage and key regressions. **Merging note:** each class branch uses the same registry filename; consolidate the per-class exports before merging multiple branches, rather than allowing later changes to overwrite earlier class rules.
