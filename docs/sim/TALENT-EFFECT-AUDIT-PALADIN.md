# Paladin: talent calculation audit and implementation ledger

**Repository:** [Equadis/OctoBot](https://github.com/Equadis/OctoBot) · **branch:** `audit/talent-effects-paladin` · **source:** [OctoWoW published talent calculator](https://octowow.st/talents/paladin/) (2026-11-11T23:29:44.018448+00:00, SHA-256 `16f76bfbdb4faba8636986e58db45a38ccc6ef84e83395d99ce7c7849de35ee4`).

## Coverage summary

| Measure | Count |
|---|---:|
| Imported talents | 49 |
| Talents with individual reviewed registry entries | 49 |
| At least one character-sheet or weapon-derived effect | 10 |
| Scoped reference contributions only | 23 |
| Simulation/event-only records | 16 |

**Important:** The second and third categories are not completed DPS/TPS/HPS mechanics. A school, attack type or pet effect may be described numerically without being incorporated into a full combat outcome. The planner uses unverified base coefficients and must not be represented as a validated OctoWoW simulator.

## Exact classification of all 49 talents

| ID | Talent | Ranks | Status | Effect / precise unresolved dependency |
|---:|---|---:|---|---|
| 444 | Divine Strength | 5 | Sheet contribution | CHARACTER-SHEET percent  str (rank vector 0) |
| 445 | Divine Intellect | 5 | Sheet contribution | CHARACTER-SHEET percent  int (rank vector 0) |
| 446 | Holy Judgement | 3 | Event pending | SIMULATION PENDING — Holy Judgement only modifies the next Holy Light after casting Judgement; needs triggered spell state |
| 447 | Spiritual Focus | 2 | Scoped/pending | SCOPED ONLY scoped Flash of Light/Holy Light pushbackResistancePct (rank vector 0) |
| 448 | Improved Seal of Righteousness | 5 | Scoped/pending | SCOPED ONLY scoped Seal/Judgement of Righteousness damagePct (rank vector 0) |
| 449 | Healing Light | 3 | Scoped/pending | SCOPED ONLY scoped Holy Light / Flash of Light / Holy Shock healingPct (rank vector 0) |
| 450 | Sanctity Aura | 1 | Scoped/pending | SCOPED ONLY scoped Sanctity Aura holyDamagePct (explicit [10]); only if {"aura":"Sanctity Aura"} |
| 451 | Improved Lay on Hands | 2 | Scoped/pending | SCOPED ONLY scoped Lay on Hands cooldownReductionMinutes (rank vector 1); SIMULATION PENDING — Target receives a temporary item armour buff after Lay on Hands; not a personal permanent armour stat |
| 452 | Unyielding Faith | 2 | Scoped/pending | SCOPED ONLY scoped Fear/Disorient resistChancePct (rank vector 0) |
| 453 | Improved Concentration Aura | 3 | Scoped/pending | SCOPED ONLY scoped Concentration Aura effectivenessPct (rank vector 0); SCOPED ONLY scoped Concentration Aura resistSilenceInterruptPct (rank vector 1); SIMULATION PENDING — The planner does not offer Concentration Aura as a selectable aura |
| 454 | Illumination | 5 | Event pending | SIMULATION PENDING — Illumination refunds mana on healing crits; requires spell cast and resource events |
| 455 | Ironclad | 2 | Sheet contribution | CHARACTER-SHEET special  healingFromItemArmourPct (rank vector 0) |
| 456 | Divine Favor | 5 | Scoped/pending | SCOPED ONLY spell Holy Shock crit (rank vector 0) |
| 457 | Holy Shock | 1 | Event pending | SIMULATION PENDING — Holy Shock is an active damage/healing spell whose cooldown may reset after a cast |
| 458 | Holy Power | 3 | Scoped/pending | SCOPED ONLY spell Holy Light/Flash of Light crit (rank vector 0) |
| 459 | Blessed Strikes | 5 | Scoped/pending | SIMULATION PENDING — Crusader Strike can reset Holy Shock cooldown; SCOPED ONLY scoped Holy Strike healing healingPct (rank vector 1); SCOPED ONLY scoped Holy Strike healing power coefficientBonusPct (rank vector 2) |
| 460 | Daybreak | 1 | Event pending | SIMULATION PENDING — Daybreak applies on critical heal and is consumed on later target damage |
| 461 | Improved Devotion Aura | 5 | Scoped/pending | SCOPED ONLY scoped Devotion Aura armourBonusPct (rank vector 0) |
| 462 | Redoubt | 5 | Event pending | SIMULATION PENDING — Redoubt grants temporary block chance after receiving an attack, ending after time or block charges |
| 463 | Precision | 3 | Sheet contribution | CHARACTER-SHEET global  hit (rank vector 0); CHARACTER-SHEET global  spellHit (rank vector 0) |
| 464 | Guardian's Favor | 2 | Scoped/pending | SCOPED ONLY scoped Hand of Protection cooldownReductionSeconds (rank vector 0); SCOPED ONLY scoped Hand of Freedom durationIncreaseSeconds (rank vector 1) |
| 465 | Toughness | 5 | Sheet contribution | CHARACTER-SHEET special  itemArmourPct (rank vector 0) |
| 466 | Improved Righteous Fury | 3 | Scoped/pending | SCOPED ONLY scoped Righteous Fury threatPct (rank vector 0) |
| 467 | Blessing of Sanctuary | 1 | Event pending | SIMULATION PENDING — Blessing of Sanctuary must be cast/selected; target damage reduction and block retaliation are not a permanent player bonus |
| 468 | Shield Specialization | 3 | Scoped/pending | SCOPED ONLY scoped Shield blockValuePct (rank vector 0); only if {"shield":true}; SIMULATION PENDING — Mana restoration on blocking is conditional |
| 469 | Anticipation | 3 | Sheet contribution | CHARACTER-SHEET global  defense (rank vector 0) |
| 470 | Improved Hand of Reckoning | 2 | Scoped/pending | SCOPED ONLY scoped Hand of Reckoning hit (rank vector 0) |
| 471 | Improved Hammer of Justice | 3 | Scoped/pending | SCOPED ONLY scoped Hammer of Justice cooldownReductionSeconds (rank vector 0) |
| 472 | Righteous Defense | 3 | Event pending | SIMULATION PENDING — Damage reduction only while Righteous Fury is active; no Righteous Fury state control |
| 473 | Holy Shield | 1 | Event pending | SIMULATION PENDING — Holy Shield temporary block charges/threat/damage need an on-use ability and attack engine |
| 474 | Reckoning | 5 | Event pending | SIMULATION PENDING — Reckoning grants an extra attack after blocking; cannot increase always-on weapon speed |
| 475 | Righteous Strikes | 5 | Scoped/pending | SCOPED ONLY scoped Holy Strike threatPct (rank vector 0); SCOPED ONLY scoped Holy Strike damagePct (rank vector 1); SIMULATION PENDING — Zealous Defense temporarily reduces next blocked attack after Crusader Strike |
| 476 | Bulwark of the Righteous | 1 | Event pending | SIMULATION PENDING — Bulwark of the Righteous shield bash and 12-second damage reduction require an active ability model |
| 428 | Improved Blessings | 5 | Sheet contribution | SCOPED ONLY scoped Blessing of Might/Wisdom effectivenessPct (rank vector 0); CHARACTER-SHEET buff might ap (rank vector 0) |
| 429 | Benediction | 5 | Scoped/pending | SCOPED ONLY scoped Judgement/Seals manaCostReductionPct (rank vector 0) |
| 430 | Improved Judgement | 2 | Scoped/pending | SCOPED ONLY scoped Judgement cooldownReductionSeconds (rank vector 0) |
| 431 | Improved Seal of the Crusader | 3 | Scoped/pending | SCOPED ONLY scoped Seal of the Crusader attackPowerBonusPct (rank vector 0); only if {"seal":"Seal of the Crusader"}; SCOPED ONLY scoped Judgement of the Crusader holyDamageIncreasePct (rank vector 0) |
| 432 | Deflection | 5 | Sheet contribution | CHARACTER-SHEET global  parry (rank vector 0) |
| 433 | Improved Retribution Aura | 2 | Scoped/pending | SCOPED ONLY scoped Retribution Aura damagePct (rank vector 0); only if {"aura":"Retribution Aura"} |
| 434 | Conviction | 5 | Sheet contribution | CHARACTER-SHEET global  crit (rank vector 0) |
| 435 | Blessing of Kings | 1 | Event pending | SIMULATION PENDING — Blessing of Kings talent grants the castable Blessing; stats only apply if the Kings buff is actually selected |
| 436 | Pursuit of Justice | 2 | Scoped/pending | SCOPED ONLY scoped Movement/Mounted movementSpeedPct (rank vector 0) |
| 437 | Two-Handed Weapon Specialization | 3 | Sheet contribution | CHARACTER-SHEET weapon twohand-sword-mace-axe skill (rank vector 1); CHARACTER-SHEET weapon twohand damagePct (rank vector 0) |
| 438 | Vindication | 3 | Event pending | SIMULATION PENDING — Vindication chance on damaging melee attack applies a limited-level target damage debuff for 10 seconds |
| 439 | Eye for an Eye | 2 | Event pending | SIMULATION PENDING — Eye for an Eye reflects incoming spell-critical damage with a health-based cap |
| 440 | Vengeance | 5 | Event pending | SIMULATION PENDING — Vengeance damage/threat modifiers stack on critical effects for 30 seconds; proc uptime is not permanent |
| 441 | Seal of Command | 1 | Event pending | SIMULATION PENDING — Seal of Command requires selecting the seal, resolving procs and Judgement; no always-on flat damage bonus |
| 442 | Vengeful Strikes | 5 | Scoped/pending | SCOPED ONLY scoped Crusader Strike damagePct (rank vector 0); SCOPED ONLY scoped Zeal per stack attackCastSpeedPct (rank vector 1); SIMULATION PENDING — Zeal stack generation/duration requires an aura engine |
| 443 | Repentance | 1 | Event pending | SIMULATION PENDING — Repentance crowd control or immunity fallback damage requires a target/ability model |

## Known source and validation limitations

- **Blessing talents:** Improved Blessings enhances only an explicitly selected Blessing of Might; it must never multiply unrelated attack power or imply the blessing has been cast.
- The published calculator is a definition source, not a demonstration that the live server uses precisely the same mechanics.
- Abilities requiring attack outcomes, time, procs, cast resolution, cooldown reset, movement, party state or target debuffs must be validated in a combat engine.
- Gear, buffs, forms/stances and weapon choices require controlled in-game stacking and rounding comparisons.
- All existing and new regression tests are run by `.github/workflows/talent-branch-tests.yml` on this branch.

**Do not merge this branch directly together with another class branch without consolidating their separate `docs/sim/core/talent-rules.mjs` exports.** Each branch is isolated intentionally so independent class verification remains possible; `main` has not been altered by this audit.
