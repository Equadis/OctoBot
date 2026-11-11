# OctoSim development

OctoSim's target is a complete nine-class, browser-only simulator at
`https://equadis.github.io/OctoBot/sim/`, using Combat Gum as its principal
interface, workflow, functionality and Rogue reference.

**Current state: a public Warrior build planner, with talent allocation, item
references, local saves, JSON import/export and shareable builds. Combat
simulation and derived item statistics are not implemented.**

Open the DPS Sim / Gear Planner navigation tab or `/OctoBot/sim/`. The other
dashboard pages have only gained the new navigation link. No monitoring or
Discord behaviour changes.

The entry page is a nine-class selection screen. Open Warrior at
`/OctoBot/sim/?class=warrior`; other class cards show their planned status.
Existing shared builds using `#build=...` still open the Warrior planner.
The planner follows Combat Gum's two-column equipment/configuration layout,
fixed side controls and icon-based talent grid. Game-icon sources and attribution
are recorded in SOURCES.md. Left-click adds a talent point; right-click removes
one. The selected-talent controls provide the same edits for keyboard users.

- [Specification](SPECIFICATION.md): full implementation brief and source priority.
- [Implementation](IMPLEMENTATION.md): observed interface and sequential milestones.
- [Sources](SOURCES.md): pinned sources, licences and actual coverage.
- [Rulesets](RULESETS.md): unresolved OctoWoW evidence and release blockers.
- [Validation](VALIDATION.md): reference methodology and checks actually run.

## Development checks

Node 20 or newer, no package installation required:

```sh
node --test tests/sim/*.test.mjs
python -m unittest discover -s tests/sim -p 'test_*.py'
node tools/sim/check-evidence.mjs
```

The evidence checker exits unsuccessfully while required Warrior mechanics
remain unresolved. This is a release gate, separate from passing unit tests.

`core/events.mjs` supplies a stable event queue using integer microseconds.
`core/random.mjs` supplies deterministic iteration streams independent of worker
partitioning. `core/contracts.d.ts` defines the common engine and worker
messages. These files contain no class damage formulas or assumed server rules.

`core/talents.mjs` validates allocations against the official calculator's
published metadata: ranks, tier requirements, prerequisites and level budgets.
The Warrior snapshot contains 54 talents with tree totals 49/55/53. This does
not implement the talents' combat effects.

## Official talent data

Use `https://octowow.st/talents/` as the primary source for published talent
definitions. `data/talents/warrior.json` contains identifiers, positions, rank
limits, prerequisites and numeric rank parameters, with source URL and HTML hash.
It copies no calculator UI code, artwork or tooltip prose. Parameter vectors are
unlabelled source facts; they must be mapped to effects explicitly, not interpreted
automatically as damage modifiers.

Refresh with `python tools/sim/import-talents.py --class warrior`, or parse an
already retrieved official page offline:

```sh
python tools/sim/import-talents.py --class warrior --html /path/to/warrior.html --source-url https://octowow.st/talents/warrior/
```

The importer fails on missing records, incomplete trees or invalid dependencies.
Only Warrior has been imported. Other classes' source collection can use the
same parser without beginning their simulation implementation.

## Intended architecture

Use independently written, Combat Gum-inspired UI components, one shared build
schema, and lazily loaded class adapters executing inside Web Workers. Reuse a
complete upstream engine where its licence and mechanics permit; do not require
an upstream engine to be rewritten to use the queue here. A Go/WASM adapter can
retain its own event scheduler. Keep server rules and evidence outside engines.

Save locally and share the full versioned build, including engine revision,
ruleset revision, seed, encounter and rotation. Reject unsupported options rather
than accepting them without an effect. Cancel by terminating workers, release
listeners, and disregard results with an obsolete job ID. Capture a bounded log
for one selected iteration, not every event across thousands of iterations.

GitHub Pages serves `docs/` directly. Use relative module and worker URLs under
`docs/sim/`; do not change the root website, workers, Discord bot or collectors.
If a build tool is introduced, its output must preserve `/OctoBot/sim/` paths.

## Next required evidence

Talent names, ranks and prerequisites are now established from the official
calculator. It supports the revised class-page presentation, including the
rank-1 attack-power coefficient. Higher ability ranks, hidden mechanics and
controlled combat observations remain necessary for numerical validation.
These remaining checks do not prevent independent UI or engine development.
