# Simulation source audit

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
Haaxor1689 as its creator. We extracted factual talent metadata, not application
code, images or tooltip prose. The source hash and retrieval time are recorded in
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
included in this branch. Official calculator factual metadata is now included
with provenance. If an engine is later vendored, include exact pinned revisions, licence texts and
notices, documented local modifications, and visible upstream attribution.
