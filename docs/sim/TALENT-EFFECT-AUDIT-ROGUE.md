# Rogue — talent effects audit

**Branch:** `audit/talent-effects-rogue` (isolated, no changes to main).

**Source:** [https://octowow.st/talents/rogue/](https://octowow.st/talents/rogue/) · snapshot 2026-11-11T23:29:43.972862+00:00 · SHA256 `865b889058c29c8485d457a3817094b4c289fd588ead58d9ec7d1a295b5fbf65`.

### Coverage status

| Measure | Count |
|---|---:|
| Imported talent definitions | 56 |
| Explicitly mapped/reviewed rules | 29 |
| Talents with an applied static/weapon effect | 11 |
| Additional talents with scoped tooltip contributions only | 18 |
| Talents without numeric rules (recorded but pending) | 27 |

Status labels: `partial`: 21; `sheet`: 8; `proc-or-conditional`: 23; `ability-specific`: 4.

**Interpretation:** Static and weapon effects may alter the character sheet. Scoped entries describe where published bonuses apply, but do not imply functioning ability damage, mana, cast-time, pet or DPS mechanics. Temporary and conditional effects are not automatically added to permanent totals. The existing calculator still relies on partially unverified Vanilla base coefficients.

### Talent-by-talent ledger

| ID | Talent | Ranks | Coverage | Mapped effects or outstanding mechanic |
|---:|---|---:|---|---|
| 128 | Improved Eviscerate | 3 | `partial` | scoped Eviscerate damagePct (vector 0) |
| 129 | Remorseless Attacks | 2 | `proc-or-conditional` | Pending: After killing an opponent that yields experience or honor, gives you a 40% increased critical strike chance on your next Combo Point generating a |
| 130 | Malice | 5 | `sheet` | global  crit (vector 0) |
| 131 | Ruthlessness | 3 | `proc-or-conditional` | Pending: Gives your finishing moves a 100% chance to add a combo point to your target. |
| 132 | Murder | 2 | `partial` | scoped Humanoid/Giant/Beast/Dragonkin targets damagePct (vector 0) |
| 133 | Improved Blade Tactics | 3 | `partial` | scoped Slice and Dice/Flourish durationPct (vector 0) |
| 134 | Relentless Strikes | 1 | `proc-or-conditional` | Pending: Your finishing moves have a 20% chance per combo point to restore 20 energy and increase the damage of your finishing moves by 5% for 30 sec. Sta |
| 135 | Throwing Weapon Specialization | 2 | `partial` | scoped Throw/Deadly Throw rangeIncreaseYards (vector 0) |
| 136 | Lethality | 5 | `partial` | scoped Combo-point generators criticalDamage (vector 0) |
| 137 | Taste for Blood | 2 | `partial` | scoped Rupture durationIncreaseSeconds (vector 0); Pending: Melee damage bonus per combo point is a temporary Rupture aura |
| 138 | Vile Poisons | 3 | `partial` | scoped Poisons damagePct (vector 0); scoped Poison dispels resistChancePct (vector 1) |
| 139 | Improved Poisons | 3 | `sheet` | global  poisonChance (vector 0) |
| 140 | Efficient Poisons | 3 | `partial` | scoped Poison application resistReductionPct (vector 0); Pending: Chance not to consume poison charges is event-driven |
| 141 | Envenom | 1 | `proc-or-conditional` | Pending: Finishing move that increases the effectiveness and the chance to apply poisons to your target by 30%. Lasts longer per combo point: 1 point : 12 |
| 142 | Cold Blood | 1 | `proc-or-conditional` | Pending: When activated, increases the critical strike chance of your next Sinister Strike, Backstab, Ambush, Noxious Assault, or Eviscerate by 100%. |
| 143 | Vigor | 2 | `partial` | special  maxEnergy (vector 0); Pending: Energy on poison application is event-driven |
| 144 | Seal Fate | 5 | `proc-or-conditional` | Pending: Your critical strikes from abilities that add combo points have a 100% chance to add an additional combo point. |
| 145 | Noxious Assault | 1 | `ability-specific` | Pending: Strikes with both weapons, dealing 30 damage plus 30% of your Attack Power and applies poisons from both weapons. Awards 1 combo point. |
| 110 | Opportunity | 5 | `partial` | scoped Backstab/Garrote/Ambush from behind damagePct (vector 0) |
| 111 | Lightning Reflexes | 5 | `sheet` | global  dodge (vector 0) |
| 112 | Deflection | 5 | `sheet` | global  parry (vector 0) |
| 113 | Improved Backstab | 3 | `partial` | spell Backstab crit (vector 0) |
| 114 | Precision | 5 | `sheet` | global  hit (vector 0) |
| 115 | Riposte | 1 | `proc-or-conditional` | Pending: A strike that becomes active after parrying an opponent's attack. This attack deals 150% weapon damage and disarms the target for 6 sec. |
| 116 | Improved Sprint | 2 | `proc-or-conditional` | Pending: Gives a 100% chance to remove all movement impairing effects when you activate your Sprint ability. |
| 117 | Setup | 3 | `proc-or-conditional` | Pending: Gives you a 45% chance to add a combo point to your target after dodging their attack or fully resisting one of their spells. |
| 118 | Improved Kick | 2 | `proc-or-conditional` | Pending: Gives your Kick ability a 100% chance to silence the target for 2 sec. |
| 119 | Concussive Blows | 5 | `proc-or-conditional` | Pending: Gives you a 6% chance to stun your target for 3 sec with a mace. |
| 120 | Dual Wield Specialization | 5 | `sheet` | offhand  damagePct (vector 0) |
| 121 | Close Quarters Combat | 2 | `sheet` | weapon mace crit (vector 0); weapon dagger crit (vector 0); weapon fist crit (vector 0) |
| 122 | Surprise Attack | 1 | `proc-or-conditional` | Pending: A surprise strike that deals 25% of your Attack Power as damage. Only useable after the target dodges and cannot be blocked, dodged or parried by |
| 123 | Hack and Slash | 2 | `proc-or-conditional` | Pending: Gives you a 5% chance to get an extra attack on the same target after dealing damage with your Axe or Sword. |
| 124 | Weapon Expertise | 2 | `sheet` | weapon expertise-weapons skill (vector 0) |
| 125 | Blade Rush | 2 | `partial` | special  meleeHastePct (vector 0); Pending: Agility-based Energy tick reduction requires a resource model |
| 126 | Aggression | 3 | `partial` | scoped Sinister Strike/Eviscerate/Riposte/Surprise Attack damagePct (vector 0) |
| 127 | Adrenaline Rush | 1 | `proc-or-conditional` | Pending: Increases your Energy regeneration rate by 100% for 15 sec. |
| 146 | Camouflage | 5 | `partial` | scoped Stealth movement movementSpeedPct (vector 0); scoped Stealth cooldownReductionSeconds (vector 1) |
| 147 | Improved Expose Armor | 2 | `partial` | scoped Expose Armor armourReductionPct (vector 0) |
| 148 | Improved Gouge | 3 | `partial` | scoped Gouge durationIncreaseSeconds (vector 0) |
| 149 | Improved Ambush | 3 | `partial` | spell Ambush crit (vector 0) |
| 150 | Elusiveness | 2 | `ability-specific` | Pending: Reduces the cooldown of your Vanish and Blind abilities by 1.5 min. |
| 151 | Serrated Blades | 3 | `partial` | global  armorPen (vector 1); scoped Rupture/Garrote damagePct (vector 0) |
| 152 | Initiative | 3 | `proc-or-conditional` | Pending: Gives you a 100% chance to add an additional combo point to your target when using your Ambush, Garrote, or Cheap Shot ability. |
| 153 | Improved Ghostly Strike | 3 | `proc-or-conditional` | Pending: Your Ghostly Strike increases your movement speed by 15% and increases your party members' movement speed by 6% within 30 yards for 5 sec. In add |
| 154 | Smoke Bomb | 1 | `proc-or-conditional` | Pending: Creates a cloud of thick smoke in 8 yards around you for 8 sec. All targets inside the smoke have a 20% reduced chance of being hit by attacks an |
| 155 | Hemorrhage | 1 | `ability-specific` | Pending: An instant strike that deals 110% weapon damage and causes the target to hemorrhage, increasing any Physical damage dealt to the target by 2%. La |
| 156 | Cloaked in Shadows | 2 | `proc-or-conditional` | Pending: Whenever you Vanish, you and nearby party members within 20 yards are cloaked in shadows, gaining a barrier that absorbs up to 12% of your maximu |
| 157 | Blackjack | 2 | `proc-or-conditional` | Pending: Your Sap and Blind abilities reduce the target's damage dealt by 10% for 8 sec when their effect ends or fails to apply. In addition, you have a  |
| 158 | Blinding Haze | 3 | `partial` | scoped Distract energyCostReduction (vector 0); Pending: Hit reduction debuff requires a target-aura model |
| 159 | Dirty Deeds | 2 | `partial` | scoped Cheap Shot/Garrote energyCostReduction (vector 0) |
| 160 | Preparation | 1 | `proc-or-conditional` | Pending: When activated, this ability immediately finishes the cooldown on your other Rogue abilities. |
| 161 | Shadow of Death | 1 | `proc-or-conditional` | Pending: A finishing move that etches a sigil onto the target for 6 sec. The sigil accumulates damage equal to a percentage of all damage the target takes |
| 162 | Bloody Mess | 2 | `partial` | scoped Hemorrhage energyCostReduction (vector 0); scoped Hemorrhage physical vulnerability damageBonusPct (vector 1) |
| 163 | Honor Among Thieves | 2 | `ability-specific` | Pending: Physical critical strikes by you or party members within 20 yards grant you 5 Energy. |
| 164 | Tricks of the Trade | 5 | `proc-or-conditional` | Pending: Your opening moves have a 100% chance and your finishing moves have a 20% chance per combo point to increase your party members' critical strike  |
| 165 | Mark for Death | 1 | `proc-or-conditional` | Pending: A marking strike that deals 135% weapon damage and reveals the target’s vulnerabilities, increasing your party members' Attack Power by 30% and d |

### Published tooltip anomaly

`Elusiveness` rank 1 reports **45 minutes** of cooldown reduction; rank 2 reports **1.5 minutes**. Units conflict, so both ranks remain outside numerical cooldown calculation until verified in-game.

### Verification blockers

1. Compare all passive/weapon numbers and rounding with controlled OctoWoW client observations.
2. Verify stance, shield, form, aspect, pet, active buff and equipment eligibility.
3. Verify spell-family, ranged and individual-ability hit/crit tables, proc uptime and cast/resource timing before using DPS, TPS or HPS comparisons.
4. Complete mappings of remaining talents if the source indicates a permanent, testable sheet effect.
5. Re-run the branch Actions workflow and the baseline simulator regression suite after changes.

**Integration caution:** all class branches currently use `core/talent-rules.mjs`; their per-class registries need consolidation before multiple branches are merged. Never merge one registry over another.
