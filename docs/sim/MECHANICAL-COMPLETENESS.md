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

## Dynamic physical defence
Calculated incoming physical attacks rebuild the supplied one-roll table from temporary armour, defence skill, dodge, parry, block chance, block value and crit suppression deltas. Class block charges continue to use the same selected outcome. Defence skill changes the reference miss formula; other avoidance and crit-suppression changes are explicit separate deltas, not inferred from defence conversion. Scripted pre-resolved damage is unchanged. Live validation and dynamic spell resistance remain outstanding.

## Dynamic spell defence
Incoming magical attacks with rating-based resistance inputs rebuild their distribution with temporary school-specific and all-resistance deltas. Spell crit suppression adjusts the conditional crit roll separately. Explicit fixed-bin models reject rating deltas rather than inventing a conversion. Exact armour and school-resistance on-use tooltip patterns compile into defensive auras. The rating reference approximation is not a live-verified probability table.

## Dynamic capacities
Explicit opt-in capacity policy supports player health, mana, energy and rage aura modifiers. Current resource can clamp, preserve deficit or preserve ratio; health cannot be reduced below one by capacity changes. Original base capacities remain immutable, refresh/replacement avoids transient expiration, and changes are logged. Exact server semantics and companion capacities remain unverified.

## Conditional equipment triggers
Incoming landed or critical attack-result events can activate explicit source-matched effects; optional owner or target health threshold predicates are evaluated before cooldown and proc rolls. Incoming resource-return set wording retains all three published amounts and requires a compatible explicit resource selection. These are pre-damage attack-result triggers, not damage-taken or post-damage triggers; rates, Druid form changes and server event timing remain unverified.

## Stacking equipment auras and expendable charges
Explicit aura stacking supports add/replace/max, cap, duration refresh or preservation, and charge consumption on named landed or critical outgoing/incoming attacks. Consumption runs before new proc activation on the same attack, so newly granted charges cannot be consumed by their triggering event. These are post-roll effects: charge modifiers must already be present when the current attack rolls; spell-specific guarantees and one-charge effects granting a full outcome override require separate integration. Source-specific stack/charge policies remain research inputs.

## Ability-specific critical charges
Explicit source-scoped equipment auras can convert ordinary hit outcomes to their paired critical outcomes while preserving miss, avoidance and resistance. Charge consumption can occur on attempt or landed outcome. This is not a full guaranteed-hit model; glance/block outcomes remain unchanged. Competing charges use first configured eligible effect; exact overlap and named set proc rates remain unverified. Direct damage only.

## Combo-point-dependent critical set effect
Direct attack events for finishers carry target-specific combo points before spending. Explicit chance per point scales the proc roll and rejects missing point evidence. The exact imported Eviscerate 5% per point tooltip maps to a source-restricted next-critical aura; duration, consumption on attempt or landed, and internal cooldown remain explicit research inputs. No live validation claimed.

## Ability-specific modifiers
Explicit aura keys abilityDamageFactor:<abilityId>, abilityCostFactor:<abilityId>:<resource> and abilityCostReduction:<abilityId>:<resource> support direct damage and mana/rage/energy payment adjustments. Costs apply after class-specific adjustments, with percentage before flat reduction and a zero floor. Channel costs snapshot at action start. Periodic damage, special execution paths, cooldown changes and individual set mappings remain outside this batch. These stacking and timing choices are reference policies, not live observations.

## Scoped cooldown and periodic modifiers
Personal ability cooldowns use abilityCooldownFactor:<abilityId> and abilityCooldownReductionMs:<abilityId> at activation; shared and global cooldowns are excluded, running cooldowns do not retime. Ordinary periodic damage uses the existing snapshot or dynamic policy for abilityDamageFactor. Special execution paths and live validation remain outstanding.

## Additional catalogue proc mappings
Exact imported compound 2% energy/dodge/melee haste set wording, harmful spell damage-only proc wording and on-use attack speed wording compile to the existing runtime. The source set does not state eligible events; source restrictions must be supplied. Generic on-use attack speed is interpreted as melee only in this research mapping; ranged scope is not asserted. Swing and incoming defence models must be configured to observe the relevant benefits. These mappings do not establish live proc rates or automatic activation.

## Automatic scoped equipment compilation
The build adapter now consumes the existing combined active item/set scoped audit for exact unconditioned ability names. Percentage ordinary direct/periodic formula damage, personal cooldown reductions and existing mana/energy/rage start costs are applied once after rank/talent compilation and recorded with rank provenance. Unsupported, conditional, shared cooldown, special and non-exact scope effects remain outside this mapping. Scoped applied bonuses with trinket swaps are rejected pending loadout-aware compilation. Live validation pending.

## Weapon enchantment runtime
Selected, available weapon enchant IDs are validated against the equipped hand and compiled with explicit reference proc policies. Fiery Weapon and Lifestealing use school-specific damage and leech; Crusader supports an acknowledged AP-only approximation plus healing, not full Strength inheritance. Hand-tagged landed events are required; missing hand metadata cannot trigger the enchant. Proc rates, damage, timing and overlap are not inferred. Other event enchants and PPM conversion remain outstanding.

## Weapon speed PPM reference
Enchant policies can select fixed chance or explicit PPM with base-weapon-speed-landed basis. Conversion clamps ppm * unmodified weapon seconds / 60 to one; haste does not reduce per-contact probability. White-only or explicit named attacks are required; misses and nonmatching hands are excluded by existing runtime. Realised procs/minute can differ due to misses, haste, specials and cooldowns. No live rates assumed.

