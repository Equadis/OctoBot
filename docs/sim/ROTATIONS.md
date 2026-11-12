# Rotation configuration catalogue

The shared registry contains **125 built-in presets**, including all **40 existing IDs**, and one final **New Custom Rotation** option per class. This expansion adds **85** priorities. Preset selection fills editable rows; it does not run combat or change talents, gear, class options or the selected character build.

**Every built-in preset below is research-based and awaits independent OctoWoW priority/mechanic validation. Combat execution is unavailable for all 125 presets.** There is no implemented DPS, threat or healing encounter engine in this project. No DPS, TPS or HPS values are fabricated. A published spell identity, a valid configuration and a validated combat model are separate claims.

## Counts

| Class | Added | Existing IDs retained | Total built-ins |
| --- | ---: | ---: | ---: |
| Warrior | 9 | 4 | 13 |
| Rogue | 9 | 15 | 24 |
| Paladin | 9 | 3 | 12 |
| Hunter | 10 | 3 | 13 |
| Priest | 8 | 3 | 11 |
| Shaman | 11 | 3 | 14 |
| Mage | 10 | 3 | 13 |
| Warlock | 9 | 3 | 12 |
| Druid | 10 | 3 | 13 |
| **Total** | **85** | **40** | **125** |

Counts exclude New Custom Rotation. The Rogue's 15 previous presets and Warrior's four previous IDs remain available. Existing Paladin, Hunter, Priest, Shaman, Mage, Warlock and Druid defaults are retained.

## Using presets and saved builds

Presets are grouped by specialisation with existing defaults before additions. Named saved rotations have their own group; New Custom Rotation is always last. Every priority has editable ability, target and condition rows. Boolean conditions use equality to 0 or 1. The legacy numeric condition wire shape remains intact: `{metric, operator, value, aura}`; `aura` names the subject of advanced conditions, such as an ability, proc or shared cooldown group.

Role selection separates DPS, threat/tanking and healing. Choosing a preset sets its role; changing role independently does not replace rows. Requirements report missing talents, levels, equipment, class options and verified set bonuses. Configuration recommendations are separate, non-mutating matches based on the selected role, talents and equipment, never simulated optimal rankings. Missing mechanics remain visible under Sources & requirements.

Existing saved builds retain their explicit rotation rows, ordering and conditions. Preset IDs are stable, including previous Rogue aliases. Two templates are corrected only when newly selected: legacy `holy-shock` is healing-oriented and legacy Hunter `survival` is melee. Importing old explicit damage/ranged rows under those IDs does not silently rewrite them. New fields such as role, stable ability IDs and target scope round-trip through builds, share links and saved custom rotations. Custom rotation storage remains at 20 named entries per class; this expansion does not reduce build-save capacity.

## Sources and evidence

Current-server references take precedence over Turtle research:

