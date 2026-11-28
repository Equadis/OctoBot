# OctoBot Auction House rollout

## Storage and cost model

The Railway collectors use their existing character sessions and claim one UTC slot per realm during the first 15 seconds of the hour. A conditional R2 write prevents a restarted collector from claiming the same slot. A scan with unfinished pagination, a timed-out query or an oversized snapshot leaves the last published version available. The collector sends one compressed completion and reports progress at most once every 30 seconds.

A successful publication writes an immutable catalogue, an advanced-filter projection, item detail partitions and compact price state. It switches the public pointer after every component has been written. The Worker precomputes prices once during publication. Normal site searches, favourites, filtering by item attributes, sorting and pagination run against the browser's versioned catalogue. Listing filters use the narrower server-side projection. Row expansions fetch auction details, and opening Price history fetches the chart.

Pricing retains the latest priced observation of each auction ID per item variant across the three most recent completed scans. Five retained samples are required. Where at least ten are available, prices greater than ten times the median are excluded. Four prior daily lows in the previous 14 days support the sparse-item fallback. Three hourly observations now usually span two hours. Three five-minute observations previously spanned about ten minutes when scans ran on schedule. The sample and outlier rules are the same, but the elapsed observation window changes with the scan schedule.

An exact ledger preserves historical distinct-auction totals and first-seen timestamps. Auction change counts compare meaningful listing fields and ignore expected countdown decay. A disappeared listing is recorded as disappeared. Closed daily prices are written once per UTC day, retained for 365 days, and read on demand. Current day lows accumulate across successful scans. Each realm retains its latest three published versions and protects shared ledger and archive partitions until all references expire. Optional raw archives are off by default. Authorised seller and metadata recovery run in bounded batches after publication. Seller names appear after the detail cache refreshes. Recovered item metadata enters the next catalogue version.

The snapshot path uses zero D1 rows for scanning, publishing, search, filter, details, recovery or charting. R2 and Workers usage still counts. The existing databases and services continue to use their own bindings. Current production D1 data remains available for backup and rollback.

| Cloudflare resource | Included monthly usage | Account guard |
| --- | ---: | ---: |
| D1 rows read | 25 billion | 15 billion per billing period and 500 million per UTC day |
| D1 rows written | 50 million | 30 million per billing period and 1 million per UTC day |
| D1 storage | 5 GB | 4 GB |
| Worker requests | 10 million | 8.5 million |
| Worker CPU | 30 million ms | 24 million ms |
| R2 Standard storage | 10 GB-month | 8.5 GB observed storage |
| R2 Standard Class A operations | 1 million | 800,000 |
| R2 Standard Class B operations | 10 million | 8 million |

