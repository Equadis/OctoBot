# Nine-class planner audit — 12 November 2026

## Implementation status

This is a gear/talent planner with character-sheet estimates. **There is no implemented DPS engine for any class.** The disabled Run Simulation control is intentional. Resource timelines, racial actives, pets, conditional talents, proc/set effects and timed consumables have not passed combat validation. This audit must not be described as completed nine-class DPS support.

| Shared rule | Enforcement |
| --- | --- |
| Race eligibility | Class-specific dropdown, build validation, imports and shared links |
| Legacy invalid races | Local recovery selects the class default; original records retained |
| Equipment | Class, race and level masks, professions, armour, weapon proficiency, slots, unique items and weapon/ammunition relationships |
| Unsupported item metadata | Cannot equip; existing invalid references excluded from stats; recovery copy precedes local repair |
| Ammunition/containers | Hunter only; bow/crossbow arrows/quiver and gun bullets/ammo pouch |
| Talents | Official nine-class snapshot; ranks, point budget, lower-tier and prerequisite validation |
| Shift-left/right | Highest legal rank / lowest legal rank preserving all other talents |
| Class appearance | Standard class colours for heading/icon, smaller landing labels; Open Planner retained |
| Selection outlines | One allocation-coloured talent outline; no extra selected/focused shadow |
| Additional consumables | Verified source eligibility, resources, level and known profession requirements |
| Stacking | Existing observed Combat Gum pair rules plus additional consumable selection groups and coating conflicts |
| Engine preparation | Rejects missing engines, unavailable base stats, unsupported racial/buff/consumable effects and unresolved potion cooldowns |

Strict external imports reject invalid races, slots and coating conflicts. Runtime item verification also runs before applying imports/shared links, saving and sharing builds. Changing gear, races, levels or professions rechecks dependent equipment. Local recovery keeps raw backups under `octosim.recovery.*`; existing named records are not silently overwritten. There remain 100 named builds per class, plus JSON backup/export.

## Ruleset evidence

Use current dedicated OctoWoW pages over older overviews. Rules below are not inferred from modern retail:

- [Additional class/race combinations](https://octowow.st/class-race-combinations): Human Hunter, Dwarf Mage/Warlock, Gnome Hunter, Orc Mage, Undead Hunter, Tauren Priest, Troll Warlock.
- [High Elves](https://octowow.st/high-elves): current class icons identify Warrior, Paladin, Hunter, Rogue, Priest and Mage. Current passives specify 2% Agility, +3 Bow skill and +10 Enchanting. The older new-races page conflicts with these values and is not used.
- [Goblins](https://octowow.st/goblins): current class icons identify Warrior, Hunter, Rogue, Mage and Warlock. Current passives specify +3 Daggers/Maces and +10 Mining/Jewelcrafting.
- [Shaman](https://octowow.st/shaman): Orc, Tauren and Troll; baseline two-handed axes/maces. No unsupported dual-wield assumption is added.
- [Druid](https://octowow.st/druid): explicitly permits potions in Cat/Bear forms. Resource restoration eligibility also follows item class masks.
- [Rogue](https://octowow.st/rogue): substantial custom combat changes exist. An axe-related talent description alone is not accepted as proof of weapon training. This requires further server verification.

The Vanilla base-stat table remains a reference, not confirmation of OctoWoW base stats. Custom race/class combinations with no verified base row show unavailable values rather than another race's numbers. Only level-60 crit/dodge reference coefficients are provided. Race passives mapped into sheet estimates do not imply that racial actives are simulated.

## Consumable coverage and uncertainty

`data/consumables/catalogue.json` contains **1,302 consumable listings**, with **84 source tooltips/restrictions verified** at this checkpoint. Remaining records are explicitly unverified and unavailable for selection. This is **not a complete consumable audit**. The manifest records missing IDs and source failures; the resumable importer can continue without replacing verified records with failed responses.

Verified records retain exact source effect text, class/race masks, required level, spell IDs, URL and source SHA-256. Source verification establishes published tooltip facts, not combat correctness. Additional long-duration passive effects contribute only where the parser explicitly recognises them. Short-duration potions/runes are not averaged into permanent stats. Existing Combat Gum buff values remain labelled reference estimates pending OctoWoW verification.

Examples demonstrating why Vanilla assumptions are unsafe:

- [Item 13442](https://octowow.st/db/?item=13442) publishes Rage restoration 45–346 and Strength 60 for 20 seconds, with class mask 1025 (Warrior/Druid).
- [Item 13444](https://octowow.st/db/?item=13444) publishes 1350–2251 Mana restoration.
- [Spell 17531](https://octowow.st/db/?spell=17531) exposes a category cooldown that does not establish the final item-template cooldown. Neither a familiar Vanilla cooldown nor that spell category is silently treated as verified item cooldown.
- [Item 20007](https://octowow.st/db/?item=20007) publishes 12 Mana per 5 seconds for 3600 seconds; this long-duration passive is included in sheet estimates.

Shared potion/rune/bandage categories are conservative planner selection groups. Item-level cooldowns remain unresolved (`cooldownSeconds: null`, `cooldownVerified: false`). The future engine gate rejects unsupported effects and unresolved shared-cooldown selections, even if a hypothetical adapter declares an effect supported. Do not claim that cooldowns, all stacking interactions or timed effects have been fully validated.

## Verification

Run `node --test tests/sim/*.test.mjs` and `python -m unittest discover -s tests/sim -p 'test_*.py'`.

Regression coverage exercises every class/race pair; every class's talent shortcuts against the complete validator; insufficient points; mixed prerequisite/tier retention; unavailable engines; mana/rage restrictions; legacy repair; missing equipment metadata; ammo matching; cross-list flask conflicts; and selected passive facts. Existing build, item, target, rotation and character-sheet fixtures remain required.

Interactive browser QA was unavailable in the editing session. CSS and event handlers were inspected, but mouse/keyboard focus appearance and every visual breakpoint require a browser pass. Full class engine implementation, full consumable source coverage and independent OctoWoW combat validation remain outstanding acceptance criteria.
