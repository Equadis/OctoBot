# OctoMetrics Worker (raid intelligence)

Source for `https://octometrics.eqvoice.workers.dev`, now kept in this repository. It is the Cloudflare Worker that the Railway service `octobot-metrics-tracker` pushes to (`/api/ingest`) and that the website reads (`/api/summary`).

**Status: written and unit-tested here. It is NOT deployed until you run the procedure below.** Nothing in this change touches the Railway service.

## What changed in the Worker

`worker.mjs` is the v0.2.1 Worker from `OctoBot-Metrics-Tracker-v0.2.1-Whisper-Replies/cloudflare/worker.mjs` with one function changed (`summary`). Ingest authentication, event validation, the four allowed accounts, CORS and the 30-day retention job are untouched, and there is **no schema change and no D1 migration**.

`/api/summary` keeps every existing field and adds, per realm:

| Field | Meaning |
|---|---|
| `buffs[...].head` | `"onyxia"`, `"nefarian"` or `null`, taken from the yell text the collector already stores |
| `heads.onyxia`, `heads.nefarian` | One block per head, tracked separately (Onyxia = watcher `sw`, Nefarian = Blackwing Lair watcher `org`) |
| `heads.*.raid` | Latest headcount observation: `observedAt`, `fresh`, `active`, `players`, `listCapped`, `activityStart`, `clearConfirmed` (always `false`) |
| `heads.*.clear` | Estimated clear: `status` (`idle`, `learning`, `estimated`, `due`, `overdue`), `estimatedAt`, `earliestAt`, `latestAt`, `samples`, `minSamples`, `confidence` (`none`, `low`, `medium`, `high`), `confirmed` (always `false`) |
| `heads.*.learned` | Median and quartiles of past raid durations, and the sample count |
| `heads.*.drops.alliance/horde` | Last **confirmed** drop (`at`, `source`, `confirmed: true`) or `null` |
| `unattributedDrops` | Drops whose yell text is missing or unrecognised. These are never guessed |

There is no cooldown field and no buff-duration field anywhere: OctoWoW has no head-drop cooldown.

## How the estimate works

Ported from `services/world-buff-tracker` (`duration-store.ts`, `config.ts`): the **median of past form-to-clear durations**, with plausibility bounds, kept separately for each raid.

| Raid | Plausible clear |
|---|---|
| Onyxia's Lair | 10 minutes to 6 hours |
| Blackwing Lair | 30 minutes to 10 hours |

Past sessions come from the `activity_started` and `activity_ended` transitions the collector already stores. A start and the next end are paired into a duration. An end with no start (for example after a collector restart) is ignored.

* Fewer than **5** plausible past raids: `learning`, no estimate is shown.
* 5 to 9 raids: `low`. 10 to 14: `medium`. 15 or more: `high`. A wide spread between raids (inter-quartile range above 75% of the median) lowers the grade one step, never below `low`.
* `estimatedAt = raid start + median`. The window `earliestAt` to `latestAt` uses the 25th and 75th percentiles. Past `latestAt` the status is `overdue`.
* An estimate is **never** a confirmed drop. Only a capital-city yell confirms a drop.

## Audit: advanced tracker versus the deployed collector

| Capability | Advanced tracker (`services/world-buff-tracker`) | Deployed collector v0.2.1 | After this change |
|---|---|---|---|
| Confirmed drops per faction from capital yells | Yes | Yes | Unchanged |
| Which head (Onyxia or Nefarian) a drop came from | Yes (`lastHead`) | The yell matcher knows, but only the faction is kept | Worker derives it from the stored yell text |
| Raid presence, start and end | Roster cohort tracking, wipe versus clear detection, lockout rule | Headcount threshold; end after 3 quiet polls | Unchanged (headcount) |
| Learned clear duration (median, plausibility bounds, minimum samples) | Yes (MongoDB) | No | Yes, in the Worker, from stored sessions |
| Estimated clear countdown | Yes ("ending soon" alerts) | No | Yes, on the website |
| Kill confirmation from Chronicle raid logs | Yes | No | **Not ported** |
| Roster-based clear detection | Yes | No | **Not ported** (see below) |
| Head-drop cooldown | Configurable, default 0 for OctoWoW | None | None. Not modelled |
| Darkmoon Faire detection | Yes | No | Out of scope |
| Discord and whisper alerts | Yes | Fixed whisper replies only | Out of scope |

