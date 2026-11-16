# OctoBot Auction House (WIP) — architecture, safety and deployment

**Status: development branch only. No migration, Worker, GitHub Pages, or Railway collector has been deployed by this work.** The collector has not authenticated to N'Zoth and no real Auction House packets or benchmarks have been captured. Never imply a completed live scan from the implementation alone.

## Architecture and feasibility audit

- Existing repo: `services/world-buff-tracker` implements 1.12-world login/packet transport with `AuthClient`, `WorldClient`, `parseUpdateObject` and `CMSG_CREATURE_QUERY`. Auth build comes from `config.ts` (OctoWoW build; world session uses Vanilla 5875 unless configured otherwise).
- The dedicated `auction-collector.ts` reuses the existing game socket/authenticator but runs in a separate Railway service/process with its own account/password, no chat/DMF/raid work.
- A Lua addon **cannot run inside this headless Node.js client**. The compatible aux fork, https://octowow.st/git/Dusk/aux-addon-ClassicAPI, can guide filter behavior and pricing calculations, but is **not installed or executing**. `AuctionQueryThrottle` is a separate in-client modification, not evidence of server query limits.
- Vanilla 1.12 packet references: [auction hello](https://gtker.com/wow_messages/docs/msg_auction_hello_client.html), [unfiltered list request](https://gtker.com/wow_messages/docs/cmsg_auction_list_items.html), [list result](https://gtker.com/wow_messages/docs/smsg_auction_list_result.html). The documented result contains stable auction ID, item ID, suffix/enchant fields, stack size, owner GUID, starting bid, current highest bid, minimum bid increment, buyout and a time-left value in **milliseconds**. OctoWoW compatibility and semantics **are not verified**.
- The collector identifies Auctioneer Finch by a live creature-name response and uses its observed GUID to request the Auction House service. Character must be parked **within sight and interact range** of Finch. It does not search the world, move, teleport, or perform autonomous navigation.
- The collector sends ONLY `MSG_AUCTION_HELLO` and `CMSG_AUCTION_LIST_ITEMS` alongside normal login/NPC-name queries. **No bids, purchases, auctions posted, cancellations or inventory actions.**
- The collector is **disabled unless both** `AUCTION_COLLECTOR_ENABLED=true` and `AUCTION_RULES_APPROVED=true`. This is a safeguard, not a substitute for confirming OctoWoW's actual rules. Obtain explicit server permission for unattended collection; never infer consent from allowed Lua addons.

## Deployment order (requires explicit approval)

1. **Review the feature branch and run tests**: `npm ci && npm run typecheck && npm test && npm run build` in `services/world-buff-tracker`; `node --test cloudflare/octometrics/tests/*.test.mjs` and `node --test tests/site-routes.test.mjs` at repository root. Confirm no regression in existing tests. GitHub CI checks do not replace live verification.
2. **Back up existing D1 and Worker**. Compare the live Worker with this repository's `cloudflare/octometrics/worker.mjs` — its source explicitly notes that deployed code may diverge. STOP if it does; merge changes rather than overwrite live production. Keep the existing `metric_events` table.
3. **Apply the additive D1 migration to the confirmed OctoMetrics database**, e.g., with the correct existing Wrangler project configuration: `npx wrangler d1 execute octometrics --remote --config ./wrangler.metrics.toml --file ./cloudflare/octometrics/migrations/0002_auction.sql`. Verify the DB name, config path, and working directory first; don't assume the example path exists. Back up before mutation.
4. **Create a dedicated secret** `AUCTION_PUSH_TOKEN` for OctoMetrics and the auction Railway service. Do not reuse `METRICS_PUSH_TOKEN` or expose any key in frontend.
5. **Deploy the updated OctoMetrics Worker** (including `auction.mjs` and `auction-pricing.mjs`) only after verifying its original ingest, summary, world-buff, raid and DMF behavior. Read-only endpoints: `GET /api/auction/summary`, `/api/auction/scan-status`, `/api/auction/items`, `/api/auction/item/:id?variant=...`, `/api/auction/history/:id?variant=...`; writer: authenticated `POST /api/auction/scan/{start,page,complete,fail}`.
6. **Publish GitHub Pages** via the approved review/merge workflow; confirm the new card and `/OctoBot/auction-house/` route. Until a real complete scan is published, it should display **NO DATA**, never synthetic listings.
7. **Create a new Railway service** rooted at `/services/world-buff-tracker` (do not change the existing tracker service). Install/build as other Node/TypeScript services do. Start command `npm run start:auction`; this executes `dist/auction-collector.js`. Use separate credentials; `WOW_ACCOUNT` is the authenticated account name, `WOW_CHARACTER=OBPVEAH` is the in-world character.
8. **Leave the collector disabled** initially. Explicitly verify OctoWoW policy and test authentication/NPC interaction under supervision before granting `AUCTION_RULES_APPROVED=true` and `AUCTION_COLLECTOR_ENABLED=true`. One active game session per account: ensure the account isn't logged in elsewhere.
9. **Begin with a conservative interval** (default 5.5 seconds between queries) and watch for throttling/timeouts. This is not an attempt to bypass server protections. If the server resists, slow down or stop. Capture 3+ successful real scans and compare complete duration, auctions/page, failed queries and response latencies before changing the schedule.
10. Verify the Worker retains an older complete scan during incomplete uploads; confirm historical aggregation after at least four distinct daily price observations and trend calculations after the second full scan.

### Railway environment

| Variable | Meaning |
|---|---|
| `WOW_ACCOUNT`, `WOW_PASSWORD` | Isolated game account login secret |
| `WOW_CHARACTER=OBPVEAH` | Character must already be parked next to Finch |
| `WOW_REALM=N'Zoth` | Exact realm |
| `WOW_LOGIN_ENABLED=true` | Enable existing game-client login |
| `WOW_AUTH_HOST`, `WOW_AUTH_PORT`, `WOW_WORLD_HOST`, `WOW_WORLD_PORT` | Existing client configuration and optional overrides |
| `AUCTION_PUSH_TOKEN` | Dedicated, secret ingestion bearer token |
| `AUCTION_PUSH_URL` | Defaults to `https://octometrics.eqvoice.workers.dev/api/auction/scan` |
| `AUCTION_COLLECTOR_ENABLED=false` | Must explicitly become `true` only with permission |
| `AUCTION_RULES_APPROVED=false` | Explicit server-rules acceptance gate |
| `AUCTION_QUERY_INTERVAL_MS=5500` | Minimum 5000ms; respect any more restrictive server throttle |
| `AUCTION_QUERY_TIMEOUT_MS=30000` | Time out a page and abort its scan; never pair late responses with another query |
| `AUCTION_SCAN_COOLDOWN_MS=3600000` | Cooldown **after completion**; never overlap scans |
| `AUCTION_MAX_PAGES=2000` | Fail safely rather than scan endlessly |

## Data integrity and prices

- Each scan has a unique ID, start/end timestamps, pages, counts and a status. Each page is uploaded with an idempotent page index. **Only complete scans** are public. After every page is seen, the Worker verifies page continuity, distinct auction IDs and a collected listing count at least as large as the initial reported total. A changing Auction House can make a scan fail, which is better than publishing bad data.
- `ah_listings` holds item variants and full copper prices as integers. 1g = 10,000c; 1s = 100c. Protocol buyout of `0` is preserved separately from a missing (`NULL`) buyout.
- `ah_item_points` groups each item+variant by cheapest **positive** unit buyout; selects the listing to show; no-buyout auctions do not distort buyout averages.
- `ah_daily` stores one representative price per item/variant/day. **MVP policy:** the **lowest available unit buyout for that day** is the day’s representative value. This is useful for bargain hunting but is vulnerable to a single unusually cheap listing. The 14-day arithmetic mean uses one representative price per day, excluding the current unfinished day; a valid market percentage requires **four eligible distinct days**. No history => NO DATA.
- `Market % = 100 × current cheapest unit buyout ÷ rolling daily average`. Examples: 10s vs 10s = 100%; 25s vs 10s = 250%; 5s vs 10s = 50%; 25c vs 10s = 2.5%.
- Arrows are **short-term** versus the last complete snapshot: under 10% = stable, 10–24.99% = single, at least 25% = double; red up = more expensive, green down = cheaper. This is distinct from the 14-day historical average.
- The documented wire format includes precise `time_left_ms`. The site subtracts elapsed time from the observation; it labels the result approximately and shows **Uncertain** after it reaches zero, not "expired". Live OctoWoW semantics must still be checked.
- The API retains three recent complete snapshots for trends and daily aggregates for one year. No complete scan is overwritten by partial pages. D1 constraints, large scan paging and actual storage costs need real benchmarking.

## Metadata limitations and next work

**MVP currently has no verified real item-metadata collector.** Standard auction rows have item ID/suffix but **do not embed item name, quality, icon, full tooltip or seller name**. The website displays item IDs and a neutral icon placeholder rather than guessing. The OctoWoW item DB (`https://octowow.st/db/`) remains the preferred metadata source, but no authoritative permitted API or icon URL contract was confirmed. Integration with authenticated item-name queries and a cached item metadata/icon pipeline needs a separate, rate-limited implementation and tests. No claim of full icon coverage is warranted.

Owner GUID is not a human-readable seller name. For lookups, `auction_id` is a server-provided ID in the documented Vanilla protocol; if real OctoWoW captures differ, update the matching strategy before using it to link observations.

**Operational limitations**: the collector has no real authenticated test, no measured scan duration, no confirmed request throttling, no real NPC GUID capture, and no verified OctoWoW policy approval. Backend code, frontend, migrations and protocol parser must be validated in CI and a controlled live session before any production deployment.

## Rollback

If a deployment is subsequently authorised, record original Worker deployment and D1 backup first. On problems, disable `AUCTION_COLLECTOR_ENABLED`/stop only its Railway service, roll back the OctoMetrics Worker to the recorded prior deployment, and revert the Pages feature commit if needed. Keep additive auction tables for investigation or restore D1 from the backup if approved; **never drop metric_events**.
