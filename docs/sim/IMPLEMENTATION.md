# OctoSim implementation audit — 11 November 2026

## Product standard and source priority

Combat Gum is the primary reference for UX, relevant functionality, simulation
workflow, result presentation and Rogue behaviour. Dedicated class simulators
come second, WoWSims Turtle third, Python implementations fourth, and WoWSims
Classic last. This ranking never overrides verified OctoWoW mechanics.

Do not replace this goal with nine embedded simulators, a generic calculator,
or a reduced-feature interface. No proprietary code or artwork has been copied.

## Existing repository

Initial checkout: `498b795` on `main`. The published site is static `docs/`.
`docs/index.html` is Population; `docs/status.html` is Server Status. Both have
inline dark styling and a `.page-nav` with relative links. Population collection,
Cloudflare D1, GitHub scheduled collectors and Discord systems are separate
subsystems. There was no simulator or frontend package to extend.

Integration eventually adds a third `DPS Simulator` link in both navigation
bars and the simulator's header. Implementation here does not alter either
page, monitoring state or deployment.

## Combat Gum live UI audit

Observed directly at `https://www.combatgum.app/rogue`, Alpha v3.01.
These are public behaviours, not an inspection of proprietary implementation.

| Area | Observed behaviour | OctoSim requirement |
| --- | --- | --- |
| Frame | Dark navy background, slate cards, gold headings, compact controls | Original CSS matching the hierarchy and density; preserve OctoBot navigation |
| Layout | Two principal columns: Character and Buffs & Debuffs | Reproduce panel arrangement and spacing before responsive adaptations |
| Side controls | Left fixed build controls; right fixed section controls and green Run Simulation button | Keep configuration and execution within easy reach |
| Build controls | Share Build, Save Build, Load Build, Item Config, Reset Config | Complete equivalents with versioned state and import/export integrity |
| Custom stats | Expandable rows, Add Stat; text explains which stats affect DPS | Clearly supported effects, class-aware validation |
| Equipment | Six left slots, eight right slots, centre stat list; three weapons below | Slot selection, enchants, effects and restrictions in a single shared component |
| Statistics | Base, melee, melee versus target, defence; expandable spell section | Derived values from the actual selected adapter and ruleset |
| Item chooser | Search input, count, sortable list, direction toggle, enchant selector, Select, Clear Slot | Search, sort, compare, confirm, clear; add verified phase/availability filters |
| Item details | Quality colouring, stat summaries, hover details, Octo DB links | Verified entity links; provenance and availability maintained separately |
| Buffs | Named groups, checkboxes, effects, Select All/Clear All | Class-aware groups and verified stacking/exclusion rules |
| Talents | Three trees, ranks, tree totals, remaining points, per-tree Clear points | Actual target-server ranks, prerequisites, level and point validation |
| Rotation | Preset dropdown, editable name, Save, Add ability; priority evaluated top to bottom | Native class abilities and editable conditions; round-trip configuration |
| Timing | Key press interval and optional variability | Expose timing semantics used by the engine |
| Settings | Fight duration, optional variation, iterations, target level/armour, school resistances, target presets | Defaults required by brief: 180s, 1,000 iterations, player 60, target 63; documented armour |
| Execution | Run changes to Cancel; running status appears | Worker execution, visible progress, cancel, stale-job protection |
| Results | Current-result selector; mean, median, standard deviation and range | Full comparison and distribution workflow with uncertainty reporting |
| Breakdown | Source, damage share, DPS, attacks, glancing/hit/crit counts and damage ranges; avoided attacks split by outcome | Outcome counters and amounts retained by the common result schema |
| Resources | Energy per second by source and total | Per-class gained, spent and wasted resources |
| Log | Dedicated Combat Log section below results | Selected iteration, structured events and bounded retention |

An empty-gear/empty-rotation run was executed to inspect the Results surface;
it returned zero. This is **not** a Rogue accuracy or performance benchmark.
Item-chooser interaction was inspected. Build persistence, an equipped reference
rotation, nonzero combat logs, mobile layout and comparison behaviour still need
hands-on inspection; they are not claimed verified.

Ichabaddie's Armory was opened at `https://ichasarmory.quest/`. It exposes class
and race controls, Octo realm selection, gear/planner controls and a Shaman DPS
panel that requires Shaman selection. No numerical Shaman reference run or
source-licence finding is claimed from that inspection.

## Class sequence and status

| Order | Class | OctoSim status | Work remaining |
| --- | --- | --- | --- |
| 1 | Warrior | In development: audit only | Resolve ruleset evidence; integrate engine; complete UI; numerical validation |
| 2 | Rogue | Not started | Begins only after Warrior acceptance gate |
| 3 | Shaman | Not started | Same common UI and validation standard |
| 4 | Mage | Not started | Include Python validation references where licensed |
| 5 | Druid | Not started | Both Balance and Feral required |
| 6 | Warlock | Not started | Verify Python version coverage before comparison |
| 7 | Hunter | Not started | Shot timing and pet contributions required |
| 8 | Paladin | Not started | Verify seals and twisting for the live ruleset |
| 9 | Priest | Not started | Both Shadow and relevant Holy/Discipline DPS |

Auditing later sources does not constitute implementing those classes.
**No class is implemented or validated. No completion box is checked.**

## Current delivered foundation

- Stable, tested chronological event queue, with priority and insertion ordering.
- Seeded RNG and independent per-iteration seeds, tested across 1,000 streams.
- Shared TypeScript contracts for builds, adapters, result counters and worker messages.
- Machine-readable unresolved Warrior evidence and a failing release gate.

## Unfinished acceptance checklist

- [ ] Shared Combat Gum-inspired frontend and responsive QA
- [ ] Equipment/talents/buffs/rotation controls with verified Octo data
- [ ] Browser worker execution, progress/cancel and performance measurement
- [ ] Engine integration and actual 1,000-iteration class simulations
- [ ] Numerical references and controlled combat evidence
- [ ] Build comparison, stat weights, persistence and sharing
- [ ] All nine classes completed in order
- [ ] Navigation integration and GitHub Pages path tests
- [ ] Final licences/attribution audit and production deployment

Do not deploy this audit branch as a finished simulator.
