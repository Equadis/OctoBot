# Production raid history audit

Run from the repository root with authenticated Wrangler. Read-only; retain all original rows.

```powershell
npx wrangler d1 execute octometrics --remote --config .\wrangler.metrics.toml --command "SELECT id,type,realm,observed_at,payload_json FROM metric_events WHERE type IN ('raid_sessions','raid_session_ended','raid_session_revision') ORDER BY id LIMIT 1000" --json > raid-history-1.json
node cloudflare/octometrics/audit-raid-history.mjs raid-history-1.json
```

For more rows, rerun the same SELECT with `AND id > <last exported id>` before ORDER BY, saving each page under a new name. Pass all files to the audit command. Do not commit raw exports. The report gives each realm and zone's duplicate events, malformed and unverifiable records, excluded session keys, retained finishes and recalculated prediction sample counts/median/confidence. It replays retained snapshots to infer retractions from before durable revisions were introduced; previously pruned snapshots cannot be reconstructed. Roster departure is not proof of a boss kill.

MongoDB: inspect both zone duration collections for unkeyed legacy records, duplicate sessionKey values and valid=false records. Unkeyed records are retained but excluded from authoritative Mongo-backed learning; use the original roster snapshots to establish identity before migrating any legacy sample. Do not mark an unlinked record valid simply because the duration is plausible.

No production history is changed by this procedure.
