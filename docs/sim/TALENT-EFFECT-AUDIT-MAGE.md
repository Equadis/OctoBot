# Mage — talent effects audit

**Branch:** `audit/talent-effects-mage` (isolated, no changes to main).

**Source:** [https://octowow.st/talents/mage/](https://octowow.st/talents/mage/) · snapshot 2026-11-11T23:29:44.004273+00:00 · SHA256 `7ad369269087cf74092696a5f10e3115d660a8b0fdbf36af0009fc9815de6ad1`.

### Coverage status

| Measure | Count |
|---|---:|
| Imported talent definitions | 55 |
| Explicitly mapped/reviewed rules | 29 |
| Talents with an applied static/weapon effect | 2 |
| Additional talents with scoped tooltip contributions only | 24 |
| Talents without numeric rules (recorded but pending) | 26 |

Status labels: `partial`: 27; `proc-or-conditional`: 21; `ability-specific`: 4; `sheet`: 2; `active-or-non-stat`: 1.

**Interpretation:** Static and weapon effects may alter the character sheet. Scoped entries describe where published bonuses apply, but do not imply functioning ability damage, mana, cast-time, pet or DPS mechanics. Temporary and conditional effects are not automatically added to permanent totals. The existing calculator still relies on partially unverified Vanilla base coefficients.

### Talent-by-talent ledger

| ID | Talent | Ranks | Coverage | Mapped effects or outstanding mechanic |
|---:|---|---:|---|---|
| 37 | Arcane Subtlety | 2 | `sheet` | global  spellPen (vector 0) |
| 38 | Magic Absorption | 3 | `sheet` | global  arcaneRes (vector 0); global  fireRes (vector 0); global  frostRes (vector 0); global  natureRes (vector 0); global  shadowRes (vector 0) |
| 39 | Improved Arcane Missiles | 5 | `proc-or-conditional` | Pending: Gives you a 100% chance to avoid interruption caused by damage while channeling Arcane Missiles. |
| 40 | Wand Specialization | 2 | `partial` | scoped Wand damagePct (vector 0); scoped Wand hit (vector 1) |
| 41 | Arcane Focus | 5 | `partial` | spell Arcane hit (vector 0) |
| 42 | Arcane Concentration | 5 | `proc-or-conditional` | Pending: Gives you a 10% chance of entering a Clearcasting state after any damage spell hits a target. The Clearcasting state reduces the mana cost of you |
| 43 | Magic Attunement | 1 | `active-or-non-stat` | Pending: Increases the effect of your Amplify Magic and Dampen Magic spells by 100% and allows them to be cast on enemies. Only affects targets level 62 o |
| 44 | Arcane Impact | 3 | `partial` | spell Arcane crit (vector 0) |
| 45 | Arcane Rupture | 1 | `proc-or-conditional` | Pending: Rupture your target with the force of concentrated arcane energy, dealing 101 to 114 Arcane damage and increasing the damage and mana cost of you |
| 46 | Improved Mana Shield | 2 | `proc-or-conditional` | Pending: Decreases the mana lost per point of damage taken when Mana Shield is active by 25%. |
| 47 | Improved Counterspell | 2 | `proc-or-conditional` | Pending: Gives your Counterspell a 100% chance to silence the target for 4 sec. |
| 48 | Temporal Convergence | 3 | `proc-or-conditional` | Pending: Your Arcane Missiles have a chance of 15% to reset the cooldown of Arcane Rupture and cause it to return its base mana cost on its next cast. Thi |
| 49 | Arcane Meditation | 3 | `partial` | scoped Mana regeneration while casting regenPct (vector 0); Pending: Regeneration is tripled below 35% mana and requires a resource model |
| 50 | Arcane Instability | 3 | `proc-or-conditional` | Pending: Your successful damaging Arcane spells have an 25% chance to uncontrollably erupt, consuming 2% of your base mana to deal 25% more damage. |
| 51 | Presence of Mind | 1 | `proc-or-conditional` | Pending: When activated, your next Mage spell with a casting time less than 10 sec becomes an instant cast spell. |
| 52 | Accelerated Arcana | 1 | `partial` | spell Arcane castSpeedPct (vector explicit) |
| 53 | Arcane Potency | 2 | `partial` | spell Arcane criticalDamagePct (vector 0) |
| 54 | Resonance Cascade | 5 | `proc-or-conditional` | Pending: Your successful damaging Arcane spells have a 20% chance to duplicate for 50% of the damage. This effect can trigger off of itself and duplicated |
| 55 | Arcane Power | 1 | `proc-or-conditional` | Pending: When activated, your casting speed is increased by 30% while draining 1% of your maximum mana every second and reducing all mana gain by 50%. Fal |
| 1 | Improved Fireball | 5 | `partial` | scoped Fireball castTimeReductionSeconds (vector 0) |
| 2 | Impact | 5 | `proc-or-conditional` | Pending: Gives your Fire spells a 10% chance to stun the target for 2 sec. |
| 3 | Ignite | 5 | `ability-specific` | Pending: Your critical strikes from Fire damage spells cause the target to burn for an additional 40% of your spell's damage over 4 sec. |
| 4 | Flame Throwing | 2 | `partial` | scoped Fire spells rangeIncreaseYards (vector 0); scoped Blast Wave radiusIncreasePct (vector 1) |
| 5 | Improved Fire Blast | 3 | `partial` | scoped Fire Blast cooldownReductionSeconds (vector 0); scoped Fire Blast globalCooldownReductionSeconds (vector 1) |
| 6 | Incinerate | 2 | `partial` | spell Fire Blast/Scorch crit (vector 0) |
| 7 | Improved Flamestrike | 3 | `partial` | spell Flamestrike crit (vector 0) |
| 8 | Pyroblast | 1 | `ability-specific` | Pending: Hurls an immense fiery boulder that causes 148 to 194 Fire damage and an additional 56 Fire damage over 12 sec. |
| 9 | Burning Soul | 2 | `partial` | scoped Fire spells pushbackResistancePct (vector 0); scoped Fire spells threatReductionPct (vector 1) |
| 10 | Fire Vulnerability | 3 | `partial` | Pending: Fire Vulnerability debuff application and duration are target-state mechanics, not permanent personal Fire damage |
| 11 | Improved Fire Ward | 2 | `proc-or-conditional` | Pending: Causes your Fire Ward to have a 20% chance to reflect Fire spells while active. |
| 12 | Master of Elements | 3 | `ability-specific` | Pending: Your Fire and Frost spell criticals will refund 45% of their base mana cost. |
| 13 | Blast Wave | 1 | `proc-or-conditional` | Pending: A wave of flame radiates outward from the caster, damaging all enemies caught within the 10 yard blast for 160 to 192 Fire damage, and dazing the |
| 14 | Critical Mass | 3 | `partial` | spell Fire crit (vector 0) |
| 15 | Hot Streak | 2 | `proc-or-conditional` | Pending: Gives your Fireball and Fire Blast critical strikes a 100% chance to grant Hot Streak, reducing the cast time of your next Pyroblast by 1 sec per |
| 16 | Fire Power | 5 | `partial` | spell Fire damagePct (vector 0) |
| 17 | Combustion | 1 | `proc-or-conditional` | Pending: When activated, this spell causes each of your Fire damage spell hits to increase your critical strike chance with Fire damage spells by 10%. Thi |
| 18 | Frost Warding | 2 | `partial` | scoped Frost/Ice Armor effectivenessPct (vector 0), conditional on {"armour":["Frost Armor","Ice Armor"]}; Pending: Frost Ward reflection chance requires event simulation |
| 19 | Improved Frostbolt | 5 | `partial` | scoped Frostbolt castTimeReductionSeconds (vector 0) |
| 20 | Elemental Precision | 3 | `partial` | spell Fire/Frost hit (vector 0) |
| 21 | Piercing Ice | 3 | `partial` | spell Frost damagePct (vector 0) |
| 22 | Frostbite | 3 | `proc-or-conditional` | Pending: Gives your Chill effects a 15% chance to freeze the target for 5 sec. |
| 23 | Improved Frost Nova | 2 | `partial` | scoped Frost Nova cooldownReductionSeconds (vector 0) |
| 24 | Permafrost | 3 | `partial` | scoped Chill effects durationIncreaseSeconds (vector 0); scoped Chill effects slowIncreasePct (vector 1) |
| 25 | Ice Shards | 5 | `partial` | spell Frost criticalDamagePct (vector 0) |
| 26 | Cold Snap | 1 | `proc-or-conditional` | Pending: When activated, this spell finishes the cooldown on all of your Frost spells. |
| 27 | Improved Blizzard | 3 | `ability-specific` | Pending: Adds a chill effect to your Blizzard spell. This effect lowers the target's movement speed by 40%. Lasts 1.5 sec. |
| 28 | Arctic Reach | 2 | `partial` | scoped Frostbolt/Icicles/Blizzard rangeIncreasePct (vector 0); scoped Frost Nova/Cone of Cold radiusIncreasePct (vector 0) |
| 29 | Frost Channeling | 3 | `partial` | scoped Frost spells manaCostReductionPct (vector 0); scoped Frost spells threatReductionPct (vector 1) |
| 30 | Shatter | 5 | `partial` | Pending: Shatter's critical bonus only applies to frozen targets |
| 31 | Ice Block | 1 | `proc-or-conditional` | Pending: You become encased in a block of ice, protecting you from all physical attacks and spells for 10 sec, but during that time you cannot attack, mov |
| 32 | Icicles | 1 | `proc-or-conditional` | Pending: Draw upon frost leylines, becoming frozen in place, and launch icicles at the enemy, dealing 101 Frost damage every 1 sec for 5 sec. Damage taken |
| 33 | Improved Cone of Cold | 3 | `partial` | scoped Cone of Cold damagePct (vector 0) |
| 34 | Winter's Chill | 5 | `partial` | Pending: Winter's Chill adds a stackable target debuff and is not player passive critical strike chance |
| 35 | Flash Freeze | 2 | `proc-or-conditional` | Pending: If an effect that causes a target to freeze is not applied due to the target being permanently immune to freeze effects, you have a 100% chance t |
| 36 | Ice Barrier | 1 | `proc-or-conditional` | Pending: Instantly shields you, absorbing 454 damage and increasing your Frost damage by 10% for 1 min. While the shield holds, spells will not be interru |

### Verification blockers

1. Compare all passive/weapon numbers and rounding with controlled OctoWoW client observations.
2. Verify stance, shield, form, aspect, pet, active buff and equipment eligibility.
3. Verify spell-family, ranged and individual-ability hit/crit tables, proc uptime and cast/resource timing before using DPS, TPS or HPS comparisons.
4. Complete mappings of remaining talents if the source indicates a permanent, testable sheet effect.
5. Re-run the branch Actions workflow and the baseline simulator regression suite after changes.

**Integration caution:** all class branches currently use `core/talent-rules.mjs`; their per-class registries need consolidation before multiple branches are merged. Never merge one registry over another.
