# Mage: talent calculation audit and implementation ledger

**Repository:** [Equadis/OctoBot](https://github.com/Equadis/OctoBot) · **branch:** `audit/talent-effects-mage` · **source:** [OctoWoW published talent calculator](https://octowow.st/talents/mage/) (2026-11-11T23:29:44.004273+00:00, SHA-256 `7ad369269087cf74092696a5f10e3115d660a8b0fdbf36af0009fc9815de6ad1`).

## Coverage summary

| Measure | Count |
|---|---:|
| Imported talents | 55 |
| Talents with individual reviewed registry entries | 55 |
| At least one character-sheet or weapon-derived effect | 2 |
| Scoped reference contributions only | 27 |
| Simulation/event-only records | 26 |

**Important:** The second and third categories are not completed DPS/TPS/HPS mechanics. A school, attack type or pet effect may be described numerically without being incorporated into a full combat outcome. The planner uses unverified base coefficients and must not be represented as a validated OctoWoW simulator.

## Exact classification of all 55 talents

| ID | Talent | Ranks | Status | Effect / precise unresolved dependency |
|---:|---|---:|---|---|
| 37 | Arcane Subtlety | 2 | Sheet contribution | CHARACTER-SHEET global  spellPen (rank vector 0) |
| 38 | Magic Absorption | 3 | Sheet contribution | CHARACTER-SHEET global  arcaneRes (rank vector 0); CHARACTER-SHEET global  fireRes (rank vector 0); CHARACTER-SHEET global  frostRes (rank vector 0); CHARACTER-SHEET global  natureRes (rank vector 0); CHARACTER-SHEET global  shadowRes (rank vector 0) |
| 39 | Improved Arcane Missiles | 5 | Scoped/pending | SCOPED ONLY scoped Arcane Missiles channel pushbackAvoidancePct (rank vector 0) |
| 40 | Wand Specialization | 2 | Scoped/pending | SCOPED ONLY scoped Wand damagePct (rank vector 0); SCOPED ONLY scoped Wand hit (rank vector 1) |
| 41 | Arcane Focus | 5 | Scoped/pending | SCOPED ONLY spell Arcane hit (rank vector 0) |
| 42 | Arcane Concentration | 5 | Event pending | SIMULATION PENDING — Arcane Concentration generates Clearcasting with hit-proc chance and internal cooldown; next-spell mana state pending |
| 43 | Magic Attunement | 1 | Scoped/pending | SCOPED ONLY scoped Amplify/Dampen Magic effectivenessPct (explicit [100]); SIMULATION PENDING — Target eligibility and currently active magic buff are not modelled |
| 44 | Arcane Impact | 3 | Scoped/pending | SCOPED ONLY spell Arcane crit (rank vector 0) |
| 45 | Arcane Rupture | 1 | Event pending | SIMULATION PENDING — Arcane Rupture is an active Arcane hit and a timed Arcane Missiles damage/mana-cost aura |
| 46 | Improved Mana Shield | 2 | Scoped/pending | SCOPED ONLY scoped Mana Shield manaLossReductionPct (rank vector 0) |
| 47 | Improved Counterspell | 2 | Event pending | SIMULATION PENDING — Improved Counterspell applies silence only after a successful Counterspell |
| 48 | Temporal Convergence | 3 | Event pending | SIMULATION PENDING — Temporal Convergence procs cooldown resets and refunds Arcane Rupture mana after Arcane Missiles events |
| 49 | Arcane Meditation | 3 | Scoped/pending | SCOPED ONLY scoped Mana regeneration while casting regenPct (rank vector 0); SIMULATION PENDING — Regeneration is tripled below 35% mana and requires a resource model |
| 50 | Arcane Instability | 3 | Event pending | SIMULATION PENDING — Arcane Instability has a chance to spend base mana for bonus Arcane damage on successful spells |
| 51 | Presence of Mind | 1 | Event pending | SIMULATION PENDING — Presence of Mind is an activated next-spell instant cast, not baseline casting speed |
| 52 | Accelerated Arcana | 1 | Scoped/pending | SCOPED ONLY spell Arcane castSpeedPct (explicit [5]) |
| 53 | Arcane Potency | 2 | Scoped/pending | SCOPED ONLY spell Arcane criticalDamagePct (rank vector 0) |
| 54 | Resonance Cascade | 5 | Event pending | SIMULATION PENDING — Resonance Cascade duplicates Arcane spell damage probabilistically and can recursively trigger |
| 55 | Arcane Power | 1 | Event pending | SIMULATION PENDING — Arcane Power temporarily hastens casting, changes mana income and drains mana; duration and expiry require combat resources |
| 1 | Improved Fireball | 5 | Scoped/pending | SCOPED ONLY scoped Fireball castTimeReductionSeconds (rank vector 0) |
| 2 | Impact | 5 | Event pending | SIMULATION PENDING — Impact stuns on Fire spell proc; target crowd-control state pending |
| 3 | Ignite | 5 | Event pending | SIMULATION PENDING — Ignite creates a DoT after Fire spell critical strikes; no event-driven periodic damage model |
| 4 | Flame Throwing | 2 | Scoped/pending | SCOPED ONLY scoped Fire spells rangeIncreaseYards (rank vector 0); SCOPED ONLY scoped Blast Wave radiusIncreasePct (rank vector 1) |
| 5 | Improved Fire Blast | 3 | Scoped/pending | SCOPED ONLY scoped Fire Blast cooldownReductionSeconds (rank vector 0); SCOPED ONLY scoped Fire Blast globalCooldownReductionSeconds (rank vector 1) |
| 6 | Incinerate | 2 | Scoped/pending | SCOPED ONLY spell Fire Blast/Scorch crit (rank vector 0) |
| 7 | Improved Flamestrike | 3 | Scoped/pending | SCOPED ONLY spell Flamestrike crit (rank vector 0) |
| 8 | Pyroblast | 1 | Event pending | SIMULATION PENDING — Pyroblast is an active Fire direct-plus-DoT spell; requires ability ranks and cast/target resolution |
| 9 | Burning Soul | 2 | Scoped/pending | SCOPED ONLY scoped Fire spells pushbackResistancePct (rank vector 0); SCOPED ONLY scoped Fire spells threatReductionPct (rank vector 1) |
| 10 | Fire Vulnerability | 3 | Event pending | SIMULATION PENDING — Fire Vulnerability debuff application and duration are target-state mechanics, not permanent personal Fire damage |
| 11 | Improved Fire Ward | 2 | Event pending | SIMULATION PENDING — Improved Fire Ward can reflect a Fire spell while Fire Ward aura is active, requiring incoming spell events |
| 12 | Master of Elements | 3 | Event pending | SIMULATION PENDING — Master of Elements refunds mana only after Fire/Frost spell critical strikes |
| 13 | Blast Wave | 1 | Event pending | SIMULATION PENDING — Blast Wave is an active area Fire spell with target daze |
| 14 | Critical Mass | 3 | Scoped/pending | SCOPED ONLY spell Fire crit (rank vector 0) |
| 15 | Hot Streak | 2 | Event pending | SIMULATION PENDING — Hot Streak generates temporary stacked Pyroblast cast-time reduction after Fireball/Fire Blast crits |
| 16 | Fire Power | 5 | Scoped/pending | SCOPED ONLY spell Fire damagePct (rank vector 0) |
| 17 | Combustion | 1 | Event pending | SIMULATION PENDING — Combustion is an active accumulating Fire crit buff that expires after three Fire critical hits |
| 18 | Frost Warding | 2 | Scoped/pending | SCOPED ONLY scoped Frost/Ice Armor effectivenessPct (rank vector 0); only if {"armour":["Frost Armor","Ice Armor"]}; SIMULATION PENDING — Frost Ward reflection chance requires event simulation |
| 19 | Improved Frostbolt | 5 | Scoped/pending | SCOPED ONLY scoped Frostbolt castTimeReductionSeconds (rank vector 0) |
| 20 | Elemental Precision | 3 | Scoped/pending | SCOPED ONLY spell Fire/Frost hit (rank vector 0) |
| 21 | Piercing Ice | 3 | Scoped/pending | SCOPED ONLY spell Frost damagePct (rank vector 0) |
| 22 | Frostbite | 3 | Event pending | SIMULATION PENDING — Frostbite freezes targets probabilistically when Chill effects apply |
| 23 | Improved Frost Nova | 2 | Scoped/pending | SCOPED ONLY scoped Frost Nova cooldownReductionSeconds (rank vector 0) |
| 24 | Permafrost | 3 | Scoped/pending | SCOPED ONLY scoped Chill effects durationIncreaseSeconds (rank vector 0); SCOPED ONLY scoped Chill effects slowIncreasePct (rank vector 1) |
| 25 | Ice Shards | 5 | Scoped/pending | SCOPED ONLY spell Frost criticalDamagePct (rank vector 0) |
| 26 | Cold Snap | 1 | Event pending | SIMULATION PENDING — Cold Snap resets eligible Frost cooldowns on use |
| 27 | Improved Blizzard | 3 | Event pending | SIMULATION PENDING — Improved Blizzard applies a movement slow with Blizzard ticks; needs target aura and time modelling |
| 28 | Arctic Reach | 2 | Scoped/pending | SCOPED ONLY scoped Frostbolt/Icicles/Blizzard rangeIncreasePct (rank vector 0); SCOPED ONLY scoped Frost Nova/Cone of Cold radiusIncreasePct (rank vector 0) |
| 29 | Frost Channeling | 3 | Scoped/pending | SCOPED ONLY scoped Frost spells manaCostReductionPct (rank vector 0); SCOPED ONLY scoped Frost spells threatReductionPct (rank vector 1) |
| 30 | Shatter | 5 | Event pending | SIMULATION PENDING — Shatter's critical bonus only applies to frozen targets |
| 31 | Ice Block | 1 | Event pending | SIMULATION PENDING — Ice Block temporarily prevents damage but disables actions; cannot add permanent damage immunity |
| 32 | Icicles | 1 | Event pending | SIMULATION PENDING — Icicles is a channeled attack with stationary state and a damage-reactive explosion |
| 33 | Improved Cone of Cold | 3 | Scoped/pending | SCOPED ONLY scoped Cone of Cold damagePct (rank vector 0) |
| 34 | Winter's Chill | 5 | Event pending | SIMULATION PENDING — Winter's Chill adds a stackable target debuff and is not player passive critical strike chance |
| 35 | Flash Freeze | 2 | Event pending | SIMULATION PENDING — Flash Freeze triggers only when freeze fails due to permanent target immunity and changes Icicles cooldown |
| 36 | Ice Barrier | 1 | Event pending | SIMULATION PENDING — Ice Barrier is a temporary shield with a conditional active Frost damage benefit, not permanent spell damage |

## Known source and validation limitations

- **Spell schools:** Arcane Focus and Elemental Precision are shown as scoped Arcane, Fire or Frost bonuses, not universal hit. Spell-school and individual ability tables still require full engine testing.
- The published calculator is a definition source, not a demonstration that the live server uses precisely the same mechanics.
- Abilities requiring attack outcomes, time, procs, cast resolution, cooldown reset, movement, party state or target debuffs must be validated in a combat engine.
- Gear, buffs, forms/stances and weapon choices require controlled in-game stacking and rounding comparisons.
- All existing and new regression tests are run by `.github/workflows/talent-branch-tests.yml` on this branch.

**Do not merge this branch directly together with another class branch without consolidating their separate `docs/sim/core/talent-rules.mjs` exports.** Each branch is isolated intentionally so independent class verification remains possible; `main` has not been altered by this audit.
