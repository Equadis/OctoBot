# Game entity links (`[item:Name]`, `[quest:Name]`, …)

OctoBot answers `[type:name]` or `[type:id]` in ordinary Discord messages with a compact embed that links the
official OctoWoW database. No slash command or prefix is involved. User-facing syntax is in `COMMANDS.md`.

## How it works

| Module (`octobot/entity_linking/`) | Role | Discord-free |
| --- | --- | --- |
| `parser.py` | Finds references (bounded: 4,000 characters scanned, names ≤ 80 characters, ≤ 6 distinct references, code blocks ignored) and normalises names. | yes |
| `database.py` | Read-only, auto-reloading access to `data/entities.sqlite`; SQLite indexes plus an FTS5 trigram index. | yes |
| `resolver.py` | Matching priority: id → exact name → normalised name → alias → head phrase → prefix → partial → fuzzy. Several plausible matches are returned as *ambiguous*, never auto-picked. | yes |
| `embeds.py` | Item / quest / spell / talent / recipe / enchant / set / faction embeds. | no |
| `views.py` | Select menu for ambiguous names (author only, 120 s). | no |
| `cog.py` | Listener, cooldown, settings, edit/delete reconciliation. | no |

The website can reuse `parser`, `database`, `resolver` and `models` unchanged.

Behaviour notes

* A message with no `[` exits the listener immediately. Lookups run in a worker thread (`asyncio.to_thread`), at most four at once, and make no network request.
* The reply is sent after a one-second pause so the word and invite filters can delete a message first; a deletion seen at any time also deletes our reply.
* Replies go through `bot.discord_api`, so a 403/429 puts that channel into the existing back-off instead of retrying.
* Reply tracking (for edits and deletions) and open select menus live in memory: after a restart, old replies are no longer updated and old menus stop responding.
* Generated embeds are bot messages, so daily chatter, `/history` and other activity tracking (which skip bots) never count them.
* Settings use the moderation database: `/settings entity-links` (server) and `/settings entity-links-channel` (channel/thread/forum). Both default to on.

## Data

`data/entities.sqlite` is generated, committed, and read-only at runtime (override with `ENTITY_DATABASE_PATH`).
It is kept separate from `octobot.db`.

Rebuild (offline, reproducible from committed snapshots; atomic `os.replace`, so a running bot on Linux picks up the new file on its next lookup):

```powershell
python tools/build_entity_database.py
python tools/validate_entity_database.py --bench
```

Refresh the official snapshots (slow on purpose: the site answers bursts with HTTP 429, requests are ~12 s apart, pages are cached in `.entity-cache/`, and an interrupted run resumes):

```powershell
python tools/crawl_official_quests.py          # quest listings  -> data/sources/official-quests.json
python tools/crawl_official_quests.py --details 200   # optional: start/end NPC, objectives for 200 more quests
python tools/crawl_official_lists.py           # spells, recipes, enchants, sets, factions -> data/sources/official-lists.json
```

Item and talent data come from the existing `docs/sim/data/items` and `docs/sim/data/talents` snapshots.
Curated abbreviations are in `data/sources/entity-aliases.json` (every target id is checked at build time).

### Source priority and what was *not* used

1. Official OctoWoW database (all entities in the table below).
2. Existing OctoBot/OctoSim datasets (item catalogue/details, talent calculators).
3. OctoWoW-specific addon databases and pfQuest were investigated but **not imported**: their ids and text are not
   guaranteed to match OctoWoW's custom content, and nothing in them was needed to cover quests that the official
   database already lists with verified ids. They remain candidates for NPC and object data.
4. Third-party reference data (`reference-tooltips.json`, from a combat-sim site) is not used.

## Coverage at the first build (2026-11-28)

| Type | Records | Source | Notes |
| --- | --- | --- | --- |
| item | 19,840 | catalogue (+ official tooltips for 14,086) | 5,754 non-equipment items have name, quality, level, icon only |
| quest | 3,224 | official listing | **Partial**: only 67 of 173 listing categories captured (all Eastern Kingdoms zones); Kalimdor, dungeons, raids, battlegrounds, other missing. Listing gives level, minimum level, faction, zone, XP, item rewards; no NPCs/objectives |
| talent / spell | 476 / 1,414 | talent calculators + official class listing | Talent ranks are separate spell records. Class abilities: Druid Balance only so far |
| set | 363 | official listing | bonuses from item tooltips |
| faction | 54 | official listing | |
| recipe, enchant | 0 | not captured | crawl pending |
| npc, boss, object, zone | 0 | no verified source | the bot stays silent for these |

The official site rate-limits to roughly one page per few minutes, so crawls are resumable (`.entity-cache/`).
Re-run `tools/crawl_official_quests.py` and `tools/crawl_official_lists.py` until they report no failed categories, then rebuild.
Questie-Octo (local addon) data was reviewed but not imported: its licence file states it does not relicense third-party data and its provenance is a Turtle WoW server snapshot plus pfQuest.
