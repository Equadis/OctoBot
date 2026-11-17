# Warrior — talent effects audit

**Branch:** `audit/talent-effects-warrior` (isolated, no changes to main).

**Source:** [https://octowow.st/talents/warrior/](https://octowow.st/talents/warrior/) · snapshot 2026-11-11T23:29:44.088091+00:00 · SHA256 `b8b800af1b9e2927d3fc7647a155fcf7fc87f216f520b8bf3d2782d2bf2879a2`.

### Coverage status

| Measure | Count |
|---|---:|
| Imported talent definitions | 54 |
| Explicitly mapped/reviewed rules | 34 |
| Talents with an applied static/weapon effect | 10 |
| Additional talents with scoped tooltip contributions only | 23 |
| Talents without numeric rules (recorded but pending) | 20 |

Status labels: `partial`: 26; `proc-or-conditional`: 18; `sheet`: 8; `ability-specific`: 2.

**Interpretation:** Static and weapon effects may alter the character sheet. Scoped entries describe where published bonuses apply, but do not imply functioning ability damage, mana, cast-time, pet or DPS mechanics. Temporary and conditional effects are not automatically added to permanent totals. The existing calculator still relies on partially unverified Vanilla base coefficients.

### Talent-by-talent ledger

| ID | Talent | Ranks | Coverage | Mapped effects or outstanding mechanic |
|---:|---|---:|---|---|
| 56 | Improved Heroic Strike | 3 | `partial` | scoped Heroic Strike rageCostReduction (vector 0) |
| 57 | Tactical Mastery | 5 | `proc-or-conditional` | Pending: You retain up to 25 of your rage points when you change stances. |
| 58 | Improved Rend | 2 | `partial` | scoped Rend bleed damagePct (vector 0) |
| 59 | Improved Charge | 2 | `partial` | scoped Charge rageGained (vector 0) |
| 60 | Deflection | 5 | `sheet` | global  parry (vector 0) |
| 61 | Improved Thunder Clap | 3 | `partial` | scoped Thunder Clap rageCostReduction (vector 0); scoped Thunder Clap damagePct (vector 1) |
| 62 | Master Strike | 1 | `proc-or-conditional` | Pending: Performs a skillful attack, dealing 35% weapon damage and causing an additional effect depending on your main hand weapon. Mace: Disorients the t |
| 63 | Improved Overpower | 2 | `partial` | scoped Overpower criticalChance (vector 0) |
| 64 | Deep Wounds | 3 | `ability-specific` | Pending: Your critical strikes cause the opponent to bleed, dealing 60% of your melee weapon's average damage over 6 sec. |
| 65 | Two-Handed Weapon Specialization | 3 | `sheet` | weapon twohand damagePct (vector 0); weapon twohand skill (vector 1) |
| 66 | Impale | 2 | `partial` | scoped Battle/Defensive/Berserker abilities criticalDamage (vector 0) |
| 67 | Master of Arms | 5 | `partial` | weapon axe crit (vector 0); weapon mace armorPen (vector 1, × level); Pending: Sword extra-attack proc and polearm range require combat/range support |
| 68 | Sweeping Strikes | 1 | `proc-or-conditional` | Pending: Your next 5 abilities and main-hand melee attacks strike an additional nearby opponent. |
| 69 | Boundless Anger | 3 | `sheet` | special  maxRage (vector 0) |
| 70 | Improved Disciplines | 3 | `partial` | scoped Retaliation/Recklessness/Shield Wall cooldownReductionMinutes (vector 0) |
| 71 | Improved Slam | 2 | `partial` | scoped Slam castTimeReductionSeconds (vector 0); scoped Slam globalCooldownReductionSeconds (vector 0) |
| 72 | Precision Cut | 3 | `partial` | scoped Execute per extra Rage damagePct (vector 0) |
| 73 | Mortal Strike | 1 | `proc-or-conditional` | Pending: A vicious strike that deals 115% weapon damage and wounds the target, reducing the effectiveness of any healing by 50% for 10 sec. |
| 93 | Booming Voice | 5 | `partial` | scoped Shouts areaOfEffectPct (vector 0); scoped Battle/Demoralizing Shout durationPct (vector 1) |
| 94 | Cruelty | 5 | `sheet` | global  crit (vector 0) |
| 95 | Dual Wield Specialization | 5 | `sheet` | offhand  damagePct (vector 0); offhand  hit (vector 0) |
| 96 | Unbridled Wrath | 5 | `proc-or-conditional` | Pending: Gives you a 75% chance to generate an additional Rage point when you deal melee damage with a weapon. The effect is doubled for two-handed weapon |
| 97 | Improved Shouts | 5 | `partial` | Pending: Increases the strength of selected shouts; buff source/stacking verification needed; scoped Battle Shout attackPowerBonusPct (vector 0); scoped Demoralizing Shout attackPowerReductionPct (vector 1) |
| 98 | Piercing Howl | 1 | `proc-or-conditional` | Pending: Causes all enemies near the warrior to be dazed, reducing movement speed by 50% for 6 sec. |
| 99 | Blood Craze | 3 | `proc-or-conditional` | Pending: Regenerates 6% of your total Health over 6 sec after being the victim of a critical strike. |
| 100 | Battlefield Mobility | 2 | `partial` | scoped Intercept/Intervene cooldownReductionSeconds (vector 0); scoped Charge cooldownReductionSeconds (vector 1) |
| 101 | Enrage | 5 | `proc-or-conditional` | Pending: Gives you a 20% melee damage bonus for 8 sec after being the victim of a critical strike. |
| 102 | Improved Pummel | 2 | `partial` | scoped Pummel school lockout durationIncreaseSeconds (vector 1); Pending: Pummel slow is proc/ability-specific |
| 103 | Ravager | 3 | `partial` | scoped Whirlwind cooldownReductionSeconds (vector 0); scoped Cleave rageCostReduction (vector 1) |
| 104 | Death Wish | 1 | `proc-or-conditional` | Pending: When activated, increases your physical damage by 20% and makes you immune to Fear effects, but lowers your armor and all resistances by 20%. Las |
| 105 | Improved Execute | 2 | `partial` | scoped Execute rageCostReduction (vector 0) |
| 106 | Improved Berserker Rage | 2 | `proc-or-conditional` | Pending: Using Berserker Rage generates 10 Rage and grants a 100% chance to break free from movement impairing effects when activated. |
| 107 | Flurry | 5 | `partial` | Pending: Flurry is a three-swing proc, not permanent attack speed |
| 108 | Blood Drinker | 3 | `proc-or-conditional` | Pending: While affected by Enrage, Death Wish, or Recklessness, your melee attacks and abilities restore 2% of your maximum health. |
| 109 | Bloodthirst | 1 | `proc-or-conditional` | Pending: Instantly perform a reckless attack, dealing 100 damage plus 35% of your Attack Power and increasing your movement speed by 10% for 6 sec. |
| 74 | Improved Bloodrage | 2 | `partial` | scoped Bloodrage instantRageGained (vector 0) |
| 75 | Shield Specialization | 5 | `partial` | special  blockChance (vector 0), conditional on {"shield":true}; Pending: Rage generated after a successful block requires combat simulation |
| 76 | Anticipation | 3 | `sheet` | global  defense (vector 0) |
| 77 | Iron Will | 5 | `partial` | scoped Stun/Charm resistChancePct (vector 0) |
| 78 | Toughness | 5 | `sheet` | special  itemArmourPct (vector 0); special  shieldBlockValuePct (vector 1) |
| 79 | Last Stand | 1 | `proc-or-conditional` | Pending: When activated, this ability temporarily grants you 30% of your maximum hit points for 20 seconds. After the effect expires, the hit points are l |
| 80 | Improved Intervene | 2 | `proc-or-conditional` | Pending: Grants a 100% chance to gain immunity to movement impairing effects for 3 sec after using Intervene. |
| 81 | Improved Taunt | 2 | `partial` | scoped Taunt cooldownReductionSeconds (vector 0) |
| 82 | Improved Revenge | 3 | `partial` | scoped Revenge stunChancePct (vector 0); scoped Revenge cooldownReductionSeconds (vector 1) |
| 83 | Gag Order | 2 | `proc-or-conditional` | Pending: Your Shield Slam has an additional 100% chance to dispel 1 magic effect on the target and your Shield Bash ability has a 100% chance to silence t |
| 84 | Improved Disarm | 2 | `ability-specific` | Pending: Decreases the cooldown of your Disarm ability by 20 secs. |
| 85 | Defiance | 5 | `partial` | scoped Defensive Stance threatPct (vector 0), conditional on {"stance":"Defensive"} |
| 86 | One-Handed Weapon Specialization | 5 | `sheet` | weapon onehand damagePct (vector 0) |
| 87 | Shield Slam | 1 | `proc-or-conditional` | Pending: Slam the target with your shield, causing 174 to 184 damage, modified by your shield block value and attack power. This attack causes a high amou |
| 88 | Improved Shield Slam | 2 | `partial` | scoped Shield Slam cooldownReductionSeconds (vector 0); Pending: Temporary next-attack block chance requires an event model |
| 89 | Reprisal | 2 | `partial` | scoped Revenge damagePct (vector 0); Pending: Refund Rage on hit is event-dependent |
| 90 | Improved Shield Wall | 2 | `partial` | scoped Shield Wall durationIncreaseSeconds (vector 0); scoped Shield Wall cooldownReductionMinutes (vector 1) |
| 91 | Defensive Tactics | 3 | `proc-or-conditional` | Pending: While wearing a shield, you retain 180% of the increased threat generation from Defensive Stance in other stances. |
| 92 | Concussion Blow | 1 | `proc-or-conditional` | Pending: Deals 115 damage and stuns the opponent for 3 sec. This ability deals a high amount of threat and penetrates 100% of the enemy's armor. Instantly |

### Verification blockers

1. Compare all passive/weapon numbers and rounding with controlled OctoWoW client observations.
2. Verify stance, shield, form, aspect, pet, active buff and equipment eligibility.
3. Verify spell-family, ranged and individual-ability hit/crit tables, proc uptime and cast/resource timing before using DPS, TPS or HPS comparisons.
4. Complete mappings of remaining talents if the source indicates a permanent, testable sheet effect.
5. Re-run the branch Actions workflow and the baseline simulator regression suite after changes.

**Integration caution:** all class branches currently use `core/talent-rules.mjs`; their per-class registries need consolidation before multiple branches are merged. Never merge one registry over another.
