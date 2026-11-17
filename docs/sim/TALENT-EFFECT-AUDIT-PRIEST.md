# Priest — talent effects audit

**Branch:** `audit/talent-effects-priest` (isolated, no changes to main).

**Source:** [https://octowow.st/talents/priest/](https://octowow.st/talents/priest/) · snapshot 2026-11-11T23:38:49.459479+00:00 · SHA256 `ae346edead76b1ad082b31ea373fc64f72b72538333746555c062f2d27bcf5fb`.

### Coverage status

| Measure | Count |
|---|---:|
| Imported talent definitions | 52 |
| Explicitly mapped/reviewed rules | 33 |
| Talents with an applied static/weapon effect | 3 |
| Additional talents with scoped tooltip contributions only | 30 |
| Talents without numeric rules (recorded but pending) | 19 |

Status labels: `partial`: 32; `proc-or-conditional`: 17; `sheet`: 1; `ability-specific`: 2.

**Interpretation:** Static and weapon effects may alter the character sheet. Scoped entries describe where published bonuses apply, but do not imply functioning ability damage, mana, cast-time, pet or DPS mechanics. Temporary and conditional effects are not automatically added to permanent totals. The existing calculator still relies on partially unverified Vanilla base coefficients.

### Talent-by-talent ledger

| ID | Talent | Ranks | Coverage | Mapped effects or outstanding mechanic |
|---:|---|---:|---|---|
| 166 | Wand Specialization | 2 | `partial` | scoped Wand/Bow damagePct (vector 0); scoped Wand/Bow hit (vector 1) |
| 167 | Piercing Light | 3 | `partial` | spell Holy/Discipline hit (vector 0) |
| 168 | Mental Agility | 5 | `partial` | scoped Instant/Holy/Discipline spells manaCostReductionPct (vector 0) |
| 169 | Silent Resolve | 5 | `partial` | scoped All spells threatReductionPct (vector 0) |
| 170 | Unbreakable Will | 5 | `partial` | scoped Stun/Fear/Silence resistChancePct (vector 0) |
| 171 | Blessed Concentration | 2 | `proc-or-conditional` | Pending: Gives you a 100% chance to gain the Focused Casting effect that lasts for 6 sec after being the victim of a melee or ranged critical strike. The  |
| 172 | Improved Power Word: Fortitude | 2 | `partial` | scoped Power Word: Fortitude buffEffectivenessPct (vector 0) |
| 173 | Improved Inner Fire | 2 | `partial` | scoped Inner Fire buffEffectivenessPct (vector 0) |
| 174 | Inner Focus | 1 | `proc-or-conditional` | Pending: When activated, reduces the Mana cost of your next spell by 100% and increases its critical effect chance by 25% if it is capable of a critical e |
| 175 | Improved Power Word: Shield | 3 | `partial` | scoped Power Word: Shield absorbPct (vector 0) |
| 176 | Meditation | 3 | `partial` | scoped Mana regeneration while casting regenPct (vector 0) |
| 177 | Searing Light | 3 | `proc-or-conditional` | Pending: Your damaging Holy and Discipline spell critical strikes have a 100% chance to cause your next Smite spell to be instant cast and cost 60% less m |
| 178 | Purifying Flames | 2 | `proc-or-conditional` | Pending: Your Holy Fire has a 100% chance to increase your Holy damage by 12% for 10 sec. |
| 179 | Mental Strength | 3 | `partial` | percent  int (vector 0); spell Spell casting castSpeedPct (vector 1) |
| 180 | Enlighten | 1 | `proc-or-conditional` | Pending: Bring a party member under your tutelage for 30 min. Whenever you cast a Discipline or Holy spell, you have a 10% chance with helpful spells, or  |
| 181 | Resurgent Shield | 1 | `proc-or-conditional` | Pending: When your Power Word: Shield is broken, 25% of its base mana cost is refunded and increases damage and healing done by Holy spells and effects by |
| 182 | Force of Will | 5 | `partial` | spell Offensive spells damagePct (vector 0); spell Offensive spells crit (vector 0) |
| 183 | Chastise | 1 | `proc-or-conditional` | Pending: Chastise the target, causing 139 to 160 Holy damage. If the target is an enemy, they are disoriented for up to 2 sec or until they take damage. I |
| 184 | Improved Renew | 3 | `partial` | scoped Renew healingPct (vector 0) |
| 185 | Holy Focus | 2 | `proc-or-conditional` | Pending: Gives you a 70% chance to avoid interruption caused by damage while casting any Holy spell. |
| 186 | Divinity | 5 | `partial` | spell Holy/Discipline crit (vector 0) |
| 187 | Divine Fury | 5 | `partial` | scoped Smite/Holy Fire/Heal/Greater Heal castTimeReductionSeconds (vector 0) |
| 188 | Spell Warding | 3 | `partial` | scoped Incoming spell damage damageReductionPct (vector 0) |
| 189 | Holy Reach | 2 | `partial` | scoped Smite/Holy Fire/Chastise rangeIncreasePct (vector 0); scoped Prayer of Healing/Holy Nova radiusIncreasePct (vector 0) |
| 190 | Blessed Recovery | 3 | `proc-or-conditional` | Pending: After being struck by a melee or ranged critical hit, heal 25% of the damage taken over 6 sec. |
| 191 | Inspiration | 3 | `proc-or-conditional` | Pending: Increases your target's armor by 25% for 15 sec after getting a critical effect from your Flash Heal, Heal, Greater Heal, or Prayer of Healing sp |
| 192 | Holy Nova | 1 | `proc-or-conditional` | Pending: Causes an explosion of holy light around the caster, causing 27 to 31 Holy damage to all enemy targets within 10 yards and healing all party memb |
| 193 | Empowered Recovery | 2 | `partial` | scoped Renew durationIncreaseSeconds (vector 0); scoped Healing target with Renew healingPct (vector 0) |
| 194 | Improved Healing | 3 | `partial` | scoped Lesser Heal/Heal/Greater Heal/Prayer of Healing manaCostReductionPct (vector 0) |
| 195 | Spiritual Guidance | 5 | `sheet` | special  spFromSpiritPct (vector 0) |
| 196 | Book of Prayer | 2 | `proc-or-conditional` | Pending: Whenever you cast a healing spell, you regain 30% of its mana cost if it is different from your previous healing spell. |
| 197 | Spirit of Redemption | 1 | `partial` | percent  spi (vector explicit); Pending: Spirit of Redemption on death requires combat context |
| 198 | Reservoir of Light | 3 | `partial` | scoped Lightwell Splendor of Light effectivenessPct (vector 0) |
| 199 | Spiritual Healing | 5 | `partial` | scoped Healing spells healingPct (vector 0) |
| 200 | Ascendance | 1 | `proc-or-conditional` | Pending: Calls upon divine aid, purging all forms of crowd control and empowering your healing spells. Healing spells cost 33% less mana and their cast ti |
| 201 | Spirit Tap | 5 | `proc-or-conditional` | Pending: Gives you a 100% chance to gain a 100% bonus to your Spirit after killing a target that yields experience or critically striking a target with Mi |
| 202 | Improved Mind Blast | 5 | `partial` | scoped Mind Blast cooldownReductionSeconds (vector 0) |
| 203 | Shadow Affinity | 3 | `partial` | scoped Shadow spells threatReductionPct (vector 0) |
| 204 | Improved Shadow Word: Pain | 2 | `partial` | scoped Shadow Word: Pain durationIncreaseSeconds (vector 0) |
| 205 | Shadow Focus | 5 | `partial` | spell Shadow hit (vector 0) |
| 206 | Blackout | 5 | `proc-or-conditional` | Pending: Gives your Shadow damage spells a 10% chance to stun the target for 2 sec. |
| 207 | Improved Psychic Scream | 2 | `partial` | scoped Psychic Scream cooldownReductionSeconds (vector 0) |
| 208 | Improved Fade | 2 | `partial` | scoped Fade cooldownReductionSeconds (vector 0); scoped Fade end threatReturnReductionPct (vector 1) |
| 209 | Mind Flay | 1 | `ability-specific` | Pending: Assault the target's mind with Shadow energy, causing 75 Shadow damage over 3 sec and slowing their movement speed by 50%. |
| 210 | Improved Mana Burn | 2 | `partial` | scoped Mana Burn castTimeReductionSeconds (vector explicit) |
| 211 | Shadow Reach | 2 | `partial` | scoped Shadow spells rangeIncreasePct (vector 0) |
| 212 | Shadow Weaving | 5 | `proc-or-conditional` | Pending: Your Shadow damage spells have a 100% chance to grant you Shadow Weaving for 10 sec. Your Shadow damage spells apply a vulnerability that increas |
| 213 | Silence | 1 | `proc-or-conditional` | Pending: Silences the target, preventing them from casting spells for 5 sec. |
| 214 | Vampiric Embrace | 1 | `ability-specific` | Pending: Afflicts your target with Shadow energy that causes all party members to be healed for 20% of any Shadow spell damage you deal for 1 min. |
| 215 | Vampiric Touch | 2 | `partial` | scoped Vampiric Embrace healingPct (vector 0); scoped Vampiric Embrace partyManaReturnPct (vector 1); Pending: Target damage and active Vampiric Embrace aura need event-driven party resource handling |
| 216 | Darkness | 5 | `partial` | spell Shadow damagePct (vector 0) |
| 217 | Shadowform | 1 | `partial` | spell Shadow damagePct (vector explicit), conditional on {"form":"Shadowform"}; Pending: Shadowform armour/damage reduction and ability restrictions need combat support |

### Verification blockers

1. Compare all passive/weapon numbers and rounding with controlled OctoWoW client observations.
2. Verify stance, shield, form, aspect, pet, active buff and equipment eligibility.
3. Verify spell-family, ranged and individual-ability hit/crit tables, proc uptime and cast/resource timing before using DPS, TPS or HPS comparisons.
4. Complete mappings of remaining talents if the source indicates a permanent, testable sheet effect.
5. Re-run the branch Actions workflow and the baseline simulator regression suite after changes.

**Integration caution:** all class branches currently use `core/talent-rules.mjs`; their per-class registries need consolidation before multiple branches are merged. Never merge one registry over another.
