# Shaman: talent calculation audit and implementation ledger

**Repository:** [Equadis/OctoBot](https://github.com/Equadis/OctoBot) · **branch:** `audit/talent-effects-shaman` · **source:** [OctoWoW published talent calculator](https://octowow.st/talents/shaman/) (2026-11-11T23:29:44.031212+00:00, SHA-256 `8340d1af2ba89a41d8c28c5e9829f7cf5679b11864f6a7d00307fa1e2a02d2ac`).

## Coverage summary

| Measure | Count |
|---|---:|
| Imported talents | 49 |
| Talents with individual reviewed registry entries | 49 |
| At least one character-sheet or weapon-derived effect | 7 |
| Scoped reference contributions only | 25 |
| Simulation/event-only records | 17 |

**Important:** The second and third categories are not completed DPS/TPS/HPS mechanics. A school, attack type or pet effect may be described numerically without being incorporated into a full combat outcome. The planner uses unverified base coefficients and must not be represented as a validated OctoWoW simulator.

## Exact classification of all 49 talents

| ID | Talent | Ranks | Status | Effect / precise unresolved dependency |
|---:|---|---:|---|---|
| 218 | Convection | 5 | Scoped/pending | SCOPED ONLY scoped Offensive Fire/Frost/Nature manaCostReductionPct (rank vector 0) |
| 219 | Concussion | 5 | Scoped/pending | SCOPED ONLY spell Fire/Frost/Nature damagePct (rank vector 0) |
| 220 | Earth's Grasp | 2 | Scoped/pending | SCOPED ONLY scoped Stoneclaw Totem healthPct (rank vector 0); SCOPED ONLY scoped Earthbind Totem radiusIncreasePct (rank vector 1) |
| 221 | Elemental Warding | 3 | Scoped/pending | SCOPED ONLY scoped Incoming Fire/Frost/Nature damageReductionPct (rank vector 0) |
| 222 | Elemental Devastation | 3 | Sheet contribution | CHARACTER-SHEET global  hit (rank vector 0); CHARACTER-SHEET global  spellHit (rank vector 0); SIMULATION PENDING — Melee-crit-triggered additional spell hit is a 10-second proc: rank 1/2/3 gives +3/+6/+9%, not passive |
| 223 | Elemental Focus | 1 | Event pending | SIMULATION PENDING — Elemental Focus triggers two Clearcasting charges on an eligible elemental spell or melee critical strike |
| 224 | Reverberation | 3 | Scoped/pending | SCOPED ONLY scoped Shock spells cooldownReductionSeconds (rank vector 0) |
| 225 | Call of Thunder | 5 | Scoped/pending | SCOPED ONLY spell Lightning Bolt/Chain Lightning crit (rank vector 0) |
| 226 | Improved Molten Blast | 2 | Event pending | SIMULATION PENDING — Improved Molten Blast deals extra damage only when Molten Blast refreshes Flame Shock; requires target aura state |
| 227 | Improved Fire Totems | 2 | Scoped/pending | SCOPED ONLY scoped Fire Nova Totem activationDelayReductionSeconds (rank vector 0); SCOPED ONLY scoped Magma Totem threatReductionPct (rank vector 1) |
| 228 | Call of Earth | 2 | Scoped/pending | SCOPED ONLY scoped Earth Shield maximumCharges (rank vector 0) |
| 229 | Call of Flame | 3 | Scoped/pending | SCOPED ONLY spell Fire damagePct (rank vector 0) |
| 230 | Storm Reach | 2 | Scoped/pending | SCOPED ONLY scoped Lightning Bolt/Chain Lightning rangeIncreaseYards (rank vector 0) |
| 231 | Elemental Mastery | 1 | Event pending | SIMULATION PENDING — Elemental Mastery grants temporary +15% elemental damage and offensive spell cost reduction for 10 seconds; not passive |
| 232 | Elemental Fury | 2 | Scoped/pending | SCOPED ONLY spell Fire/Frost/Nature damagePct (rank vector 0); SIMULATION PENDING — Totem critical-damage effects remain combat-engine scoped |
| 233 | Lightning Mastery | 5 | Scoped/pending | SCOPED ONLY scoped Lightning Bolt/Chain Lightning castTimeReductionSeconds (rank vector 0) |
| 234 | Earthquake | 1 | Event pending | SIMULATION PENDING — Earthquake is an activated multi-target Nature spell that spawns a slowing zone |
| 251 | Ancestral Knowledge | 5 | Sheet contribution | CHARACTER-SHEET percent  str (rank vector 0); CHARACTER-SHEET percent  agi (rank vector 0); CHARACTER-SHEET percent  sta (rank vector 0); CHARACTER-SHEET percent  int (rank vector 0); CHARACTER-SHEET percent  spi (rank vector 0) |
| 252 | Shield Specialization | 5 | Sheet contribution | CHARACTER-SHEET special  blockChance (rank vector 0); only if {"shield":true}; CHARACTER-SHEET special  shieldBlockValuePct (rank vector 1) |
| 253 | Totemic Alignment | 2 | Scoped/pending | SCOPED ONLY scoped Totem threat transferredToOwnerPct (rank vector 0) |
| 254 | Thundering Strikes | 5 | Sheet contribution | CHARACTER-SHEET global  crit (rank vector 0) |
| 255 | Stable Shields | 3 | Scoped/pending | SCOPED ONLY scoped Shield spells maximumCharges (rank vector 0) |
| 256 | Improved Ghost Wolf | 2 | Scoped/pending | SCOPED ONLY scoped Ghost Wolf castTimeReductionSeconds (rank vector 0) |
| 257 | Calming Winds | 3 | Scoped/pending | SCOPED ONLY scoped Physical/imbue attacks threatReductionPct (rank vector 0) |
| 258 | Lightning Strike | 1 | Event pending | SIMULATION PENDING — Lightning Strike is an active weapon strike with empowered active-shield charge effects |
| 259 | Ancestral Guardian | 3 | Sheet contribution | CHARACTER-SHEET special  itemArmourPct (rank vector 0); CHARACTER-SHEET global  dodge (rank vector 1) |
| 260 | Flurry | 5 | Event pending | SIMULATION PENDING — Flurry is temporary for three attacks after a crit; do not add permanent haste |
| 261 | Spirit Armor | 2 | Sheet contribution | CHARACTER-SHEET special  shieldArmourPct (rank vector 0); only if {"shield":true}; SCOPED ONLY scoped Shield active threatPct (rank vector 1); only if {"shield":true} |
| 262 | Enhancing Totems | 2 | Sheet contribution | SCOPED ONLY scoped Strength of Earth/Grace of Air Totems effectivenessPct (rank vector 0); SCOPED ONLY scoped Grounding Totem cooldownReductionSeconds (rank vector 1); CHARACTER-SHEET buff earth str (rank vector 0); CHARACTER-SHEET buff air agi (rank vector 0) |
| 263 | Elemental Weapons | 3 | Event pending | SIMULATION PENDING — Weapon imbue effects are different per imbue and often triggered; an imbue-specific stat/aura model is required |
| 264 | Stormstrike | 1 | Event pending | SIMULATION PENDING — Stormstrike is an active extra-attack ability with two Nature-damage charge bonuses |
| 265 | Element's Grace | 5 | Scoped/pending | SCOPED ONLY scoped Weapons / Stormstrike / Lightning Strike damagePct (rank vector 0); SCOPED ONLY spell Instant spells crit (rank vector 1) |
| 266 | Bloodlust | 1 | Event pending | SIMULATION PENDING — Bloodlust applies temporary attack/cast-speed buffs and party crit-triggered haste effects |
| 235 | Improved Healing Wave | 5 | Event pending | SIMULATION PENDING — Official calculator alternates 15 / 0.3 / 45 / 0.6 / 75 sec reductions across ranks; malformed data cannot be trusted |
| 236 | Tidal Focus | 5 | Scoped/pending | SCOPED ONLY scoped Healing spells manaCostReductionPct (rank vector 0); SCOPED ONLY scoped Totems manaCostReductionPct (rank vector 1) |
| 237 | Improved Reincarnation | 2 | Scoped/pending | SCOPED ONLY scoped Reincarnation cooldownReductionMinutes (rank vector 0); SCOPED ONLY scoped Reincarnation returnedHealthManaPct (rank vector 1) |
| 238 | Ancestral Healing | 3 | Event pending | SIMULATION PENDING — Ancestral Healing grants a temporary armour buff to a healed target after a critical heal, not to the caster |
| 239 | Tidal Mastery | 5 | Scoped/pending | SCOPED ONLY spell Healing spells/Lightning spells crit (rank vector 0) |
| 240 | Healing Way | 3 | Event pending | SIMULATION PENDING — Healing Way creates or consumes stacks of a target healing increase following qualifying heals |
| 241 | Healing Focus | 2 | Scoped/pending | SCOPED ONLY scoped Healing spells pushbackAvoidancePct (rank vector 0) |
| 242 | Totemic Mastery | 1 | Scoped/pending | SCOPED ONLY scoped Helpful Totems durationPct (explicit [20]); SCOPED ONLY scoped Totemic Recall manaRefundPct (explicit [15]) |
| 243 | Nature's Grace | 3 | Scoped/pending | SCOPED ONLY scoped Nature spells threatReductionPct (rank vector 0) |
| 244 | Restorative Totems | 5 | Scoped/pending | SCOPED ONLY scoped Mana Spring Totem manaCostReductionPct (rank vector 0); SCOPED ONLY scoped Healing Stream Totem effectivenessPct (rank vector 1) |
| 245 | Improved Water Shield | 3 | Event pending | SIMULATION PENDING — Water Shield conditional mana/5 requires an actual shield-state control |
| 246 | Tidal Surge | 2 | Event pending | SIMULATION PENDING — Tidal Surge refunds mana probabilistically only after healing a target with Healing Way |
| 247 | Ancestral Swiftness | 1 | Event pending | SIMULATION PENDING — Ancestral Swiftness is an on-use next Nature spell instant cast with an offensive penalty |
| 248 | Undertow | 2 | Event pending | SIMULATION PENDING — Undertow restores/consumes Water Shield charges after a qualifying heal; requires shield state and target events |
| 249 | Improved Chain Heal | 5 | Scoped/pending | SCOPED ONLY scoped Chain Heal castTimeReductionSeconds (rank vector 0) |
| 250 | Spirit Link | 1 | Event pending | SIMULATION PENDING — Spirit Link temporarily redistributes damage between party targets, requiring group health and damage timelines |

## Known source and validation limitations

- **Improved Healing Wave:** Published calculator rank descriptions alternate 15 / 0.3 / 45 / 0.6 / 75 seconds; these implausible values remain explicitly unresolved, not implemented as haste.
- **Elemental Devastation:** Permanent +3% melee and spell hit at 3/3 is applied; additional +9% on melee crit for 10 seconds requires a proc model and must never appear as passive hit.
- **Flurry:** Increases attack speed for three swings after crit; intentionally omitted from permanent haste.
- The published calculator is a definition source, not a demonstration that the live server uses precisely the same mechanics.
- Abilities requiring attack outcomes, time, procs, cast resolution, cooldown reset, movement, party state or target debuffs must be validated in a combat engine.
- Gear, buffs, forms/stances and weapon choices require controlled in-game stacking and rounding comparisons.
- All existing and new regression tests are run by `.github/workflows/talent-branch-tests.yml` on this branch.

**Do not merge this branch directly together with another class branch without consolidating their separate `docs/sim/core/talent-rules.mjs` exports.** Each branch is isolated intentionally so independent class verification remains possible; `main` has not been altered by this audit.
