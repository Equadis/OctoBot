# Base-stat verification

Verified on 2026-11-22. Both sources are vanilla cores, not OctoWoW. Agreement verifies the import, not live OctoWoW values.

## Result

| Status | Rows |
|---|---|
| Verified (identical in CMaNGOS Classic and MaNGOS Zero) | 2,393 |
| Disputed (kept, flagged) | 7 |
| Corrected | 0 |
| Unresolved: no source row | 1,140 |
| Total | 3,540 |

Import fidelity: 2,400 rows compared with the CMaNGOS source, 0 mismatches. Cross-check: 2,400 primary-stat rows compared with MaNGOS Zero, 0 mismatches.

## Sources

- CMaNGOS Classic sql/base/mangos.sql: https://github.com/cmangos/mangos-classic/blob/master/sql/base/mangos.sql (2400 level rows, 540 class rows)
- MaNGOS Zero World/Setup/FullDB: https://github.com/mangoszero/database/tree/master/World/Setup/FullDB (2400 level rows, 540 class rows)

## Disputed records

### Anomalies found by invariant checks

| Combination | Transition | Kind | This race | Other races (median) | Compared |
|---|---|---|---|---|---|
| Undead mage | L1→L2 | primary-stat-decrease | [0, 0, 0, -5, 7] | [0, 0, 0, 1, 1] | 3 |
| Orc rogue | L18→L19 | stalled-while-other-races-grow | [0, 0, 0, 0, 0] | [1, 2, 0, 0, 1] | 6 |
| Orc rogue | L19→L20 | stalled-while-other-races-grow | [0, 0, 0, 0, 0] | [0, 1, 1, 1, 0] | 6 |
| Human warrior | L18→L19 | stalled-while-other-races-grow | [0, 0, 0, 0, 0] | [1, 1, 1, 0, 1] | 7 |

Order of values: strength, agility, stamina, intellect, spirit. Both source datasets contain these rows unchanged.

### Source conflicts

| Combination | Level | MaNGOS Zero health/mana | CMaNGOS and repo health/mana |
|---|---|---|---|
| Night Elf:druid | 1 | [33, 50] | [33, 17] |
| Tauren:druid | 1 | [33, 50] | [33, 17] |

## Candidates (evidence only, not applied)

| Combination | Level | Current | Candidate | Basis |
|---|---|---|---|---|
| Human warrior | 19 | [44, 33, 41, 22, 26] | [45, 34, 42, 22, 27] | level 18 row plus the median increment of 7 other races |
| Orc rogue | 19 | [37, 43, 35, 20, 29] | [38, 45, 35, 20, 30] | level 18 row plus the median increment of 6 other races |
| Orc rogue | 20 | [37, 43, 35, 20, 29] | [38, 46, 36, 21, 30] | level 19 candidate plus the median increment of 6 other races |
| Undead mage | 1 | [19, 18, 21, 27, 21] | [19, 18, 21, 21, 27] | level 2 minus the median increment of 3 other races |

These values are inferred from other races. No OctoWoW or source value supports them, so nothing was changed.

## Class health and mana tables

8 level transitions in the class-only tables decrease (for example warrior health 101 to 100 at level 11). They are identical across all races and sources, so they are reported as source behaviour and left unchanged.

## Unresolved: missing combinations

19 combinations (1,140 rows) have no rows in either source: Dwarf:mage, Dwarf:warlock, Gnome:hunter, Goblin:hunter, Goblin:mage, Goblin:rogue, Goblin:warlock, Goblin:warrior, High Elf:hunter, High Elf:mage, High Elf:paladin, High Elf:priest, High Elf:rogue, High Elf:warrior, Human:hunter, Orc:mage, Tauren:priest, Troll:warlock, Undead:hunter. They are not substituted from another race or class.

## Out of scope

- The "76 conflicting source-data records" in the handoff are 76 abilities with source-conflicting spell-rank data (193 rank rows), not base stats. By class: warrior 11, rogue 9, paladin 6, druid 7, shaman 6, hunter 11, mage 6, warlock 12, priest 8. They need controlled spell measurements and are untouched here.
- Known Mage and Priest level-60 health and mana differences between CMaNGOS and WoWSims Turtle are recorded as todo tests in tests/sim/reference-parity.test.mjs; neither source is OctoWoW.
- Third-party Combat Gum figures for Goblin and High Elf Rogue (77/132/75 and 77/135/73) appear in tests/sim/reference-parity.test.mjs; they are unverified and were not imported.
