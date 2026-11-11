# OctoWoW ruleset compatibility

The target/default is OctoWoW. Vanilla and Turtle are references, not aliases.
No verified OctoWoW ruleset has yet been created.

## Conflicting first-party evidence

Both pages were retrieved on 11 November 2026:

- [Official Warrior page](https://octowow.st/warrior) describes changed rage
  generation, revised abilities and replacement talents. Its introduction refers
  to proposed changes for an upcoming patch; the live activation revision is not
  established by that wording.
- [Database ability entry](https://octowow.st/db/?spell=23894) describes the
  rank-4 attack as 45% of attack power. It also renders the resource cost as mana,
  so this page alone cannot be treated as an authoritative combat schema.

| Mechanic | Octo database | Octo class page | Available implementation | Status |
| --- | --- | --- | --- | --- |
| Rank-4 coefficient | 45% AP | Base damage plus 35% AP; base amount absent | WarriorSim Turtle: `200 + 0.35 × AP`; WoWSims Turtle: `0.45 × AP` | Conflicting; live formula not established |
| Rage from swings | No usable formula established | Damage and weapon-speed contribution; no complete numerical formula | WarriorSim includes separate modes and hand/crit paths | Unknown live parameters |
| Ability rank scaling | Individual entries available | Several spells described qualitatively | WarriorSim contains a lower-level TODO for the changed coefficient | Lower levels cannot be advertised validated |
| Talent tree | Calculator linked from official site; full current dataset not audited | Replacements, rank and row changes described | Upstream trees must be reconciled individually | Unknown live version and exact ranks |
| Item phases | Item identity does not prove current obtainability | Not established by the class page | Upstream phase numbers belong to their own data | Unknown Octo progression mapping |
| Proc/queue/batching rules | Tooltips do not establish hidden behaviour | Insufficient numerical detail | Implementations have mode-specific paths | Controlled testing needed |

This is not evidence that one source is wrong or that a proposal is live. Keep
both observations and resolve the conflict with current authoritative patch
information, the live client data/ranks and controlled combat measurements.
Do not select the easier coefficient and label the result validated.

## Data ingestion

The official site and database are publicly readable over HTTPS. Entity pages
contain server-rendered descriptions and related-list JavaScript. A documented
bulk API or structured export was **not established** in this audit; no guessed
endpoint is used. No API absence is claimed.

Any importer should retain entity ID, canonical verified page, retrieval date,
source revision/hash, exact stat/rank fields, availability evidence and unresolved
fields. Parse data without evaluating remote JavaScript. Fetch at build time;
ship static validated JSON and keep runtime simulation independent of the site.

Never infer that identical item IDs imply identical stats or effects across
servers. Do not put unverified custom items, future AQ/Naxx items or upstream
phase assumptions into the default obtainable-item pool.

## Release gate

`data/warrior-evidence.json` records unresolved mechanics needed by the first
class. `node tools/sim/check-evidence.mjs` fails until they have confirmed
evidence. Clearing those entries is necessary but not sufficient: actual engine,
UI and numerical reference acceptance must also pass.

The sequential class requirement leaves Rogue and later engines unstarted while
Warrior's validation gate is unresolved. An unverified reference mode, if later
provided for development, must not be renamed OctoWoW or presented as completion.
