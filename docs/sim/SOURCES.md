# Simulation source audit

## Interface and icon follow-up

OctoSim now uses an independently written class-selection grid and planner
layout based on the observed Combat Gum home and Rogue screens: navy/slate
panels, gold headings, fixed build controls on the left, section controls on
the right, equipment columns around the centre panel, and compact talent grids.
Combat Gum branding, logo, source code and bundled artwork are not copied.

Class and empty equipment-slot icons use the same public WoW icon paths observed
in Combat Gum, served by `https://wow.zamimg.com/images/wow/icons/large/`.
Warrior talent icons use their actual image URLs exposed by the official OctoWoW
calculator, including custom icons. The importer preserves those URLs and icon
identifiers with the talent metadata. Image bytes are not redistributed in the
repository; this is not a claim that the game artwork is project-owned or MIT
licensed. The UI attributes game icons to Blizzard Entertainment. External icon
hosts receive normal browser image requests; image failures retain usable labels
and fall back to a question-mark icon.

The reference's availability badges are not copied as class-status facts.
All nine class planners are available. No combat simulator is advertised as implemented.

Audited 11 November 2026. Revision pins prevent later source changes from
silently changing validation expectations. Source presence is not proof of
runtime accuracy, build success or OctoWoW compatibility.

| Priority | Source | Revision | Licence evidence | Finding and disposition |
| --- | --- | --- | --- | --- |
| 1 | [Combat Gum](https://www.combatgum.app/rogue) | Public UI Alpha v3.01 | No source-reuse grant established | Primary UX/functionality/Rogue reference; original implementation required |
| 2 | [WarriorSim Turtle](https://github.com/Thrunk112/WarriorSim-TurtleWoW) | `a4aad9c8a964e20d60b31b864341a63cd3cfaccf` | package.json declares ISC; no standalone licence file found | JavaScript engine, gear/talent/buff data and worker exist; Turtle formulas differ from database; no code vendored here |
| 2 | [Original WarriorSim](https://github.com/GuybrushGit/WarriorSim) | `ae03455a9421d04a1563c27393e909cffeb56cf2` | package.json declares ISC; no standalone licence file found | Provenance reference for the Turtle fork; preserve attribution and resolve notice handling before redistribution |
| 2 | [Ichabaddie's Armory](https://ichasarmory.quest/) | Public live UI | Source-reuse grant not established | Shaman interaction and output reference; no proprietary source/assets copied |
| 2 | [HunterSim Turtle](https://github.com/Barwaat/huntersim2-twow) | `adfe31178d22ed3f44a1b05c205ad4e1c8a1d639` | MIT LICENSE | Go/WoWSims-style source includes shots, aspects and traps; project README still points at Classic; do not assume complete/current Turtle adaptation |
| 3 | [WoWSims Turtle](https://github.com/isfir/wowsims-turtle) | `64cfa6ae2777b20bc95f3573dd9b2572634dddd7` | MIT LICENSE; README requests visible upstream link | Real shared Go engine, WASM target and class source directories; launch registry marks only Mage Alpha; all other specialisations Unlaunched |
| 4 | [Timanaku Python](https://github.com/Timanaku/turtlewowsim) | `f71cb8718e0e40c16ad073ed196d1a8d3bb2f7d8` | No licence grant located in repository licence files or pyproject | README advertises Mage and Balance; explicitly says Warlock update to 1.17.2 is unfinished; no code copied |
| 4 | [codeshard Python](https://github.com/codeshard/twowsim) | `c039dab0ccb84e83731ac7272c9ceb6642f162ad` | No licence grant located in repository licence files or pyproject | README advertises Mage, Balance and Warlock; implementation files exist; no numerical tests performed and no code copied |
| 5 | [WoWSims Classic](https://github.com/wowsims/classic) | `7779ebbf79dc7f1341e6ab939b28a3402c9a730a` | MIT LICENSE | Vanilla fallback; must not override verified Octo custom mechanics |
| Additional | [Slamrish fork](https://github.com/Slamrish/Sim-TurtleWoW) | `efccb679c4e8537a61cb628784b4b1695a391cee` | package.json declares ISC; no standalone licence file found | CLASSES.md labels Rogue basic/30%; RoguePlayer has TODOs for talents, gear, sets, enchants, buffs and spells; unsuitable as a complete Rogue engine |

## Dependencies and integration implications

Additional first-party game-data source: [OctoWoW talent calculator](https://octowow.st/talents/),
with [Warrior definitions](https://octowow.st/talents/warrior/). The page identifies
Haaxor1689 as its creator. We extracted factual talent metadata and rank descriptions, not application
code or image bytes. The source hash and retrieval time are recorded in
`data/talents/warrior.json`; application-code reuse permissions are not assumed.

WarriorSim uses JavaScript globals, mutable data selection and a synchronous
iteration loop inside a classic worker. Its `Player.getConfig()` reads jQuery;
an adapter must supply explicit config and remove frontend assumptions from
the integration path. RNG currently uses global Math.random; deterministic
adaptation and independent upstream comparisons are required. Data also contains
other game-mode paths; do not expose them as Octo mechanics.

WoWSims Turtle builds Go to WASM with protobuf-generated Go/TypeScript types.
Its makefile exposes all specialisation pages, but that is not a completion
claim. The checked-out source has no generated `sim/core/proto/*.pb.go` files;
building requires protoc and plugins as documented upstream. No successful WASM
build or class run has been recorded by this audit.

The Python projects use SimPy, NumPy, pandas and plotting tools. Browser
integration requires extracting mechanics from execution/reporting dependencies.
Prefer a licensed TypeScript or WASM implementation; use Pyodide only after
measuring payload and runtime costs. Missing licence evidence blocks copying
their implementation, not independent implementation or public-behaviour study.

No third-party simulation code, upstream engine data files, logos or art are
included in this branch. Official calculator factual metadata for all nine classes (476 talents) is included
with provenance. If an engine is later vendored, include exact pinned revisions, licence texts and
notices, documented local modifications, and visible upstream attribution.

## Character sheet and buff replacement — 12 November 2026

- Combat Gum **Alpha v3.01** was tested through its visible checkbox controls in
  both listing orders. Raw observations are in
  `data/reference/combatgum-buff-observations.json`. The additional pair tests
  capture the asymmetric Dreamwater/Dreamtonic and Arcane Giant/Greater Arcane
  cases. OctoBot resolves those pairs symmetrically, with the last selection
  winning. Other confirmed combinations remain allowed; an entire consumable
  category is not incorrectly treated as exclusive. Select All was separately
  tested: Mongoose/Juju Might/Juju Power, Expose and Annihilator take priority
  over weaker conflicting options.
- `core/base-stats.mjs` contains factual numeric rows for levels 1–60 extracted
  from [CMaNGOS Classic's player_levelstats and player_classlevelstats tables](https://github.com/cmangos/mangos-classic/blob/master/sql/base/mangos.sql).
  The source is published under GPL-2.0-or-later. Only numeric game facts were
  extracted; no upstream executable implementation was copied. The retrieval
  date and source SHA-256 are recorded in the data module.
- Level-60 class coefficients were checked against
  [WoWSims Classic base_stats.go](https://github.com/wowsims/classic/blob/master/sim/core/base_stats.go)
  (MIT). Rogue's 29 agility per crit and 14.5 agility per dodge reproduce the
  visible Combat Gum fixture. Character calculations are original code.
- The Human Rogue fixture is: no gear or talents, level 60, target 63/4211 armour,
  Weapon Skill Book, Mongoose, Scorpok, Juju Might, Juju Power, Dreamshard. All
  supplied stat values are reproduced, including 305 skill, 430 AP, 8.41% crit,
  5.41% effective crit, 2093 health, 12.4% dodge and 15 SP.

These remain **planning estimates**, not a verified OctoWoW combat ruleset.
Only supported passive item/enchant effects and explicitly mapped static talents
contribute. Triggered procs, temporary rotation auras, conditional talent effects,
unimplemented set bonuses and school-specific spell crit are not averaged into
permanent totals. School damage enchants and buffs are displayed separately from
general spell power. Level-dependent crit/dodge coefficients below 60 are not
invented: affected fields display a dash. Unsupported race/class pairs similarly
show unavailable base attributes. Fortune shows flat bonuses only. Additional
Nature resistance modelling is pending, so Poison Resist displays a dash when
that resistance is non-zero. Hover notes identify these calculation boundaries.

The attack table is an independently represented Combat Gum display baseline,
including its miss/skill, dodge/skill and glancing display conventions. Agreement
with that UI does not establish agreement with the OctoWoW server. Run Simulation
remains unavailable until a verified combat engine exists.
