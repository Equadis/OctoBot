# Authoritative raid sessions (Bufftracker → OctoMetrics → World Info)

One raid lifecycle, owned by the World Buff Tracker (`services/world-buff-tracker`). OctoMetrics stores what it reports; the website renders it. Nothing else decides when a raid started, which raid it is, or when it ended.

```
RaidTracker (roster cohorts, lockout, wipe/resume)   services/world-buff-tracker/src/watcher/raid-tracker.ts
  → sessions()  (id, formedAt, status, guild composition, confidence, end reason)
  → RaidTelemetry (raid_sessions / raid_session_ended, schema 1)  src/raid-telemetry.ts
  → POST /api/ingest  (Bearer METRICS_PUSH_TOKEN)                 cloudflare/octometrics/worker.mjs
  → D1 metric_events  (no migration)                              cloudflare/octometrics/raid-sessions.mjs
  → GET /api/summary → heads.<onyxia|nefarian>.{sessions,authoritative,clear}
  → docs/world-info.js renders it
```

## Why the numbers disagreed (root cause)

The deployed collector (`octobot-metrics-tracker`, source not in this repo; compiled copy `dist-metrics/metrics/raid-state.js`) keeps one headcount "activity session" per lair:

* it **starts** when one poll shows `count >= threshold` (15 Onyxia, 20 BWL) and records that poll as the start;
* it **ends** only after **3 consecutive polls** with `count < max(2, floor(threshold/3))` (5 Onyxia, 6 BWL). Any poll at or above that floor resets the quiet counter.

A lair that never drops below 5/6 players for three polls in a row therefore never ends the session, and the next raid inherits the previous raid's start time. Polls land every 15–25 minutes, so three quiet polls need roughly 45–75 minutes of near-emptiness — which a busy lair rarely has.

The live `/api/summary` on 2026-11-15 21:33 UTC shows exactly that signature:

| Lair | Collector `activityStart` | Age | Players now | Tracker (whisper) |
|---|---|---|---|---|
| Onyxia | 20:05:08 | 1h 28m | 11 (below 15 but above the 5 floor, so the session stays open) | young raid |
| BWL | 17:08:38 | 4h 25m | 35 | young raid |

The same merging poisons the learned durations: Onyxia median 40.0 min with p75 73.5 min, BWL median exactly 3 h with p75 3 h 20 m — sessions that run through several raids.

For the reported case (Onyxia 48m 15s vs 8 min, BWL 3h 44m 45s vs 49 min) the mechanism accounts for both: the earlier raid's session never closed, so the clock began ≈40 min (Onyxia) and ≈2 h 55 m (BWL) before the new raid formed. **What is missing to prove it for those exact raids:** the D1 `raid_who` event history for that window (the `activity_started`/`activity_ended` timeline). It was not available here; the live snapshot above is consistent with it but is not that timeline.

## What formation means

A raid's clock starts when its **own roster** first reaches the configured strength (`WOW_RAID_STRENGTH_SIZE` / `WOW_BWL_RAID_STRENGTH_SIZE`, default = min raid size 15 Onyxia / 20 BWL), using the tracker poll time. One or two players entering start nothing. A previous raid's start is never inherited: the lockout ledger stops a cleared raid's members from founding a new one, and a back-to-back group forms its own session. Known limit: the clock starts at the poll where the tracker first sees strength, so a group that waited in the lair while the previous raid was still being cleared starts at that raid's clear (up to the sustained-departure wait, 3–5 min, later than they truly assembled). The tracker does not backdate.

## Session model (`raid-session.ts`)

