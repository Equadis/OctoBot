# Hunter — talent effect audit

**Independent branch:** `audit/talent-effects-hunter`; source [official class calculator](https://octowow.st/talents/hunter/) (retrieved 2026-11-11T23:29:44.044344+00:00, HTML SHA256 `5de146011a25875988790d305d181c8798dd371aa5d74d058fd2f4d81f0e0854`).

**Review coverage:** all 55 talents have a classification; 16 have explicitly mapped effect rules. Counts: {"proc-or-conditional":22,"partial":12,"sheet":4,"ability-specific":17}. These are calculator-derived estimates, not verified live combat formulas.

**Status guide:** `sheet` contributes to static or weapon-derived numbers, `partial` tracks a subset with remaining combat work, and other categories are intentionally excluded from blanket stats. Every unimplemented entry is a tracked verification gap.

| ID | Talent | Max ranks | Status | Mapped / outstanding effect |
|---:|---|---:|---|---|
| 373 | Swift Aspects | 5 | `proc-or-conditional` | Not in character-sheet calculation: While Aspect of the Hawk is active, all normal ranged attacks have a 10% chance of increasing ranged attack speed by 15% for 12 se |
| 374 | Endurance Training | 5 | `partial` | pet  staminaFromOwnerPct (rank vector 0); pet  healthPct (rank vector 1) |
| 375 | Improved Eyes of the Beast | 2 | `proc-or-conditional` | Not in character-sheet calculation: Increases the duration of your Eyes of the Beast by 60 sec. While channeling Eyes of the Beast, your pet deals 30% additional dama |
| 376 | Improved Primal Aspects | 3 | `sheet` | global  dodge (rank vector 0); active only under {"aspect":"Aspect of the Monkey"} |
| 377 | Thick Hide | 3 | `partial` | pet  armourFromOwnerPct (rank vector 0); pet  armourPct (rank vector 1) |
| 378 | Improved Revive Pet | 2 | `ability-specific` | Not in character-sheet calculation: Revive Pet's casting time is reduced by 6 sec, mana cost is reduced by 40%, and increases the health your pet returns with by an a |
| 379 | Pathfinding | 2 | `ability-specific` | Not in character-sheet calculation: Increases the speed bonus of your Aspect of the Cheetah and Aspect of the Pack by 6% and increases your pet's movement speed by 30 |
| 380 | Coordinated Assault | 1 | `ability-specific` | Not in character-sheet calculation: Hitting an enemy with Arcane Shot, Steady Shot, or Raptor Strike causes your pet's next attack within 6 sec to also strike for Phy |
| 381 | Unleashed Fury | 5 | `ability-specific` | Not in character-sheet calculation: Increases the damage done by your pets by 20%. |
| 382 | Bestial Discipline | 2 | `ability-specific` | Not in character-sheet calculation: Increases the Focus regeneration of your pets by 5 each tick and reduces the cooldown of your pets' special ability by 20%. |
| 383 | Improved Mend Pet | 2 | `proc-or-conditional` | Not in character-sheet calculation: Increases amount you heal your pet with Mend Pet by 40% and gives the spell a 50% chance of cleansing 1 Curse, Disease, Magic or P |
| 384 | Ferocity | 5 | `partial` | pet  crit (rank vector 0) |
| 385 | Scent of Blood | 3 | `proc-or-conditional` | Not in character-sheet calculation: Your attacks have a 15% chance to send your pet into a rage, causing it to deal 40% additional damage for 8 sec. |
| 386 | Bestial Wrath | 1 | `proc-or-conditional` | Not in character-sheet calculation: Sends your pet into a rage, granting it Scent of Blood for 18 sec. While enraged, the beast does not feel pity, remorse, or fear,  |
| 387 | Intimidation | 1 | `proc-or-conditional` | Not in character-sheet calculation: Command your pet to intimidate the target on the next successful melee attack, stunning the target for 3 sec, and increasing the p |
| 388 | Bestial Precision | 2 | `partial` | pet  hit (rank vector 0); pet  spellHit (rank vector 1); pet  skill (rank vector 2) |
| 389 | Spirit Bond | 2 | `partial` | pet  attackPowerFromOwnerRangedPct (rank vector 0); pet  spellPowerFromOwnerRangedPct (rank vector 1) |
| 390 | Frenzy | 5 | `proc-or-conditional` | Not in character-sheet calculation: Gives your pet a 100% chance to gain a 30% attack speed increase for 8 sec after dealing a critical strike. |
| 391 | Kill Command | 1 | `proc-or-conditional` | Not in character-sheet calculation: Commands your pet to instantly attack for 80% of its Attack Power. Can only be used after the Hunter lands a critical strike on th |
| 412 | Improved Concussive Shot | 5 | `proc-or-conditional` | Not in character-sheet calculation: Gives your Concussive Shot a 20% chance to stun the target for 3 sec. |
| 413 | Efficiency | 5 | `ability-specific` | Not in character-sheet calculation: Reduces the Mana cost of your Shots and Stings by 10%. |
| 414 | Improved Stings | 5 | `ability-specific` | Not in character-sheet calculation: Increases the damage of Serpent Sting by 30%, increases the mana drained by Viper Sting by 5%, and causes Scorpid Sting to reduce  |
| 415 | Lethal Shots | 5 | `partial` | ranged  crit (rank vector 0) |
| 416 | Hawk Eye | 2 | `ability-specific` | Not in character-sheet calculation: Increases the range of your ranged weapons by 6 yards. |
| 417 | Aimed Shot | 1 | `ability-specific` | Not in character-sheet calculation: An aimed shot that increases ranged damage by 70. |
| 418 | Swiftshot | 3 | `ability-specific` | Not in character-sheet calculation: Reduces the cooldown of Arcane Shot by 1.5 sec and the cooldown of Aimed Shot by 6 sec. |
| 419 | Endless Quiver | 2 | `proc-or-conditional` | Not in character-sheet calculation: Your Auto Shot, Arcane Shot, Steady Shot and Multi-Shot have a 6% chance to fire an additional normal ranged attack. This addition |
| 420 | Mortal Shots | 5 | `partial` | ranged  criticalDamagePct (rank vector 0) |
| 421 | Scatter Shot | 1 | `proc-or-conditional` | Not in character-sheet calculation: A short-range shot that deals 50% weapon damage and disorients the target for 4 sec. Any damage caused will remove the effect. Tur |
| 422 | Experimental Ammunition | 1 | `proc-or-conditional` | Not in character-sheet calculation: Your Aimed Shot deals an additional 5% of its damage as Fire, Arcane, or Nature damage, based on the active effect. Grants a furth |
| 423 | Piercing Shots | 2 | `ability-specific` | Not in character-sheet calculation: Your critical strikes from Multi-Shot, Steady Shot and Aimed Shot cause the target to bleed, dealing 30% of the damage over 8 sec. |
| 424 | Barrage | 3 | `ability-specific` | Not in character-sheet calculation: Increases the damage of Multi-Shot and Volley by 15% and reduces the cast time of Volley by 2 sec. |
| 425 | Improved Marksmanship | 2 | `ability-specific` | Not in character-sheet calculation: Increases the damage of Steady Shot and Aimed Shot by 10%. |
| 426 | Ranged Weapon Specialization | 5 | `partial` | ranged  damagePct (rank vector 0) |
| 427 | Lock and Load | 1 | `proc-or-conditional` | Not in character-sheet calculation: Your Steady Shot, Aimed Shot, and Arcane Shot critical strikes have a 100% chance to reset the cooldown of Aimed Shot and trigger  |
| 392 | Improved Slaying | 3 | `ability-specific` | Not in character-sheet calculation: Increases all damage caused against Beasts, Giants, Dragonkin, and Humanoid targets by 3% and increases critical damage caused aga |
| 393 | Resourcefulness | 5 | `ability-specific` | Not in character-sheet calculation: Reduces the Mana cost of all traps and melee abilities by 10%. |
| 394 | Swift Reflexes | 2 | `sheet` | global  parry (rank vector 0); special  meleeHastePct (rank vector 0) |
| 395 | Entrapment | 3 | `proc-or-conditional` | Not in character-sheet calculation: Gives your Immolation Trap, Frost Trap, and Explosive Trap a 25% chance to entrap the target, preventing them from moving for 5 se |
| 396 | Savage Strikes | 2 | `partial` | offhand  damagePct (rank vector 0); spell Lacerate/Raptor Strike/Mongoose Bite/Carve/Wing Clip crit (rank vector 1) |
| 397 | Improved Wing Clip | 3 | `proc-or-conditional` | Not in character-sheet calculation: Gives your Wing Clip ability a 40% chance to immobilize the target for 5 sec. |
| 398 | Alone Against the World | 2 | `partial` | scoped All damage when no pet damagePct (rank vector 0); active only under {"pet":"None"} |
| 399 | Planning Ahead | 2 | `proc-or-conditional` | Not in character-sheet calculation: The duration of Freezing and Frost Trap effects and the damage of Immolation and Explosive Trap effects are increased by 25% if th |
| 400 | Survivalist | 5 | `sheet` | special  maxHealthPct (rank vector 0) |
| 401 | Carve | 1 | `ability-specific` | Not in character-sheet calculation: A sweeping attack that strikes up to 5 enemies in a 10 yard cone in front of you, dealing 60% weapon damage. This ability shares a |
| 402 | Deterrence | 1 | `proc-or-conditional` | Not in character-sheet calculation: When activated, increases your Dodge and Parry chance by 25% for 10 sec. |
| 403 | Stinging Nettle | 2 | `proc-or-conditional` | Not in character-sheet calculation: Your Mongoose Bite and triggered Fire traps now apply your highest rank of Serpent Sting for 40% of the duration. Serpent Stings a |
| 404 | Surefooted | 3 | `partial` | global  hit (rank vector 0); global  hit (rank vector 1); active only under {"dualWield":true}; Proc/event awaiting combat simulation: Movement-impairing resistance bonus is not a displayed combat stat |
| 405 | Improved Feign Death | 2 | `proc-or-conditional` | Not in character-sheet calculation: Reduces the chance your Feign Death ability will be resisted by 8%. |
| 406 | Killer Instinct | 3 | `partial` | global  crit (rank vector 0); ranged  crit (rank vector 0); scoped Melee attacks criticalDamagePct (rank vector 1) |
| 407 | Trap Mastery | 3 | `proc-or-conditional` | Not in character-sheet calculation: Increases the duration of Freezing and Frost Trap effects by 30% and the damage of Immolation and Explosive Trap effects by 30%. I |
| 408 | Lacerate | 1 | `proc-or-conditional` | Not in character-sheet calculation: Deepens the target's open wound, dealing damage equal to 40% of melee Attack Power and causing the target to bleed for 20% of that |
| 409 | Vicious Strikes | 2 | `ability-specific` | Not in character-sheet calculation: Reduces the cooldown of Raptor Strike and Mongoose Bite by 1 sec and increases the damage they deal by 10%. |
| 410 | Lightning Reflexes | 5 | `sheet` | percent  agi (rank vector 0); special  apFromAgiPct (rank vector 1) |
| 411 | Untamed Trapper | 1 | `proc-or-conditional` | Not in character-sheet calculation: Reduces the mana cost of your Immolation Trap and Explosive Trap effects by 20% and increases their damage based on your melee Att |

### Validation still required

1. Reconcile effect values, rounding and buff stacking with controlled in-game tests.
2. Verify spell family, weapon subtype, form, shield, aura and pet conditions.
3. Implement simulated abilities, procs, resources, encounter targets and rotation effects without adding temporary bonuses permanently.
4. Expand the explicit mapping for any remaining genuinely permanent character-sheet effects.

The class-specific registry is `docs/sim/core/talent-rules.mjs`; `tests/sim/talent-effects-audit.test.mjs` verifies rank vectors, class coverage and key regressions. **Merging note:** each class branch uses the same registry filename; consolidate the per-class exports before merging multiple branches, rather than allowing later changes to overwrite earlier class rules.
