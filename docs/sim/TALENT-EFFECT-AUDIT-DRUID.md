# Druid — talent effect audit

**Independent branch:** `audit/talent-effects-druid`; source [official class calculator](https://octowow.st/talents/druid/) (retrieved 2026-11-11T23:29:44.058837+00:00, HTML SHA256 `7137a9837ef004335ceefa79899e196be18fcdde24f303cbbd4615deb26d5bdc`).

**Review coverage:** all 54 talents have a classification; 13 have explicitly mapped effect rules. Counts: {"active-or-non-stat":4,"ability-specific":15,"proc-or-conditional":22,"sheet":3,"partial":10}. These are calculator-derived estimates, not verified live combat formulas.

**Status guide:** `sheet` contributes to static or weapon-derived numbers, `partial` tracks a subset with remaining combat work, and other categories are intentionally excluded from blanket stats. Every unimplemented entry is a tracked verification gap.

| ID | Talent | Max ranks | Status | Mapped / outstanding effect |
|---:|---|---:|---|---|
| 301 | Improved Wrath | 5 | `ability-specific` | Not in character-sheet calculation: Reduces the cast time and global cooldown of your Wrath spell by 0.5 sec. |
| 302 | Nature's Grasp | 1 | `proc-or-conditional` | Not in character-sheet calculation: While active, any time an enemy strikes the caster they have a 35% chance to become afflicted by Entangling Roots (Rank 1). Only u |
| 303 | Improved Nature's Grasp | 4 | `proc-or-conditional` | Not in character-sheet calculation: Increases the chance for your Nature's Grasp to entangle an enemy by 65%. |
| 304 | Sylvan Blessing | 2 | `proc-or-conditional` | Not in character-sheet calculation: Gives you a 100% chance after killing a target that yields experience or honor to allow your Mana to regenerate at a 100% rate whi |
| 305 | Guidance of the Dream | 3 | `proc-or-conditional` | Not in character-sheet calculation: Gives you a 70% chance to avoid interruption caused by damage while casting your Balance spells. |
| 306 | Improved Moonfire | 2 | `partial` | spell Moonfire crit (rank vector 0) |
| 307 | Natural Weapons | 3 | `partial` | global  hit (rank vector 1); global  spellHit (rank vector 1); scoped All physical attacks damagePct (rank vector 0) |
| 308 | Natural Shapeshifter | 3 | `ability-specific` | Not in character-sheet calculation: Reduces the mana cost of all shapeshifting by 30%. |
| 309 | Moonfury | 3 | `partial` | scoped Starfire/Moonfire/Hurricane/Insect Swarm/Wrath damagePct (rank vector 0) |
| 310 | Omen of Clarity | 1 | `proc-or-conditional` | Not in character-sheet calculation: Imbues the Druid with natural energy. Each of the Druid's melee attacks or offensive spell casts has a chance of causing the caste |
| 311 | Nature's Reach | 2 | `ability-specific` | Not in character-sheet calculation: Increases the range of your Wrath, Entangling Roots, Faerie Fire, Moonfire, Starfire, Insect Swarm, Hurricane, Remove Curse, Aboli |
| 312 | Vengeance | 5 | `ability-specific` | Not in character-sheet calculation: Increases the critical strike damage bonus of your Starfire, Moonfire, and Wrath spells by 100%. |
| 313 | Moonglow | 3 | `ability-specific` | Not in character-sheet calculation: Reduces the Mana cost of your Moonfire, Starfire, Wrath, Hurricane, Insect Swarm, Healing Touch, Regrowth and Rejuvenation spells  |
| 314 | Owlkin Frenzy | 3 | `proc-or-conditional` | Not in character-sheet calculation: Damage taken while in Moonkin Form has a 10% chance to enrage you, granting a 30% chance to avoid interruption caused by damage wh |
| 315 | Moonkin Form | 1 | `proc-or-conditional` | Not in character-sheet calculation: Transforms the Druid into Moonkin Form. While in this form the armor contribution from items is increased by 180%, the Mana cost o |
| 316 | Nature's Grace | 1 | `ability-specific` | Not in character-sheet calculation: All spell criticals grace you with a blessing of nature, reducing the casting time of your next spell by 0.5 sec. |
| 317 | Improved Starfire | 3 | `proc-or-conditional` | Not in character-sheet calculation: Reduces the cast time of Starfire by 0.5 sec and gives it a 15% chance to stun the target for 3 sec. |
| 318 | Balance of All Things | 3 | `proc-or-conditional` | Not in character-sheet calculation: Damaging a target afflicted by Insect Swarm with Wrath refunds 30% of its mana cost. Starfire has a 9% increased chance to critica |
| 319 | Gale Winds | 2 | `ability-specific` | Not in character-sheet calculation: Reduces the mana cost of Hurricane by 20% and causes it to reduce the attack speed of affected enemies by 25%. |
| 320 | Eclipse | 1 | `proc-or-conditional` | Not in character-sheet calculation: Aligns natural and astral energies. Damage from Wrath has a 40% chance to grant Arcane Eclipse, increasing Arcane damage dealt. Da |
| 267 | Ferocity | 5 | `active-or-non-stat` | Not in character-sheet calculation: Reduces the cost of your Maul, Swipe, Savage Bite, Claw, and Rake abilities by 5 Rage or Energy. |
| 268 | Feral Aggression | 5 | `ability-specific` | Not in character-sheet calculation: Increases the Attack Power reduction of your Demoralizing Roar by 40% and the damage caused by your Ferocious Bite by 15%. |
| 269 | Feral Instinct | 3 | `proc-or-conditional` | Not in character-sheet calculation: Increases threat caused in Bear and Dire Bear Form by 15% and reduces the chance enemies have to detect you while Prowling. |
| 270 | Brutal Impact | 2 | `active-or-non-stat` | Not in character-sheet calculation: Increases the stun duration of your Bash and Pounce abilities by 1 sec. |
| 271 | Thick Hide | 3 | `sheet` | special  itemArmourPct (rank vector 0) |
| 272 | Open Wounds | 3 | `ability-specific` | Not in character-sheet calculation: Increases the damage of Rip by 15%. In addition, increases the damage of Claw by 30% for each of your active Bleed effects on the  |
| 273 | Feral Swiftness | 2 | `partial` | global  dodge (rank vector 1); active only under {"form":["Cat","Bear"]}; Proc/event awaiting combat simulation: Outdoor Cat Form movement speed is not a permanent combat stat |
| 274 | Feral Charge | 1 | `proc-or-conditional` | Not in character-sheet calculation: Causes you to charge an enemy, immobilizing and interrupting any spell being cast for 4 sec. |
| 275 | Sharpened Claws | 3 | `sheet` | global  crit (rank vector 0); active only under {"form":["Cat","Bear"]} |
| 276 | Primal Fury | 2 | `proc-or-conditional` | Not in character-sheet calculation: Gives you a 100% chance to gain an additional 5 Rage anytime you get a critical strike while in Bear and Dire Bear Form and your c |
| 277 | Predatory Strikes | 3 | `partial` | special  apPct (rank vector 0); active only under {"form":["Cat","Bear"]}; scoped Claw/Rake/Maul/Swipe/Savage Bite damagePct (rank vector 1) |
| 278 | Blood Frenzy | 2 | `proc-or-conditional` | Not in character-sheet calculation: Increases the duration of Tiger's Fury by 12 sec, and causes Enrage to instantly generate 10 Rage. In addition, Tiger's Fury and E |
| 279 | Improved Shred | 2 | `ability-specific` | Not in character-sheet calculation: Increases the damage of Shred by 10% and reduces its Energy cost by 12. |
| 280 | Ancient Brutality | 2 | `proc-or-conditional` | Not in character-sheet calculation: Dodging an attack while in Bear or Dire Bear Form imbues you with the spirit of the Ancients, generating 4 Rage per second for 5 s |
| 281 | Berserk | 1 | `proc-or-conditional` | Not in character-sheet calculation: Removes all Fear effects and increases your energy regeneration rate by 100% while in Cat form, and increases your total health by |
| 282 | Heart of the Wild | 5 | `sheet` | percent  int (rank vector 0); percent  sta (rank vector 1); active only under {"form":"Bear"}; percent  str (rank vector 2); active only under {"form":"Cat"} |
| 283 | Carnage | 2 | `proc-or-conditional` | Not in character-sheet calculation: Your Maul, Swipe, and Savage Bite abilities return 10% of their damage as healing to you. In addition, gives your Ferocious Bite a |
| 284 | Leader of the Pack | 1 | `partial` | scoped Leader of the Pack partyCritPct (rank vector explicit); active only under {"form":["Cat","Bear"]}; Proc/event awaiting combat simulation: Aura self-application/party eligibility not independently validated |
| 285 | Improved Mark of the Wild | 5 | `active-or-non-stat` | Not in character-sheet calculation: Increases the effects of your Mark of the Wild and Gift of the Wild spells by 35%. |
| 286 | Furor | 5 | `proc-or-conditional` | Not in character-sheet calculation: Gives you 100% chance to gain 10 Rage when you shapeshift into Bear and Dire Bear Form or 40 Energy when you shapeshift into Cat F |
| 287 | Improved Healing Touch | 5 | `ability-specific` | Not in character-sheet calculation: Reduces the cast time of your Healing Touch spell by 0.5 sec. |
| 288 | Nature's Focus | 5 | `proc-or-conditional` | Not in character-sheet calculation: Gives you a 70% chance to avoid interruption caused by damage while casting the Healing Touch, Regrowth, and Tranquility spells. |
| 289 | Subtlety | 5 | `ability-specific` | Not in character-sheet calculation: Reduces the threat generated by your spells by 20%. |
| 290 | Swiftmend | 1 | `active-or-non-stat` | Not in character-sheet calculation: Consumes a Rejuvenation or Regrowth effect on a friendly target to instantly heal them an amount equal to 12 sec. of Rejuvenation  |
| 291 | Genesis | 3 | `partial` | scoped Periodic magic damageAndHealingPct (rank vector 0) |
| 292 | Reflection | 3 | `proc-or-conditional` | Not in character-sheet calculation: Allows 15% of your Mana regeneration to continue while casting. |
| 293 | Gift of Nature | 5 | `partial` | scoped Healing spells healingPct (rank vector 0) |
| 294 | Tranquil Spirit | 5 | `ability-specific` | Not in character-sheet calculation: Reduces the mana cost of your Healing Touch, Regrowth and Tranquility spells by 10%. |
| 295 | Aessina's Bloom | 2 | `ability-specific` | Not in character-sheet calculation: Healing a target affected by Regrowth or Rejuvenation with your Healing Touch spells reduces the casting time of your next Healing |
| 296 | Nature's Swiftness | 1 | `proc-or-conditional` | Not in character-sheet calculation: When activated, your next Nature spell becomes an instant cast spell. |
| 297 | Preservation | 3 | `ability-specific` | Not in character-sheet calculation: Increases the periodic healing of Regrowth by 30% if the friendly target is affected by Rejuvenation. |
| 298 | Improved Regrowth | 5 | `partial` | spell Regrowth crit (rank vector 0) |
| 299 | Improved Tranquility | 2 | `partial` | scoped Tranquility healingPct (rank vector 0) |
| 300 | Tree of Life Form | 1 | `proc-or-conditional` | Not in character-sheet calculation: Shapeshift into the Tree of Life. While in this form armor contribution from items is inreased by 180%, the healing power of nearb |

### Validation still required

1. Reconcile effect values, rounding and buff stacking with controlled in-game tests.
2. Verify spell family, weapon subtype, form, shield, aura and pet conditions.
3. Implement simulated abilities, procs, resources, encounter targets and rotation effects without adding temporary bonuses permanently.
4. Expand the explicit mapping for any remaining genuinely permanent character-sheet effects.

The class-specific registry is `docs/sim/core/talent-rules.mjs`; `tests/sim/talent-effects-audit.test.mjs` verifies rank vectors, class coverage and key regressions. **Merging note:** each class branch uses the same registry filename; consolidate the per-class exports before merging multiple branches, rather than allowing later changes to overwrite earlier class rules.