`id` (persistent #N from the existing Mongo counter — numbering is untouched), `formedAt`, `lastConfirmedAt`, `status` (`in_progress`, `leaving`, `ended`), `players`, `peak`, `rosterSize`, `continuity`, `guild`, `confidence`, and for ended sessions `endedAt`, `endReason`, `clearSource`, `trusted`.

| End reason | Meaning |
|---|---|
| `kill_confirmed` | A Chronicle kill by a roster member (the **only** thing that sets `clearSource: chronicle_kill`) |
| `departed` | Roster left and stayed gone (left the lair / disbanded). Kill **not** proven |
| `disbanded` | Left sooner than `WOW_RAID_DISBAND_MINUTES` (set by the alert pipeline) |
| `interrupted` | Tracking was lost (blind gap) or the clear was implausible/merged. Not a clear |

An empty `/who` is never treated as a kill. A wipe that returns within the sustained wait keeps the same session; one that returns after it **resumes** the same id and clock (existing behaviour, preserved).

### Confidence

| Value | When |
|---|---|
| `confirmed` | Reserved for direct evidence (e.g. a future friends-list roster source). **`/who` alone never emits it.** |
| `high` | Only raid tracked in its lair, or a concurrent cohort whose guild composition is a different single guild |
| `tentative` | A concurrent cohort separated by arrival timing alone (two PUGs, two raids of one guild) |
| unresolved | Reported as `lair.ambiguity`, never as a session |

### Concurrent raids

`WOW_RAID_MAX_CONCURRENT` (default 2; `WOW_BWL_RAID_MAX_CONCURRENT`; 1 restores the single-roster behaviour exactly). A second session is created only when **all** hold: another raid is at strength right now; the `/who` view is complete; the unassigned players reach the strength threshold on their own; they arrived together (within the fill window); and they arrived **after** the first raid's fill window closed. Otherwise the activity is reported as ambiguity:

* `overlapping_assembly` — a second group assembled while the first was forming (e.g. 49 players arriving together). Indistinguishable from one big raid by `/who`.
* `truncated_view` — the 49-player `/who` cap hid part of the zone.
* `staggered_arrivals` — extra players arrived too spread out to form a group, or the concurrent limit is reached.

Forty or more players never imply two raids. Concurrent sessions persist across restarts under `raidstate` keys `<lane>#<slot>`.

### Guild classification (`guild-label.ts`)

Computed from the **raid's own roster**, unique names, last known guild per member. Unlisted members count as *unknown*, never as unguilded.

| Result | Rule (default) | Label |
|---|---|---|
| guild | one guild ≥ 60% | `Nightfall` |
| guild-led | one guild 50–59% | `Nightfall-led PUG` |
| collab | no guild ≥ 60%, top two each ≥ 25% and together ≥ 65% | `Nightfall + Stormguard` |
| pug | none of the above, roster known | `PUG` |
| unknown | roster < 10, or < 80% of members' guilds known (truncated `/who`) | `Unknown` |

A new label must win 3 consecutive readings before it replaces the shown one. Env: `WOW_GUILD_RAID_PERCENT`, `WOW_GUILD_LED_PERCENT`, `WOW_GUILD_COLLAB_EACH_PERCENT`, `WOW_GUILD_COLLAB_COMBINED_PERCENT`, `WOW_GUILD_MIN_ROSTER`, `WOW_GUILD_MIN_KNOWN_PERCENT`, `WOW_GUILD_STABLE_READINGS`. These are initial recommendations, tested only against synthetic rosters.

## Telemetry (schema 1)

Two event types on the existing `/api/ingest` (role `rt`, account `bufftracker`, realm must be allow-listed):

* `raid_sessions` — full current state of one lair, sent on change and every 2 minutes. `seq` is monotonic; an older `seq` is acknowledged with HTTP 409 and ignored; an identical `eventId` returns 200 and is not stored again.
* `raid_session_ended` — once per ended session, retried until acknowledged; `durationMs` must equal `endedAt − formedAt` exactly or it is rejected.

Validation rejects: wrong schema/zone/role/account, future or pre-2024 timestamps, `endedAt < formedAt`, a kill claimed without Chronicle, malformed guild data, more than 12 sessions. Unknown fields (including any character name) are dropped. **No character names leave the tracker**: only aggregate guild counts (top 5 per raid). The game account name is never published (`account` is the constant `bufftracker`).

Retention: `raid_sessions` 3 days; `raid_session_ended` 30 days (the existing nightly cron).

### `/api/summary` additions (existing fields unchanged)

Per head (`heads.onyxia`, `heads.nefarian`): `sessions[]` (id, key, status, confidence, `identity` = `inferred`|`confirmed`, `startedAt`, `elapsedMs`, guild, estimate), `authoritative` (`fresh`, `stale`, `expired`, `ageMs`, `lair` with `ambiguity`, `lastFinished`), and `clear` now carrying `source`: `authoritative` or `legacy_headcount`. Once the tracker has reported, the merged headcount estimate is never used again for that lair.

### Staleness

* ≤ 3 min since the last snapshot: fresh.
* 3 min – 6 h: **stale** — same ids and start times, labelled STALE, estimates replaced by `stale`; nothing is called cleared.
* > 6 h: expired — live sessions are dropped (not turned into a clear); the card falls back to aggregate activity.

### Estimates

`heads.*.clear` uses the oldest high-confidence live session. Training data = ended sessions with `trusted: true` (high confidence, no overlap ambiguity) that ended by `kill_confirmed` or `departed`, within the plausibility bounds (Onyxia 10 min–6 h, BWL 30 min–10 h), at least 5 of them; separately per lair. Disbanded, interrupted, tentative, ambiguous and merged sessions never train. Until 5 trusted sessions exist the status is `learning` (NO DATA/LEARNING on the card). An estimate is never a confirmed kill or drop.

## Deployment

**Blocker to know first:** the production Railway service `octobot-metrics-tracker` runs the separate collector, not this tracker. The authoritative sessions only exist once the **main World Buff Tracker** runs in production for N'Zoth (`npm start`, with real accounts, MongoDB for raid numbering/state). Until then the site shows aggregate activity (`1+`, no raid ids or timers) and says so. No weaker substitute is used.

1. **Worker first.** Copy `worker.mjs`, `raid-intel.mjs`, `raid-sessions.mjs` into the deployed Worker project; `npx wrangler deploy`. No D1 migration (events use the existing `metric_events` table).
2. **Tracker.** Add to the tracker service env: `METRICS_PUSH_TOKEN` (same secret as the Worker) and optionally `METRICS_PUSH_URL` (default `https://octometrics.eqvoice.workers.dev/api/ingest`). Telemetry is off without the token; `WOW_RAID_TELEMETRY=false` disables it. Optional: `WOW_RAID_MAX_CONCURRENT`, the guild variables above.
3. **Website.** Publish `docs/` (`world-info.js`, `world-info.css`). It tolerates a Worker without the new fields.
4. Verify `curl "https://octometrics.eqvoice.workers.dev/api/summary?realm=N%27Zoth"`: `heads.onyxia.authoritative.fresh` is `true` and `sessions[].id` matches the in-game whisper.
5. Rollback: `npx wrangler rollback`; unset `METRICS_PUSH_TOKEN` on the tracker.

Existing raid numbers, the Mongo counter and records are untouched. The Chronicle early-confirm path still acts on the first lane with a pending departure.

## Limitations (honest list)

* `/who` has no instance id and no party info: sessions are roster-cohort **inferences**; identity is never `confirmed` from `/who`.
* Raids that assemble at the same time cannot be separated; they are reported as ambiguity. The page then shows a lower bound (`2+`).
* A concurrent raid that resumes after a wipe read as a clear is not resumed (its members are locked out instead); it ends and its remaining members cannot start a new raid for the lockout period.
* Concurrent raid kills reach alerts, but Chronicle early-confirm only confirms one pending departure per poll.
* The `/who` 49-player cap hides players; guild labels degrade to Unknown rather than guess.
* Ended sessions are held in tracker memory (2 h); after a tracker restart they are not re-published, so "last finished" relies on the stored `raid_session_ended` events.
* Guild thresholds and the unresolved-activity rules were tested on synthetic rosters only, not on live data.
* The legacy collector can stay as a secondary source; it cannot be fixed here (its source is not in this repository).

## Tests

```bash
cd services/world-buff-tracker && npm ci && npx vitest run          # tracker (guild-label, raid-sessions, raid-telemetry + fixtures)
node --test cloudflare/octometrics/tests/*.test.mjs                 # Worker (ingest, dedupe, stale, learning)
node --test tests/world-info-raids.test.mjs tests/world-info-heads.test.mjs   # page, fed by Worker output built from tracker fixtures
```

`cloudflare/octometrics/tests/fixtures/tracker-wire.json` is generated from the real tracker by `raid-telemetry.test.ts` (`UPDATE_FIXTURES=1 npx vitest run src/raid-telemetry.test.ts`); the same file feeds the Worker and page tests, so tracker, Worker and website are compared on identical data.