Cloudflare publishes the [D1 rates](https://developers.cloudflare.com/d1/platform/pricing/), [Workers rates](https://developers.cloudflare.com/workers/platform/pricing/), [R2 rates](https://developers.cloudflare.com/r2/pricing/), and [supported account spending limits](https://developers.cloudflare.com/billing/manage/spend-management/). Cloudflare’s Workers spending limit covers requests and CPU. D1 and R2 remain outside that limit. Setting a Workers-wide limit can interrupt the other Workers on the account.

## Local measurements

Run these commands with Node 22.5 or later. The two-realm R2 harness uses the real Worker routes and an instrumented in-memory bucket. The before column runs the legacy SQL on the same catalogue and three observations in SQLite, plus 14 days of fallback price points. Fixture data is synthetic and sized to exercise busy markets. SQLite query plans establish visits to the history and current listing inputs, and the figures below distinguish candidate rows from Cloudflare billing counters.

```sh
node cloudflare/octometrics/benchmark-auction.mjs 30000
node cloudflare/octometrics/benchmark-auction.mjs 60000
node --test cloudflare/octometrics/tests/*.test.mjs tests/auction*.test.mjs
python3 -m unittest discover -s cloudflare/octometrics/tests -p test_auction_sql.py
npm --prefix services/world-buff-tracker run typecheck
npm --prefix services/world-buff-tracker test
npm --prefix services/world-buff-tracker run build
```

| Metric | Legacy SQL path | R2 at 30,000 listings | R2 at 60,000 listings |
| --- | --- | ---: | ---: |
| Listing inserts per completed scan | At least one per listing, plus index, point, history and cleanup writes | 0 D1 writes | 0 D1 writes |
| D1 rows read by scan completion | Scans current listing, page and historic price inputs | 0 | 0 |
| History listing candidates per ordinary or listing-filtered search | 90,000 at 30,000 per scan, 180,000 at 60,000 | 0 D1 reads | 0 D1 reads |
| Ordinary search, cold server wall time | 441 ms at 30,000, 710 ms at 60,000 | 65 ms with 2 R2 reads | 72 ms with 2 R2 reads |
| Listing-filtered search, cold server wall time | 281 ms at 30,000, 577 ms at 60,000 | 74 ms with 3 R2 reads | 129 ms with 3 R2 reads |
| Typical same-day completion | Includes per-page transactions and D1 historical precompute on the optimisation branch | 34 R2 reads and 53 puts | 34 R2 reads and 53 puts |
| Compressed catalogue per realm | N/A | 492 KB | 582 KB |
| Compressed storage, three retained versions across both realms | Production D1 account baseline required | 17.1 MB | 29.6 MB |

A separate local Wrangler run exercised an R2-bound Worker with 60,000 listings. Publication succeeded in 1.39 seconds. Cloudflare’s local runtime returned one successful claim and one conflict for concurrent requests, decoded the catalogue correctly, returned 304 on its ETag and served a semantically identical filter query from cache in 4 ms after a 204 ms cold request. These are local runtime measurements.

The measured SQL plans include the indexed historical-day range, the complete-scan index, the per-scan listing index and temporary sorts. The historical candidate counts exclude daily summaries, joins, current listing filters and repeated counts. Use Cloudflare Query Insights and the account billing export for the prior live baseline and pilot comparison.

A two-minute session that searches and pages through item results sends no search requests after loading the new catalogue, plus a manifest per visible minute. Its D1 queries are zero, including when it opens details or a chart. A snapshot-matched conditional request takes the 304 path before loading object data. An identical warm edge query can avoid the catalogue and filter object reads. The benchmark above uses cold responses and does not estimate the production hit rate.

For a 31-day month, the combined maximum is 1,488 scan slots. Budget about 260,000 Class A operations and 400,000 Class B operations for scan activity, recovery, monitoring and maintenance at the long-scan bound. The test measured under 1.8 CPU seconds per 60,000-listing publication. The model rounds background CPU to 3 million ms and assumes six requests per session, three cold advanced filters at 200 ms each, ten Class B operations per session, and up to 200,000 background Worker requests. Light routes add an assumed 2 ms per request and are rounded into the estimates.

| Sessions per month | Worker requests per month | Worker CPU per month | R2 Class B per month | Modelled Auction House overage using the full account allowance |
| ---: | ---: | ---: | ---: | ---: |
| 1,000 | 206,000 | 3.6 million ms | 410,000 | $0 |
| 10,000 | 260,000 | 9.1 million ms | 500,000 | $0 |
| 50,000 | 500,000 | 33.3 million ms | 900,000 | about $0.07 |
| 100,000 | 800,000 | 63.6 million ms | 1.4 million | about $0.67 |

The model excludes unrelated account usage, storage already in D1, restore work, optional raw archives, taxes and any previous overage. At 10,000 sessions it averages roughly 8,400 Worker requests, 294,000 CPU ms, 8,400 Class A operations, and 16,000 Class B operations per day. D1 reads and writes from the new path remain zero. Compare actual account totals and Cloudflare CPU after the pilot. The 60,000 listing cap, 24 MiB decompressed upload cap and 12 MiB uncompressed object cap must be checked against a genuine backup and the live realm sizes. Ledger and 365-day archive growth should be checked independently of the three-version raw storage estimate.

## Configuration

| Setting | Purpose |
| --- | --- |
| `AUCTION_SNAPSHOT_MODE=true` and private R2 binding `AUCTION_SNAPSHOTS` | Route both Auction House realms to R2 and suppress legacy D1 maintenance |
| `AUCTION_PUSH_TOKEN` | Existing Railway collector secret |
| `AUCTION_ADMIN_TOKEN` | Separate Worker secret for verified imports and account reports |
| `AUCTION_COLLECTION_PAUSED=true` | Refuse new scan slots. Keep existing public snapshots available |
| `AUCTION_INGEST_PAUSED=true` | Refuse completion, progress and recovery writes |
| `AUCTION_HISTORY_PAUSED=true` | Refuse new pricing builds. Keep published pricing and charts accessible |
| `AUCTION_PUBLIC_PAUSED=true` | Return a maintenance response for Auction House public routes |
| `AUCTION_LIST_FILTERS_PAUSED=true` | Serve cached filter results and suspend new server-side listing-filter computations |
| `AUCTION_MAINTENANCE_PAUSED=true` | Suspend superseded-generation cleanup and optional raw archival |
| `AUCTION_IMPORT_ENABLED=true` | Open the authenticated initial import endpoint while collection is paused |
| `AUCTION_GC_ENABLED=true` | Let the existing Worker schedule sweep up to 200 orphan objects per realm while account usage is within budget |
| `AUCTION_ARCHIVE_RAW=true` | Optional compressed raw archive after verifying a seven-day R2 lifecycle on both realm `archive/` prefixes |
| `AUCTION_QUERY_LIMITER` | Optional Workers rate-limiting binding on expensive cache misses. Configure 20 per 60 seconds per client per location for the pilot |
| `AUCTION_BUDGET_<FIELD>` | Lower an individual threshold from the table. Field names follow the budget JSON keys in uppercase |
| `AUCTION_BUDGET_MAX_AGE_MS` | Default two hours, adjustable from five minutes to six hours |

The existing `AUCTION_API_PAUSED` still stops all Auction House traffic if set. In snapshot mode, use the narrower flags above. Production should require a budget report and imported history. The empty-history and budget-bypass flags are for local fixtures.

Run `report-auction-budget.mjs --print` with an account Analytics Read token from a trusted host and compare the output against the same billing period in the dashboard. Set `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ANALYTICS_TOKEN` and the current UTC subscription renewal date in `AUCTION_BILLING_START`. A scheduled run without `--print` posts the observation using `AUCTION_ADMIN_TOKEN`. An exported dashboard observation in the same shape can be submitted with `--file`. Schedule the report hourly using existing infrastructure and update the billing start at renewal. Wait for a first successful, verified report before allowing new slots. Configure the existing alert sink to notify on the Worker log event `auction_budget_suspended`. A stale or over-budget report blocks new scan claims, completion and scheduled orphan cleanup. Public reads continue from the last successful generation. Allow for reporting delays and activity elsewhere on the account.

## Backup, rollout and rollback

1. Keep `AUCTION_COLLECTOR_ENABLED=false` for `OBPVEAH` and `OBPVPSW`. Record the current Worker version and the binding used for each auction namespace. Compare pre- and post-cutover metrics for population, server status, World Chat, raids, Darkmoon Faire, Discord, and EQ Voice. Baseline only the necessary auction endpoints and use Cloudflare Query Insights for legacy reads.
2. Export the exact legacy D1 source as a read-only backup in an approved window. Keep the full backup in separate storage and verify its checksum, SQLite integrity, table counts and latest completed scan for each realm. If production binds the auction tables to different databases, combine the two namespace exports in a local SQLite backup before conversion. Preserve the backup and any R2 export outside the active lifecycle rules.
3. Run `node cloudflare/octometrics/seed-auction-snapshots.mjs verified.sqlite ./auction-import`. Compare the manifest’s complete scan IDs, listings, price-day coverage, and exact historical totals against the source. Upload each manifest object to the private R2 bucket using single-object PUT with `Content-Type: application/json` and `Content-Encoding: gzip`. For Wrangler use `npx wrangler r2 object put "$BUCKET/$KEY" --file "$FILE" --content-type application/json --content-encoding gzip --remote`. Keep the manifest and files until verification.
4. Validate import and one genuine captured dataset against a staging Worker and R2 bucket before any production deployment. Confirm restoration, pricing and filters against the legacy export, measure Cloudflare CPU and R2 operations, and review the first-seen ledger and archive sizes. If only staging is available, leave production and both collectors paused.
5. Deploy the new Worker with collection paused, the import flag enabled and existing service bindings inherited. The snapshot deployment skips legacy D1 schema work. Post each generated manifest to `/api/auction/import?realm=...` using the admin bearer. The import verifies every object's checksum, size and encoding before an atomic publish. Turn off the import flag. Verify summary, catalogue, seller details and charts in both realms. Deploy the Pages and Railway code with Auction House collection still disabled. Probe unrelated services and verify the Worker remains healthy.
6. Check the account report and remaining monthly quotas. Keep collection suspended if current storage exceeds the 4 GB operating threshold. Any production deletion or reclamation requires a verified backup and explicit approval.
7. Obtain authorisation to enable one collector, unpause claims, and allow one UTC slot. Log Cloudflare billable usage for the scan, public reads, and subsequent idle window. Compare requests, CPU, R2 operations and D1 row metrics against the model. Verify correct freshness at one and 24 hours using the completed timestamp. Enable the second collector only after the single-realm run is verified and authorised.
8. To pause a rollout, set the collection and ingestion pause flags and set both Railway collector flags to false. The snapshot Worker can continue to serve the published data. To roll back Worker or Railway code, restore the recorded versions and matching variables as a set. Keep legacy Auction House public APIs in maintenance mode on rollback if they would reactivate the expensive historical SQL. Preserve D1 and R2 data. Validate unrelated watchers and metrics after rollback.

When enabling optional raw archival, add separate R2 lifecycle rules for `auction/v1/nzoth/archive/` and `auction/v1/yshaarj/archive/`. Apply no expiry rule to the version, control or budget prefixes. Those contain live pointers and shared objects that can outlast a paused collector.
