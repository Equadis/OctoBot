# Priest: talent calculation audit and implementation ledger

**Repository:** [Equadis/OctoBot](https://github.com/Equadis/OctoBot) · **branch:** `audit/talent-effects-priest` · **source:** [OctoWoW published talent calculator](https://octowow.st/talents/priest/) (2026-11-11T23:38:49.459479+00:00, SHA-256 `ae346edead76b1ad082b31ea373fc64f72b72538333746555c062f2d27bcf5fb`).

## Coverage summary

| Measure | Count |
|---|---:|
| Imported talents | 52 |
| Talents with individual reviewed registry entries | 52 |
| At least one character-sheet or weapon-derived effect | 3 |
| Scoped reference contributions only | 31 |
| Simulation/event-only records | 18 |

**Important:** The second and third categories are not completed DPS/TPS/HPS mechanics. A school, attack type or pet effect may be described numerically without being incorporated into a full combat outcome. The planner uses unverified base coefficients and must not be represented as a validated OctoWoW simulator.

## Exact classification of all 52 talents

| ID | Talent | Ranks | Status | Effect / precise unresolved dependency |
|---:|---|---:|---|---|
| 166 | Wand Specialization | 2 | Scoped/pending | SCOPED ONLY scoped Wand/Bow damagePct (rank vector 0); SCOPED ONLY scoped Wand/Bow hit (rank vector 1) |
| 167 | Piercing Light | 3 | Scoped/pending | SCOPED ONLY spell Holy/Discipline hit (rank vector 0) |
| 168 | Mental Agility | 5 | Scoped/pending | SCOPED ONLY scoped Instant/Holy/Discipline spells manaCostReductionPct (rank vector 0) |
| 169 | Silent Resolve | 5 | Scoped/pending | SCOPED ONLY scoped All spells threatReductionPct (rank vector 0) |
| 170 | Unbreakable Will | 5 | Scoped/pending | SCOPED ONLY scoped Stun/Fear/Silence resistChancePct (rank vector 0) |
| 171 | Blessed Concentration | 2 | Event pending | SIMULATION PENDING — Blessed Concentration activates after taking melee/ranged crit damage; anti-pushback and spell effects expire after a short duration |
| 172 | Improved Power Word: Fortitude | 2 | Scoped/pending | SCOPED ONLY scoped Power Word: Fortitude buffEffectivenessPct (rank vector 0) |
| 173 | Improved Inner Fire | 2 | Scoped/pending | SCOPED ONLY scoped Inner Fire buffEffectivenessPct (rank vector 0) |
| 174 | Inner Focus | 1 | Event pending | SIMULATION PENDING — Inner Focus is an on-use next-spell mana-free, extra-critical effect, not permanent crit chance |
| 175 | Improved Power Word: Shield | 3 | Scoped/pending | SCOPED ONLY scoped Power Word: Shield absorbPct (rank vector 0) |
| 176 | Meditation | 3 | Scoped/pending | SCOPED ONLY scoped Mana regeneration while casting regenPct (rank vector 0) |
| 177 | Searing Light | 3 | Event pending | SIMULATION PENDING — Searing Light grants a timed instant and discounted Smite following Holy/Discipline spell critical hits |
| 178 | Purifying Flames | 2 | Event pending | SIMULATION PENDING — Purifying Flames grants temporary Holy damage after Holy Fire hits |
| 179 | Mental Strength | 3 | Sheet contribution | CHARACTER-SHEET percent  int (rank vector 0); SCOPED ONLY spell Spell casting castSpeedPct (rank vector 1) |
| 180 | Enlighten | 1 | Event pending | SIMULATION PENDING — Enlighten links party member health/mana to the priest's helpful/harmful spell events |
| 181 | Resurgent Shield | 1 | Event pending | SIMULATION PENDING — Resurgent Shield triggers a shield-break mana refund and temporary Holy damage/healing based on shield absorb amount |
| 182 | Force of Will | 5 | Scoped/pending | SCOPED ONLY spell Offensive spells damagePct (rank vector 0); SCOPED ONLY spell Offensive spells crit (rank vector 0) |
| 183 | Chastise | 1 | Event pending | SIMULATION PENDING — Chastise is an active enemy disorient or ally haste spell requiring explicit target type and ability timing |
| 184 | Improved Renew | 3 | Scoped/pending | SCOPED ONLY scoped Renew healingPct (rank vector 0) |
| 185 | Holy Focus | 2 | Scoped/pending | SCOPED ONLY scoped Holy spell casting pushbackAvoidancePct (rank vector 0) |
| 186 | Divinity | 5 | Scoped/pending | SCOPED ONLY spell Holy/Discipline crit (rank vector 0) |
| 187 | Divine Fury | 5 | Scoped/pending | SCOPED ONLY scoped Smite/Holy Fire/Heal/Greater Heal castTimeReductionSeconds (rank vector 0) |
| 188 | Spell Warding | 3 | Scoped/pending | SCOPED ONLY scoped Incoming spell damage damageReductionPct (rank vector 0) |
| 189 | Holy Reach | 2 | Scoped/pending | SCOPED ONLY scoped Smite/Holy Fire/Chastise rangeIncreasePct (rank vector 0); SCOPED ONLY scoped Prayer of Healing/Holy Nova radiusIncreasePct (rank vector 0) |
| 190 | Blessed Recovery | 3 | Event pending | SIMULATION PENDING — Blessed Recovery heals over time only after the priest receives a melee/ranged critical hit |
| 191 | Inspiration | 3 | Event pending | SIMULATION PENDING — Inspiration grants a temporary armour buff to a healed target after a critical heal, not to the priest |
| 192 | Holy Nova | 1 | Event pending | SIMULATION PENDING — Holy Nova is an active area damage/healing spell and has different Shadowform interactions |
| 193 | Empowered Recovery | 2 | Scoped/pending | SCOPED ONLY scoped Renew durationIncreaseSeconds (rank vector 0); SCOPED ONLY scoped Healing target with Renew healingPct (rank vector 0) |
| 194 | Improved Healing | 3 | Scoped/pending | SCOPED ONLY scoped Lesser Heal/Heal/Greater Heal/Prayer of Healing manaCostReductionPct (rank vector 0) |
| 195 | Spiritual Guidance | 5 | Sheet contribution | CHARACTER-SHEET special  spFromSpiritPct (rank vector 0) |
| 196 | Book of Prayer | 2 | Event pending | SIMULATION PENDING — Book of Prayer refunds mana only when successive healing spells differ |
| 197 | Spirit of Redemption | 1 | Sheet contribution | CHARACTER-SHEET percent  spi (explicit [10]); SIMULATION PENDING — Spirit of Redemption on death requires combat context |
| 198 | Reservoir of Light | 3 | Scoped/pending | SCOPED ONLY scoped Lightwell Splendor of Light effectivenessPct (rank vector 0) |
| 199 | Spiritual Healing | 5 | Scoped/pending | SCOPED ONLY scoped Healing spells healingPct (rank vector 0) |
| 200 | Ascendance | 1 | Event pending | SIMULATION PENDING — Ascendance is an activated temporary healing-resource/cast-time buff with ally Apotheosis effects |
| 201 | Spirit Tap | 5 | Event pending | SIMULATION PENDING — Spirit Tap grants temporary Spirit and while-casting mana regeneration after qualifying kill or Mind Blast crit |
| 202 | Improved Mind Blast | 5 | Scoped/pending | SCOPED ONLY scoped Mind Blast cooldownReductionSeconds (rank vector 0) |
| 203 | Shadow Affinity | 3 | Scoped/pending | SCOPED ONLY scoped Shadow spells threatReductionPct (rank vector 0) |
| 204 | Improved Shadow Word: Pain | 2 | Scoped/pending | SCOPED ONLY scoped Shadow Word: Pain durationIncreaseSeconds (rank vector 0) |
| 205 | Shadow Focus | 5 | Scoped/pending | SCOPED ONLY spell Shadow hit (rank vector 0) |
| 206 | Blackout | 5 | Event pending | SIMULATION PENDING — Blackout stuns randomly following Shadow damage spell hits |
| 207 | Improved Psychic Scream | 2 | Scoped/pending | SCOPED ONLY scoped Psychic Scream cooldownReductionSeconds (rank vector 0) |
| 208 | Improved Fade | 2 | Scoped/pending | SCOPED ONLY scoped Fade cooldownReductionSeconds (rank vector 0); SCOPED ONLY scoped Fade end threatReturnReductionPct (rank vector 1) |
| 209 | Mind Flay | 1 | Event pending | SIMULATION PENDING — Mind Flay is an active channeled Shadow DoT applying slow to a target |
| 210 | Improved Mana Burn | 2 | Scoped/pending | SCOPED ONLY scoped Mana Burn castTimeReductionSeconds (explicit [0.25,0.5]) |
| 211 | Shadow Reach | 2 | Scoped/pending | SCOPED ONLY scoped Shadow spells rangeIncreasePct (rank vector 0) |
| 212 | Shadow Weaving | 5 | Event pending | SIMULATION PENDING — Shadow Weaving is a temporary self/target stacking Shadow vulnerability aura generated by Shadow spell casts |
| 213 | Silence | 1 | Event pending | SIMULATION PENDING — Silence is an active target spell-lockout ability |
| 214 | Vampiric Embrace | 1 | Event pending | SIMULATION PENDING — Vampiric Embrace links Shadow damage against affected target into party healing for an aura duration |
| 215 | Vampiric Touch | 2 | Scoped/pending | SCOPED ONLY scoped Vampiric Embrace healingPct (rank vector 0); SCOPED ONLY scoped Vampiric Embrace partyManaReturnPct (rank vector 1); SIMULATION PENDING — Target damage and active Vampiric Embrace aura need event-driven party resource handling |
| 216 | Darkness | 5 | Scoped/pending | SCOPED ONLY spell Shadow damagePct (rank vector 0) |
| 217 | Shadowform | 1 | Scoped/pending | SCOPED ONLY spell Shadow damagePct (explicit [15]); only if {"form":"Shadowform"}; SIMULATION PENDING — Shadowform armour/damage reduction and ability restrictions need combat support |

## Known source and validation limitations

- **Spirit of Redemption:** The permanent 10% Spirit contribution is implemented, while the death-triggered healing form remains pending.
- **Piercing Light:** Holy/Discipline resist-reduction is scoped; it is not blanket spell hit.
- The published calculator is a definition source, not a demonstration that the live server uses precisely the same mechanics.
- Abilities requiring attack outcomes, time, procs, cast resolution, cooldown reset, movement, party state or target debuffs must be validated in a combat engine.
- Gear, buffs, forms/stances and weapon choices require controlled in-game stacking and rounding comparisons.
- All existing and new regression tests are run by `.github/workflows/talent-branch-tests.yml` on this branch.

**Do not merge this branch directly together with another class branch without consolidating their separate `docs/sim/core/talent-rules.mjs` exports.** Each branch is isolated intentionally so independent class verification remains possible; `main` has not been altered by this audit.
