# OctoSim development

OctoSim's target is a complete nine-class, browser-only simulator at
`https://equadis.github.io/OctoBot/sim/`, using Combat Gum as its principal
interface, workflow, functionality and Rogue reference.

**Current state: source audit and shared engine primitives only. No playable
simulator, class engine, or OctoWoW DPS result is delivered by this branch.**
There is deliberately no `index.html` and no public navigation change until
there is a usable implementation to expose. Existing dashboards are untouched.

- [Specification](SPECIFICATION.md): full implementation brief and source priority.
- [Implementation](IMPLEMENTATION.md): observed interface and sequential milestones.
- [Sources](SOURCES.md): pinned sources, licences and actual coverage.
- [Rulesets](RULESETS.md): unresolved OctoWoW evidence and release blockers.
- [Validation](VALIDATION.md): reference methodology and checks actually run.

## Development checks

Node 20 or newer, no package installation required:

```sh
node --test tests/sim/*.test.mjs
node tools/sim/check-evidence.mjs
```

The evidence checker exits unsuccessfully while required Warrior mechanics
remain unresolved. This is a release gate, separate from passing unit tests.

`core/events.mjs` supplies a stable event queue using integer microseconds.
`core/random.mjs` supplies deterministic iteration streams independent of worker
partitioning. `core/contracts.d.ts` defines the common engine and worker
messages. These files contain no class damage formulas or assumed server rules.

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

Establish which Warrior changes are live: the official class page describes
changed abilities but calls the changes proposed; the database and available
engines disagree. A current authoritative ruleset revision, exact rank/talent
data and controlled combat observations are needed for the numerical validation
gate. See RULESETS.md for the specific discrepancy rather than guessing.
