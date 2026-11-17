# Druid — talent effects audit

**Branch:** `audit/talent-effects-druid` (isolated, no changes to main).

**Source:** [https://octowow.st/talents/druid/](https://octowow.st/talents/druid/) · snapshot 2026-11-11T23:29:44.058837+00:00 · SHA256 `7137a9837ef004335ceefa79899e196be18fcdde24f303cbbd4615deb26d5bdc`.

### Coverage status

| Measure | Count |
|---|---:|
| Imported talent definitions | 54 |
| Explicitly mapped/reviewed rules | 35 |
| Talents with an applied static/weapon effect | 6 |
| Additional talents with scoped tooltip contributions only | 27 |
| Talents without numeric rules (recorded but pending) | 19 |

Status labels: `partial`: 32; `sheet`: 3; `proc-or-conditional`: 16; `active-or-non-stat`: 1; `ability-specific`: 2.

**Interpretation:** Static and weapon effects may alter the character sheet. Scoped entries describe where published bonuses apply, but do not imply functioning ability damage, mana, cast-time, pet or DPS mechanics. Temporary and conditional effects are not automatically added to permanent totals. The existing calculator still relies on partially unverified Vanilla base coefficients.

### Talent-by-talent ledger

| ID | Talent | Ranks | Coverage | Mapped effects or outstanding mechanic |
|---:|---|---:|---|---|
| 301 | Improved Wrath | 5 | `partial` | scoped Wrath castTimeReductionSeconds (vector 0); scoped Wrath globalCooldownReductionSeconds (vector 0) |
| 302 | Nature's Grasp | 1 | `proc-or-conditional` | Pending: While active, any time an enemy strikes the caster they have a 35% chance to become afflicted by Entangling Roots (Rank 1). Only useable outdoors |
| 303 | Improved Nature's Grasp | 4 | `proc-or-conditional` | Pending: Increases the chance for your Nature's Grasp to entangle an enemy by 65%. |
| 304 | Sylvan Blessing | 2 | `proc-or-conditional` | Pending: Gives you a 100% chance after killing a target that yields experience or honor to allow your Mana to regenerate at a 100% rate while casting. Las |
| 305 | Guidance of the Dream | 3 | `proc-or-conditional` | Pending: Gives you a 70% chance to avoid interruption caused by damage while casting your Balance spells. |
| 306 | Improved Moonfire | 2 | `partial` | spell Moonfire crit (vector 0) |
| 307 | Natural Weapons | 3 | `partial` | global  hit (vector 1); global  spellHit (vector 1); scoped All physical attacks damagePct (vector 0) |
| 308 | Natural Shapeshifter | 3 | `partial` | scoped Shapeshifting manaCostReductionPct (vector 0) |
| 309 | Moonfury | 3 | `partial` | scoped Starfire/Moonfire/Hurricane/Insect Swarm/Wrath damagePct (vector 0) |
| 310 | Omen of Clarity | 1 | `proc-or-conditional` | Pending: Imbues the Druid with natural energy. Each of the Druid's melee attacks or offensive spell casts has a chance of causing the caster to enter a Cl |
| 311 | Nature's Reach | 2 | `partial` | scoped Balance/utility spells rangeIncreasePct (vector 0) |
| 312 | Vengeance | 5 | `partial` | scoped Starfire/Moonfire/Wrath criticalDamagePct (vector 0) |
| 313 | Moonglow | 3 | `partial` | scoped Balance and healing spells manaCostReductionPct (vector 0) |
| 314 | Owlkin Frenzy | 3 | `proc-or-conditional` | Pending: Damage taken while in Moonkin Form has a 10% chance to enrage you, granting a 30% chance to avoid interruption caused by damage while casting and |
| 315 | Moonkin Form | 1 | `partial` | Pending: The Moonkin form armour multiplier is implemented by the existing form calculator. Remaining spell mana/damage effects need modelling. |
| 316 | Nature's Grace | 1 | `ability-specific` | Pending: All spell criticals grace you with a blessing of nature, reducing the casting time of your next spell by 0.5 sec. |
| 317 | Improved Starfire | 3 | `partial` | scoped Starfire castTimeReductionSeconds (vector 0); Pending: Starfire stun chance requires hit/event resolution |
| 318 | Balance of All Things | 3 | `proc-or-conditional` | Pending: Damaging a target afflicted by Insect Swarm with Wrath refunds 30% of its mana cost. Starfire has a 9% increased chance to critically strike agai |
| 319 | Gale Winds | 2 | `partial` | scoped Hurricane manaCostReductionPct (vector 0); scoped Hurricane target slow attackSpeedReductionPct (vector 1) |
| 320 | Eclipse | 1 | `proc-or-conditional` | Pending: Aligns natural and astral energies. Damage from Wrath has a 40% chance to grant Arcane Eclipse, increasing Arcane damage dealt. Damage from Starf |
| 267 | Ferocity | 5 | `partial` | scoped Feral abilities rageEnergyCostReduction (vector 0) |
| 268 | Feral Aggression | 5 | `partial` | scoped Demoralizing Roar attackPowerReductionPct (vector 0); scoped Ferocious Bite damagePct (vector 1) |
| 269 | Feral Instinct | 3 | `partial` | scoped Bear Form threatPct (vector 0), conditional on {"form":"Bear"} |
| 270 | Brutal Impact | 2 | `partial` | scoped Bash/Pounce stunDurationIncreaseSeconds (vector 0) |
| 271 | Thick Hide | 3 | `sheet` | special  itemArmourPct (vector 0) |
| 272 | Open Wounds | 3 | `partial` | scoped Rip damagePct (vector 0); scoped Claw per active Bleed damagePct (vector 1) |
| 273 | Feral Swiftness | 2 | `partial` | global  dodge (vector 1), conditional on {"form":["Cat","Bear"]}; Pending: Outdoor Cat Form movement speed is not a permanent combat stat |
| 274 | Feral Charge | 1 | `proc-or-conditional` | Pending: Causes you to charge an enemy, immobilizing and interrupting any spell being cast for 4 sec. |
| 275 | Sharpened Claws | 3 | `sheet` | global  crit (vector 0), conditional on {"form":["Cat","Bear"]} |
| 276 | Primal Fury | 2 | `proc-or-conditional` | Pending: Gives you a 100% chance to gain an additional 5 Rage anytime you get a critical strike while in Bear and Dire Bear Form and your critical strikes |
| 277 | Predatory Strikes | 3 | `partial` | special  apPct (vector 0), conditional on {"form":["Cat","Bear"]}; scoped Claw/Rake/Maul/Swipe/Savage Bite damagePct (vector 1) |
| 278 | Blood Frenzy | 2 | `partial` | scoped Tiger's Fury durationIncreaseSeconds (vector 0); scoped Enrage instantRageGained (vector 1); Pending: Attack speed increase from active Tiger's Fury/Enrage is not passive |
| 279 | Improved Shred | 2 | `partial` | scoped Shred damagePct (vector 0); scoped Shred energyCostReduction (vector 1) |
| 280 | Ancient Brutality | 2 | `proc-or-conditional` | Pending: Dodging an attack while in Bear or Dire Bear Form imbues you with the spirit of the Ancients, generating 4 Rage per second for 5 sec. This effect |
| 281 | Berserk | 1 | `proc-or-conditional` | Pending: Removes all Fear effects and increases your energy regeneration rate by 100% while in Cat form, and increases your total health by 20% while in B |
| 282 | Heart of the Wild | 5 | `sheet` | percent  int (vector 0); percent  sta (vector 1), conditional on {"form":"Bear"}; percent  str (vector 2), conditional on {"form":"Cat"} |
| 283 | Carnage | 2 | `proc-or-conditional` | Pending: Your Maul, Swipe, and Savage Bite abilities return 10% of their damage as healing to you. In addition, gives your Ferocious Bite a 20% chance per |
| 284 | Leader of the Pack | 1 | `partial` | scoped Leader of the Pack partyCritPct (vector explicit), conditional on {"form":["Cat","Bear"]}; Pending: Aura self-application/party eligibility not independently validated |
| 285 | Improved Mark of the Wild | 5 | `partial` | scoped Mark/Gift of the Wild buffEffectivenessPct (vector 0) |
| 286 | Furor | 5 | `proc-or-conditional` | Pending: Gives you 100% chance to gain 10 Rage when you shapeshift into Bear and Dire Bear Form or 40 Energy when you shapeshift into Cat Form. |
| 287 | Improved Healing Touch | 5 | `partial` | scoped Healing Touch castTimeReductionSeconds (vector 0) |
| 288 | Nature's Focus | 5 | `proc-or-conditional` | Pending: Gives you a 70% chance to avoid interruption caused by damage while casting the Healing Touch, Regrowth, and Tranquility spells. |
| 289 | Subtlety | 5 | `partial` | scoped Spells threatReductionPct (vector 0) |
| 290 | Swiftmend | 1 | `active-or-non-stat` | Pending: Consumes a Rejuvenation or Regrowth effect on a friendly target to instantly heal them an amount equal to 12 sec. of Rejuvenation or 18 sec. of R |
| 291 | Genesis | 3 | `partial` | scoped Periodic magic damageAndHealingPct (vector 0) |
| 292 | Reflection | 3 | `partial` | scoped Mana regeneration while casting regenPct (vector 0) |
| 293 | Gift of Nature | 5 | `partial` | scoped Healing spells healingPct (vector 0) |
| 294 | Tranquil Spirit | 5 | `partial` | scoped Healing Touch/Regrowth/Tranquility manaCostReductionPct (vector 0) |
| 295 | Aessina's Bloom | 2 | `ability-specific` | Pending: Healing a target affected by Regrowth or Rejuvenation with your Healing Touch spells reduces the casting time of your next Healing Touch spell by |
| 296 | Nature's Swiftness | 1 | `proc-or-conditional` | Pending: When activated, your next Nature spell becomes an instant cast spell. |
| 297 | Preservation | 3 | `partial` | scoped Regrowth with Rejuvenation periodicHealingPct (vector 0) |
| 298 | Improved Regrowth | 5 | `partial` | spell Regrowth crit (vector 0) |
| 299 | Improved Tranquility | 2 | `partial` | scoped Tranquility healingPct (vector 0) |
| 300 | Tree of Life Form | 1 | `partial` | Pending: Tree of Life cannot currently be selected in class form options; do not assume its aura or armour effect is active |

### Verification blockers

1. Compare all passive/weapon numbers and rounding with controlled OctoWoW client observations.
2. Verify stance, shield, form, aspect, pet, active buff and equipment eligibility.
3. Verify spell-family, ranged and individual-ability hit/crit tables, proc uptime and cast/resource timing before using DPS, TPS or HPS comparisons.
4. Complete mappings of remaining talents if the source indicates a permanent, testable sheet effect.
5. Re-run the branch Actions workflow and the baseline simulator regression suite after changes.

**Integration caution:** all class branches currently use `core/talent-rules.mjs`; their per-class registries need consolidation before multiple branches are merged. Never merge one registry over another.
