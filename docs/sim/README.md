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

### Equipment catalogue and revised planner layout (11 November 2026)

The class chooser has no intro hero and uses the requested 3 × 3 class order. The Warrior planner has independent desktop columns: Character then Buffs & Debuffs on the left; Talents, Rotation, Settings, Results and Combat Log on the right. On narrow screens the sections stack. Notes and settings survive local saving, JSON export and share links; these controls do not imply that a combat engine exists.

`data/items/catalogue.json` retains recovered official item listings; `equipment.json` is the searchable equipment subset. `manifest.json` records source coverage and failed/capped partitions. **This is not a verified complete database export.** The public lists cap at approximately 500 rows. Category and item-level partitioning recovered all discovered equipment listing branches, but some non-equipment partitions remain incomplete. Listing records omit class/race masks, some inventory types, and full attributes.

The picker filters slot, Warrior weapon/armour proficiency and level. It checks official detail-page class/race masks, inventory type, additional requirements and unique-item duplication before equipping. Detail requests run in the browser and can fail because of CORS, source availability or source protection; a failure does not equip the item. Only two downloaded detail records are bundled initially. Unknown restrictions remain unknown. Unsupported profession/reputation requirements are rejected. Base stats, racial/talent effects, set bonuses and procs are not included in displayed equipment attributes. Existing imported references remain compatible and are marked red until verified; changing character level/race flags incompatible equipment.

Rebuild listing snapshots with:

```sh
python tools/sim/import-items.py --menu-html /path/to/the-linked-locale_enus.js
# Recover partial cached downloads without further network requests:
python tools/sim/import-items.py --menu-html /path/to/the-linked-locale_enus.js --cached-only
# Extract facts from previously downloaded individual item pages:
python tools/sim/import-item-details.py 12345:/path/to/item-12345.html
```

The source menu is the script actually linked by the database, not an assumed API. The importer parses data literals without executing source JavaScript, caches source responses outside tracked files, partitions capped lists, and retains successful downloads after a later failure. A complete official item-data export would remove the remaining list-limit and per-item metadata limitations.


### Buff lists, priorities and tooltips (11 November 2026)

Buffs are grouped checkbox options based on the Combat Gum text supplied by the user, with per-group selection controls and collapsed SP consumables. The listed effects are reference display values; they have not been validated as OctoWoW calculations. Class-specific options such as Thistle Tea are disabled for Warrior. Selection, key-press timing, rotation presets and editable priority conditions round-trip through saved builds and share links. Four Warrior starter presets and a custom priority editor replace the rotation notes field. Named custom rotations are saved in browser storage. Existing free-text planning notes remain in imported build data for compatibility.

All 54 official Warrior talents now have rank-specific plain-text effect descriptions extracted by the existing data-only importer. The inline selected-talent panel has been removed; talent and equipment information appears on hover or keyboard focus. Arrow Up/Down and +/− adjust the focused talent. Item tooltips use retrieved source data where available and show a concise fallback when details cannot be loaded. Retrieved Equip/Use/Chance-on-hit text is displayed without executing or inserting source HTML. Headings collapse their panels. No new combat calculations or generated DPS results are implied by these UI controls.

### Complete settings controls (11 November 2026)

One red **Clear points** control under **Points left** clears all three talent trees. Per-tree clear buttons have been removed.

Settings now include duration variation, iterations, editable target level/armour and all five spell resistances, 41 named boss presets, and Expert/Heroic Training Dummy buttons. The parameter snapshot in `core/targets.mjs` records the public Combat Gum reference: bosses replace level, armour and all five resistances; Expert is level 60 / 3,000 armour and Heroic is level 63 / 4,211 armour, both with zero resistances. A selected dummy is highlighted; manual target edits switch to Custom. The special +50 energy/sec encounter parameter is retained in build data for the class engines to use when implemented. These remain reference configuration values, not independent verification of server encounter mechanics. All settings round-trip through browser saves, JSON export and share links. Older builds receive defaults for newly added fields.
