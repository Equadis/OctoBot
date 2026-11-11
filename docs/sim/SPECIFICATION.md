# OctoSim — primary development reference

Combat Gum (https://www.combatgum.app/rogue) is the most up-to-date identified simulator and the primary reference. Recreate and extend its experience for all nine original classes using original implementation code, integrated into OctoBot. Do not independently redesign the experience or assemble unrelated simulator frontends.

Use Combat Gum as the benchmark for interface, equipment management, configuration, controls, navigation, simulation workflow, gear comparison, iteration controls, detailed statistics, results and build sharing. Its Rogue behaviour is the leading reference, subject to independent calculation and game-version checks. Every class must ultimately meet this same usability and functionality standard.

## Binding source priority

1. Combat Gum: primary interface, functionality and Rogue reference.
2. Dedicated Turtle class simulators, including WarriorSim and Ichabaddie's Armory.
3. WoWSims Turtle: investigate and complete shared-engine implementations where appropriate.
4. Python simulation projects: additional engines and numerical validation, particularly Mage, Balance Druid and Warlock; port compatible mechanics to browser JavaScript or WASM.
5. WoWSims Classic: verified Vanilla fallback where newer compatible implementations are unavailable.

Prioritise accuracy, completeness and current functionality over convenience. This is reference priority, not automatic authority over server mechanics: verify the intended OctoWoW ruleset. Do not assume Combat Gum, Turtle and Octo implement every mechanic identically.

Investigate Combat Gum's live interface first, then establish the shared UI and modular architecture. Implement classes sequentially, starting Warrior then Rogue, using suitable existing engines where legally and technically appropriate. Independently implement features whose sources are unavailable or proprietary; do not copy unlicensed code or assets. Every calculation must run in the browser. The final production URL is https://equadis.github.io/OctoBot/sim/.

The detailed brief below remains binding. The earlier per-class phrase “Primary source” selects that class's engine candidate within this overall reference hierarchy; it does not demote Combat Gum as the product-wide benchmark.

---

# Claude Code — OctoSim: Unified Nine-Class DPS Simulator

## 1. Project Overview

Build **OctoSim**, a complete, browser-based World of Warcraft Classic DPS simulation platform integrated into the existing OctoBot website.

**Existing website:** https://equadis.github.io/OctoBot/

**GitHub repository:** https://github.com/Equadis/OctoBot

**New simulator location:** https://equadis.github.io/OctoBot/sim/

**Primary UI reference:** https://www.combatgum.app/rogue

The objective is to create a unified simulator for all nine original WoW classes, using Combat Gum's interface, visual layout, workflows and overall user experience as the design reference.

The simulation must execute entirely in the user's browser. No simulation backend, paid APIs, desktop applications, server-side Python or persistent simulation servers should be required.

Build and validate the classes **one by one**, reusing existing open-source simulation engines wherever legally permitted and technically appropriate.

The final application must feel like one cohesive product, not nine separate simulators embedded into a website.

---

## 2. Non-Negotiable Requirements

1. Support all nine Classic WoW classes.
2. Run all simulations entirely client-side.
3. Integrate directly into OctoBot's existing website.
4. Recreate Combat Gum's interface and interaction patterns as closely as practical, using independently written UI code and appropriately licensed assets.
5. Provide a consistent interface for every class.
6. Support comprehensive gear, talent, buff, consumable and rotation configuration.
7. Use actual combat simulation, not arbitrary DPS formulas or fabricated results.
8. Support thousands of simulation iterations.
9. Make builds saveable, importable, exportable and shareable.
10. Ensure GitHub Pages compatibility.
11. Preserve all existing OctoBot functionality.
12. Complete and validate each class before beginning the next.

**Do not use iframes to embed existing simulators.** The engines must be integrated into our own application.

**Do not build a Python server.** Python-based simulators must be ported or compiled into a browser-compatible runtime.

Do not describe a class as finished until its calculations and primary features have been verified.

---

## 3. Website Integration

Inspect the existing OctoBot repository before making changes.

The website currently includes:

- Population dashboard
- Server Status dashboard

Add a third navigation tab:

**Population | Server Status | DPS Simulator**

The new simulator must be available at:

`/OctoBot/sim/`

Requirements:

- Use the existing OctoBot branding, header and navigation.
- Maintain the existing dark visual identity for navigation.
- Use Combat Gum as the principal reference for the simulator itself.
- Preserve working links and navigation across all pages.
- Support the GitHub Pages `/OctoBot/` base path correctly.
- Avoid introducing breaking changes to existing population monitoring, server status, Cloudflare Workers, Discord commands or automation systems.
- Keep simulation assets and logic isolated from the existing dashboards.

A sensible structure would be:

```text
docs/
├── index.html
├── status.html
└── sim/
    ├── index.html
    ├── assets/
    └── ...
```

Use TypeScript and a suitable lightweight build system if beneficial. The final production output must be static and deployable by GitHub Pages.

---

## 4. Combat Gum UI Recreation

Reference:

https://www.combatgum.app/rogue

Inspect the live application and document its interface before implementation.

Use its layout, spacing, visual hierarchy, equipment interface, editing workflows, configuration panels and results presentation as the primary design references.

Recreate the experience using original implementation code. Do not copy proprietary source code, artwork, logos or other unlicensed assets.

### Main Layout

Develop a consistent interface containing:

**Character configuration**

- Class selection
- Race selection
- Character level
- Talent specialisation
- Character statistics
- Gear slots arranged around a character equipment panel
- Weapon slots
- Item enchantments and temporary enhancements
- Active set bonuses

**Configuration sections**

- Gear
- Talents
- Buffs
- Consumables
- Rotation
- Simulation Settings
- Results

**Results**

- Average DPS
- Total damage
- Median DPS
- Minimum and maximum DPS
- DPS distribution
- Damage by ability
- Critical hit percentage
- Miss, dodge and resistance rates
- Resource usage
- Proc frequencies and uptime
- Cooldown usage
- Detailed combat timeline
- Individual simulation combat log

The actual layout should follow Combat Gum where possible rather than inventing an unrelated design.

### Gear Selection

Clicking an equipment slot should open a searchable item-selection interface.

Include:

- Item icons
- Item names with quality colouring
- Stats
- Weapon damage and speed
- Required level
- Item restrictions
- Equip effects
- Proc effects
- Set bonuses
- Comparison against currently equipped gear

Allow filters for item slot, quality, minimum/maximum level, phase and availability.

### Build Comparison

Allow users to compare multiple configurations without manually rebuilding their character.

For example:

- Build A versus Build B
- Different weapons
- Different trinkets
- Different talent distributions
- Different rotations
- Different buffs
- Different encounter durations

Results must use comparable simulation parameters and, where appropriate, matching random seeds to reduce comparison noise.

Show both absolute DPS and percentage differences.

### Responsive Interface

Support desktop, tablet and mobile.

Prioritise the desktop layout, but ensure equipment selection, settings, controls and results remain usable on smaller screens.

---

## 5. Simulation Architecture

Create a modular simulation platform with one shared frontend and independent class-specific combat engines.

Conceptual architecture:

```text
OctoSim
│
├── Shared Interface
│   ├── Character
│   ├── Equipment
│   ├── Talents
│   ├── Buffs
│   ├── Consumables
│   ├── Rotation
│   ├── Encounter
│   └── Results
│
├── Simulation Core
│   ├── Combat Timeline
│   ├── Event Queue
│   ├── RNG
│   ├── Damage Calculation
│   ├── Attack Tables
│   ├── Resource Management
│   ├── Procs
│   ├── Cooldowns
│   ├── Auras and Debuffs
│   └── Statistics
│
├── Class Engines
│   ├── Warrior
│   ├── Rogue
│   ├── Shaman
│   ├── Mage
│   ├── Druid
│   ├── Warlock
│   ├── Hunter
│   ├── Paladin
│   └── Priest
│
└── Game Data
    ├── Items
    ├── Spells
    ├── Talents
    ├── Races
    ├── Buffs
    ├── Consumables
    ├── Set Bonuses
    └── Encounter Data
```

All nine engines must implement a common simulation interface so the frontend does not require separate implementations for each class.

Class-specific controls should be driven by configuration and capability metadata.

### Combat Mechanics

Implement and validate the mechanics appropriate to each class:

- Melee and spell hit calculations
- Critical strikes and critical damage
- Glancing blows
- Weapon skill
- Armor and mitigation
- Spell resistances
- Auto-attacks
- Swing timers
- Global cooldowns
- Cast times and channelled spells
- Rage, energy and mana
- Mana regeneration and the five-second rule
- Damage-over-time effects
- Talent modifiers
- Procs and internal cooldowns
- Buff and debuff stacking
- Cooldown management
- Set bonuses
- Temporary effects
- Extra attacks
- Pets and guardians
- Threat where relevant to rotation constraints
- Class-specific mechanics

Do not assume every mechanic works identically across all classes.

Avoid simplified formulas when an event-driven simulation is necessary for accurate results.

### Simulation Settings

Provide:

- Encounter duration
- Duration variation
- Number of iterations
- Player level
- Target level
- Target armor
- Target resistances
- Number of targets
- Target type
- Latency/reaction-time settings
- Starting resources
- Cooldown behaviour
- External buffs and debuffs

Defaults:

- 1,000 iterations
- 180-second encounter
- Level 60 player
- Level 63 raid-boss target

These must all be configurable, and default encounter statistics must be documented rather than treated as universal.

Support lower-level characters where the underlying class implementation has been validated.

### Performance

Use Web Workers to execute simulations off the main UI thread.

Requirements:

- No UI freezing during large simulations.
- Progress indicator.
- Cancel simulation.
- Support deterministic RNG seeds.
- Efficient batched iterations.
- Proper cleanup after cancellation.
- Avoid excessive memory allocations.
- Lazy-load class engines.
- Lazy-load large item databases.
- Preserve responsive UI while calculations execute.

WebAssembly is permitted and encouraged where it offers genuine benefits.

### Python Compatibility

Existing Python simulation engines are explicitly in scope.

Investigate the most suitable approach for each:

1. Translate simulation logic into TypeScript/JavaScript.
2. Compile compatible engine code to WebAssembly where feasible.
3. Use an entirely client-side Python runtime such as Pyodide only when its performance and download-size trade-offs are justified.

Prefer JavaScript/TypeScript or WebAssembly for the production simulation engines.

Retain the original Python implementations as validation references when possible.

Do not silently substitute approximated calculations for Python mechanics that have not yet been ported.

---

## 6. Existing Simulation Sources

Investigate all the following projects.

These are references and potential implementation sources, not a guarantee that their code can all be reused.

Check licences, provenance, class completeness, patch compatibility and dependencies before integration.

### Warrior

Live simulator:
https://thrunk112.github.io/WarriorSim-TurtleWoW/turtle.html

Source:
https://github.com/Thrunk112/WarriorSim-TurtleWoW

Original project:
https://github.com/GuybrushGit/WarriorSim

### Rogue

Reference simulator:
https://www.combatgum.app/rogue

Additional open-source references:
https://github.com/isfir/wowsims-turtle

https://github.com/Slamrish/Sim-TurtleWoW

### Shaman

https://ichasarmory.quest/

Additional source:
https://github.com/isfir/wowsims-turtle

### Mage

https://isfir.github.io/wowsims-turtle/mage/

https://github.com/Timanaku/turtlewowsim

https://github.com/codeshard/twowsim

### Druid

https://github.com/Timanaku/turtlewowsim

https://github.com/codeshard/twowsim

https://github.com/isfir/wowsims-turtle

### Warlock

https://github.com/codeshard/twowsim

https://github.com/Timanaku/turtlewowsim

https://github.com/isfir/wowsims-turtle

### Hunter

https://github.com/Barwaat/huntersim2-twow

https://github.com/isfir/wowsims-turtle

### Paladin

https://github.com/isfir/wowsims-turtle

### Priest

https://github.com/isfir/wowsims-turtle

### Additional Vanilla Reference

https://wowsims.github.io/classic/

https://github.com/wowsims/classic

### Source Selection Rules

Before reusing any engine:

1. Determine whether it actually contains the required class implementation.
2. Confirm whether its implementation is complete or experimental.
3. Verify the licence and attribution requirements.
4. Identify dependencies and game-version assumptions.
5. Test the original engine with known configurations.
6. Determine the amount of adaptation required.
7. Document all known missing mechanics.
8. Preserve attribution where required.
9. Never assume that a repository with a class name implements that class.

Particularly important: the WoWSims Turtle repository contains code for many classes but only publicly identifies Mage as launched in Alpha. Other implementations must be independently tested and completed.

Do not copy private or unlicensed Combat Gum or Ichabaddie source code.

---

## 7. Game Version and Database

The target website is for the **OctoWoW community**.

Primary database:

https://octowow.st/db/

Use OctoWoW's database as the preferred source for item, spell, NPC and other game-entity references.

Investigate whether the database exposes a usable API or structured data exports.

Do not assume undocumented endpoints exist.

If necessary, create build-time import tools that produce static, browser-readable JSON datasets from legitimately accessible data.

Every named item displayed in the simulator should link to its corresponding verified OctoWoW database page where available.

### Ruleset Accuracy

Turtle WoW and OctoWoW must not automatically be treated as mechanically identical.

Use a configurable ruleset layer that separates simulation logic from server-specific data and mechanics.

The default must be **OctoWoW**, based on verified OctoWoW mechanics.

Determine whether each mechanic comes from:

- Original Vanilla 1.12.1
- Turtle WoW modifications
- OctoWoW modifications
- An explicitly documented approximation

Do not import Turtle WoW custom spells, talents or items into OctoWoW by default without verifying their applicability.

Maintain a ruleset compatibility matrix and implementation notes.

### Gear and Phase Availability

Support:

- Original Vanilla equipment
- Relevant OctoWoW equipment
- Custom items where confirmed
- Correct set bonuses
- Equipment restrictions
- Character-level requirements
- Phase restrictions
- Currently obtainable items
- Optional future-phase item inclusion

Do not expose unreleased AQ or Naxxramas items as currently available by default.

Availability should follow verified OctoWoW progression rather than hardcoded assumptions.

If source data cannot be verified, clearly identify the missing coverage rather than inventing it.

---

## 8. Sequential Class Implementation

**Build the classes in the exact order below.**

Complete, test and document each class before starting the next.

Each completed class must use the common OctoSim UI and simulation API.

### Phase 1 — Warrior

Primary source: WarriorSim Turtle WoW.

Implement:

- Arms
- Fury
- Protection damage configurations
- One-handed and two-handed weapons
- Dual wielding
- Rage generation and expenditure
- Heroic Strike queueing
- Bloodthirst
- Mortal Strike
- Execute
- Whirlwind
- Slam
- Stance-dependent abilities
- Enrage and Flurry
- Weapon specialisations
- Talent interactions
- Trinkets and weapon procs

Validate against the original WarriorSim for equivalent configurations.

### Phase 2 — Rogue

Primary reference: Combat Gum.

Implement:

- Assassination
- Combat
- Subtlety
- Energy regeneration
- Combo points
- Sinister Strike
- Backstab
- Eviscerate
- Slice and Dice
- Rupture
- Poisons
- Weapon specialisations
- Seal Fate
- Blade Flurry
- Adrenaline Rush
- Vanish and its relevant combat interactions
- Trinket effects
- Cooldown timing

Add configurable gear-swap and cooldown sequences where permitted by verified game mechanics.

Support advanced comparisons involving opener equipment and subsequent equipment changes, while respecting in-combat equipment restrictions.

### Phase 3 — Shaman

Primary reference: Ichabaddie's Armory.

Implement:

- Enhancement
- Elemental
- Relevant hybrid builds
- Weapon imbues
- Windfury interactions
- Totem effects
- Spell damage
- Spell critical strikes
- Mana usage and regeneration
- Lightning Bolt
- Chain Lightning
- Earth Shock
- Other rotation-relevant shocks
- Elemental Mastery
- Stormstrike
- Talent interactions

Verify that source mechanics belong to the intended ruleset.

### Phase 4 — Mage

Primary sources: WoWSims Turtle and Python simulators.

Implement:

- Arcane
- Fire
- Frost
- Hybrid builds
- Spell casting and mana regeneration
- Spell coefficients
- Ignite
- Scorch stacking
- Frostbolt
- Fireball
- Arcane Missiles
- Clearcasting
- Combustion
- Arcane Power
- Presence of Mind
- Relevant cooldowns and trinkets

Use the Python implementations to verify damage calculations and spell rotations.

### Phase 5 — Druid

Primary sources: Python simulator and WoWSims Turtle.

Implement:

- Balance
- Feral Cat DPS
- Relevant hybrid builds
- Shapeshifting
- Form-specific statistics
- Energy mechanics
- Combo points
- Feral attack power
- Claw
- Shred
- Rip
- Ferocious Bite
- Powershifting
- Wrath
- Starfire
- Moonfire
- Relevant damage-over-time effects
- Nature's Grace
- Talent interactions

Balance and Feral must both have working damage simulations.

### Phase 6 — Warlock

Primary sources: Python simulators and WoWSims Turtle.

Implement:

- Affliction
- Demonology
- Destruction
- SM/Ruin
- DS/Ruin
- Shadow Bolt
- Corruption
- Immolate
- Curse of Agony
- Relevant curses
- Damage-over-time management
- Life Tap
- Pet damage
- Pet sacrifice effects
- Improved Shadow Bolt
- Nightfall
- Shadow Mastery
- Relevant debuff interactions

Validate against the available Python implementations.

### Phase 7 — Hunter

Primary sources: HunterSim and WoWSims Turtle.

Implement:

- Beast Mastery
- Marksmanship
- Survival
- Auto Shot
- Aimed Shot
- Multi-Shot
- Arcane Shot
- Hunter weapon mechanics
- Ammunition damage
- Ranged attack speed
- Shot timing and clipping
- Pet damage
- Pet abilities
- Pet attack speed
- Pet talents
- Aspect effects
- Relevant melee-weaving configurations
- Talent interactions

Hunter DPS must include pet contributions where applicable.

### Phase 8 — Paladin

Primary source: WoWSims Turtle.

Implement:

- Retribution
- Relevant spell-damage and hybrid configurations
- Seal of Command
- Seal of Righteousness
- Judgements
- Seal twisting where supported by the intended ruleset
- Vengeance
- Consecration
- Exorcism where applicable
- Mana regeneration
- Weapon attack timing
- On-hit proc interactions
- Talent effects

Verify all seal and judgement behaviour against the target game ruleset.

### Phase 9 — Priest

Primary source: WoWSims Turtle.

Implement:

- Shadow
- Smite-based damage configurations
- Shadow Word: Pain
- Mind Blast
- Mind Flay
- Smite
- Holy Fire
- Shadowform
- Mana regeneration
- Spirit Tap where relevant
- Shadow Weaving
- Inner Focus
- Power Infusion
- Spell coefficients
- Damage-over-time effects
- Talent interactions

Support both Shadow and relevant Holy/Discipline damage builds.

---

## 9. Common Features Required for Every Class

Every class must have:

### Character

- Class and race selection
- Level configuration
- Base-stat calculation
- Equipment management
- Valid weapon restrictions
- Talent allocation
- Derived-stat display

### Combat

- Functional combat rotation
- Class-specific resource mechanics
- Attack or spell events
- Appropriate cooldowns
- Buff and debuff interactions
- Damage calculation
- Multiple combat iterations

### Results

- DPS summary
- Damage breakdown
- Distribution chart
- Ability statistics
- Resource statistics
- Combat log
- Comparison against another build

### Presets

- Example talent configurations
- Starter gear configurations
- Raid-buff presets
- Consumable presets
- Encounter presets
- Rotation presets

Presets should be representative configurations, not automatically asserted to be optimal.

---

## 10. Advanced Simulation Features

### Gear Comparison

Provide single-item comparisons and multi-item comparisons.

Support comparing alternative equipment combinations without changing the original saved build.

### Stat Weights

Calculate marginal DPS contributions for relevant stats.

Do not invent universal stat weights; derive them from simulations using a documented method.

### Rotation Configuration

Provide class-specific rotation controls inside a common interface.

Include:

- Ability priority
- Resource thresholds
- Buff maintenance
- Cooldown conditions
- Execute-phase behaviour
- Opener configuration
- Manual ability enable/disable controls

Use a priority-based or event-based rotation model rather than relying entirely on fixed spell sequences.

### Cooldown Planning

Support setting activation timing or conditions for cooldowns and equipment effects.

Where useful, represent cooldown plans on a combat timeline.

### Saving and Sharing

Users must be able to:

- Save multiple builds locally.
- Rename builds.
- Duplicate builds.
- Compare builds.
- Import exported builds.
- Export builds as JSON.
- Generate shareable URLs.
- Restore all relevant simulation settings from a shared link.

Use browser storage for saved local builds.

No login system should be required.

Ensure shared URLs do not expose private data.

---

## 11. Verification and Testing

Accuracy is critical.

A simulator producing plausible-looking numbers is not sufficient.

### Reference Validation

For each class:

1. Identify one or more trustworthy reference simulations.
2. Reproduce matching character configurations.
3. Match relevant talents, items, buffs, targets and rotations.
4. Run multiple iterations with reproducible settings.
5. Compare results.
6. Investigate significant discrepancies.
7. Document unsupported mechanics and remaining differences.

Do not use an arbitrary percentage tolerance to conceal known formula errors.

Record expected DPS, actual DPS, configuration, seed, iteration count and reference source.

### Automated Tests

Add tests for:

- Base stats
- Item stat calculation
- Talent effects
- Attack tables
- Resource regeneration
- Spell coefficients
- Critical strikes
- Damage mitigation
- Procs
- Buff stacking
- Cooldowns
- Rotations
- Encounter duration
- Multiple iterations
- Deterministic simulation seeds
- Import/export integrity

### Browser Tests

Verify:

- Every class can be selected.
- Equipment changes update character stats.
- Talents affect calculations.
- Buffs affect calculations.
- Rotations affect results.
- Simulation runs without errors.
- Simulation cancellation works.
- Progress reporting works.
- Results render correctly.
- Builds save and reload.
- Shared links restore builds.
- Browser navigation works.
- Mobile layout remains usable.

Test the GitHub Pages deployment path, not just the local development server.

---

## 12. Class Completion Requirements

Before moving from one class to the next, verify:

- [ ] The class loads correctly.
- [ ] Equipment selection is functional.
- [ ] Talent allocation is functional.
- [ ] Class-specific rotations are functional.
- [ ] Resource mechanics are implemented.
- [ ] The simulation runs in the browser.
- [ ] 1,000 iterations complete successfully.
- [ ] Results are based on actual combat events.
- [ ] Known procs and cooldowns behave correctly.
- [ ] Reference tests pass or discrepancies are documented.
- [ ] Builds save and reload.
- [ ] Shared URLs work.
- [ ] The UI follows the shared Combat Gum-inspired design.
- [ ] Existing OctoBot pages remain functional.
- [ ] Documentation is updated.

Do not count an incomplete or placeholder implementation as a completed class.

---

## 13. Development Workflow

### Stage A — Repository and Source Audit

Before coding:

1. Inspect the existing OctoBot repository.
2. Examine Combat Gum's public interface.
3. Evaluate the linked simulation projects.
4. Determine which engines can legally be reused.
5. Identify class-specific missing functionality.
6. Establish the game-ruleset compatibility plan.
7. Choose the browser-compatible technical architecture.
8. Create a class-by-class implementation checklist.

Save the findings in:

`docs/sim/IMPLEMENTATION.md`

Document assumptions and unresolved source limitations.

### Stage B — Shared Foundation

Build the shared OctoSim UI, data structures, simulation interface and Web Worker execution system.

Ensure all nine classes can use the same architecture.

### Stage C — Class Development

Implement the classes sequentially:

1. Warrior
2. Rogue
3. Shaman
4. Mage
5. Druid
6. Warlock
7. Hunter
8. Paladin
9. Priest

After each class:

- Run tests.
- Fix failures.
- Validate against a reference.
- Record the class's completion status.
- Commit the completed work.
- Continue to the next class.

Do not redesign the entire frontend for each class.

Do not stop after implementing the first class or merely creating the nine class-selection buttons.

### Stage D — Final Integration

After all nine classes:

- Perform cross-class regression testing.
- Review the UI for inconsistencies.
- Optimise performance.
- Verify all navigation.
- Verify production GitHub Pages paths.
- Test mobile responsiveness.
- Test persistent builds and shared links.
- Audit licences and attribution.
- Update project documentation.
- Run the complete test suite.

---

## 14. Documentation

Include:

- `README.md` — installation, architecture and usage
- `IMPLEMENTATION.md` — class progress and feature coverage
- `SOURCES.md` — upstream projects, licences and attribution
- `RULESETS.md` — Vanilla, Turtle and OctoWoW mechanics
- `VALIDATION.md` — numerical comparison methodology and results

Every class should have a clear status:

- Not started
- In development
- Implemented, unverified
- Validated

Distinguish functionality from numerical accuracy.

---

## 15. Final Acceptance Criteria

The project is complete only when:

1. OctoBot has a functioning **DPS Simulator** navigation tab.
2. The simulator runs from `/OctoBot/sim/`.
3. All nine classes have functional damage simulations.
4. All simulations execute inside the browser.
5. Python reference engines no longer require Python servers or local installations.
6. All classes use one consistent Combat Gum-inspired interface.
7. Gear, talents, buffs and rotations can be configured.
8. Simulations return actual calculated results.
9. Users can compare equipment and builds.
10. Users can save and share configurations.
11. Simulation accuracy has been tested and outstanding limitations documented.
12. Existing OctoBot functionality remains unaffected.
13. The completed application can be deployed through GitHub Pages.

**Start by auditing the existing repository and simulation sources, then implement the shared foundation and Warrior. Proceed through all nine classes in order, validating each before progressing.**

Prioritise working, accurate and maintainable implementations over visual placeholders. Preserve completed work through commits and documentation, and report any genuine blockers explicitly rather than falsely marking a class complete.

The final product should be a unified, high-quality Classic WoW simulation platform: **OctoSim**.
