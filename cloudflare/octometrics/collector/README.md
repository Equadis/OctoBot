# Collector and Worker fix: missing world-buff drops

BLUF: the production collector suppressed the Alliance Rallying Cry announcement because it shared one five-minute duplicate timer between both factions. These files fix that, make retries safe, expose listener health, and unify what counts as a confirmed drop. Nothing here is deployed until you run the steps below.

## What is in this folder

`dist-metrics/metrics/` holds the files that replace or extend the compiled collector (Railway service `octobot-metrics-tracker`, v0.2.1):

| File | Change |
|---|---|
| `buffs.js` | Matcher normalises colour codes, quotes and whitespace; recognises Onyxia and Nefarian for both factions plus Rend's Warchief's Blessing; returns faction and head. |
| `drop-pipeline.js` | Duplicate key is realm, faction, buff and head over 60 s (was realm and buff over 5 min, across both factions). Stable `eventId` per announcement. Logs every stage as `DROPFLOW {json}`. |
| `listener-health.js` | Tracks connection, last yell heard, last match, last queued drop, ingest results. Sent as a `listener_health` heartbeat. |
| `events.js` | Publisher no longer retries permanent 4xx rejections forever (one bad event used to block every event behind it). Temporary failures back off 10 s to 120 s with the same `eventId`. Drops are kept longest when the queue is full. |
| `index.js` | The v0.2.1 entry point wired to the above. Everything else (population, `/who`, Darkmoon Faire, whisper replies, schedule) is unchanged. |

The Worker files (`../worker.mjs`, `../raid-intel.mjs`, `../listener-status.mjs`, `../raid-sessions.mjs`) are in the parent folder. The Worker is backwards compatible: it still accepts events from the old collector, so the two can be deployed in either order. Deploy the Worker first so it can show listener health as soon as the collector reports it.

`collector-patches/0001-dedupe-buff-yells-per-faction.patch` is superseded by this change. Do not also apply it.

## Safety rules

- Do not create a new Worker or D1 database. Do not apply `schema.sql` again.
- Redeploy only `octobot-metrics-tracker`. Leave `octobot-dmf-tracker` and every other Railway service alone.
- A redeploy reconnects the OBPVESW, OBPVEORG and OBPVEBB accounts. Check first that the old container has stopped, so two copies never log in with the same account.
- Nothing logged contains passwords or tokens.

## Steps (you run these)

1. **Back up and apply (dry run first).**
   ```bash
   node cloudflare/octometrics/collector/apply.mjs "C:\path\to\OctoBot-Metrics-Tracker-v0.2.1-Whisper-Replies" --dry-run
   node cloudflare/octometrics/collector/apply.mjs "C:\path\to\OctoBot-Metrics-Tracker-v0.2.1-Whisper-Replies"
   ```
   Every replaced file is saved as `<name>.bak-<timestamp>`.
2. **Test.** In this repository: `node --test cloudflare/octometrics/tests/*.test.mjs tests/*.test.mjs`. All must pass.
3. **Deploy the Worker.** In the collector folder: `npx wrangler deployments list` (note the current id), then `npx wrangler deploy --config wrangler.metrics.toml --dry-run`, then `npx wrangler deploy --config wrangler.metrics.toml`. Rollback: `npx wrangler rollback`.
4. **Check the Worker.** `curl -s "https://octometrics.eqvoice.workers.dev/api/summary?realm=N%27Zoth"` shows `lastDrops`, `listeners` (status `unverified` until the new collector runs), `monitoring`, and `dropDiagnostics`. Existing population and raid data must look as before.
5. **Deploy the collector.** From the collector folder, only for service `octobot-metrics-tracker`: `railway up`. Rollback: redeploy the previous deployment from the Railway dashboard.
6. **Verify live before calling it fixed.**
   - `railway logs` for `octobot-metrics-tracker` shows `DROPFLOW` lines and no repeating ingest errors.
   - `listeners.sw.status` and `listeners.org.status` become `healthy` within a few minutes.
   - At the next real turn-in (or when OctoWoW staff trigger an announcement) the logs show `matched`, `published`, then `accepted`; the Worker logs `ingest_stored`; `/api/summary` `lastDrops` updates; World Info shows the new elapsed time within its normal refresh.
   - Both factions recorded independently when one follows the other within five minutes.
7. **Diagnostic query** for D1 if anything looks wrong:
   ```sql
   SELECT id, type, account, role, observed_at, received_at, payload_json
   FROM metric_events WHERE type='world_buff_drop' ORDER BY id DESC LIMIT 20;
   ```

## Known limits

- A yell the listener never receives (out of range, packet loss) cannot be recovered. The silence thresholds (Stormwind 2 h, Orgrimmar 6 h without any monster yell) are starting values; tune them in `../listener-status.mjs` after a week of data.
- The original suppression left no log line, so the cause of the missed 05:07 Alliance drop is the best-supported explanation, not a directly observed one. The new `deduplicated` log stage will show any future case.