## Temporary primary attributes
Explicit marginal conversion policies expand flat Strength, Agility, Stamina, Intellect and Spirit equipment aura contributions into supported secondary keys. All derivatives share the original aura stacks and expiry. Crusader can alternatively supply Strength rather than AP-only approximation. Capacity effects require an explicit capacity policy. Spirit regeneration, nonlinear thresholds, primary percentage stacking and class coefficients are not inferred; empty coefficient maps explicitly model no secondary contribution. Server validation pending.

## Dynamic Spirit and MP5 regeneration
An explicitly selected player mana tick stream adds temporary Spirit-derived mana/second and MP5 deltas using its interval. Spirit follows the configured inside-window fraction; MP5 is independent of the spend window. A separate mana regeneration factor applies to the combined amount. One stream only prevents duplicate aura contributions. Coefficients and casting-window fraction remain caller-supplied reference inputs; no server rates inferred.

## Dynamic percentage primary attributes
Opt-in primaryAttributePolicy mode dynamic derives secondary deltas once from the full active flat/additive/multiplicative primary aura totals against the build snapshot. Ordering is flat then additive percentage then multiplicative percentage. Existing flat-only expansion remains backward compatible. This is a marginal linear reference policy; nonlinear server thresholds and changing base attributes on loadout changes are not inferred.

## Selected timed buff compilation
The adapter now compiles eligible selected Flurry and Quickness event buffs into timed melee haste auras. Activation schedules and reuse remain explicit research inputs; Quickness requires melee-only scope acknowledgement. Existing planner exclusions remain authoritative and a static conflicting selected buff is rejected rather than silently stacked. These two mapped effects currently have no pair in BUFF_CONFLICTS; general timed pairwise exclusion and provider/raid propagation remain outstanding.

## Raid armour overlap reference
Opt-in strongest-active research policy transfers selected Sunder, Expose, Recklessness and Faerie armour reductions from the sheet to encounter-duration target auras. The existing strongest-per-group armour resolver prevents double counting with class debuffs and restores weaker contributions on expiry. Single target/fixed loadout only. The provider is a synthetic player-owned aura with separate raid label, not a simulated raid actor. Other target effects and special damage paths are not claimed validated.

## Raid spell overlap reference
Opt-in selected Elements/Shadow curses migrate from the static sheet to encounter-duration target auras. Existing strongest curse vulnerability semantics apply. Optional direct ordinary spell resistance policies rebuild rating-based bins after the strongest reduction and reject mismatches with compiled baseline outcomes. No inferred server distribution; periodic application/tick resistance, special paths and multi-target provider schedules remain outstanding. Fixed loadout single target only for migrated raid auras.

## Periodic resistance extension and regression correction
Corrected the direct spell runtime's premature reference to curseAuras (CI 44438064994). Explicit per-school direct/application/tick resistance policies now permit separate ordinary tables and recalculate using active target debuffs at the actual roll time. Legacy direct policy remains accepted. Unconfigured phases retain original outcomes; special/guaranteed application distributions are not automatically converted. Server validation still pending.

## Scheduled raid debuff providers
Optional raidProviderSchedules assign each migrated selected armour/spell debuff to an existing additional ally, enemy target, application time and duration. Dead providers/targets cannot apply new auras. Existing aura ownership and strongest-group semantics preserve overlap and expiry. Multiple targets permitted only with explicit schedules; baseline target armour/resistance remains shared reference configuration, not individual creature stats. Providers do not independently cast or generate threat; fixed loadout only. Legacy encounter-long synthetic auras retained without schedules.

## Friendly raid providers
Explicit friendlyProviderSchedules support existing ally providers, a party of up to five, named recipients, application time, duration and reference secondary modifiers. Same-ID external buffs replace one another (last applied reference rule); matching static selected IDs are rejected. Dead providers or recipients cannot receive new applications. Party membership is supplied per schedule; range, provider class/talents, different-ID conflicts and autonomous raid rotations are not inferred. Ally aura bookkeeping does not imply autonomous ally DPS. Live validation pending.

## Provider, consumable and equipment follow-up
Explicit per-application provider distance and talent factor; pairwise friendly exclusion and static conflict checks. Compound rejuvenation uses independent reference rolls only when acknowledged. Primal Gods AP tooltip mapping and corrected observed ranged AP inheritance adapter key. These remain reference models; range is supplied per activation rather than simulated movement.

## Additional mechanical policies
Hunter defensive passive training accepts confirmed Natural Armor and school resistance ranks, and optional explicit baseline inheritance. Calculated incoming attacks use delta contributions (not scripted outcomes). Swap policies optionally support global crit and hit changes with equal hand deltas; unsupported snapshot changes remain rejected. Fiery Blaze single-target approximation and Elemental Slayer creature binding require explicit acknowledgement. None of these source coefficients are live verified.

## Elemental Devastation conditional talent
Imported Shaman talent 222 rank 1/2/3 grants 3/6/9 percentage points of spell hit for ten seconds on owner landed physical melee critical strikes. Dynamic refresh, no permanent double-count with static talent hit, no ranged or equipment-generated proc activation. Ordinary direct spell table consumes the delta; special/periodic application coverage not asserted.
