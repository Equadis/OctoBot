# Rogue — talent effect audit

**Independent branch:** `audit/talent-effects-rogue`; source [official class calculator](https://octowow.st/talents/rogue/) (retrieved 2026-11-11T23:29:43.972862+00:00, HTML SHA256 `865b889058c29c8485d457a3817094b4c289fd588ead58d9ec7d1a295b5fbf65`).

**Review coverage:** all 56 talents have a classification; 15 have explicitly mapped effect rules. Counts: {"proc-or-conditional":29,"sheet":8,"partial":7,"ability-specific":10,"active-or-non-stat":2}. These are calculator-derived estimates, not verified live combat formulas.

**Status guide:** `sheet` contributes to static or weapon-derived numbers, `partial` tracks a subset with remaining combat work, and other categories are intentionally excluded from blanket stats. Every unimplemented entry is a tracked verification gap.

| ID | Talent | Max ranks | Status | Mapped / outstanding effect |
|---:|---|---:|---|---|
| 128 | Improved Eviscerate | 3 | `partial` | scoped Eviscerate damagePct (rank vector 0) |
| 129 | Remorseless Attacks | 2 | `proc-or-conditional` | Not in character-sheet calculation: After killing an opponent that yields experience or honor, gives you a 40% increased critical strike chance on your next Combo Poi |
| 130 | Malice | 5 | `sheet` | global  crit (rank vector 0) |
| 131 | Ruthlessness | 3 | `proc-or-conditional` | Not in character-sheet calculation: Gives your finishing moves a 100% chance to add a combo point to your target. |
| 132 | Murder | 2 | `ability-specific` | Not in character-sheet calculation: Increases all damage caused against Humanoid, Giant, Beast and Dragonkin targets by 2%. |
| 133 | Improved Blade Tactics | 3 | `active-or-non-stat` | Not in character-sheet calculation: Increases the duration of your Slice and Dice and Flourish abilities by 45%. |
| 134 | Relentless Strikes | 1 | `proc-or-conditional` | Not in character-sheet calculation: Your finishing moves have a 20% chance per combo point to restore 20 energy and increase the damage of your finishing moves by 5%  |
| 135 | Throwing Weapon Specialization | 2 | `proc-or-conditional` | Not in character-sheet calculation: Increases the range of Throw and Deadly Throw by 6 yards and gives your Deadly Throw a 100% chance to apply your off-hand weapon p |
| 136 | Lethality | 5 | `partial` | scoped Combo-point generators criticalDamage (rank vector 0) |
| 137 | Taste for Blood | 2 | `ability-specific` | Not in character-sheet calculation: Increases the duration of your Rupture by 6 sec. Each time you use Rupture, your melee damage is increased by 2% per combo point f |
| 138 | Vile Poisons | 3 | `proc-or-conditional` | Not in character-sheet calculation: Increases the damage dealt by your poisons by 30% and gives your poisons an additional 40% chance to resist dispel effects. |
| 139 | Improved Poisons | 3 | `sheet` | global  poisonChance (rank vector 0) |
| 140 | Efficient Poisons | 3 | `proc-or-conditional` | Not in character-sheet calculation: Reduces the chance your poisons will be resisted by 12% and gives your poison applications a 45% chance to not consume a charge. |
| 141 | Envenom | 1 | `proc-or-conditional` | Not in character-sheet calculation: Finishing move that increases the effectiveness and the chance to apply poisons to your target by 30%. Lasts longer per combo poin |
| 142 | Cold Blood | 1 | `proc-or-conditional` | Not in character-sheet calculation: When activated, increases the critical strike chance of your next Sinister Strike, Backstab, Ambush, Noxious Assault, or Eviscerat |
| 143 | Vigor | 2 | `partial` | special  maxEnergy (rank vector 0); Proc/event awaiting combat simulation: Energy on poison application is event-driven |
| 144 | Seal Fate | 5 | `proc-or-conditional` | Not in character-sheet calculation: Your critical strikes from abilities that add combo points have a 100% chance to add an additional combo point. |
| 145 | Noxious Assault | 1 | `ability-specific` | Not in character-sheet calculation: Strikes with both weapons, dealing 30 damage plus 30% of your Attack Power and applies poisons from both weapons. Awards 1 combo p |
| 110 | Opportunity | 5 | `proc-or-conditional` | Not in character-sheet calculation: Increases the damage dealt when striking from behind with your Backstab, Garrote, or Ambush abilities by 15%. |
| 111 | Lightning Reflexes | 5 | `sheet` | global  dodge (rank vector 0) |
| 112 | Deflection | 5 | `sheet` | global  parry (rank vector 0) |
| 113 | Improved Backstab | 3 | `partial` | spell Backstab crit (rank vector 0) |
| 114 | Precision | 5 | `sheet` | global  hit (rank vector 0) |
| 115 | Riposte | 1 | `proc-or-conditional` | Not in character-sheet calculation: A strike that becomes active after parrying an opponent's attack. This attack deals 150% weapon damage and disarms the target for  |
| 116 | Improved Sprint | 2 | `proc-or-conditional` | Not in character-sheet calculation: Gives a 100% chance to remove all movement impairing effects when you activate your Sprint ability. |
| 117 | Setup | 3 | `proc-or-conditional` | Not in character-sheet calculation: Gives you a 45% chance to add a combo point to your target after dodging their attack or fully resisting one of their spells. |
| 118 | Improved Kick | 2 | `proc-or-conditional` | Not in character-sheet calculation: Gives your Kick ability a 100% chance to silence the target for 2 sec. |
| 119 | Concussive Blows | 5 | `proc-or-conditional` | Not in character-sheet calculation: Gives you a 6% chance to stun your target for 3 sec with a mace. |
| 120 | Dual Wield Specialization | 5 | `sheet` | offhand  damagePct (rank vector 0) |
| 121 | Close Quarters Combat | 2 | `sheet` | weapon mace crit (rank vector 0); weapon dagger crit (rank vector 0); weapon fist crit (rank vector 0) |
| 122 | Surprise Attack | 1 | `proc-or-conditional` | Not in character-sheet calculation: A surprise strike that deals 25% of your Attack Power as damage. Only useable after the target dodges and cannot be blocked, dodge |
| 123 | Hack and Slash | 2 | `proc-or-conditional` | Not in character-sheet calculation: Gives you a 5% chance to get an extra attack on the same target after dealing damage with your Axe or Sword. |
| 124 | Weapon Expertise | 2 | `sheet` | weapon expertise-weapons skill (rank vector 0) |
| 125 | Blade Rush | 2 | `partial` | special  meleeHastePct (rank vector 0); Proc/event awaiting combat simulation: Agility-based Energy tick reduction requires a resource model |
| 126 | Aggression | 3 | `ability-specific` | Not in character-sheet calculation: Increases the damage of your Sinister Strike, Eviscerate, Riposte and Surprise Attack abilities by 10%. |
| 127 | Adrenaline Rush | 1 | `proc-or-conditional` | Not in character-sheet calculation: Increases your Energy regeneration rate by 100% for 15 sec. |
| 146 | Camouflage | 5 | `proc-or-conditional` | Not in character-sheet calculation: Increases your speed while stealthed by 15% and reduces the cooldown of your Stealth ability by 5 sec. In addition, reduces the ch |
| 147 | Improved Expose Armor | 2 | `ability-specific` | Not in character-sheet calculation: Increases the armor reduced by your Expose Armor ability by 50%. |
| 148 | Improved Gouge | 3 | `active-or-non-stat` | Not in character-sheet calculation: Increases the effect duration of your Gouge ability by 1.5 sec. |
| 149 | Improved Ambush | 3 | `partial` | spell Ambush crit (rank vector 0) |
| 150 | Elusiveness | 2 | `ability-specific` | Not in character-sheet calculation: Reduces the cooldown of your Vanish and Blind abilities by 1.5 min. |
| 151 | Serrated Blades | 3 | `partial` | global  armorPen (rank vector 1); scoped Rupture/Garrote damagePct (rank vector 0) |
| 152 | Initiative | 3 | `proc-or-conditional` | Not in character-sheet calculation: Gives you a 100% chance to add an additional combo point to your target when using your Ambush, Garrote, or Cheap Shot ability. |
| 153 | Improved Ghostly Strike | 3 | `proc-or-conditional` | Not in character-sheet calculation: Your Ghostly Strike increases your movement speed by 15% and increases your party members' movement speed by 6% within 30 yards fo |
| 154 | Smoke Bomb | 1 | `proc-or-conditional` | Not in character-sheet calculation: Creates a cloud of thick smoke in 8 yards around you for 8 sec. All targets inside the smoke have a 20% reduced chance of being hi |
| 155 | Hemorrhage | 1 | `ability-specific` | Not in character-sheet calculation: An instant strike that deals 110% weapon damage and causes the target to hemorrhage, increasing any Physical damage dealt to the t |
| 156 | Cloaked in Shadows | 2 | `proc-or-conditional` | Not in character-sheet calculation: Whenever you Vanish, you and nearby party members within 20 yards are cloaked in shadows, gaining a barrier that absorbs up to 12% |
| 157 | Blackjack | 2 | `proc-or-conditional` | Not in character-sheet calculation: Your Sap and Blind abilities reduce the target's damage dealt by 10% for 8 sec when their effect ends or fails to apply. In additi |
| 158 | Blinding Haze | 3 | `proc-or-conditional` | Not in character-sheet calculation: Reduces the Energy cost of your Distract by 15. In addition, targets hit by your Distract have their chance to hit reduced by 6% f |
| 159 | Dirty Deeds | 2 | `ability-specific` | Not in character-sheet calculation: Reduces the Energy cost of your Cheap Shot and Garrote abilities by 20. |
| 160 | Preparation | 1 | `proc-or-conditional` | Not in character-sheet calculation: When activated, this ability immediately finishes the cooldown on your other Rogue abilities. |
| 161 | Shadow of Death | 1 | `proc-or-conditional` | Not in character-sheet calculation: A finishing move that etches a sigil onto the target for 6 sec. The sigil accumulates damage equal to a percentage of all damage t |
| 162 | Bloody Mess | 2 | `ability-specific` | Not in character-sheet calculation: Reduces the Energy cost of your Hemorrhage by 5 and increases the Physical damage dealt bonus of your Hemorrhage by 100%. |
| 163 | Honor Among Thieves | 2 | `ability-specific` | Not in character-sheet calculation: Physical critical strikes by you or party members within 20 yards grant you 5 Energy. |
| 164 | Tricks of the Trade | 5 | `proc-or-conditional` | Not in character-sheet calculation: Your opening moves have a 100% chance and your finishing moves have a 20% chance per combo point to increase your party members' c |
| 165 | Mark for Death | 1 | `proc-or-conditional` | Not in character-sheet calculation: A marking strike that deals 135% weapon damage and reveals the target’s vulnerabilities, increasing your party members' Attack Pow |

### Validation still required

1. Reconcile effect values, rounding and buff stacking with controlled in-game tests.
2. Verify spell family, weapon subtype, form, shield, aura and pet conditions.
3. Implement simulated abilities, procs, resources, encounter targets and rotation effects without adding temporary bonuses permanently.
4. Expand the explicit mapping for any remaining genuinely permanent character-sheet effects.

The class-specific registry is `docs/sim/core/talent-rules.mjs`; `tests/sim/talent-effects-audit.test.mjs` verifies rank vectors, class coverage and key regressions. **Merging note:** each class branch uses the same registry filename; consolidate the per-class exports before merging multiple branches, rather than allowing later changes to overwrite earlier class rules.

### Source anomaly requiring live confirmation

`Elusiveness` rank 1 says **45 minutes** cooldown reduction in the official calculator snapshot, while rank 2 says **1.5 minutes**. Do not interpret these mixed units automatically; both ranks remain outside the numerical cooldown model pending in-game confirmation.