### What is not ported, and why

* **Roster cohorts and Chronicle confirmation** need the player names from each `/who` poll (the collector currently publishes only a count), a collector change, and a compile step. The supplied collector has compiled JavaScript only (`dist-metrics`), so that change cannot be made safely without its source. Until then, back-to-back raids in the same lair can merge into one long session, and a collector restart splits a raid in two. Expect `learning` or `low` confidence for a while, and treat every estimate accordingly.
* The collector dedupes buff yells by realm and buff name, not by faction, so a second faction's drop within 5 minutes of the first is dropped. An optional one-line fix is in `collector-patches/`. It is **not applied** and not required for this change.

## Deployment procedure

Run these yourself from your existing OctoMetrics Worker project (the folder that holds `cloudflare/worker.mjs` and your Wrangler config). Do not create a new Worker or D1 database, and do **not** apply `schema.sql` again.

1. **Record the current version for rollback.** `npx wrangler deployments list` and note the latest deployment id.
2. **Confirm the deployed Worker matches the file this change is based on.** Diff your current `cloudflare/worker.mjs` against the v0.2.1 file. If it differs, stop and tell me, because the new `worker.mjs` would overwrite those differences.
3. **Copy `worker.mjs` and `raid-intel.mjs`** from `cloudflare/octometrics/` in this repository into that same folder, replacing `worker.mjs`.
4. **Dry run.** `npx wrangler deploy --dry-run`
5. **Deploy.** `npx wrangler deploy`
6. **Verify.**
   ```bash
   curl -s "https://octometrics.eqvoice.workers.dev/api/summary?realm=N%27Zoth"
   ```
   Check that `heads.onyxia` and `heads.nefarian` exist, that `buffs[...].head` is set on new drops, and that population and `sessions` look as before. Expect `clear.status` to be `learning` until 5 plausible past raids have been stored.
7. **Rollback if needed.** `npx wrangler rollback` (choose the version noted in step 1).

The website tolerates a Worker without these fields (it shows NO DATA), so the Worker and the site can be deployed in either order. The Railway service needs no change.

## Optional collector patch (not required)

`collector-patches/0001-dedupe-buff-yells-per-faction.patch` changes one line in `dist-metrics/metrics/index.js`. If you choose to apply it: run it in the collector folder, run `npm.cmd test`, then deploy with your usual `railway up` command. Do this only when you are ready for the four accounts to reconnect.

## Tests

```bash
node --test cloudflare/octometrics/tests/*.test.mjs
```


## Darkmoon Faire ingestion extension

This repository also defines a **separately deployed** DMF-only Railway process
(`services/world-buff-tracker`, start command `npm run start:dmf`).
The receiver accepts authenticated `dmf_status` and `dmf_sighting`
events only from the exact N'Zoth combinations:

| Role | Account | Site |
|---|---|---|
| `dmfa` | `OBPVEDMFA` | `elwynn` |
| `dmfh` | `OBPVEDMFH` | `mulgore` |

Status reports an actively connected character separately from the last
confirmed NPC sighting. A sighting requires `confirmed: true` and
`source: onsite`; no NPC match is **not** sent as a negative sighting.
The summary gains `darkmoon.sites.elwynn`, `darkmoon.sites.mulgore`,
and `darkmoon.latestConfirmed`. Site properties include
`collectorStatus` (`online`/`offline`/`stale`/`unknown`),
`lastHeartbeatAt`, `lastConfirmedAt`, `npc` and `fresh`
(direct sighting no older than six hours).

The existing `metric_events` D1 table works unchanged; no migration or
new Worker is necessary. Deploy the updated Worker before starting the
new Railway accounts (otherwise they receive HTTP 400).
Run `node --test cloudflare/octometrics/tests/*.test.mjs` before deploying.
This extension adds API data; it does **not** automatically implement a
visual DMF panel on the OctoBot website.
