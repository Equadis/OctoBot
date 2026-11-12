# OctoSim development

OctoSim's target is a complete nine-class, browser-only simulator at
`https://equadis.github.io/OctoBot/sim/`, using Combat Gum as its principal
interface, workflow, functionality and Rogue reference.

**Current state: nine class build planners, with official OctoWoW talent trees,
class-aware equipment filters, editable class rotations/resources and class options (poisons, forms, pets, aspects, imbues, stances and starting resources), profession
requirements, local saves, JSON import/export and share links. Combat simulation
and complete derived combat statistics are still in development.**

All nine cards open the same planner at `/OctoBot/sim/?class=CLASS_ID`.
Legacy shared builds without a class route still open Warrior. The page retains
the unified site header, navigation and site-wide viewer counter.

Named builds use IndexedDB with **100 slots per class**, separate drafts and
rotation collections. A name updates only that class's existing save. Load lists
support search, delete, undo and whole-class JSON backup/restore. Batch imports are transactional and reject over-capacity or invalid backups without changing existing saves. The original localStorage collection is migrated
once per class and retained unchanged as a recovery backup. Nothing is synced to
an account; exports and share links are the portable backup mechanisms. Actual
browser quota remains device/browser dependent; quota failures preserve existing
records and offer export rather than removing saves.

All 476 published talent definitions are stored in `data/talents/`, with rank
text, IDs, coordinates, prerequisites and official icon URLs. Source HTML was
read from the ordinary official calculator in the browser and parsed with the
same data-only importer. Imported metadata does not validate combat effects.

Equipment covers all published weapons, armour, shirts, tabards, relics,
ammunition and quivers. `catalogue-manifest.json` records equipment listing coverage independently of the
long-running detail import. The older `manifest.json` remains for compatibility. `detail-coverage.json` records
missing IDs and source errors. The non-equipment catalogue retains three capped
miscellaneous/quest partitions; those do not hide equipable gear.

`tools/sim/sync-equipment.py` resumes official detail ingestion and checkpoints
class/race masks, inventory slots, level, profession requirements and full
item tooltips. `.github/workflows/sim-equipment.yml` runs the large import outside
the browser; all planning and eventual simulation calculations remain local.
Unknown source requirements remain blocked rather than silently assumed met.
Vanilla weapon proficiency baselines still require a complete OctoWoW audit;
class masks and published talent definitions are checked independently.

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

The picker filters slot, Warrior weapon/armour proficiency and level. It checks official detail-page class/race masks, inventory type, additional requirements and unique-item duplication before equipping. Detail requests run in the browser and can fail because of CORS, source availability or source protection; a failed verification permits only an explicitly labelled unverified planning reference, which contributes no calculated attributes. Only two downloaded detail records are bundled initially. Unknown restrictions remain unknown. Unsupported profession/reputation requirements are rejected. Base stats, racial/talent effects, set bonuses and procs are not included in displayed equipment attributes. Existing imported references remain compatible and are marked red until verified; changing character level/race flags incompatible equipment.

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

Buffs are grouped checkbox options based on the Combat Gum text supplied by the user, with per-group selection controls and collapsed SP consumables. The listed effects are reference display values; they have not been validated as OctoWoW calculations. Class-specific options such as Thistle Tea are disabled for Warrior. Selection, key-press timing, rotation presets and editable priority conditions round-trip through saved builds and share links. Each class has its own starter presets, abilities, resources and custom priority editor. These are planning controls, not validated optimal rotations. Named custom rotations are saved in browser storage. Existing free-text planning notes remain in imported build data for compatibility.

All 54 official Warrior talents now have rank-specific plain-text effect descriptions extracted by the existing data-only importer. The inline selected-talent panel has been removed; talent and equipment information appears on hover or keyboard focus. Arrow Up/Down and +/− adjust the focused talent. Item tooltips use retrieved source data where available and show a concise fallback when details cannot be loaded. Retrieved Equip/Use/Chance-on-hit text is displayed without executing or inserting source HTML. Headings collapse their panels. No new combat calculations or generated DPS results are implied by these UI controls.

### Complete settings controls (11 November 2026)

One red **Clear points** control under **Points left** clears all three talent trees. Per-tree clear buttons have been removed.

Settings now include duration variation, iterations, editable target level/armour and all five spell resistances, 41 named boss presets, and Expert/Heroic Training Dummy buttons. The parameter snapshot in `core/targets.mjs` records the public Combat Gum reference: bosses replace level, armour and all five resistances; Expert is level 60 / 3,000 armour and Heroic is level 63 / 4,211 armour, both with zero resistances. A selected dummy is highlighted; manual target edits switch to Custom. The special +50 energy/sec encounter parameter is retained in build data for the class engines to use when implemented. These remain reference configuration values, not independent verification of server encounter mechanics. All settings round-trip through browser saves, JSON export and share links. Older builds receive defaults for newly added fields.


### Three-pane equipment picker (11 November 2026)

The slot picker now follows the reference layout in OctoBot colours: search and count across the top; sort, direction, quality and enchant controls on the left; the full scrollable item catalogue in the middle; and an independently scrolling tooltip preview on the right. Previewing a row does not equip it. Select confirms a choice; Clear Slot removes its item and enchant. Keyboard arrows navigate the list, and Enter confirms a ready selection. The equipped and previewed rows have separate highlights.

The display-only reference snapshot contains 1,072 tooltips matched to official OctoWoW listing IDs, names, item levels, required levels and armour. It includes effect and set-bonus text, but does not replace official class/race masks or feed calculated attributes. Explicit class restrictions in reference tooltips also narrow candidates. If the official item-detail request fails, the clearly labelled **Select reference** option saves the item without treating its stats or restrictions as verified. Known unusable items remain blocked. Only source-verified, usable items contribute to the equipment attribute total.

The 65 enchant labels and slot references, 82 patch item tags, and reference tooltip display facts were read from Combat Gum's public data; the UI and interactions are independently implemented. These references are not a claim of server mechanic compatibility. Enchant references are validated by slot/class, saved with gear and preserved in share links; enchant/proc calculations remain unimplemented. Sorting treats unavailable values as unknown and places them last. Some sort values come from matched reference tooltip facts and are not independently validated server statistics. Enchant spell effects and reference tooltip data are never executed or inserted as source HTML.
