# PvP Auction House: OBPVPSW (Y'Shaarj only)

The existing Stormwind metrics character is the sole PvP auction listener. No second login, no movement packets and no new Railway service. C'Thun is excluded. N'Zoth's dedicated collector is unchanged.

## Deployment order (local operator)

1. Back up the existing D1 and the local metrics upload bundle. Run the existing full test suite and PvP tests before deploying.
2. From the OctoBot repository, apply `cloudflare/octometrics/migrations/0011_pvp_auction.sql` to the existing octometrics D1 once, using the existing Wrangler configuration. Deploy the Worker before enabling PvP scanning. No existing auction tables are altered.
3. Build `services/world-buff-tracker` with `npm ci` and `npm run build`.
4. From the OctoBot root, run `node cloudflare/octometrics/collector/apply-pvp-auction.mjs "<existing metrics upload directory>" --dry-run` then `--apply` when validated. This patches the existing entrypoint and copies compiled client dependencies. Check the actual bundle offline before deployment. It does not overwrite custom raid or chat modules.
5. On octobot-metrics-tracker, set AUCTION_COLLECTOR_ENABLED=true, AUCTION_RULES_APPROVED=true (only after verifying permission for PvP collection), and the same AUCTION_PUSH_TOKEN and optional AUCTION_PUSH_URL as the existing auction collector. Set scan cadence conservatively (default one hour) and AUCTION_QUERY_INTERVAL_MS if required by server policy. Never paste secrets into the repository. Keep world chat enabled.
6. Stop the old metrics deployment before uploading the patched bundle with Railway CLI. Do not start a second service with OBPVPSW. Redeploy only octobot-metrics-tracker.
7. Verify logs: the PvP character discovers Auctioneer Fitch and completes a scan; chat and .server info continue on the same session. Confirm /api/auction/summary?realm=Y%27Shaarj and the default PvE endpoint show separate snapshots. Hardcore stays metrics-only.

If the actual local metrics upload differs from the checked-in entrypoint, the patch refuses unmatched anchors or existing overlapping hooks. Restore the backup on regression. Do not change production without successful integration checks.
