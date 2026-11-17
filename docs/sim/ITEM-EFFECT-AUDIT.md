# Item and equipment audit, phase 1

Branch: audit/item-stat-effects (independent from the nine talent branches; merge integration required). No main deployment.

## Snapshot inventory
- 19,840 catalogue rows; 14,087 unique equippable records in both the planner and dressing-room input. No equippable ID difference in the snapshot.
- 14,086 detail records available. Item 5410 (OLDCeremonial Club) lacks a verified equipment-slot detail and must remain unavailable until resolved. The catalogue manifest is explicitly incomplete for three capped non-equipment partitions. Current live database completeness and all reputation/quest/profession rewards have not been independently recrawled.
- 549 name/slot discrepancies between raw listings and details (including one-hand listing versus main-hand tooltip); current item picker uses authoritative detail slot. Remaining discrepancies need individual source review.
- 9,010 imported effect lines / 689 normalised patterns: 7,705 recognised passive lines, 626 event lines, 438 conditional lines, 241 unmapped lines. 1,270 items have at least one non-passive/unrecognised effect. 12,816 detail records have no such effect lines; this does not establish full item correctness.
- 172 distinct parsed set rosters on 908 item records; zero detected roster parse exceptions. 352 normalised set lines/patterns: 28 directly passive, 78 conditional, 1 event and 245 unmapped by current parser. These are normalised line counts (not numbers of whole sets implemented). Static set bonuses apply once per threshold from distinct item IDs, with full roster identity and published numeric profession gates. Conflicts fail closed. Scoped set effects remain uncalculated.
- 72 listed enhancements checked for finite parsed values and selected scope isolation; not a complete enchant-source or numerical audit.

## Changes
Exact permanent item-effect patterns replace loose substring parsing. Split damage, healing and spell school bonuses; weapon-subclass skill; ranged-only haste, hit, crit, damage and AP; shield block, periodic health restoration, item defensive contributions, source-only conditional flags and visible uncalculated effects. Set thresholds implement supported static bonuses, crafted requirements and two distinct same-name Hakkari weapons. No temporary proc, use effect or uncertain compound tooltip is added as unconditional stats.

## Run and evidence
Run: https://github.com/Equadis/OctoBot/actions/runs/44008998606 (code/test revision b794afe1b9c21adf427fbee017bbe0beb6d1a61b). 125 Node tests passed, 3 pre-existing TODO assertions, 0 failures; 11 Python tests passed. Workflow re-inventories all records and uploads item-inventory-audit.json; original effect and set-line patterns retain sample item IDs and raw text. The source is the repository's existing OctoWoW tooltip snapshot, not a live combat or newly fetched database validation.

## Remaining
Unmapped/conditional effects, ability and proc resolution, full item set modifier coverage, authoritative enchant availability/stat verification, random suffixes, weapon/ammunition/ranged damage formula, gear restrictions and all mismatched listing records need further validation. Flat effects and percentage contributions are not live-verified stacking, rounding or mitigation. Existing three TODOs concern base-stat evidence and racial stacking. Talent changes have not been integrated; buff/consumable audit remains separate.
