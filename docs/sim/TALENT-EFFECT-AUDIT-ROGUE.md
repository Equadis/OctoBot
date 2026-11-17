# Rogue: talent calculation audit and implementation ledger

**Repository:** [Equadis/OctoBot](https://github.com/Equadis/OctoBot) · **branch:** `audit/talent-effects-rogue` · **source:** [OctoWoW published talent calculator](https://octowow.st/talents/rogue/) (2026-11-11T23:29:43.972862+00:00, SHA-256 `865b889058c29c8485d457a3817094b4c289fd588ead58d9ec7d1a295b5fbf65`).

## Coverage summary

| Measure | Count |
|---|---:|
| Imported talents | 56 |
| Talents with individual reviewed registry entries | 56 |
| At least one character-sheet or weapon-derived effect | 11 |
| Scoped reference contributions only | 19 |
| Simulation/event-only records | 26 |

**Important:** The second and third categories are not completed DPS/TPS/HPS mechanics. A school, attack type or pet effect may be described numerically without being incorporated into a full combat outcome. The planner uses unverified base coefficients and must not be represented as a validated OctoWoW simulator.

## Exact classification of all 56 talents

| ID | Talent | Ranks | Status | Effect / precise unresolved dependency |
|---:|---|---:|---|---|
| 128 | Improved Eviscerate | 3 | Scoped/pending | SCOPED ONLY scoped Eviscerate damagePct (rank vector 0) |
| 129 | Remorseless Attacks | 2 | Event pending | SIMULATION PENDING — Remorseless Attacks critical bonus activates after killing an eligible enemy and affects the next qualifying opener |
| 130 | Malice | 5 | Sheet contribution | CHARACTER-SHEET global  crit (rank vector 0) |
| 131 | Ruthlessness | 3 | Event pending | SIMULATION PENDING — Ruthlessness generates combo points probabilistically when finishing moves execute |
| 132 | Murder | 2 | Scoped/pending | SCOPED ONLY scoped Humanoid/Giant/Beast/Dragonkin targets damagePct (rank vector 0) |
| 133 | Improved Blade Tactics | 3 | Scoped/pending | SCOPED ONLY scoped Slice and Dice/Flourish durationPct (rank vector 0) |
| 134 | Relentless Strikes | 1 | Event pending | SIMULATION PENDING — Relentless Strikes provides finisher-triggered energy refund and temporary stacking damage effects |
| 135 | Throwing Weapon Specialization | 2 | Scoped/pending | SCOPED ONLY scoped Throw/Deadly Throw rangeIncreaseYards (rank vector 0) |
| 136 | Lethality | 5 | Scoped/pending | SCOPED ONLY scoped Combo-point generators criticalDamage (rank vector 0) |
| 137 | Taste for Blood | 2 | Scoped/pending | SCOPED ONLY scoped Rupture durationIncreaseSeconds (rank vector 0); SIMULATION PENDING — Melee damage bonus per combo point is a temporary Rupture aura |
| 138 | Vile Poisons | 3 | Scoped/pending | SCOPED ONLY scoped Poisons damagePct (rank vector 0); SCOPED ONLY scoped Poison dispels resistChancePct (rank vector 1) |
| 139 | Improved Poisons | 3 | Sheet contribution | CHARACTER-SHEET global  poisonChance (rank vector 0) |
| 140 | Efficient Poisons | 3 | Scoped/pending | SCOPED ONLY scoped Poison application resistReductionPct (rank vector 0); SIMULATION PENDING — Chance not to consume poison charges is event-driven |
| 141 | Envenom | 1 | Event pending | SIMULATION PENDING — Envenom finisher duration/effectiveness varies by combo points and requires target poison state |
| 142 | Cold Blood | 1 | Event pending | SIMULATION PENDING — Cold Blood on-use guarantees a critical on the next eligible ability; not permanent crit |
| 143 | Vigor | 2 | Sheet contribution | CHARACTER-SHEET special  maxEnergy (rank vector 0); SIMULATION PENDING — Energy on poison application is event-driven |
| 144 | Seal Fate | 5 | Event pending | SIMULATION PENDING — Seal Fate only grants an extra combo point after critical combo-point-builder attacks |
| 145 | Noxious Assault | 1 | Event pending | SIMULATION PENDING — Noxious Assault active dual-weapon strike triggers both poisons and awards a combo point |
| 110 | Opportunity | 5 | Scoped/pending | SCOPED ONLY scoped Backstab/Garrote/Ambush from behind damagePct (rank vector 0) |
| 111 | Lightning Reflexes | 5 | Sheet contribution | CHARACTER-SHEET global  dodge (rank vector 0) |
| 112 | Deflection | 5 | Sheet contribution | CHARACTER-SHEET global  parry (rank vector 0) |
| 113 | Improved Backstab | 3 | Scoped/pending | SCOPED ONLY spell Backstab crit (rank vector 0) |
| 114 | Precision | 5 | Sheet contribution | CHARACTER-SHEET global  hit (rank vector 0) |
| 115 | Riposte | 1 | Event pending | SIMULATION PENDING — Riposte is an attack enabled after a successful parry, with damage and target disarm |
| 116 | Improved Sprint | 2 | Event pending | SIMULATION PENDING — Improved Sprint breaks movement impairments only when Sprint is activated |
| 117 | Setup | 3 | Event pending | SIMULATION PENDING — Setup gives combo points after dodging a hit or resisting a spell |
| 118 | Improved Kick | 2 | Event pending | SIMULATION PENDING — Improved Kick applies a target silence when Kick lands |
| 119 | Concussive Blows | 5 | Event pending | SIMULATION PENDING — Concussive Blows mace stuns are chance-on-hit effects; not permanent critical chance |
| 120 | Dual Wield Specialization | 5 | Sheet contribution | CHARACTER-SHEET offhand  damagePct (rank vector 0) |
| 121 | Close Quarters Combat | 2 | Sheet contribution | CHARACTER-SHEET weapon mace crit (rank vector 0); CHARACTER-SHEET weapon dagger crit (rank vector 0); CHARACTER-SHEET weapon fist crit (rank vector 0) |
| 122 | Surprise Attack | 1 | Event pending | SIMULATION PENDING — Surprise Attack only enables following an enemy dodge and must use an attack table |
| 123 | Hack and Slash | 2 | Event pending | SIMULATION PENDING — Hack and Slash extra sword/axe attack chance needs melee hit events |
| 124 | Weapon Expertise | 2 | Sheet contribution | CHARACTER-SHEET weapon expertise-weapons skill (rank vector 0) |
| 125 | Blade Rush | 2 | Sheet contribution | CHARACTER-SHEET special  meleeHastePct (rank vector 0); SIMULATION PENDING — Agility-based Energy tick reduction requires a resource model |
| 126 | Aggression | 3 | Scoped/pending | SCOPED ONLY scoped Sinister Strike/Eviscerate/Riposte/Surprise Attack damagePct (rank vector 0) |
| 127 | Adrenaline Rush | 1 | Event pending | SIMULATION PENDING — Adrenaline Rush doubles Energy regeneration only while the timed ability is active |
| 146 | Camouflage | 5 | Scoped/pending | SCOPED ONLY scoped Stealth movement movementSpeedPct (rank vector 0); SCOPED ONLY scoped Stealth cooldownReductionSeconds (rank vector 1) |
| 147 | Improved Expose Armor | 2 | Scoped/pending | SCOPED ONLY scoped Expose Armor armourReductionPct (rank vector 0) |
| 148 | Improved Gouge | 3 | Scoped/pending | SCOPED ONLY scoped Gouge durationIncreaseSeconds (rank vector 0) |
| 149 | Improved Ambush | 3 | Scoped/pending | SCOPED ONLY spell Ambush crit (rank vector 0) |
| 150 | Elusiveness | 2 | Event pending | SIMULATION PENDING — Official Elusiveness rank values have conflicting units: 45 min at rank 1 and 1.5 min at rank 2; live verification required |
| 151 | Serrated Blades | 3 | Sheet contribution | CHARACTER-SHEET global  armorPen (rank vector 1); SCOPED ONLY scoped Rupture/Garrote damagePct (rank vector 0) |
| 152 | Initiative | 3 | Event pending | SIMULATION PENDING — Initiative awards extra combo points on successful opening abilities |
| 153 | Improved Ghostly Strike | 3 | Scoped/pending | SCOPED ONLY scoped Ghostly Strike energyCostReduction (rank vector 2); SIMULATION PENDING — Ghostly Strike grants short-lived self/party movement speed effects after use |
| 154 | Smoke Bomb | 1 | Event pending | SIMULATION PENDING — Smoke Bomb reduces hit chance inside its temporary area; requires target positioning and aura state |
| 155 | Hemorrhage | 1 | Event pending | SIMULATION PENDING — Hemorrhage active ability applies physical vulnerability charges with duration; not permanent global damage |
| 156 | Cloaked in Shadows | 2 | Event pending | SIMULATION PENDING — Cloaked in Shadows only generates a temporary barrier after Vanish |
| 157 | Blackjack | 2 | Event pending | SIMULATION PENDING — Blackjack debuff and return-to-stealth only occur after Sap/Blind action outcomes |
| 158 | Blinding Haze | 3 | Scoped/pending | SCOPED ONLY scoped Distract energyCostReduction (rank vector 0); SIMULATION PENDING — Hit reduction debuff requires a target-aura model |
| 159 | Dirty Deeds | 2 | Scoped/pending | SCOPED ONLY scoped Cheap Shot/Garrote energyCostReduction (rank vector 0) |
| 160 | Preparation | 1 | Event pending | SIMULATION PENDING — Preparation actively resets cooldowns and requires per-ability timers |
| 161 | Shadow of Death | 1 | Event pending | SIMULATION PENDING — Shadow of Death finishing move captures incoming damage then releases it based on target state |
| 162 | Bloody Mess | 2 | Scoped/pending | SCOPED ONLY scoped Hemorrhage energyCostReduction (rank vector 0); SCOPED ONLY scoped Hemorrhage physical vulnerability damageBonusPct (rank vector 1) |
| 163 | Honor Among Thieves | 2 | Event pending | SIMULATION PENDING — Honor Among Thieves generates Energy after party critical hits; requires shared party events |
| 164 | Tricks of the Trade | 5 | Event pending | SIMULATION PENDING — Tricks of the Trade temporarily buffs party crit after openers/finishers and stacks; not a personal passive |
| 165 | Mark for Death | 1 | Event pending | SIMULATION PENDING — Mark for Death is an active strike applying a party AP/SP vulnerability effect with duration |

## Known source and validation limitations

- **Elusiveness:** Calculator rank 1 says 45 minutes but rank 2 says 1.5 minutes of cooldown reduction. Do not interpret the rank-1 number without live server confirmation.
- The published calculator is a definition source, not a demonstration that the live server uses precisely the same mechanics.
- Abilities requiring attack outcomes, time, procs, cast resolution, cooldown reset, movement, party state or target debuffs must be validated in a combat engine.
- Gear, buffs, forms/stances and weapon choices require controlled in-game stacking and rounding comparisons.
- All existing and new regression tests are run by `.github/workflows/talent-branch-tests.yml` on this branch.

**Do not merge this branch directly together with another class branch without consolidating their separate `docs/sim/core/talent-rules.mjs` exports.** Each branch is isolated intentionally so independent class verification remains possible; `main` has not been altered by this audit.
