# Integration follow-ups (tracked separately from OctoSim engine work)

Recorded 28 November 2026 on PR #79 (`feat/octosim-merge-main`). Neither list below is caused by the merge; both exist on `origin/main` (9e6d1ebd) or are UI data gaps. They do not block the OctoSim engine milestone.

## A. Buff entries without an icon (16)

`buffIcon()` in `docs/sim/core/icons.mjs` returns no icon for these ids, so the Buffs list shows a blank slot of the same size. They are listed explicitly in `NO_ICON_YET` in `tests/icons-and-borders.test.mjs`; a new buff without an icon fails that test.

| id | Name |
|---|---|
| flurry | Juju Flurry |
| wind-serpent | Embrace of the Wind Serpent |
| corrosive-poison | Corrosive Poison |
| fengus | Fengus' Ferocity |
| slipkik | Slip'kik's Savvy |
| mastery-axes, mastery-maces, mastery-swords, mastery-daggers, mastery-fists, mastery-polearms, mastery-staves, mastery-bows, mastery-guns, mastery-crossbows, mastery-thrown | Weapon Masteries (11) |

Needs: confirmed icon names (check the OctoWoW database page or in-game icon for each). Do not guess. Remove the id from `NO_ICON_YET` when mapped.

## B. Root test files already failing on `origin/main` (10 files, 20 tests)

Run with `node --test tests/<file>`. All fail identically on a clean `origin/main`. None is run by the OctoSim workflow. The CI jobs that do run are green on PR #79.

| File | Failing tests | Likely cause |
|---|---|---|
| `ah-planner-polish.test.mjs` | 6 (character name box, item icon borders, price coins, Collector card, scan status) | Tests predate main's Auction House and Gear Planner changes (character name removed in 34580efd). |
| `gearplanner-race-icons.test.mjs` | 1 (section called "Gear Planner") | Nav label and wording changed. |
| `icons-and-borders.test.mjs` | 1 (rows and dropdowns use shared icon code) | Planner no longer has `professionPickers` (secondary skills removed). |
| `outfitter-high-elf.test.mjs` | 1 (changed scripts carry new version strings) | Version-token check; needs a look at which script changed without a bump. |
| `toolbar-and-hover.test.mjs` | 1 (class card gradient) | Class card styling changed (`d4c89cc0`, `a477f2c6`). |
| `vigor-and-saved-builds.test.mjs` | 1 (item preview wheel, compact Character fields) | Expects the removed "Build details" toggle. The 4 Vigor/energy tests in this file pass. |
| `world-info-drops.test.mjs` | 3 | World Info tracker logic. |
| `world-info-heads.test.mjs` | 4 | Darkmoon Faire, estimate alert, sound alerts. |
| `world-info-raids.test.mjs` | 1 | Tracker drop-out and return. |
| `world-info-text.test.mjs` | 1 | "PUG" shown as "Pug", en dashes. |

Fixing these means deciding the intended current behaviour per feature, so they were left alone in the OctoSim PR.