- [OctoWoW database](https://octowow.st/db/), [talent calculator](https://octowow.st/talents/) and official class pages linked by each preset.
- [Combat Gum Rogue](https://www.combatgum.app/rogue): existing Rogue preset organisation and workflow reference.
- [Turtle Knowledge Base structured classes](https://github.com/stevemcqueenz/turtle-knowledge-base-/tree/b88d4445d9fdb21beb31ea013eefd5a2540f4787/structured/classes) and [human-readable guides](https://github.com/stevemcqueenz/turtle-knowledge-base-/tree/b88d4445d9fdb21beb31ea013eefd5a2540f4787/guide/classes), pinned at `b88d4445d9fdb21beb31ea013eefd5a2540f4787`.
- [Aegis rotation documentation](https://github.com/Torchlite-bit/Aegis_SBR/blob/95e2fa99d37d416eb0493cdea9edbe29b94dbe05/docs/rotations.md) and [correctness audit](https://github.com/Torchlite-bit/Aegis_SBR/blob/95e2fa99d37d416eb0493cdea9edbe29b94dbe05/docs/audit-phase1-rotations.md), pinned at `95e2fa99d37d416eb0493cdea9edbe29b94dbe05`.

The research manifest records hashes for 63 structured and guide files. Implementation code is original; upstream Lua and guide text are not vendored or executed. The public spell-search importer completed **181 searches with no fetch failures**. Candidate spell IDs, published levels and ranks are recorded in ability-data.mjs and ability-evidence.json. These identify public database entries, **not verified player-learned rank availability**. Official talent matches separately record their spell IDs. Powershift and Pet Attack are commands rather than spell identities; the legacy Power Infusion identity remains unresolved and is excluded from compatible recommendations.

Regenerate identity evidence with `python tools/sim/import-rotation-abilities.py`. It reads the registry, parses database literals without executing database JavaScript and caches public responses in ignored .rotation-source-cache/. Talent references are factual snapshots of the existing official talent JSON. A source observation is not evidence that a whole priority is accurate on OctoWoW.

## Known discrepancies and validation work

All presets await independent current-server validation, particularly:

- **Rogue:** current official Blade Flurry is a baseline level-30 toggle, not a talent requirement. Verify energy/damage changes, reset behaviour, burst cooldown timing, poison interactions and Noxious/Envenom priorities before execution.
- **Paladin:** current calculator permits Holy Shock damage/healing while Turtle/Aegis describe healing-only behaviour. New Holy priorities target allies. Zeal, Holy Might and shared strike cooldown claims differ between sources. Judgement weaving requires a verified re-seal/GCD/latency policy; seal twisting is not assumed.
- **Mage:** current Hot Streak uses five stacks rather than the Turtle reference's nine. Arcane Surge activation and effect descriptions conflict; the policy is unresolved. Verify Master of Elements, channel boundaries, freeze immunity and instant-cast proc consumption.
- **Druid:** published Eclipse proc chances differ between OctoWoW and Turtle. Templates inspect actual buffs/shared cooldown state without inventing proc formulas. Verify empowered cast expiry, snapshots, powershift resource/GCD rules and behind-target access. T3.5 templates remain incompatible until the exact equipped set bonus is independently verified.
- **Hunter:** Survival priorities are melee; ranged casts require explicitly verified Auto Shot clip/reset policies, not an arbitrary time threshold. Verify Kill Command's player-crit proc, pet range, availability and cooldown.
- **Shaman:** use the requested Enhancement | Tank naming fallback rather than asserting a Warden specialisation. Ancestral Swiftness is current talent metadata; legacy Nature's Swiftness stays editable. Verify Earthquake conditions, Fire Nova/Totem interactions, imbues and shield/tank behaviour.
- **Warlock:** official class material mentions Felguard and temporary Doomguard control; this does not verify Felstorm, learned ranks or permanent pet control. Verify curse assignment, Malediction, owned DoTs, pet commands and channel ticks before use.
- **Priest:** Chastise's ally health/level restrictions are represented. Legacy Power Infusion lacks a current matching player-spell identity. Validate current Smite/Searing Light, Shadow proc/DoT and healing behaviour.
- **Warrior:** validate Slam's swing reset/clip policy, next-swing queueing, stance/resource rules, Lawnmower priorities, threat output and multi-target encounter effects.

Unknowns are deliberately preserved as requirements or unresolved notes. Publicly listed abilities are not automatically available at every level, rank, race or build.

## Engine and condition contract

The registry, validator, recommendation matcher and typed condition evaluator are shared by all classes. Registry templates are recursively frozen; selection clones rows before editing. A preset includes stable ID, class, specialisation, role, description, requirements, sources, ruleset revision, verification and execution status. Built-ins are `research-based` / `unsupported` for ruleset `octowow-public-2026-11-12`.

The evaluator chooses a priority action only. Its engine adapter must supply real resources and predictions; owned aura trackers; procs; ability/shared cooldowns; weapon/stance/form state; cast/channel state; melee/ranged timers and verified cast-window policies; pet status; target collections; and, for healing, ally health, deficits and incoming damage. Conditions use named cooldown/ability/aura keys. An active owned DoT with no ownership evidence throws. A safe cast window requires an explicit `verified-safe` policy plus cast duration, latency and swing timers. Unknown predicates, absent required state or unsupported action kinds throw UnsupportedRotationState rather than becoming always-true rules.

Target scopes are primary, cycle, ally, self and pet. The adapter identifies action kinds (instant, cast, channel, queued-melee, ranged-auto, pet, cooldown, form-transition or command), and explicitly reports both availability and readiness. The evaluator does not implement GCDs, queues, damage, healing, threat, pet AI, cooldown activation or form transitions. It evaluates condition support before choosing the first eligible action, so an unsupported lower-priority condition cannot silently disappear.

The simulation entry point separately requires the exact ruleset revision, supported role/output, independently validated preset, supported and verified ability IDs, supported predicates and target scopes, plus existing race, equipment, consumable, buff and engine validation. Healing requires HPS/encounter support; tanking requires TPS/encounter support. A DPS-only adapter cannot run healing or tank presets. No adapter currently meets these capabilities.

## Validation

Automated regression coverage includes all requested names and counts, stable legacy IDs, every preset's schema and requirements, unique row signatures, save/share round-trips, custom cloning, advanced predicates, unsupported-state failures, owned/multi-target DoTs, ally targeting, role/weapon/talent/set requirements, non-mutating recommendations and simulation gates. Existing class/equipment/consumable/talent/panel-reset tests remain in place.

Run `node --test tests/sim/*.test.mjs` and `python -m unittest discover -s tests/sim -p 'test_*.py'`. Module syntax and repository whitespace checks are also required. No interactive browser surface was available during this implementation; dropdown appearance, zoom and mobile interaction still require a manual visual pass. Native select controls and the current editor styling are retained.

## Complete catalogue

**Status for every entry:** research-based priority; awaiting OctoWoW validation; combat execution unavailable. DPS, tank and healing labels describe intended encounter roles, not implemented engines.

### Warrior

- **Arms | Two-Handed** — `arms-twohand`; dps; preserved legacy ID.
- **Arms | Two-Handed (Slam Weave)** — `arms-twohand-slam-weave`; dps.
- **Arms | Two-Handed (No Slam)** — `arms-twohand-no-slam`; dps.
- **Arms | Sweeping Strikes (Cleave)** — `arms-sweeping-cleave`; dps.
- **Fury | Dual Wield** — `fury-dual`; dps; preserved legacy ID.
- **Fury | Two-Handed** — `fury-twohand`; dps; preserved legacy ID.
- **Fury | Dual Wield (Execute Focus)** — `fury-dual-execute`; dps.
- **Fury | Two-Handed (Swing-Timed Slam)** — `fury-twohand-swing-slam`; dps.
- **Fury | Two-Handed (No Slam)** — `fury-twohand-no-slam`; dps.
- **Fury | Lawnmower (Sweeping Strikes)** — `fury-lawnmower`; dps.
- **Fury | Dual Wield (Tank Threat)** — `fury-dual-tank`; tank.
- **Protection | Shield** — `protection-shield`; tank; preserved legacy ID.
- **Protection | Shield (AoE Threat)** — `protection-shield-aoe`; tank.

### Rogue

- **Assassination | Noxious Assault (Rupture)** — `assassination-noxious-rupture`; dps; preserved legacy ID.
- **Assassination | Noxious Assault (No Rupture)** — `assassination-noxious`; dps; preserved legacy ID.
- **Assassination | Noxious Assault Expose Armour (Rupture)** — `assassination-noxious-expose-rupture`; dps; preserved legacy ID.
- **Assassination | Noxious Assault Expose Armour (No Rupture)** — `assassination-noxious-expose`; dps; preserved legacy ID.
- **Assassination | Noxious Assault (Cold Blood)** — `assassination-noxious-cold-blood`; dps.
- **Assassination | Noxious Assault Expose Armour (Cold Blood)** — `assassination-noxious-expose-cold-blood`; dps.
- **Combat | 1Cp Eviscerate Spam** — `combat-spam`; dps; preserved legacy ID.
- **Combat | Sinister Strike AR (Rupture)** — `combat-sinister-ar-rupture`; dps; preserved legacy ID.
- **Combat | Sinister Strike AR (No Rupture)** — `combat-sinister-ar`; dps; preserved legacy ID.
- **Combat | Sinister Strike Envenom (Rupture)** — `combat-sinister-envenom-rupture`; dps; preserved legacy ID.
- **Combat | Sinister Strike Envenom (No Rupture)** — `combat-sinister-envenom`; dps; preserved legacy ID.
- **Combat | Backstab AR (Rupture)** — `combat-backstab-ar-rupture`; dps; preserved legacy ID.
- **Combat | Backstab AR (No Rupture)** — `combat-backstab-ar`; dps; preserved legacy ID.
- **Combat | Backstab Envenom (Rupture)** — `combat-backstab-envenom-rupture`; dps; preserved legacy ID.
- **Combat | Backstab Envenom (No Rupture)** — `combat-backstab-envenom`; dps; preserved legacy ID.
- **Combat | Sinister Strike Envenom (Expose Armour)** — `combat-sinister-envenom-expose`; dps.
- **Combat | Sinister Strike AR (Expose Armour)** — `combat-sinister-ar-expose`; dps.
- **Combat | Backstab Envenom (Expose Armour)** — `combat-backstab-envenom-expose`; dps.
- **Combat | Backstab AR (Expose Armour)** — `combat-backstab-ar-expose`; dps.
- **Combat | Blade Flurry (Cleave)** — `combat-blade-flurry-cleave`; dps.
- **Subtlety | Hemorrhage (Expose Armour)** — `subtlety-hemorrhage-expose`; dps; preserved legacy ID.
- **Subtlety | Hemorrhage (No Expose Armour)** — `subtlety-hemorrhage`; dps; preserved legacy ID.
- **Subtlety | Hemorrhage (Mark for Death)** — `subtlety-hemorrhage-mark-death`; dps.
- **Subtlety | Hemorrhage (Shadow of Death Burst)** — `subtlety-shadow-death-burst`; dps.

### Paladin

- **Retribution | Default** — `retribution`; dps; preserved legacy ID.
- **Retribution | Seal of Righteousness** — `retribution-righteousness`; dps.
- **Retribution | Seal of Command** — `retribution-command`; dps.
- **Retribution | Zeal / Holy Might** — `retribution-zeal-holy-might`; dps.
- **Retribution | Judgement Weave** — `retribution-judgement-weave`; dps.
- **Retribution | Consecration (AoE)** — `retribution-consecration-aoe`; dps.
- **Holy | Holy Shock** — `holy-shock`; healing; preserved legacy ID.
- **Holy | Holy Strike / Holy Shock (Healing)** — `holy-strike-shock-healing`; healing.
- **Holy | Flash of Light / Holy Light (Healing)** — `holy-light-healing`; healing.
- **Protection | Default** — `protection`; tank; preserved legacy ID.
- **Protection | Holy Shield (Single Target)** — `protection-holy-shield-st`; tank.
- **Protection | Consecration (AoE)** — `protection-consecration-aoe`; tank.

### Hunter

- **Beast Mastery | Default** — `beast-mastery`; dps; preserved legacy ID.
- **Beast Mastery | Kill Command** — `beast-mastery-kill-command`; dps.
- **Beast Mastery | Steady Shot Weave** — `beast-mastery-steady-weave`; dps.
- **Beast Mastery | Multi-Shot Cleave** — `beast-mastery-multi-cleave`; dps.
- **Marksmanship | Default** — `marksmanship`; dps; preserved legacy ID.
- **Marksmanship | Aimed Shot / Steady Shot** — `marksmanship-aimed-steady`; dps.
- **Marksmanship | Steady Shot Weave (No Aimed)** — `marksmanship-steady-no-aimed`; dps.
- **Marksmanship | Lock and Load** — `marksmanship-lock-load`; dps.
- **Marksmanship | Multi-Shot Cleave** — `marksmanship-multi-cleave`; dps.
- **Survival | Default** — `survival`; dps; preserved legacy ID.
- **Survival | Melee (Raptor Strike)** — `survival-melee-raptor`; dps.
- **Survival | Melee (Trap Weave)** — `survival-melee-trap-weave`; dps.
- **Survival | Melee (Carve AoE)** — `survival-melee-carve-aoe`; dps.

### Priest

- **Discipline | Default** — `discipline`; dps; preserved legacy ID.
- **Discipline | Holy Fire / Smite** — `discipline-holy-fire-smite`; dps.
- **Discipline | Holy Fire / Smite (T3.5)** — `discipline-smite-t35`; dps.
- **Holy | Default** — `holy`; dps; preserved legacy ID.
- **Holy | Flash Heal (Tank Healing)** — `holy-flash-tank-healing`; healing.
- **Holy | Greater Heal (Raid Healing)** — `holy-greater-raid-healing`; healing.
- **Holy | Holy Nova (AoE Healing)** — `holy-nova-aoe-healing`; healing.
- **Shadow | Default** — `shadow`; dps; preserved legacy ID.
- **Shadow | Pain / Mind Blast / Mind Flay** — `shadow-pain-blast-flay`; dps.
- **Shadow | Multi-DoT** — `shadow-multi-dot`; dps.
- **Shadow | Fade Snapshot (T3.5)** — `shadow-fade-snapshot-t35`; dps.

### Shaman

- **Elemental | Default** — `elemental`; dps; preserved legacy ID.
- **Elemental | Flame Shock / Molten Blast** — `elemental-flame-molten`; dps.
- **Elemental | Chain Lightning (Clearcasting)** — `elemental-clearcasting-cl`; dps.
- **Elemental | Earthquake (AoE)** — `elemental-earthquake-aoe`; dps.
- **Enhancement | Default** — `enhancement`; dps; preserved legacy ID.
- **Enhancement | Two-Handed Windfury** — `enhancement-twohand-windfury`; dps.
- **Enhancement | Spellhance (Flametongue)** — `enhancement-spellhance`; dps.
- **Enhancement | Fire Totem Weave** — `enhancement-fire-totem-weave`; dps.
- **Enhancement | Fire Nova Cleave** — `enhancement-fire-nova-cleave`; dps.
- **Enhancement | Tank (Single Target)** — `enhancement-tank-st`; tank.
- **Enhancement | Tank (AoE)** — `enhancement-tank-aoe`; tank.
- **Restoration | Damage** — `restoration-damage`; dps; preserved legacy ID.
- **Restoration | Chain Heal** — `restoration-chain-heal`; healing.
- **Restoration | Healing Wave (Tank Healing)** — `restoration-wave-tank`; healing.

### Mage

- **Arcane | Default** — `arcane`; dps; preserved legacy ID.
- **Arcane | Rupture / Missiles** — `arcane-rupture-missiles`; dps.
- **Arcane | Arcane Power Burn** — `arcane-power-burn`; dps.
- **Arcane | Arcane Explosion (AoE)** — `arcane-explosion-aoe`; dps.
- **Fire | Default** — `fire`; dps; preserved legacy ID.
- **Fire | Scorch / Fireball** — `fire-scorch-fireball`; dps.
- **Fire | Hot Streak / Pyroblast** — `fire-hot-streak-pyro`; dps.
- **Fire | Flamestrike (AoE)** — `fire-flamestrike-aoe`; dps.
- **Frost | Default** — `frost`; dps; preserved legacy ID.
- **Frost | Frostbolt / Flash Freeze** — `frostbolt-flash-freeze`; dps.
- **Frost | Icicles (Boss Rotation)** — `frost-icicles-boss`; dps.
- **Frost | Blizzard (AoE)** — `frost-blizzard-aoe`; dps.
- **Frost | Cone of Cold (AoE)** — `frost-cone-aoe`; dps.

### Warlock

- **Affliction | Default** — `affliction`; dps; preserved legacy ID.
- **Affliction | Corruption / Drain Soul** — `affliction-drain-soul`; dps.
- **Affliction | Dark Harvest** — `affliction-dark-harvest`; dps.
- **Affliction | Multi-DoT** — `affliction-multi-dot`; dps.
- **Demonology | Default** — `demonology`; dps; preserved legacy ID.
- **Demonology | Pet / Shadow Bolt** — `demonology-pet-shadow`; dps.
- **Demonology | Felstorm (AoE)** — `demonology-felstorm-aoe`; dps.
- **Destruction | Default** — `destruction`; dps; preserved legacy ID.
- **Destruction | Shadow Bolt** — `destruction-shadow-bolt`; dps.
- **Destruction | Fire (Immolate / Conflagrate)** — `destruction-fire-conflagrate`; dps.
- **Destruction | Fire (Searing Pain)** — `destruction-fire-searing`; dps.
- **Destruction | Hellfire (AoE)** — `destruction-hellfire-aoe`; dps.

### Druid

- **Balance | Default** — `balance`; dps; preserved legacy ID.
- **Balance | Eclipse (Starfire / Wrath)** — `balance-eclipse`; dps.
- **Balance | Starfire Focus** — `balance-starfire-focus`; dps.
- **Balance | Wrath Focus** — `balance-wrath-focus`; dps.
- **Balance | Hurricane (AoE)** — `balance-hurricane-aoe`; dps.
- **Feral | Cat** — `feral-cat`; dps; preserved legacy ID.
- **Feral | Bear** — `feral-bear`; tank; preserved legacy ID.
- **Feral | Cat (Rip / Bite)** — `feral-cat-rip-bite`; dps.
- **Feral | Cat (Powershift)** — `feral-cat-powershift`; dps.
- **Feral | Bear (Single-Target Threat)** — `feral-bear-st-threat`; tank.
- **Feral | Bear (Swipe AoE)** — `feral-bear-swipe-aoe`; tank.
- **Restoration | Regrowth / Rejuvenation (Healing)** — `restoration-regrowth-rejuvenation`; healing.
- **Restoration | Swiftmend / HoT (Healing)** — `restoration-swiftmend-hot`; healing.
