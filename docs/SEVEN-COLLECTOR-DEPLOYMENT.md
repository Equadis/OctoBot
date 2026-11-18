# OctoBot seven-service cutover (release candidate)
One GitHub source, one service/account, one world socket. No old process should be logged into the same account at cutover.

| Railway service / COLLECTOR_PROFILE | Actual login | Realm | Jobs |
|---|---|---|---|
| OBPVESW | OBPVESW | N'Zoth | Buff drops; Onyxia every 30s |
| OBPVEORG | OBPVEORG | N'Zoth | Buff drops; BWL every 30s |
| OBPVEDMFA | OBPVEDMFA | N'Zoth | Elwynn Faire; server info 20s; World Chat flush 10s |
| OBPVEDMFH | OBPVEDMFH | N'Zoth | Mulgore Faire; server info 20s; World Chat flush 10s |
| OBPVEAH | OBPVEAH | N'Zoth | AH; server info 10s |
| OBPVPSW | OBPVPSW | Y'Shaarj | AH; server info 10s |
| OVHCSW | OBHCSW | C'Thun | server info 10s |

The service name OVHCSW is retained as requested; the existing HC telemetry/account identifier is OBHCSW. Confirm actual login and character names before cutover. World chat is assigned only to the two PvE DMF accounts in the requested design: the previous PvP/HC chat feeds will stop unless explicitly assigned again.

## Common Railway configuration
- Repository Equadis/OctoBot, release branch after CI passes; root /services/world-buff-tracker.
- Railpack, Node 22, build npm run build, start npm run start:collector; one replica; same Europe West region.
- Shared variables: WOW_AUTH_HOST, WOW_PASSWORD, METRICS_PUSH_URL, METRICS_PUSH_TOKEN, AUCTION_PUSH_URL, AUCTION_PUSH_TOKEN, RAILPACK_NODE_VERSION. Set tokens privately in the new project's shared variables; reference them on individual services. Never commit a secret. Do not copy provider-generated RAILWAY_* values.
- Per-service COLLECTOR_PROFILE and WOW_ACCOUNT/WOW_CHARACTER/WOW_REALM if overriding profile defaults. WOW_LISTENERS=[]; leave WOW_LOGIN_ENABLED=false during setup.
- Two DMF services: WORLD_CHAT_ENABLED=true.
- Raid services: RAID_STATE_KEY (same persistent strong key, in Railway only). Key rotation requires decrypt/re-encrypt; never discard it. Existing counters must be seeded to their known floors; never guess numbers.
- Two auction services: AUCTION_COLLECTOR_ENABLED=true, AUCTION_RULES_APPROVED=true only if server approval is valid, AUCTION_MAX_PAGES=2000, AUCTION_QUERY_INTERVAL_MS=0, AUCTION_QUERY_TIMEOUT_MS=30000, AUCTION_UPLOAD_INTERVAL_MS=500. Start with AUCTION_SCAN_COOLDOWN_MS=3600000 for both; verify throughput before reducing. Do not copy PvE world host/port to other realms: use realm discovery unless an override is independently verified.
- Existing old live service is the credential source. Do not delete until copied and a verified rollback path exists.

## D1 isolation
Maintain existing DB for metrics and raid state. Create empty octobot-auction and octobot-worldchat databases. Use exact live tables, including indices, triggers and stored historical data. Do not replay migrations into an exported full schema.
1. Confirm capacity, back up original octometrics database and record Worker deployment ID. Ensure old AH and chat writers and cleanup cron are quiesced before export; plan a short maintenance window.
2. Run `node cloudflare/octometrics/migrate-isolated-d1.mjs octometrics octobot-auction octobot-worldchat` to print narrowly scoped Wrangler export/import and count commands. The helper never executes them.
3. Export **each table separately** (the helper prints one Wrangler export command per table, not multiple `--table` flags in one command). Verify that every expected file exists and includes its schema and data; inspect indexes and triggers, then import into **empty** destinations in the printed order. Compare row counts, latest complete scan IDs, prices, totals and latest chat message times. In case of import failure, do not rerun into a partially populated database. If your Wrangler version cannot export the required schema objects, stop and use a verified alternative; never proceed with partial exports.
4. Add bindings AUCTION_DB and WORLD_CHAT_DB to the existing deployed Worker config. Keep DB unchanged. Preserve existing secrets, routes and daily cron; add */5 * * * * for small bounded auction cleanup runs. Deploy reviewed Worker from the actual deployed config, not the population Worker.
5. Smoke test old and new GET endpoints before enabling writers. Do not delete any source tables. After new writes begin, switching back to old bindings requires reconciliation: old tables will not contain the latest data.
6. Maintain an initial one-hour auction cooldown, pace each page 500ms, check two full scans per realm, no abandoned upload after five minutes of inactivity and no D1 overload. Keep previous snapshots on interrupted scans.

## Raid persistence migration
New checkpoint route preserves encrypted full roster state separately from the legacy pseudonymised checkpoint. Existing numbering routes and stored floors are unchanged. Read the old checkpoint before enabling each raid observer. If the legacy payload holds active slots or lockouts, the new collector refuses to start rather than silently start over. A safe migration requires the legacy collector's pseudonym algorithm and a compatible mapping, or an explicitly approved cutover after all legacy sessions and lockouts expire. Do not delete state or seed counters arbitrarily. The new encryption key must be backed up securely.

## CI and cutover
Only switch after the release checks succeed, a dry-run deployment works and D1/raid preconditions are met. The new runtime's disabled-login smoke test is not a live protocol test. Existing services may be stopped at cutover but retain their configuration for rollback; never duplicate game logins. Verify the live job intervals, chat coverage, both DMF sites, raid and counter continuity, and two consecutive complete PvE/PvP scans. Enable services one at a time. Do not mark production ready until every live verification passes.
