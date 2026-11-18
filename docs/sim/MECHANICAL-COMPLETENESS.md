# Phase 3 — Mechanical completeness
The first shared timed/proc effect adapter accepts explicitly sourced on-use and landed/critical attack-triggered stat auras or resource restoration, per-effect cooldowns, optional shared cooldown, and aura exclusivity. It is opt-in research, not a complete item catalogue; exact source names and eligibility are supplied, and a proc is not a permanent character-sheet bonus. Item/set/enchant/consumable identities and all numerical values still require mapping and validation. Proc auras activate after the triggering attack outcome is calculated; they can affect subsequent events. No public gate changes.

## Restoration consumables
Selected source-observed, exact single-resource or health restoration tooltips compile into actual scheduled uses with bounded inventory, explicit individual/shared cooldown assumptions and sampled ranges. Unsupported compound effects fail closed. Cooldown values remain research inputs rather than verified server claims.

## Companion stats
Owner-to-pet inheritance and known Great Stamina health contribution may now be explicitly applied to raw companion inputs. Included mode disallows duplicate application. No custom family coefficients or unseen trained ranks inferred; armour and resistance training remain unsupported by this adapter.

## Trinket swap reference transition
The equipment runtime can transition explicitly scheduled before/after loadouts with preserved cooldowns, equip lock, and configurable old aura retention. The build adapter checks replacement legality, exact item IDs for loadout effects and unchanged static combat snapshot; it rejects stat-changing swaps. The combat drop is an acknowledged research scenario input, not an actual Vanish/Feign Death cast or success model. Public readiness stays blocked; integration of real cast outcomes and dynamic stat/attack-table changes remains outstanding.

The restricted swap adapter now supports AP and school/healing power changes via persistent dynamic stat modifiers. Other changes (hit, crit, health, haste, unrelated weapon damage) fail closed. Formulas reading static inputs outside the dynamic range path still require review; actual combat drop is not simulated.

## Direct equipment damage
Explicit equipment effects can roll an independent damage outcome with a supplied school, range and mitigation. Damage is scheduled after the triggering attack at the same timestamp, and equipment-generated attack events cannot recursively trigger equipment effects. On-use damage requires an explicit target. This is a research policy, not an automatic item mapping or live proc-rate claim.

## Periodic damage and extra attacks
Periodic equipment damage uses per-effect/per-target identity, explicit interval, duration, refresh and expiry tick policy. Existing ticks persist after unequipping; application requires an equipped effect. Extra attacks resolve the configured hand's white-swing effects without resetting swing timers; nested equipment/weapon triggers are disabled and range is checked. Proc rates, actual server extra-attack interactions and individual catalogue mappings remain unverified. No public gate changes.

## Tooltip-to-runtime mapping
Exact complete timed AP, spell/healing power, simple direct damage and extra-attack tooltip patterns compile from selected equipped item effects or active set bonuses. Caller supplies unknown cooldowns, source eligibility and outcomes; composite/unrecognised effects are rejected. These patterns are not a full catalogue inventory or independently verified proc rates. Tooltip-derived effects are restricted to fixed loadouts until loadout-aware mapping is implemented.

## Absorption and life transfer
Equipment effects now execute sampled absorption capacity, explicit school restrictions and timed replacement, and damage/periodic damage optionally use the shared leech ledger. Exact source-shaped absorption and life-transfer tooltips are mapped. Unknown life-transfer school and healing basis remain explicit research inputs rather than inferred values. Compound multi-effect procs and dynamic haste remain outstanding.

## Dynamic spell attack tables
Ordinary direct magical damage with explicit spell outcome bins supports temporary spell hit, spell crit and school-specific crit deltas. Miss probability is adjusted independently; conditional resistance distribution is preserved, and conditional critical chance is adjusted separately within each non-full resistance bin. Zero modifiers leave existing tables unchanged. Unsupported tables fail closed; ranged magical attacks, application rolls, healing and special execution paths are not promoted to verified coverage. Arithmetic is a research reference, not live validation.

## General spell haste
Explicit eligible ability IDs use spellHasteFactor at action start; cast duration and optionally whole-tick channels and GCD are shortened. Existing class-specific reductions remain separate. Channel tick count is preserved. Mid-cast changes do not retime existing casts. GCD scaling and floor must be supplied explicitly rather than inferred from Classic rules. Live timing and interactions remain unverified.
